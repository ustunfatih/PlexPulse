
import React, { useState } from 'react';
import { Server, Key, AlertCircle, Loader2, ExternalLink, ShieldAlert, Trash2, Eye, EyeOff } from 'lucide-react';
import { fetchPlexHistory } from '../services/plexService';
import { PlayHistoryItem } from '../types';

interface PlexConnectProps {
  onDataLoaded: (data: PlayHistoryItem[]) => void;
}

export const PlexConnect: React.FC<PlexConnectProps> = ({ onDataLoaded }) => {
  const [url, setUrl] = useState(() => {
    return process.env.PLEX_SERVER_URL || localStorage.getItem('plex_url') || '';
  });
  
  const [token, setToken] = useState(() => {
    return process.env.PLEX_TOKEN || localStorage.getItem('plex_token') || '';
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const hasSavedCredentials = !!localStorage.getItem('plex_url') || !!localStorage.getItem('plex_token');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) {
      setError("Please provide both Server URL and Token");
      return;
    }

    if (!process.env.PLEX_SERVER_URL) localStorage.setItem('plex_url', url);
    if (!process.env.PLEX_TOKEN) localStorage.setItem('plex_token', token);

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPlexHistory(url, token);
      if (data.length === 0) {
         setError("Connection successful, but no history found. Try watching something!");
      } else {
         onDataLoaded(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCredentials = () => {
    localStorage.removeItem('plex_url');
    localStorage.removeItem('plex_token');
    
    if (!process.env.PLEX_SERVER_URL) setUrl('');
    if (!process.env.PLEX_TOKEN) setToken('');
    
    setError("Credentials cleared from browser storage.");
    setTimeout(() => setError(null), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto glass-card rounded-3xl p-1">
      <div className="bg-[#15171C] rounded-[22px] border border-white/5 p-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#e5a00d] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Server className="w-6 h-6 text-black" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Connect Server</h3>
                    <p className="text-gray-400 text-sm">Direct API connection</p>
                </div>
            </div>
            
            {hasSavedCredentials && (
                <button 
                    onClick={handleClearCredentials}
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all hover:bg-red-500/20"
                    title="Clear credentials from browser storage"
                >
                    <Trash2 className="w-3 h-3" /> Forget
                </button>
            )}
        </div>

        <form onSubmit={handleConnect} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Server URL</label>
            <div className="relative group">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://192.168.1.x:32400"
                className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 pl-11 text-white placeholder-gray-600 focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none transition-all font-mono text-sm"
              />
              <Server className="w-4 h-4 text-gray-500 absolute left-4 top-4.5 group-focus-within:text-[#e5a00d] transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">X-Plex-Token</label>
               <a 
                 href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/" 
                 target="_blank" 
                 rel="noreferrer"
                 className="text-xs text-[#e5a00d] hover:text-white transition-colors flex items-center gap-1"
               >
                 Find Token <ExternalLink className="w-3 h-3" />
               </a>
            </div>
            <div className="relative group">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your token here..."
                className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 pl-11 pr-12 text-white placeholder-gray-600 focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none transition-all font-mono text-sm"
              />
              <Key className="w-4 h-4 text-gray-500 absolute left-4 top-4.5 group-focus-within:text-[#e5a00d] transition-colors" />
              
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors focus:outline-none"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e5a00d] hover:bg-[#ffb319] text-black py-4 rounded-xl font-bold text-base transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connect & Analyze"}
          </button>
        </form>
        
        {error && (
          <div className="mt-8 animate-fade-in">
              <div className="bg-[#1C1C1E] border border-red-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-red-500/20 p-2 rounded-lg">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Connection Failed</h4>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
