import React, { useState } from 'react';
import { LogIn, LogOut, ShieldCheck, ChevronDown, User, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';

export const UserAuthButton: React.FC = () => {
  const { user, isGuest, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse border border-slate-700/60 flex items-center justify-center">
        <User className="w-4 h-4 text-slate-500 animate-pulse" />
      </div>
    );
  }

  const name = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Trader');
  const avatar = user?.photoURL;

  return (
    <>
      <div className="relative flex items-center space-x-2">
        {/* If user is Guest Trader, show a prominent direct Sign In button right on the Navbar */}
        {isGuest && (
          <button
            onClick={() => {
              setAuthModalTab('login');
              setAuthModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border border-cyan-400/40 shadow-sm shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* User Account / Guest Status Badge */}
        {user ? (
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border transition-all text-left cursor-pointer ${
              isGuest 
                ? 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/70' 
                : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40'
            }`}
          >
            {avatar ? (
              <img src={avatar} alt={name} className="w-6 h-6 rounded-full border border-cyan-500/40" />
            ) : (
              <div className={`w-6 h-6 rounded-full font-bold font-mono text-xs flex items-center justify-center border shrink-0 ${
                isGuest 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-white leading-none">
                {name}
              </span>
              <span className={`text-[9px] font-mono leading-none mt-1 flex items-center space-x-1 ${
                isGuest ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                  isGuest ? 'bg-amber-400' : 'bg-emerald-400'
                }`}></span>
                <span>{isGuest ? 'Guest Mode' : 'Authenticated'}</span>
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => {
                setAuthModalTab('signup');
                setAuthModalOpen(true);
              }}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        {/* Dropdown Menu for User / Guest */}
        {dropdownOpen && user && (
          <div className="absolute right-0 top-11 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-2.5 pb-2.5 mb-2 border-b border-slate-800">
              {avatar ? (
                <img src={avatar} alt={name} className="w-9 h-9 rounded-full border border-cyan-500/40" />
              ) : (
                <div className={`w-9 h-9 rounded-full font-bold font-mono text-sm flex items-center justify-center border ${
                  isGuest ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate">{name}</span>
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  {user.email || `UID: ${user.uid.slice(0, 10)}...`}
                </span>
              </div>
            </div>

            {isGuest ? (
              <div className="space-y-2 mb-2">
                <div className="px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Currently in Temporary Guest Session</span>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setAuthModalTab('login');
                    setAuthModalOpen(true);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Register Account</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-2 py-1.5 mb-2.5 rounded bg-slate-800/60 border border-slate-700/50 text-[11px] text-emerald-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Authenticated Firebase Session</span>
              </div>
            )}

            <button
              onClick={async () => {
                await logout();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isGuest ? 'Clear Guest Session' : 'Sign Out'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
};
