
import React, { useMemo, useState, useEffect } from 'react';
import { PlayHistoryItem } from '../types';
import { processReports, generateMonthlyHeatmap } from '../services/dataProcessing';
import { ActivityHeatmap } from './Charts';
import { Calendar, Flame, Clock, ChevronLeft, ChevronRight, Zap, Users, ChevronDown, Grid, LayoutGrid, Info, Image as ImageIcon, Loader2, Maximize2, Clapperboard, Tv, Film, CalendarDays, AlertTriangle, Download, Filter, X } from 'lucide-react';
import { APP_COLORS } from '../constants';
import { exportToCSV, exportYearlyReportToCSV } from '../services/exportService';

interface ReportsProps {
  data: PlayHistoryItem[];
}

export const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'movie' | 'episode'>('all');
  const [yearIndex, setYearIndex] = useState(0);
  
  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [minDuration, setMinDuration] = useState<number | ''>('');
  const [maxDuration, setMaxDuration] = useState<number | ''>('');
  
  // Heatmap State
  const [heatmapMode, setHeatmapMode] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState<number>(0); 
  const [selectedHeatmapYear, setSelectedHeatmapYear] = useState<number>(0);

  // Poster State
  const [yearlyPoster, setYearlyPoster] = useState<string | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [posterSupportError, setPosterSupportError] = useState<string | null>(null);

  // Extract unique users
  const users = useMemo(() => {
    const u = new Set<string>();
    data.forEach(d => {
      if (d.user && d.user.trim()) {
        u.add(d.user.trim());
      }
    });
    const userList = Array.from(u).sort();
    // Debug: Log users to console (can be removed later)
    if (userList.length > 0) {
      console.log('Found users:', userList);
    }
    return userList;
  }, [data]);

  useEffect(() => {
    if (selectedUser !== 'all' && !users.includes(selectedUser)) {
        setSelectedUser('all');
    }
  }, [users, selectedUser]);

  // Filter Data based on User, Media Type, and Advanced Filters
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

    // Advanced Filters: Date Range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      d = d.filter(x => x.date && x.date >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      d = d.filter(x => x.date && x.date <= endDate);
    }

    // Advanced Filters: Duration Range
    if (minDuration !== '') {
      d = d.filter(x => (x.durationMinutes || 0) >= minDuration);
    }
    if (maxDuration !== '') {
      d = d.filter(x => (x.durationMinutes || 0) <= maxDuration);
    }

    return d;
  }, [data, selectedUser, selectedMediaType, dateRange, minDuration, maxDuration]);

  const reports = useMemo(() => processReports(filteredData), [filteredData]);

  const safeYearIndex = reports.length > 0 ? Math.min(yearIndex, Math.max(0, reports.length - 1)) : 0;
  const currentReport = reports.length > 0 ? reports[safeYearIndex] : null;
  
  const handlePrev = () => setYearIndex(prev => Math.min(reports.length - 1, prev + 1));
  const handleNext = () => setYearIndex(prev => Math.max(0, prev - 1));

  // Reset poster when year changes
  useEffect(() => {
    setYearlyPoster(null);
    setPosterError(null);
    setPosterSupportError(null);
  }, [currentReport?.year, selectedMediaType, selectedUser]);

  useEffect(() => {
    if (currentReport) {
      // Sync local heatmap filters with the new report year/context
      setSelectedHeatmapYear(currentReport.year);
      
      if (currentReport.busiestMonth) {
        const m = currentReport.monthlyBreakdown.find(m => m.monthName === currentReport.busiestMonth);
        if (m) {
          const monthNum = parseInt(m.monthKey.split('-')[1]) - 1;
          if (!isNaN(monthNum)) setSelectedHeatmapMonth(monthNum);
        }
      }
    }
  }, [currentReport]);

  const heatmapData = useMemo(() => {
    if (!currentReport) return [];
    if (heatmapMode === 'weekly') {
      return currentReport.heatmapData;
    } else if (heatmapMode === 'monthly') {
      return generateMonthlyHeatmap(filteredData, currentReport.year, selectedHeatmapMonth);
    } else {
      // For yearly, find the report for the selected year
      const reportForYear = reports.find(r => r.year === selectedHeatmapYear);
      return reportForYear ? reportForYear.dailyActivity : currentReport.dailyActivity;
    }
  }, [currentReport, heatmapMode, selectedHeatmapMonth, filteredData, selectedHeatmapYear, reports]);

  const handleGenerateYearlyPoster = async () => {
    if (!currentReport) return;
    setLoadingPoster(true);
    setPosterError(null);
    setPosterSupportError(null);

    let generateYearlyRecap: typeof import('../services/geminiService')['generateYearlyRecap'];

    try {
      ({ generateYearlyRecap } = await import('../services/geminiService'));
    } catch (importError) {
      console.error('Failed to load Gemini client', importError);
      setPosterSupportError(
        'Yearly poster generation is unavailable in this deployment. Provide a Gemini API key and rebuild to enable it.'
      );
      setLoadingPoster(false);
      return;
    }

    try {
      // Collect the top item from each month
      const topItems = currentReport.monthlyBreakdown
        .map(m => m.topItem)
        .filter(item => item && item !== 'None');
      
      const label = selectedMediaType === 'movie' ? 'movies' : selectedMediaType === 'episode' ? 'TV shows' : 'titles';
      
      const imageUrl = await generateYearlyRecap(currentReport.year, topItems, label);
      if (imageUrl) {
        setYearlyPoster(imageUrl);
      } else {
        throw new Error("No image data received.");
      }
    } catch (e: any) {
      console.error(e);
      let msg = "Failed to generate poster.";
      const errStr = (e.message || JSON.stringify(e)).toLowerCase();
      
      if (errStr.includes('403') || errStr.includes('permission')) {
          msg = "Permission Denied: Please verify your API Key has the 'Generative Language API' enabled in Google Cloud Console.";
      } else if (errStr.includes('quota') || errStr.includes('429')) {
          msg = "Quota Exceeded: You have hit the rate limit for image generation.";
      }
      setPosterError(msg);
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

  // Calculate max hours for the progress bar scaling
  const maxMonthlyHours = Math.max(...currentReport.monthlyBreakdown.map(m => m.totalHours), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Filter Control Bar (Placement: Below Tabs, Sticky) */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-center mb-8 sticky top-[108px] z-30 p-4 rounded-2xl glass border border-white/5 transition-all">
         {/* Year Selector */}
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

         {/* Filters and Export */}
         <div className="flex flex-col gap-3 w-full xl:w-auto">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <MediaTypeSelector selected={selectedMediaType} onSelect={setSelectedMediaType} />
              <UserFilterDropdown users={users} selected={selectedUser} onSelect={setSelectedUser} />
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  showAdvancedFilters 
                    ? 'bg-[#e5a00d] text-black' 
                    : 'bg-[#1C1C1E] hover:bg-[#3A3A3C] border border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" /> Advanced
              </button>
              {currentReport && (
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(filteredData, `plexpulse-data-${currentReport.year}.csv`)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] hover:bg-[#3A3A3C] border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all"
                    title="Export filtered data to CSV"
                  >
                    <Download className="w-4 h-4" /> Data CSV
                  </button>
                  <button
                    onClick={() => exportYearlyReportToCSV(currentReport)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] hover:bg-[#3A3A3C] border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all"
                    title="Export yearly report to CSV"
                  >
                    <Download className="w-4 h-4" /> Report CSV
                  </button>
                </div>
              )}
            </div>
            
            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="glass-card p-4 rounded-xl border border-white/10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white">Advanced Filters</h4>
                  <button
                    onClick={() => {
                      setDateRange({ start: '', end: '' });
                      setMinDuration('');
                      setMaxDuration('');
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-2 text-white text-sm focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-2 text-white text-sm focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Min Duration (min)</label>
                    <input
                      type="number"
                      value={minDuration}
                      onChange={(e) => setMinDuration(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Any"
                      min="0"
                      className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-2 text-white text-sm focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Max Duration (min)</label>
                    <input
                      type="number"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Any"
                      min="0"
                      className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-2 text-white text-sm focus:border-[#e5a00d] focus:ring-1 focus:ring-[#e5a00d] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
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
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Generate a custom AI art poster representing your {selectedMediaType === 'all' ? 'viewing' : selectedMediaType === 'movie' ? 'movie' : 'TV'} journey in {currentReport.year}.
                        <br/>It features your top hits from each month.
                    </p>
                    
                    {posterError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-left mb-6 w-full animate-in fade-in slide-in-from-bottom-2">
                           <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p className="text-xs text-red-200">{posterError}</p>
                           </div>
                        </div>
                    )}

                    {posterSupportError && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-left mb-6 w-full animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-yellow-300 flex-shrink-0" />
                          <p className="text-xs text-yellow-100">{posterSupportError}</p>
                        </div>
                      </div>
                    )}

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
                    : heatmapMode === 'yearly' 
                    ? `Viewing consistency throughout ${selectedHeatmapYear || currentReport.year}.`
                    : `Daily breakdown for ${monthNames[selectedHeatmapMonth] || 'Selected Month'}.`}
                </p>
            </div>

            <div className="flex items-center gap-3 bg-[#1C1C1E] p-1.5 rounded-xl border border-white/5 self-start md:self-auto overflow-x-auto max-w-full">
                <button 
                    onClick={() => setHeatmapMode('weekly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${heatmapMode === 'weekly' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4" /> Weekly
                </button>
                <button 
                    onClick={() => setHeatmapMode('monthly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${heatmapMode === 'monthly' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <Grid className="w-4 h-4" /> Monthly
                </button>
                <button 
                    onClick={() => setHeatmapMode('yearly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${heatmapMode === 'yearly' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <CalendarDays className="w-4 h-4" /> Yearly
                </button>
                
                {(heatmapMode === 'monthly' || heatmapMode === 'yearly') && (
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

                {heatmapMode === 'yearly' && (
                    <select 
                        value={selectedHeatmapYear}
                        onChange={(e) => setSelectedHeatmapYear(parseInt(e.target.value))}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer hover:text-[#e5a00d]"
                    >
                        {reports.map((r) => (
                        <option key={r.year} value={r.year} className="bg-[#1C1C1E]">{r.year}</option>
                        ))}
                    </select>
                )}
            </div>
            </div>

            <div className="flex-1 w-full min-h-[350px]">
                <ActivityHeatmap 
                    data={heatmapData} 
                    mode={heatmapMode} 
                    year={heatmapMode === 'yearly' ? selectedHeatmapYear : currentReport.year} 
                />
            </div>
        </div>
      </div>

      {/* 4. Monthly Chronicles (Table Style) */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/5 relative">
        <div className="p-6 border-b border-white/5 bg-[#1C1C1E] sticky top-0 z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#e5a00d]" /> Monthly Chronicles
            </h3>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead className="shadow-lg">
                    <tr className="bg-[#15171C] text-gray-500 text-xs uppercase tracking-wider">
                        <th className="sticky top-0 z-20 bg-[#15171C] p-5 font-bold border-b border-white/5">Month</th>
                        <th className="sticky top-0 z-20 bg-[#15171C] p-5 font-bold border-b border-white/5 w-1/2">Most Watched</th>
                        <th className="sticky top-0 z-20 bg-[#15171C] p-5 font-bold border-b border-white/5 text-right">Plays</th>
                        <th className="sticky top-0 z-20 bg-[#15171C] p-5 font-bold border-b border-white/5 text-right">Watch Time</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {currentReport.monthlyBreakdown.map((month) => {
                        const intensity = (month.totalHours / maxMonthlyHours) * 100;
                        return (
                            <tr key={month.monthKey} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="p-5 font-bold text-white">
                                    {month.monthName}
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${month.topItemType === 'episode' ? 'bg-green-500/10' : month.topItemType === 'movie' ? 'bg-blue-500/10' : 'bg-gray-800'}`}>
                                            {month.topItemType === 'episode' ? <Tv className="w-4 h-4 text-green-400" /> : 
                                             month.topItemType === 'movie' ? <Film className="w-4 h-4 text-blue-400" /> : 
                                             <Clapperboard className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium line-clamp-1">{month.topItem || 'Nothing watched'}</span>
                                            <span className="text-xs text-gray-500 capitalize">{month.topItemType}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5 text-right font-mono text-gray-300">
                                    {month.playCount}
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-mono text-white font-bold">{month.totalHours} hrs</span>
                                        <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full bg-gradient-to-r from-[#e5a00d] to-yellow-200"
                                                style={{ width: `${intensity}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

const StatBox = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
  <div className="glass-card p-6 rounded-3xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
    <div>
       <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
       <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-[#1C1C1E] border border-white/5 flex items-center justify-center shadow-inner">
       {icon}
    </div>
  </div>
);

const UserFilterDropdown = ({ users, selected, onSelect }: { users: string[], selected: string, onSelect: (u: string) => void }) => {
    return (
        <div className="relative group min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gray-500" />
            </div>
            <select
                value={selected}
                onChange={(e) => onSelect(e.target.value)}
                className="appearance-none bg-[#1C1C1E] text-white text-sm font-bold border border-white/10 rounded-xl py-3 pl-10 pr-10 hover:border-[#e5a00d] focus:outline-none focus:ring-1 focus:ring-[#e5a00d] transition-all w-full cursor-pointer"
            >
                <option value="all">All Users</option>
                {users.map(u => (
                    <option key={u} value={u}>{u}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
        </div>
    );
};

const MediaTypeSelector = ({ selected, onSelect }: { selected: 'all' | 'movie' | 'episode', onSelect: (t: 'all' | 'movie' | 'episode') => void }) => {
    return (
        <div className="flex bg-[#1C1C1E] p-1 rounded-xl border border-white/5">
            <button
                onClick={() => onSelect('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selected === 'all' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
                All
            </button>
            <button
                onClick={() => onSelect('movie')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${selected === 'movie' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <Film className="w-3 h-3" /> Movies
            </button>
            <button
                onClick={() => onSelect('episode')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${selected === 'episode' ? 'bg-[#3A3A3C] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <Tv className="w-3 h-3" /> Shows
            </button>
        </div>
    );
};
