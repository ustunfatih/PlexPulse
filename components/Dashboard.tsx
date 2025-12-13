
import React, { useState } from 'react';
import { AnalyticsSummary, PlayHistoryItem, TopItem } from '../types';
import {
  HourlyActivityChart, WeeklyActivityChart, MediaTypePieChart, MonthlyTrendChart, DurationDistributionChart, DailyTrendChart,
  UserComparisonChart, UserStatsTable
} from './Charts';
import { Reports } from './Reports';
import { Clock, Calendar, Film, Tv, Sparkles, LayoutDashboard, FileBarChart, Play, Hourglass, PieChart, TrendingUp, Download, Users } from 'lucide-react';
import { exportToCSV, exportSummaryToCSV } from '../services/exportService';
import { APP_COLORS } from '../constants';
import { calculateUserComparisons } from '../services/dataProcessing';
import { ImprovementIdeas } from './ImprovementIdeas';
import { buildImprovementIdeas } from '../services/insightsService';

interface DashboardProps {
  summary: AnalyticsSummary;
  rawData: PlayHistoryItem[];
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, rawData, onReset }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const userComparisons = React.useMemo(() => calculateUserComparisons(rawData), [rawData]);
  const improvementIdeas = React.useMemo(() => buildImprovementIdeas(summary), [summary]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      
      {/* iOS Style Segmented Control Navigation */}
      <div className="sticky top-16 z-40 py-6">
        <div className="flex justify-between items-center">
            {/* Segmented Control */}
            <div className="bg-[#1C1C1E] p-1 rounded-xl flex items-center shadow-inner border border-white/5 w-full max-w-sm backdrop-blur-md">
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportSummaryToCSV(summary)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] hover:bg-[#3A3A3C] border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all"
                title="Export summary to CSV"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button 
                onClick={onReset}
                className="hidden sm:block text-xs font-medium text-gray-500 hover:text-[#e5a00d] transition-colors"
              >
                Switch Source
              </button>
            </div>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <Reports data={rawData} />
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
                            {summary.totalDurationHours.toLocaleString()}
                        </span>
                        <span className="text-xl text-[#e5a00d] font-bold">hours</span>
                    </div>
                    <div className="mt-4 text-gray-400">
                        Across <span className="text-white font-bold">{summary.totalPlays.toLocaleString()}</span> plays
                    </div>
                </div>
             </div>

             {/* Time Investment Chart (Replaces AI Analysis) */}
             <div className="col-span-1 md:col-span-4 glass-card rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Hourglass className="w-5 h-5 text-blue-400" /></div>
                    <div>
                        <h3 className="font-bold text-lg text-white">Time Investment</h3>
                        <p className="text-xs text-gray-500">Duration by format</p>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <DurationDistributionChart summary={summary} />
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
                <HourlyActivityChart summary={summary} />
            </div>

            {/* Chart: Media Mix */}
            <div className="glass-card rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Film className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Play Counts</h3>
                </div>
                <div className="flex-1 min-h-0">
                    <MediaTypePieChart summary={summary} />
                </div>
            </div>

             {/* Chart: Monthly Trend */}
             <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Calendar className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Monthly Trend</h3>
                </div>
                <MonthlyTrendChart summary={summary} />
            </div>

            {/* Chart: Daily Trend */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-6">
                <DailyTrendSection summary={summary} />
            </div>

            {/* Chart: Weekly Habits */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gray-800/50 p-2 rounded-lg"><Calendar className="w-5 h-5 text-[#e5a00d]" /></div>
                    <h3 className="font-bold text-lg">Weekly Habits</h3>
                </div>
                <WeeklyActivityChart summary={summary} />
            </div>
          </div>

          {/* Top Lists - Miller's Law (Limit items displayed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TopListCard title="Top Movies" items={summary.topMovies} icon={<Film className="w-5 h-5 text-blue-400"/>} />
            <TopListCard title="Top Shows" items={summary.topShows} icon={<Tv className="w-5 h-5 text-green-400"/>} />
          </div>

          {/* User Comparison Section */}
          {userComparisons.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gray-800/50 p-2 rounded-lg"><Users className="w-5 h-5 text-[#e5a00d]" /></div>
                  <h3 className="font-bold text-lg">User Comparison</h3>
                </div>
                <UserComparisonChart users={userComparisons} />
              </div>
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gray-800/50 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-400" /></div>
                  <h3 className="font-bold text-lg">User Stats</h3>
                </div>
                <UserStatsTable users={userComparisons} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <ImprovementIdeas ideas={improvementIdeas} />
          </div>

        </div>
      )}
    </div>
  );
};

type SortOption = 'count' | 'duration' | 'recent';

const DailyTrendSection: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  const [days, setDays] = useState<30 | 90>(30);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gray-800/50 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-[#e5a00d]" /></div>
          <h3 className="font-bold text-lg">Daily Trend</h3>
        </div>
        <div className="flex bg-[#1C1C1E] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              days === 30 ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              days === 90 ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>
      <DailyTrendChart summary={summary} days={days} />
    </>
  );
};

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
