import React, { useMemo, useState, useEffect } from 'react';
import { PlayHistoryItem } from '../types';
import { processReports, generateMonthlyHeatmap } from '../services/dataProcessing';
import { ActivityHeatmap } from './Charts';
import { Calendar, Flame, Clock, ChevronLeft, ChevronRight, Zap, Users, ChevronDown, Grid, LayoutGrid, Info, Image as ImageIcon, Loader2, Maximize2, Clapperboard, Tv, Film } from 'lucide-react';
import { generateYearlyRecap } from '../services/geminiService';
import { APP_COLORS } from '../constants';

interface ReportsProps {
  data: PlayHistoryItem[];
}

export const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'movie' | 'episode'>('all');
  const [yearIndex, setYearIndex] = useState(0);
  
  // Heatmap State
  const [heatmapMode, setHeatmapMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState<number>(0); 

  // Poster State
  const [yearlyPoster, setYearlyPoster] = useState<string | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);

  // Extract unique users
  const users = useMemo(() => {
    const u = new Set<string>();
    data.forEach(d => {
      if (d.user) u.add(d.user);
    });
    return Array.from(u).sort();
  }, [data]);

  useEffect(() => {
    if (selectedUser !== 'all' && !users.includes(selectedUser)) {
        setSelectedUser('all');
    }
  }, [users, selectedUser]);

  // Filter Data based on User AND Media Type
  const filteredData = useMemo(() => {
    let d = data;
    
    // Filter by User
    if (selectedUser !== 'all') {
      d = d.filter(x => x.user === selectedUser);
    }

    // Filter by Media Type
    if (selectedMediaType === 'movie') {
      d = d.filter(x => x.type === 'movie');
    } else if (selectedMediaType === 'episode') {
      d = d.filter(x => x.type === 'episode');
    }

    return d;
  }, [data, selectedUser, selectedMediaType]);

  const reports = useMemo(() => processReports(filteredData), [filteredData]);

  const safeYearIndex = reports.length > 0 ? Math.min(yearIndex, Math.max(0, reports.length - 1)) : 0;
  const currentReport = reports.length > 0 ? reports[safeYearIndex] : null;
  
  const handlePrev = () => setYearIndex(prev => Math.min(reports.length - 1, prev + 1));
  const handleNext = () => setYearIndex(prev => Math.max(0, prev - 1));

  // Reset poster when year changes
  useEffect(() => {
    setYearlyPoster(null);
  }, [currentReport?.year, selectedMediaType, selectedUser]);

  useEffect(() => {
    if (currentReport?.busiestMonth) {
      const m = currentReport.monthlyBreakdown.find(m => m.monthName === currentReport.busiestMonth);
      if (m) {
        const monthNum = parseInt(m.monthKey.split('-')[1]) - 1;
        if (!isNaN(monthNum)) setSelectedHeatmapMonth(monthNum);
      }
    }
  }, [currentReport]);

  const heatmapData = useMemo(() => {
    if (!currentReport) return [];
    if (heatmapMode === 'weekly') {
      return currentReport.heatmapData;
    } else {
      return generateMonthlyHeatmap(filteredData, currentReport.year, selectedHeatmapMonth);
    }
  }, [currentReport, heatmapMode, selectedHeatmapMonth, filteredData]);

  const handleGenerateYearlyPoster = async () => {
    if (!currentReport) return;
    setLoadingPoster(true);
    
    try {
      // Collect the top item from each month
      const topItems = currentReport.monthlyBreakdown
        .map(m => m.topItem)
        .filter(item => item && item !== 'None');
      
      const label = selectedMediaType === 'movie' ? 'movies' : selectedMediaType === 'episode' ? 'TV shows' : 'titles';
      
      const imageUrl = await generateYearlyRecap(currentReport.year, topItems, label);
      if (imageUrl) {
        setYearlyPoster(imageUrl);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate poster. See console.");
    } finally {
      setLoadingPoster(false);
    }
  };

  if (!currentReport) {
      return (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-6 animate-fade-in min-h-[50vh]">
           <div className="flex flex-col sm:flex-row gap-4">
              <UserFilterDropdown users={users} selected={selectedUser} onSelect={setSelectedUser} />
              <MediaTypeSelector selected={selectedMediaType} onSelect={setSelectedMediaType} />
           </div>
           <div className="glass-card p-10 rounded-3xl border border-white/10 max-w-md">
             <p className="text-xl font-bold mb-2 text-white">No Reports Available</p>
             <p className="text-gray-400">We couldn't generate a report for the selected filters. Try changing the year or media type.</p>
           </div>
        </div>
      );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Filter Control Bar (Placement: Below Tabs, Sticky) */}
      {/* Gestalt Principle: Common Region */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-center mb-8 sticky top-[108px] z-30 p-4 rounded-2xl glass border border-white/5 transition-all">
         {/* Year Selector - Fitts's Law: Large Targets */}
         <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
            <button 
              onClick={handlePrev} 
              disabled={safeYearIndex >= reports.length - 1}
              className="w-12 h-12 flex items-center justify-center bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-full disabled:opacity-30 transition-all active:scale-90"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="text-center">
               <h2 className="text-3xl font-black text-white tracking-tighter tabular-nums">{currentReport.year}</h2>
            </div>
            <button 
              onClick={handleNext} 
              disabled={safeYearIndex <= 0}
              className="w-12 h-12 flex items-center justify-center bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-full disabled:opacity-30 transition-all active:scale-90"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
         </div>

         {/* Filters */}
         <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <MediaTypeSelector selected={selectedMediaType} onSelect={setSelectedMediaType} />
            <UserFilterDropdown users={users} selected={selectedUser} onSelect={setSelectedUser} />
         </div>
      </div>

      {/* 2. High Level Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Hours" value={currentReport.totalHours} icon={<Clock className="w-5 h-5 text-blue-400" />} />
        <StatBox label="Active Days" value={currentReport.activeDays} icon={<Calendar className="w-5 h-5 text-green-400" />} />
        <StatBox label="Longest Streak" value={`${currentReport.longestStreak} days`} icon={<Flame className="w-5 h-5 text-orange-500" />} />
        <StatBox label="Busiest Month" value={currentReport.busiestMonth} icon={<Zap className="w-5 h-5 text-yellow-400" />} />
      </div>

      {/* 3. Year in Review Poster & Heatmap Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Poster Section (Takes 4 cols on large) */}
        <div className="lg:col-span-4 glass-card rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
             {yearlyPoster ? (
                <div className="relative group h-full">
                    <img src={yearlyPoster} alt="Year in Review" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                            onClick={() => {
                                const newWin = window.open();
                                if(newWin) {
                                newWin.document.write(`<body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${yearlyPoster}" style="max-height:100vh;max-width:100vw;"/></body>`);
                                }
                            }}
                            className="bg-white/10 backdrop-blur border border-white/20 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <Maximize2 className="w-5 h-5" /> Full Screen
                        </button>
                    </div>
                </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#1C1C1E] to-[#15171C]">
                    <div className="w-20 h-20 bg-[#e5a00d]/10 rounded-full flex items-center justify-center mb-6">
                        <Clapperboard className="w-10 h-10 text-[#e5a00d]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Year in Review</h3>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        Generate a custom AI art poster representing your {selectedMediaType === 'all' ? 'viewing' : selectedMediaType === 'movie' ? 'movie' : 'TV'} journey in {currentReport.year}.
                        <br/>It features your top hits from each month.
                    </p>
                    <button 
                        onClick={handleGenerateYearlyPoster}
                        disabled={loadingPoster}
                        className="bg-[#e5a00d] hover:bg-[#ffb319] text-black px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {loadingPoster ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                        {loadingPoster ? "Dreaming..." : "Generate Poster"}
                    </button>
                </div>
             )}
        </div>

        {/* Heatmap Section (Takes 8 cols on large) */}
        <div className="lg:col-span-8 glass-card rounded-3xl p-6 lg:p-8 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                Viewing Intensity
                </h3>
                <p className="text-gray-400 mt-1">
                {heatmapMode === 'weekly' 
                    ? "Your typical weekly schedule."
                    : `Daily breakdown for ${monthNames[selectedHeatmapMonth] || 'Selected Month'}.`}
                </p>
            </div>

            <div className="flex items-center gap-3 bg-[#1C1C1E] p-1.5 rounded-xl border border-white/5 self-start md:self-auto">
                <button 
                    onClick={() => setHeatmapMode('weekly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${heatmapMode === 'weekly' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4" /> Weekly
                </button>
                <button 
                    onClick={() => setHeatmapMode('monthly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${heatmapMode === 'monthly' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <Grid className="w-4 h-4" /> Monthly
                </button>
                
                {heatmapMode === 'monthly' && (
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                )}

                {heatmapMode === 'monthly' && (
                    <select 
                        value={selectedHeatmapMonth}
                        onChange={(e) => setSelectedHeatmapMonth(parseInt(e.target.value))}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer hover:text-[#e5a00d]"
                    >
                        {monthNames.map((m, idx) => (
                        <option key={m} value={idx} className="bg-[#1C1C1E]">{m}</option>
                        ))}
                    </select>
                )}
            </div>
            </div>

            <div className="flex-1 w-full min-h-[350px]">
                <ActivityHeatmap data={heatmapData} mode={heatmapMode} />
            </div>
        </div>
      </div>

      {/* 4. Monthly Chronicles Grid */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
           Monthly Chronicles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentReport.monthlyBreakdown.map((month) => (
              <div key={month.monthKey} className="group relative bg-[#151515] rounded-3xl border border-white/5 overflow-hidden hover:border-[#e5a00d]/50 transition-all duration-300 hover:transform hover:scale-[1.01] hover:shadow-2xl flex flex-col h-[320px]">
                
                {/* Background Decoration */}
                <div className="absolute inset-0 z-0">
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1d24] to-[#0f1115]" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.03] rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                </div>

                {/* Content Layer */}
                <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                    
                    <div className="flex justify-between items-start">
                        <h4 className="font-black text-3xl text-white tracking-tight">{month.monthName}</h4>
                        <span className="font-mono text-xs bg-white/10 backdrop-blur px-2 py-1 rounded-md text-white border border-white/10">
                            {month.totalHours} hrs
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Most Watched {selectedMediaType === 'movie' ? 'Movie' : selectedMediaType === 'episode' ? 'Show' : 'Title'}</div>
                            <div className="text-[#e5a00d] font-bold text-xl leading-tight line-clamp-2">
                                {month.topItem || "Nothing watched"}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Plays</div>
                                <div className="text-xl font-mono text-white">{month.playCount}</div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                    {selectedMediaType === 'movie' ? 'Intensity' : 'Binge Score'}
                                </div>
                                <div className={`text-xl font-mono font-bold ${month.bingeScore > 5 ? 'text-red-400' : 'text-green-400'}`}>
                                    {month.bingeScore}<span className="text-xs text-gray-500">/10</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
          ))}
        </div>
      </div>

    </div>
  );
};

const UserFilterDropdown = ({ users, selected, onSelect }: { users: string[], selected: string, onSelect: (u: string) => void }) => (
    <div className="relative group w-full sm:w-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Users className="w-4 h-4" />
        </div>
        <select 
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            disabled={users.length === 0}
            className="appearance-none w-full sm:w-[200px] bg-[#2C2C2E] text-white pl-10 pr-8 py-3 rounded-xl text-sm font-bold border border-transparent hover:border-gray-600 focus:border-[#e5a00d] outline-none cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
        >
            <option value="all">All Users</option>
            {users.map(u => (
            <option key={u} value={u}>{u}</option>
            ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className="w-4 h-4" />
        </div>
    </div>
);

const MediaTypeSelector = ({ selected, onSelect }: { selected: any, onSelect: (v: any) => void }) => (
    <div className="flex bg-[#2C2C2E] p-1 rounded-xl border border-white/5 w-full sm:w-auto">
       <button
         onClick={() => onSelect('all')}
         className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${selected === 'all' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
       >
         All
       </button>
       <button
         onClick={() => onSelect('movie')}
         className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${selected === 'movie' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
       >
         <Film className="w-3 h-3" /> Movies
       </button>
       <button
         onClick={() => onSelect('episode')}
         className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${selected === 'episode' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
       >
         <Tv className="w-3 h-3" /> Shows
       </button>
    </div>
);

const StatBox = ({ label, value, icon }: any) => (
  <div className="glass-card p-4 sm:p-6 rounded-3xl flex flex-col justify-between h-full min-h-[120px]">
    <div className="bg-gray-800/50 w-8 h-8 rounded-lg flex items-center justify-center mb-4">{icon}</div>
    <div>
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{value}</div>
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{label}</div>
    </div>
  </div>
);