import React from 'react';
import { X, Download, ImageIcon, Video, CheckCircle2, Sparkles } from 'lucide-react';

interface ImageVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'image' | 'video' | null;
  mediaUrl: string | null;
  title: string;
  symbol: string;
}

export const ImageVideoModal: React.FC<ImageVideoModalProps> = ({
  isOpen,
  onClose,
  type,
  mediaUrl,
  title,
  symbol,
}) => {
  if (!isOpen || !mediaUrl || !type) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `${symbol}_${type === 'image' ? 'Trading_Card' : 'Chart_Video'}_${Date.now()}.${type === 'image' ? 'png' : 'webm'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              {type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  100% Free Client-Side
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Generated locally using HTML5 Canvas &amp; MediaRecorder
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="mb-6 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 min-h-[280px]">
          {type === 'image' ? (
            <img
              src={mediaUrl}
              alt="Generated Trading Card"
              className="w-full h-auto max-h-[420px] object-contain rounded-lg shadow-lg"
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              autoPlay
              loop
              className="w-full h-auto max-h-[420px] object-contain rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready for download / sharing!</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download {type === 'image' ? 'PNG Image' : 'WebM Video'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
