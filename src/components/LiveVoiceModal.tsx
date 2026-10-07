import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Radio, 
  Sparkles, 
  Activity, 
  Send,
  Zap,
  Play,
  Square,
  ShieldAlert,
  HelpCircle,
  Keyboard,
  Headphones,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { MarketQuote } from '../types/stock';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: MarketQuote | null;
}

/**
 * High-quality decimation/downsampler from hardware sampleRate to 16,000Hz PCM
 */
function downsampleTo16000(inputBuffer: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return inputBuffer;
  if (inputSampleRate < 16000) return inputBuffer;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : (inputBuffer[offsetBuffer] || 0);
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Convert Float32 audio samples to 16-bit PCM little-endian Base64
 */
function floatTo16BitPCM(input: Float32Array): string {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  let binary = '';
  const bytes = new Uint8Array(output.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Resilient multi-strategy microphone stream acquisition
 */
async function acquireMicrophoneStream(preferredDeviceId?: string): Promise<MediaStream> {
  // Strategy 1: Explicit device if specified
  if (preferredDeviceId && preferredDeviceId !== 'default') {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: preferredDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      console.warn('Strategy 1 failed, trying deviceId only...', e);
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: preferredDeviceId } },
        });
      } catch (e2) {
        console.warn('Strategy 1 fallback failed...', e2);
      }
    }
  }

  // Strategy 2: Standard constraints
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err1) {
    console.warn('Strategy 2 (standard audio constraints) failed, trying basic audio: true...', err1);
  }

  // Strategy 3: Basic audio: true (most universally compatible with all audio drivers & headsets)
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err2) {
    console.warn('Strategy 3 (audio: true) failed, checking legacy getUserMedia...', err2);
  }

  // Strategy 4: Legacy vendor-prefixed getUserMedia fallback
  const legacyGUM = 
    (navigator as any).getUserMedia || 
    (navigator as any).webkitGetUserMedia || 
    (navigator as any).mozGetUserMedia || 
    (navigator as any).msGetUserMedia;

  if (legacyGUM) {
    return new Promise((resolve, reject) => {
      legacyGUM.call(navigator, { audio: true }, resolve, reject);
    });
  }

  throw new Error('Microphone access could not be acquired with any supported audio profile.');
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose, quote }) => {
  const currentTicker = quote?.symbol || 'AAPL';

  // Check if running inside an iframe
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // Session activation state
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState<boolean | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0); // 0 to 100
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState(`Standby — Connected to ${currentTicker} Real-Time Market Copilot.`);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  // Audio devices list
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const [transcripts, setTranscripts] = useState<Array<{ sender: 'user' | 'gemini'; text: string; id: string }>>([
    {
      id: 'init-msg',
      sender: 'gemini',
      text: `Hello! I am your real-time AlphaPulse Voice Copilot. I have live market data for ${currentTicker} ($${quote?.price ? quote.price.toFixed(2) : '---'}). Ask me any question about prices, trends, RSI, or risk rules — I will respond aloud in verbal speech.`,
    },
  ]);
  const [textInput, setTextInput] = useState('');

  // Audio Context & Hardware Refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMicMutedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync ref with state
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  // Ensure AudioContext is running during user gestures to bypass browser autoplay restrictions
  const resumeAudioPlayback = useCallback(() => {
    if (!outputAudioCtxRef.current) {
      try {
        const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAudioCtxRef.current = outCtx;
        nextStartTimeRef.current = outCtx.currentTime;
        const outAnalyser = outCtx.createAnalyser();
        outAnalyser.fftSize = 256;
        outputAnalyserRef.current = outAnalyser;
      } catch (e) {
        console.warn('AudioContext creation error:', e);
      }
    }
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state === 'suspended') {
      outputAudioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  // Query browser permission status if supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then((status) => {
            setPermissionState(status.state as any);
            status.onchange = () => {
              setPermissionState(status.state as any);
            };
          })
          .catch(() => {
            setPermissionState('unknown');
          });
      } catch {
        setPermissionState('unknown');
      }
    }
  }, []);

  // Enumerate connected microphones
  const enumerateMics = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(mics);
      } catch (err) {
        console.warn('Could not enumerate microphones:', err);
      }
    }
  }, []);

  useEffect(() => {
    enumerateMics();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', enumerateMics);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', enumerateMics);
      };
    }
  }, [enumerateMics]);

  // Stop model speech playback
  const stopModelPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsModelSpeaking(false);
  }, []);

  // Play 24kHz PCM audio chunk received from gemini-3.8-live
  const play24kHzAudioChunk = useCallback((base64Audio: string) => {
    resumeAudioPlayback();
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    try {
      const binary = atob(base64Audio);
      const byteLen = binary.length - (binary.length % 2); // Ensure even byte length for 16-bit PCM!
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer, 0, byteLen / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (outputAnalyserRef.current) {
        source.connect(outputAnalyserRef.current);
        outputAnalyserRef.current.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setIsModelSpeaking(true);
      setStatusMessage(`Gemini speaking real-time data for ${currentTicker}...`);

      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx !== -1) activeSourcesRef.current.splice(idx, 1);
        if (activeSourcesRef.current.length === 0) {
          setIsModelSpeaking(false);
          setStatusMessage(isMicAvailable ? 'Listening to your voice... (Speak freely)' : 'Gemini Ready — Ask any question');
        }
      };
    } catch (e) {
      console.warn('Audio decoding error:', e);
    }
  }, [currentTicker, isMicAvailable, resumeAudioPlayback]);

  /**
   * Stop all audio streams, tracks, contexts, and WebSocket connections cleanly
   */
  const stopLiveSession = useCallback(() => {
    stopModelPlayback();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
          wsRef.current.close();
        }
      } catch {}
      wsRef.current = null;
    }

    setIsLiveActive(false);
    setIsConnecting(false);
    setIsUserSpeaking(false);
    setIsModelSpeaking(false);
    setMicVolumeLevel(0);
    setStatusMessage('Live session ended. Click "Start Live & Mic" to reconnect.');
  }, [stopModelPlayback]);

  /**
   * Connect WebSocket if not already connected and bind active market symbol
   */
  const ensureWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsLiveActive(true);
      setIsConnecting(false);
      setStatusMessage(`Gemini 3.8 Live connected! Active symbol: ${currentTicker}`);
      // Prime session with real-time stock context
      ws.send(JSON.stringify({ type: 'init', symbol: currentTicker }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Spoken audio from Gemini Live
        if (data.audio) {
          play24kHzAudioChunk(data.audio);
        }

        // 2. Barge-in interruption
        if (data.interrupted) {
          stopModelPlayback();
          setStatusMessage('Interrupted. Listening to you...');
        }

        // 3. Spoken text transcription
        if (data.modelTranscript) {
          const text = data.modelTranscript.trim();
          if (text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'gemini' && !last.id.includes('complete')) {
                return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + text }];
              }
              return [...prev, { id: 'model-' + Date.now(), sender: 'gemini', text }];
            });
          }
        }

        // 4. User voice transcript
        if (data.userTranscript) {
          const text = data.userTranscript.trim();
          if (text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'user') {
                return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + text }];
              }
              return [...prev, { id: 'user-' + Date.now(), sender: 'user', text }];
            });
          }
        }

        if (data.textFallback) {
          setTranscripts((prev) => [
            ...prev,
            { id: 'fallback-' + Date.now(), sender: 'gemini', text: data.textFallback },
          ]);
        }

        if (data.ready) {
          setIsLiveActive(true);
          setIsConnecting(false);
        }
      } catch {}
    };

    ws.onerror = () => {
      setStatusMessage('Live connection reconnecting...');
    };

    ws.onclose = () => {
      setIsLiveActive(false);
      setIsConnecting(false);
    };

    return ws;
  }, [currentTicker, play24kHzAudioChunk, stopModelPlayback]);

  /**
   * Start Live Session with Microphone
   */
  const startLiveSession = async () => {
    resumeAudioPlayback();
    setErrorNotice(null);
    setIsConnecting(true);
    setStatusMessage('Requesting microphone access and connecting to Live API...');

    let stream: MediaStream | null = null;
    let micGranted = false;

    try {
      stream = await acquireMicrophoneStream(selectedDeviceId);
      mediaStreamRef.current = stream;
      micGranted = true;
      setIsMicAvailable(true);
      setPermissionState('granted');
      enumerateMics();
    } catch (err: any) {
      console.warn('Microphone stream acquisition returned error:', err);
      setIsMicAvailable(false);
      
      const errString = String(err?.message || err?.name || '').toLowerCase();
      const isPermissionDenied = 
        err?.name === 'NotAllowedError' || 
        err?.name === 'PermissionDeniedError' || 
        errString.includes('permission denied') ||
        errString.includes('not allowed');

      if (isPermissionDenied) {
        setPermissionState('denied');
        if (isInIframe) {
          setErrorNotice('Microphone blocked by preview iframe. Open in a dedicated browser tab to enable direct microphone access.');
        } else {
          setErrorNotice('Microphone permission was blocked. Check the padlock icon in your browser address bar.');
        }
      } else {
        setErrorNotice(err?.message || 'Microphone device could not be opened.');
      }

      setStatusMessage('Switched to Live Speech Mode: Gemini will speak responses aloud via audio.');
    }

    try {
      // 1. Setup Output Audio Context (24,000 Hz for Gemini Live speech)
      resumeAudioPlayback();

      // 2. Connect to /live WebSocket
      ensureWebSocket();

      // 3. If microphone was granted, setup audio capture pipeline
      if (micGranted && stream) {
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (inputCtx.state === 'suspended') {
          await inputCtx.resume();
        }
        inputAudioCtxRef.current = inputCtx;

        const inAnalyser = inputCtx.createAnalyser();
        inAnalyser.fftSize = 256;
        inputAnalyserRef.current = inAnalyser;

        const source = inputCtx.createMediaStreamSource(stream);
        source.connect(inAnalyser);

        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        source.connect(processor);

        // Zero-gain isolation node to prevent microphone feedback through speakers
        const muteGain = inputCtx.createGain();
        muteGain.gain.value = 0.0;
        processor.connect(muteGain);
        muteGain.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (isMicMutedRef.current) {
            setMicVolumeLevel(0);
            setIsUserSpeaking(false);
            return;
          }

          const inputChannelData = e.inputBuffer.getChannelData(0);

          let sumSquares = 0;
          for (let i = 0; i < inputChannelData.length; i++) {
            sumSquares += inputChannelData[i] * inputChannelData[i];
          }
          const rms = Math.sqrt(sumSquares / inputChannelData.length);
          const normalizedVolume = Math.min(100, Math.round(rms * 450));
          setMicVolumeLevel(normalizedVolume);

          const isSpeakingNow = rms > 0.015;
          setIsUserSpeaking(isSpeakingNow);

          const downsampled16k = downsampleTo16000(inputChannelData, inputCtx.sampleRate);
          const base64Pcm = floatTo16BitPCM(downsampled16k);

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ audio: base64Pcm }));
          }
        };

        setIsLiveActive(true);
        setIsConnecting(false);
        setStatusMessage(`Live Voice Active! Speak directly to Gemini about ${currentTicker}.`);
      } else {
        setIsLiveActive(true);
        setIsConnecting(false);
      }

    } catch (err: any) {
      console.error('Audio initialization error:', err);
      setIsConnecting(false);
      setIsLiveActive(false);
      setErrorNotice('Audio system initialization failed: ' + (err?.message || err));
      setStatusMessage('Audio error. Please reload or check audio output device.');
    }
  };

  /**
   * Start in Text-to-Speech Mode (Gemini speaks aloud via 24kHz audio)
   */
  const startTextMode = () => {
    resumeAudioPlayback();
    setErrorNotice(null);
    setIsMicAvailable(false);
    setIsConnecting(true);
    setStatusMessage(`Connecting to Gemini 3.8 Live with ${currentTicker} Real-Time Data...`);

    try {
      ensureWebSocket();
      setIsLiveActive(true);
      setIsConnecting(false);
      setStatusMessage(`Gemini Live Connected! Type any question or click a prompt to hear verbal speech.`);
    } catch (err: any) {
      setIsConnecting(false);
      setErrorNotice('Failed to initialize audio output: ' + (err?.message || err));
    }
  };

  // Teardown when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopLiveSession();
      setErrorNotice(null);
    }
    return () => {
      stopLiveSession();
    };
  }, [isOpen, stopLiveSession]);

  // Frequency Waveform Visualizer
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderWave = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      let dataArray: Uint8Array | null = null;
      const isModel = isModelSpeaking;
      const isUser = isUserSpeaking && !isMicMuted && isLiveActive && isMicAvailable;

      if (isModel && outputAnalyserRef.current) {
        const bufferLength = outputAnalyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        outputAnalyserRef.current.getByteTimeDomainData(dataArray as any);
      } else if (isUser && inputAnalyserRef.current) {
        const bufferLength = inputAnalyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        inputAnalyserRef.current.getByteTimeDomainData(dataArray as any);
      }

      ctx.lineWidth = 2.5;
      ctx.beginPath();

      if (dataArray && isLiveActive) {
        const sliceWidth = width / dataArray.length;
        let x = 0;
        ctx.strokeStyle = isModel ? '#818cf8' : '#06b6d4';

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
      } else {
        ctx.strokeStyle = isLiveActive ? '#334155' : '#1e293b';
        const time = Date.now() * 0.0025;
        for (let x = 0; x < width; x++) {
          const y = centerY + Math.sin(x * 0.04 + time) * (isLiveActive ? 3 : 1);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isOpen, isModelSpeaking, isUserSpeaking, isMicMuted, isLiveActive, isMicAvailable]);

  // Send query to Gemini Live with real-time stock context
  const sendQueryToLive = (queryText: string) => {
    if (!queryText.trim()) return;
    resumeAudioPlayback();

    const cleanQuery = queryText.trim();
    setTranscripts((prev) => [
      ...prev,
      { id: 'user-' + Date.now(), sender: 'user', text: cleanQuery },
    ]);

    const ws = ensureWebSocket();
    const payload = JSON.stringify({ 
      text: cleanQuery, 
      symbol: currentTicker 
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      setStatusMessage(`Gemini Live fetching real-time data and answering aloud...`);
    } else {
      const originalOnOpen = ws.onopen;
      ws.onopen = (evt) => {
        if (originalOnOpen) (originalOnOpen as any)(evt);
        ws.send(payload);
        setStatusMessage(`Gemini Live fetching real-time data and answering aloud...`);
      };
    }
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const query = textInput;
    setTextInput('');
    sendQueryToLive(query);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-10 h-10 rounded-xl p-0.5 flex items-center justify-center transition-all ${
              isLiveActive 
                ? 'bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-800'
            }`}>
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className={`w-5 h-5 ${isLiveActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white font-sans">
                  Gemini Live Voice
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                  isLiveActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <Zap className="w-2.5 h-2.5" />
                  <span>{isLiveActive ? (isMicAvailable ? 'VOICE & MIC LIVE' : 'LIVE AUDIO STREAM') : 'STANDBY'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Real-Time Quant Copilot ({currentTicker})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {isInIframe && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Full Browser Tab (Recommended for microphone)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors flex items-center space-x-1 text-xs font-mono"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={() => {
                stopLiveSession();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-Time Market Status Bar */}
        {quote && (
          <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {quote.symbol}
              </span>
              <span className="text-slate-300 font-bold text-sm">
                ${quote.price.toFixed(2)}
              </span>
              <span className={`flex items-center text-xs font-semibold ${quote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {quote.change >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Day: <span className="text-slate-300">${quote.low.toFixed(2)} - ${quote.high.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Visualizer & Dynamic State */}
        <div className="p-5 flex flex-col items-center justify-center space-y-3.5 bg-gradient-to-b from-slate-950/60 to-slate-900 shrink-0">
          <div className="relative w-full max-w-[400px]">
            <canvas
              ref={canvasRef}
              width={400}
              height={85}
              className="w-full h-[85px] bg-slate-950/90 border border-slate-800/80 rounded-2xl shadow-inner"
            />
            {/* Live Indicator Overlay */}
            <div className="absolute top-2.5 right-3 flex items-center space-x-1.5 font-mono text-[10px] bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800 text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  isModelSpeaking
                    ? 'bg-indigo-400 animate-ping'
                    : isUserSpeaking && !isMicMuted && isLiveActive && isMicAvailable
                    ? 'bg-cyan-400 animate-pulse'
                    : isLiveActive
                    ? 'bg-emerald-500'
                    : 'bg-slate-600'
                }`}
              />
              <span>
                {isModelSpeaking
                  ? 'SPEAKING (24kHz)'
                  : isUserSpeaking && !isMicMuted && isLiveActive && isMicAvailable
                  ? 'LISTENING (16kHz)'
                  : isLiveActive
                  ? (isMicAvailable ? 'CONNECTED' : 'SPEECH READY')
                  : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Microphone Propagation Level Meter (when mic is active) */}
          {isLiveActive && isMicAvailable && (
            <div className="w-full max-w-[400px] flex items-center space-x-2 px-1">
              <span className="text-[10px] font-mono text-slate-400 shrink-0">Mic Level:</span>
              <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    isMicMuted
                      ? 'bg-rose-500/50'
                      : micVolumeLevel > 60
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${isMicMuted ? 0 : Math.max(3, micVolumeLevel)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                {isMicMuted ? 'Muted' : `${micVolumeLevel}%`}
              </span>
            </div>
          )}

          {/* Status Text & Friendly Diagnostic Handling */}
          <div className="text-center px-4 max-w-[400px] w-full">
            <p className="font-mono text-xs text-slate-300">
              {statusMessage}
            </p>

            {/* Error or Iframe Warning Card */}
            {errorNotice && (
              <div className="mt-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans text-left space-y-2">
                <div className="flex items-center space-x-1.5 font-semibold text-rose-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Microphone Access Notice</span>
                </div>
                
                {isInIframe ? (
                  <div className="space-y-2">
                    <p className="text-[11px] leading-relaxed text-rose-200">
                      You are previewing inside an <strong>embedded iframe</strong>. Web browsers block microphone access inside iframes by default.
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Full Tab (Unlocks Microphone)</span>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] leading-relaxed text-rose-300/90">
                      The browser blocked microphone access on this domain. To unblock:
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5 pl-1">
                      <li>Click the <strong>padlock or site settings icon</strong> on the left side of your browser address bar.</li>
                      <li>Change <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                      <li>Click <strong>Retry Microphone</strong> below.</li>
                    </ol>
                  </div>
                )}

                <div className="pt-1 flex items-center space-x-2 border-t border-rose-500/20">
                  <button
                    onClick={startLiveSession}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] font-mono flex items-center space-x-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Microphone</span>
                  </button>
                  <button
                    onClick={() => setShowDeviceSelector((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                  >
                    Select Device
                  </button>
                  <button
                    onClick={() => setErrorNotice(null)}
                    className="text-[11px] text-slate-400 hover:text-white underline transition-colors ml-auto"
                  >
                    Dismiss
                  </button>
                </div>

                {showDeviceSelector && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">Select Input Device:</label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value="default">Default System Microphone</option>
                      {audioDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Microphone ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Controls: START LIVE AND MIC BUTTON or ACTIVE CONTROLS */}
          {!isLiveActive ? (
            <div className="w-full max-w-[400px] pt-1 space-y-2">
              <button
                onClick={startLiveSession}
                disabled={isConnecting}
                className="w-full flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:from-emerald-400 hover:via-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <Mic className="w-4 h-4" />
                <span>{isConnecting ? 'Initializing Live Audio...' : 'Start Live & Mic'}</span>
              </button>

              <button
                onClick={startTextMode}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-all"
              >
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Text Mode (Gemini Speaks Real-Time Data Aloud)</span>
              </button>
            </div>
          ) : (
            /* Active Live Session Controls */
            <div className="flex items-center space-x-3 pt-1">
              {isMicAvailable ? (
                <button
                  onClick={() => setIsMicMuted((prev) => !prev)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                    isMicMuted
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/20 shadow-lg'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {isMicMuted ? (
                    <>
                      <MicOff className="w-4 h-4 text-rose-400" />
                      <span>Mic Muted</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>Mic Streaming</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={startLiveSession}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>Retry Mic</span>
                </button>
              )}

              {/* Interrupt / Stop */}
              <button
                onClick={stopModelPlayback}
                title="Interrupt Gemini speech"
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition-colors"
              >
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Interrupt</span>
              </button>

              {/* Stop Live Session Button */}
              <button
                onClick={stopLiveSession}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-rose-300" />
                <span>End Live</span>
              </button>
            </div>
          )}

          {/* Quick Voice Prompt Chips with Instant Real-Time Answers */}
          <div className="w-full max-w-[400px] flex items-center space-x-1.5 overflow-x-auto py-1 text-[11px] font-mono no-scrollbar">
            <span className="text-slate-500 shrink-0 text-[10px]">Ask:</span>
            {[
              `What is ${currentTicker} price?`,
              `What is ${currentTicker} RSI?`,
              `Is ${currentTicker} a buy?`,
              `Risk size for ${currentTicker}`,
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => sendQueryToLive(chip)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Volume2 className="w-3 h-3 text-cyan-400" />
                <span>{chip}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Conversation Transcript */}
        <div className="px-6 py-2 flex-1 overflow-y-auto space-y-2 border-t border-slate-800/60 font-sans text-xs min-h-[120px]">
          {transcripts.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-xl transition-all ${
                t.sender === 'user'
                  ? 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 ml-8'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 mr-8'
              }`}
            >
              <span className="font-bold text-[10px] block text-slate-400 font-mono mb-1">
                {t.sender === 'user' ? 'You' : 'Gemini 3.8 Live'}
              </span>
              <p className="whitespace-pre-wrap leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>

        {/* Direct Text Prompt Input */}
        <form
          onSubmit={handleSendPrompt}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2 shrink-0"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              isMicAvailable
                ? `Speak into mic or ask about ${currentTicker} price, RSI, risk...`
                : `Ask any question for ${currentTicker} (Gemini speaks response aloud)...`
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
