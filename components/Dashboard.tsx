import React, { useState, useMemo, useEffect } from 'react';
import { AnalyticsSummary, PlayHistoryItem, TopItem } from '../types';
import {
  HourlyActivityChart, WeeklyActivityChart, MediaTypePieChart, MonthlyTrendChart
} from './Charts';
import { Reports } from './Reports';
import { Clock, Calendar, Film, Tv, Sparkles, LayoutDashboard, FileBarChart, Play } from 'lucide-react';
import { generateInsight } from '../services/geminiService';
import { APP_COLORS } from '../constants';
import { processHistoryData } from '../services/dataProcessing';
import { MediaTypeOption, MediaTypeSelector, UserFilterDropdown } from './FilterControls';

interface DashboardProps {
  summary: AnalyticsSummary;
  rawData: PlayHistoryItem[];
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, rawData, onReset }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaTypeOption>('all');
  const [apiKeyHint, setApiKeyHint] = useState<string | null>(null);

  const users = useMemo(() => {
    const unique = new Set<string>();
    rawData.forEach((d) => {
      if (d.user) unique.add(d.user);
    });
    return Array.from(unique).sort();
  }, [rawData]);

  useEffect(() => {
    if (selectedUser !== 'all' && !users.includes(selectedUser)) {
      setSelectedUser('all');
    }
  }, [users, selectedUser]);

  const filteredData = useMemo(() => {
    let filtered = rawData;

    if (selectedUser !== 'all') {
      filtered = filtered.filter((item) => item.user === selectedUser);
    }

    if (selectedMediaType === 'movie') {
      filtered = filtered.filter((item) => item.type === 'movie');
    } else if (selectedMediaType === 'episode') {
      filtered = filtered.filter((item) => item.type === 'episode');
    }

    return filtered;
  }, [rawData, selectedUser, selectedMediaType]);

  const filteredSummary = useMemo(() => {
    if (filteredData.length === rawData.length) return summary;
    return processHistoryData(filteredData);
  }, [filteredData, rawData.length, summary]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('geminiApiKey');
      if (stored) {
        setApiKeyHint('Custom key saved');
      }
    }
  }, []);

  const handleGetInsight = async () => {
    setLoadingInsight(true);
    const text = await generateInsight(filteredSummary);
    setInsight(text);
    setLoadingInsight(false);
  };

  const handleApiKeyUpdate = () => {
    const value = window.prompt('Enter your Gemini API Key (kept locally in this browser)');
    if (value) {
      localStorage.setItem('geminiApiKey', value.trim());
      setApiKeyHint('Custom key saved');
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      
      {/* iOS Style Segmented Control Navigation */}
      <div className="sticky top-20 z-40 py-6 bg-black/80 backdrop-blur-xl">
        <div className="flex justify-between items-center">
            {/* Segmented Control */}
            <div className="bg-[#1C1C1E] p-1 rounded-xl flex items-center shadow-inner border border-white/5 w-full max-w-sm">
            <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'overview' 
                    ? 'bg-[#3A3A3C] text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
            >
                <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'reports' 
                    ? 'bg-[#3A3A3C] text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
            >
                <FileBarChart className="w-4 h-4" /> Reports
            </button>
            </div>

            <button
                onClick={onReset}
                className="hidden sm:block text-xs font-medium text-gray-500 hover:text-[#e5a00d] transition-colors"
            >
                Switch Source
            </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <MediaTypeSelector selected={selectedMediaType} onSelect={setSelectedMediaType} />
            <UserFilterDropdown users={users} selected={selectedUser} onSelect={setSelectedUser} />
          </div>
          {filteredData.length === 0 && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">No plays match these filters.</p>
          )}
        </div>
      </div>

      {activeTab === 'reports' ? (
        <Reports
          data={filteredData}
          selectedUser={selectedUser}
          selectedMediaType={selectedMediaType}
        />
      ) : (
        <div className="animate-fade-in space-y-6">
          
          {/* Hero Section: Von Restorff Effect (Isolation) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             <div className="col-span-1 md:col-span-8 glass-card rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <Play className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-gray-400 font-medium text-lg mb-1">Total Watch Time</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl sm:text-7xl font-black text-white tracking-tighter">
                            {filteredSummary.totalDurationHours.toLocaleString()}
                        </span>
                        <span className="text-xl text-[#e5a00d] font-bold">hours</span>
                    </div>
                    <div className="mt-4 text-gray-400">
                        Across <span className="text-white font-bold">{filteredSummary.totalPlays.toLocaleString()}</span> plays
                    </div>
                </div>
             </div>

             {/* AI Insight Card */}
             <div 
                onClick={handleGetInsight}
                className="col-span-1 md:col-span-4 rounded-3xl p-1 bg-gradient-to-br from-[#e5a00d] to-[#b47d0b] shadow-xl cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
             >
                <div className="bg-[#121212] h-full w-full rounded-[20px] p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5a00d] opacity-10 blur-[50px] rounded-full"></div>
                    
                    <div className="flex items-center gap-2 mb-4 justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-[#e5a00d] text-black p-2 rounded-lg">
                              <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">AI Analysis</h3>
                            {apiKeyHint && <p className="text-[11px] text-gray-400">{apiKeyHint}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleApiKeyUpdate}
                          className="text-xs font-bold text-black bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                        >
                          Set API Key
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {loadingInsight ? (
                            <div className="flex items-center gap-3 text-[#e5a00d]">
                                <div className="w-2 h-2 bg-[#e5a00d] rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-[#e5a00d] rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-[#e5a00d] rounded-full animate-bounce delay-200"></div>
                            </div>
                        ) : insight ? (
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 line-clamp-6 leading-relaxed">
                                {insight}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">
                                Tap here to let Gemini analyze your viewing habits and give you a vibe check.
                            </p>
                        )}
                    </div>
                </div>
             </div>
          </div>

          {/* Bento Grid Layout - Miller's Law (Chunking) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Chart: Activity Over Time */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Clock className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Hourly Activity</h3>
                </div>
                <HourlyActivityChart summary={filteredSummary} />
            </div>

            {/* Chart: Media Mix */}
            <div className="glass-card rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Film className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Format Distribution</h3>
                </div>
                <div className="flex-1 min-h-0">
                    <MediaTypePieChart summary={filteredSummary} />
                </div>
            </div>

             {/* Chart: Monthly Trend */}
             <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Calendar className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Monthly Trend</h3>
                </div>
                <MonthlyTrendChart summary={filteredSummary} />
            </div>

            {/* Chart: Weekly Habits */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Calendar className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Weekly Habits</h3>
                </div>
                <WeeklyActivityChart summary={filteredSummary} />
            </div>
          </div>

          {/* Top Lists - Miller's Law (Limit items displayed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TopListCard title="Top Movies" items={filteredSummary.topMovies} icon={<Film className="w-5 h-5 text-blue-400"/>} />
            <TopListCard title="Top Shows" items={filteredSummary.topShows} icon={<Tv className="w-5 h-5 text-green-400"/>} />
          </div>

        </div>
      )}
    </div>
  );
};

type SortOption = 'count' | 'duration' | 'recent';

const TopListCard = ({ title, items, icon }: { title: string, items: TopItem[], icon: React.ReactNode }) => {
  const [sort, setSort] = useState<SortOption>('count');

  // Miller's Law: Don't overwhelm. Show top 5 initially.
  // We can add a "Show More" later if needed, but 10 is max for this dashboard view.
  const sortedItems = [...items].sort((a, b) => {
    if (sort === 'count') return b.count - a.count;
    if (sort === 'duration') return b.totalDurationMinutes - a.totalDurationMinutes;
    if (sort === 'recent') return b.lastWatched.getTime() - a.lastWatched.getTime();
    return 0;
  }).slice(0, 5);

  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <div className="bg-gray-800/50 p-2 rounded-lg">{icon}</div>
            <h3 className="font-bold text-lg">{title}</h3>
        </div>
        
        {/* Sort Controls - Tiny Segmented Control */}
        <div className="flex bg-[#2C2C2E] p-1 rounded-lg">
           <button 
             onClick={() => setSort('count')}
             className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${sort === 'count' ? 'bg-[#636366] text-white shadow' : 'text-gray-400'}`}
           >
             Plays
           </button>
           <button 
             onClick={() => setSort('duration')}
             className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${sort === 'duration' ? 'bg-[#636366] text-white shadow' : 'text-gray-400'}`}
           >
             Time
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedItems.length > 0 ? sortedItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between group p-2 hover:bg-white/5 rounded-xl transition-colors -mx-2">
            <div className="flex items-center gap-4 overflow-hidden">
              <span className={`
                w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-sm font-bold shadow-inner
                ${i === 0 ? 'bg-[#e5a00d] text-black' : 'bg-gray-800 text-gray-400'}
              `}>
                {i + 1}
              </span>
              <div className="flex flex-col overflow-hidden">
                  <span className="text-gray-200 font-medium text-sm group-hover:text-white transition-colors truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-500">
                     {sort === 'recent' ? `Last watched ${item.lastWatched.toLocaleDateString()}` : ''}
                     {sort === 'duration' ? `${Math.round(item.totalDurationMinutes/60)} hrs` : ''}
                     {sort === 'count' ? 'Most played' : ''}
                  </span>
              </div>
            </div>
            <span className="text-sm text-gray-400 font-mono ml-2 whitespace-nowrap bg-black/20 px-2 py-1 rounded-md">
               {sort === 'duration' 
                  ? `${item.totalDurationMinutes}m` 
                  : `${item.count}`
               }
            </span>
          </div>
        )) : (
          <div className="text-center text-gray-500 py-8 text-sm">No items found</div>
        )}
      </div>
    </div>
  );
};