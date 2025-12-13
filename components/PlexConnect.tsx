import React, { useState } from 'react';
import {
  Server,
  Key,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { fetchPlexHistory, PlexServiceError } from '../services/plexService';
import { PlayHistoryItem } from '../types';

interface PlexConnectProps {
  onDataLoaded: (data: PlayHistoryItem[]) => void;
  onSwitchToCSV: () => void;
}

const getInitialValue = (envValue: string | undefined, storageKey: string) => {
  if (envValue) return envValue;
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(storageKey) || '';
  } catch (error) {
    return '';
  }
};

export const PlexConnect: React.FC<PlexConnectProps> = ({ onDataLoaded, onSwitchToCSV }) => {
  const envUrl = import.meta.env.VITE_PLEX_SERVER_URL as string | undefined;
  const envToken = import.meta.env.VITE_PLEX_TOKEN as string | undefined;

  const [url, setUrl] = useState(() => getInitialValue(envUrl, 'plex_url'));
  const [token, setToken] = useState(() => getInitialValue(envToken, 'plex_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const hasSavedCredentials = (() => {
    if (typeof window === 'undefined') return false;
    try {
      return !!localStorage.getItem('plex_url') || !!localStorage.getItem('plex_token');
    } catch (storageError) {
      return false;
    }
  })();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) {
      setError('Please provide both Server URL and Token');
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        if (!envUrl) localStorage.setItem('plex_url', url);
        if (!envToken) localStorage.setItem('plex_token', token);
      } catch (storageError) {
        console.warn('Unable to persist credentials', storageError);
      }
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Contacting Plex server...');

    try {
      const data = await fetchPlexHistory(url, token);
      setStatusMessage(null);

      if (data.length === 0) {
        setError('Connection successful, but no history found. Try watching something!');
      } else {
        onDataLoaded(data);
      }
    } catch (err: unknown) {
      setStatusMessage(null);
      if (err instanceof PlexServiceError) {
        setError(err.message);
      } else {
        setError('Unexpected error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearCredentials = () => {
    try {
      localStorage.removeItem('plex_url');
      localStorage.removeItem('plex_token');
    } catch (storageError) {
      console.warn('Unable to clear saved credentials', storageError);
    }

    if (!envUrl) setUrl('');
    if (!envToken) setToken('');

    setError('Credentials cleared from browser storage.');
    setTimeout(() => setError(null), 2000);
  };

  const isMixedContentError = error?.includes('HTTP Plex servers');
  const isCorsError = isMixedContentError || error === 'CORS_BLOCK' || error?.includes('Network blocked');

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
                type={showToken ? 'text' : 'password'}
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect & Analyze'}
          </button>

          {statusMessage && (
            <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}
        </form>

        {error && (
          <div className="mt-8 animate-fade-in">
            {isCorsError ? (
              <div className="bg-[#1C1C1E] border border-orange-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-500/20 p-2 rounded-lg">
                    <ShieldAlert className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Direct Access Blocked</h4>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                      {isMixedContentError ? (
                        <>Browsers block insecure <code>http://</code> requests while this site runs over <code>https://</code>. Please expose Plex over HTTPS, use a secure reverse proxy, or open the app from an HTTP host within your network.</>
                      ) : (
                        <>Your browser is blocking the connection to <strong>{url}</strong> because the server is not configured to allow third-party apps (CORS).</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-lg p-4 border border-white/5 flex flex-col items-center text-center space-y-3">
                  <p className="text-gray-300 text-sm font-medium">
                    Don't worry! You can still use the app by uploading a history file.
                  </p>
                  <button
                    onClick={onSwitchToCSV}
                    className="w-full flex items-center justify-center gap-2 bg-[#e5a00d]/10 hover:bg-[#e5a00d]/20 text-[#e5a00d] border border-[#e5a00d]/50 py-3 rounded-xl font-bold transition-all text-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Switch to CSV Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-red-200 bg-red-900/20 border border-red-500/10 p-4 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">
                    {error === 'Credentials cleared from browser storage.' ? 'Success' : 'Error'}
                  </p>
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
