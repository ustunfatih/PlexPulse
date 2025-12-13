
import React, { useState, useEffect } from 'react';
import { PlayHistoryItem, AnalyticsSummary } from './types';
import { processHistoryData, generateMockData } from './services/dataProcessing';
import { PlexConnect } from './components/PlexConnect';
import { Dashboard } from './components/Dashboard';
import { Activity, HelpCircle, X, Server, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<PlayHistoryItem[] | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (data) {
      const result = processHistoryData(data);
      setSummary(result);
    }
  }, [data]);

  const handleDemo = () => {
    const mock = generateMockData();
    setData(mock);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 font-sans selection:bg-[#e5a00d] selection:text-black overflow-x-hidden">
      
      {/* Global Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#e5a00d] opacity-[0.05] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600 opacity-[0.05] blur-[120px] rounded-full"></div>
      </div>

      {/* Navigation - App Header */}
      <nav className="fixed top-0 w-full z-50 bg-[#000000]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#e5a00d] to-[#b47d0b] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Activity className="text-black w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">PlexPulse</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-16">
        {!summary || !data ? (
          <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-8">
             <div className="text-center mb-10 space-y-4 max-w-2xl animate-fade-in-up">
               <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight">
                 Visualize your <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e5a00d] to-yellow-200">obsession</span>.
               </h1>
               <p className="text-xl text-gray-400 font-light max-w-lg mx-auto leading-relaxed">
                 Deep insights into your Plex habits. <br className="hidden sm:block"/>Connect your server to begin.
               </p>
             </div>

             {/* Content Area */}
             <div className="w-full flex justify-center animate-fade-in delay-100 mb-8">
                 <PlexConnect 
                    onDataLoaded={setData} 
                 />
             </div>

             <div className="flex items-center gap-4 animate-fade-in delay-200">
                <button 
                  onClick={handleDemo}
                  className="group flex items-center gap-2 px-6 py-2 rounded-full text-gray-500 hover:text-white transition-colors text-sm font-medium"
                >
                  No data? Try the demo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                </button>
             </div>
          </div>
        ) : (
          <Dashboard summary={summary} rawData={data} onReset={() => { setData(null); setSummary(null); }} />
        )}
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="glass-card max-w-lg w-full rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold">Getting Started</h3>
              <button onClick={() => setShowHelp(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 text-gray-300">
              <div className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5">
                 <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#e5a00d]" /> Direct Connection
                 </h4>
                 <p className="text-sm text-gray-400 leading-relaxed">
                   Enter your <strong>Plex Server URL</strong> and <strong>Token</strong>. 
                   <br/>The app will automatically attempt to bypass any firewalls or browser restrictions.
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
