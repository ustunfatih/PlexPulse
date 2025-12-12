import React, { useState, useEffect } from 'react';
import { Server, Key, AlertCircle, Loader2, ExternalLink, ShieldAlert, Globe, FileSpreadsheet, RefreshCw, CheckCircle2 } from 'lucide-react';
import { fetchPlexHistory } from '../services/plexService';
import { PlayHistoryItem } from '../types';

interface PlexConnectProps {
  onDataLoaded: (data: PlayHistoryItem[]) => void;
}

export const PlexConnect: React.FC<PlexConnectProps> = ({ onDataLoaded }) => {
  // Initialize state from Local Storage if available, otherwise default to empty string
  const [url, setUrl] = useState(() => localStorage.getItem('plex_url') || '');
  const [token, setToken] = useState(() => localStorage.getItem('plex_token') || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) {
      setError("Please provide both Server URL and Token");
      return;
    }

    // Persist credentials to Local Storage for future visits
    localStorage.setItem('plex_url', url);
    localStorage.setItem('plex_token', token);

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

  const isNetworkError = error?.includes("Network Error") || error?.includes("Failed to fetch");
  const isMixedContent = isNetworkError && window.location.protocol === 'https:' && url.startsWith('http:');

  return (
    <div className="w-full max-w-xl mx-auto glass-card rounded-3xl p-1">
      <div className="bg-[#15171C] rounded-[22px] border border-white/5 p-8">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#e5a00d] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Server className="w-6 h-6 text-black" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">Connect Server</h3>
                <p className="text-gray-400 text-sm">Direct API connection</p>
            </div>
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
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your token here..."
                className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 pl-11 text-white placeholder-gray-600 focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none transition-all font-mono text-sm"
              />
              <Key className="w-4 h-4 text-gray-500 absolute left-4 top-4.5 group-focus-within:text-[#e5a00d] transition-colors" />
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
        
        {/* Advanced Error Troubleshooting */}
        {error && (
          <div className="mt-8 animate-fade-in">
            {isNetworkError ? (
              <div className="bg-[#1C1C1E] border border-red-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-red-500/20 p-2 rounded-lg">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Connection Blocked by Browser</h4>
                    <p className="text-gray-400 text-xs mt-1">
                      {isMixedContent 
                        ? "Mixed Content Error: You cannot connect to an insecure HTTP server from this HTTPS page."
                        : "SSL/CORS Error: The browser blocked the connection to your server."
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-lg p-4 border border-white/5 space-y-3">
                  <p className="text-gray-300 text-xs font-bold uppercase tracking-wider">How to fix it:</p>
                  
                  {isMixedContent ? (
                    <div className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="bg-gray-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">1</span>
                      <p>
                        Click the lock icon in your browser address bar › Site Settings › <strong>Insecure Content</strong> › Allow. Then refresh the page.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="flex items-start gap-3 text-sm text-gray-300">
                        <span className="bg-gray-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">1</span>
                        <p>Click the button below. It will open a new tab.</p>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-gray-300">
                        <span className="bg-gray-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">2</span>
                        <div className="space-y-2">
                            <p>If you see a warning, click <strong>Advanced</strong> › <strong>Proceed (unsafe)</strong>.</p>
                            <div className="bg-green-900/20 border border-green-500/20 p-3 rounded-lg flex gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <p className="text-green-100 text-xs leading-relaxed">
                                    If you see a page saying <strong>"This XML file does not appear to have any style information"</strong>, that means <strong>IT WORKED!</strong> Close that tab and come back here.
                                </p>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-gray-300">
                        <span className="bg-gray-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0">3</span>
                        <p>Click "Connect & Analyze" again.</p>
                      </div>
                      
                      <a 
                        href={`${url}/status/sessions/history/all?X-Plex-Token=${token}&limit=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-bold transition-all border border-white/10"
                      >
                         <Globe className="w-4 h-4" /> Verify Connection (Authorize SSL)
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                   <p className="text-xs text-gray-500">Still not working?</p>
                   <button 
                     onClick={() => document.getElementById('switch-to-csv')?.click()}
                     className="text-[#e5a00d] text-xs font-bold hover:underline flex items-center gap-1"
                   >
                     Try CSV Upload <FileSpreadsheet className="w-3 h-3" />
                   </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-red-200 bg-red-900/20 border border-red-500/10 p-4 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Error</p>
                  <p className="opacity-80">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};