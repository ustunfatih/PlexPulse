import React, { useMemo, useState, useEffect } from 'react';
import { PlayHistoryItem } from '../types';
import { processReports, generateMonthlyHeatmap } from '../services/dataProcessing';
import { ActivityHeatmap } from './Charts';
import { Calendar, Flame, Clock, ChevronLeft, ChevronRight, Zap, Grid, LayoutGrid, Info, Image as ImageIcon, Loader2, Maximize2, Clapperboard, CalendarDays, AlertTriangle } from 'lucide-react';
import { generateYearlyRecap } from '../services/geminiService';
import { APP_COLORS } from '../constants';
import { MediaTypeOption } from './FilterControls';

interface ReportsProps {
  data: PlayHistoryItem[];
  selectedUser: string;
  selectedMediaType: MediaTypeOption;
}

export const Reports: React.FC<ReportsProps> = ({ data, selectedUser, selectedMediaType }) => {
  const [yearIndex, setYearIndex] = useState(0);
  
  // Heatmap State
  const [heatmapMode, setHeatmapMode] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState<number>(0); 
  const [selectedHeatmapYear, setSelectedHeatmapYear] = useState<number>(0);

  // Poster State
  const [yearlyPoster, setYearlyPoster] = useState<string | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  const reports = useMemo(() => processReports(data), [data]);

  const safeYearIndex = reports.length > 0 ? Math.min(yearIndex, Math.max(0, reports.length - 1)) : 0;
  const currentReport = reports.length > 0 ? reports[safeYearIndex] : null;
  
  const handlePrev = () => setYearIndex(prev => Math.min(reports.length - 1, prev + 1));
  const handleNext = () => setYearIndex(prev => Math.max(0, prev - 1));

  // Reset poster when year changes
  useEffect(() => {
    setYearlyPoster(null);
    setPosterError(null);
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
        return generateMonthlyHeatmap(data, currentReport.year, selectedHeatmapMonth);
    } else {
      // For yearly, find the report for the selected year
      const reportForYear = reports.find(r => r.year === selectedHeatmapYear);
      return reportForYear ? reportForYear.dailyActivity : currentReport.dailyActivity;
    }
  }, [currentReport, heatmapMode, selectedHeatmapMonth, data, selectedHeatmapYear, reports]);

  const handleGenerateYearlyPoster = async () => {
    if (!currentReport) return;

    // Avoid calling the API when there's nothing to visualize
    const topItems = currentReport.monthlyBreakdown
      .map(m => m.topItem)
      .filter(item => item && item !== 'None');

    if (topItems.length === 0) {
      setPosterError("No standout titles to showcase for this year yet.");
      return;
    }

    setLoadingPoster(true);
    setPosterError(null);

    try {
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

      if (errStr.includes('api key missing') || errStr.includes('key is missing')) {
          msg = "API Key Missing: Create a .env file with VITE_GEMINI_API_KEY=your_key. Get a key at https://aistudio.google.com/app/apikey";
      } else if (errStr.includes('403') || errStr.includes('permission')) {
          msg = "Permission Denied: Ensure your API Key has the 'Generative Language API' enabled in Google Cloud Console and billing is active.";
      } else if (errStr.includes('quota') || errStr.includes('429')) {
          msg = "Quota Exceeded: You have hit the rate limit for image generation. Please try again later.";
      } else if (errStr.includes('not found') || errStr.includes('404')) {
          msg = "Model not available: The image generation model may not be enabled for your API key. Try enabling 'Imagen API' in Google Cloud Console.";
      } else if (errStr.includes('billing')) {
          msg = "Billing Required: Image generation requires a paid API plan. Please enable billing in Google Cloud Console.";
      } else if (errStr.includes('invalid') && errStr.includes('api')) {
          msg = "Invalid API Key: Please check your VITE_GEMINI_API_KEY in the .env file.";
      }
      setPosterError(msg);
    } finally {
      setLoadingPoster(false);
    }
  };

  if (!currentReport) {
      return (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-6 animate-fade-in min-h-[50vh]">
           <div className="glass-card p-10 rounded-3xl border border-white/10 max-w-md">
             <p className="text-xl font-bold mb-2 text-white">No Reports Available</p>
             <p className="text-gray-400">We couldn't generate a report for the selected filters. Try broadening the filters or switching the year.</p>
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
      
      {/* 1. Year Selector */}
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

      {/* 4. Monthly Chronicles Grid */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
           Monthly Chronicles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentReport.monthlyBreakdown.map((month) => (
              <div key={month.monthKey} className="group relative bg-[#151515] rounded-3xl border border-white/5 overflow-hidden hover:border-[#e5a00d]/50 transition-all duration-300 hover:transform hover:scale-[1.01] hover:shadow-2xl flex flex-col min-h-[220px]">
                
                {/* Background Decoration */}
                <div className="absolute inset-0 z-0">
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1d24] to-[#0f1115]" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.03] rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                </div>

                {/* Content Layer */}
                <div className="relative z-10 p-6 flex flex-col gap-6 h-full">
                    
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-col gap-1">
                            <h4 className="font-black text-3xl text-white tracking-tight">{month.monthName}</h4>
                            <span className="text-xs text-gray-400 uppercase tracking-[0.2em] font-semibold">{currentReport.year}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-gradient-to-br from-[#e5a00d]/20 via-[#e5a00d]/10 to-transparent border border-[#e5a00d]/40 rounded-2xl px-3 py-2 shadow-[0_10px_30px_-15px_rgba(229,160,13,0.8)]">
                            <div className="w-10 h-10 rounded-xl bg-[#e5a00d]/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-[#e5a00d]" />
                            </div>
                            <div className="leading-tight">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[#e5a00d]">Hours</div>
                                <div className="text-xl font-black text-white tabular-nums">{month.totalHours}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
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

const StatBox = ({ label, value, icon }: any) => (
  <div className="glass-card p-4 sm:p-6 rounded-3xl flex flex-col justify-between h-full min-h-[120px]">
    <div className="bg-gray-800/50 w-8 h-8 rounded-lg flex items-center justify-center mb-4">{icon}</div>
    <div>
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{value}</div>
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{label}</div>
    </div>
  </div>
);