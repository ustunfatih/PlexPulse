
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { AnalyticsSummary, HeatmapPoint } from '../types';
import { APP_COLORS } from '../constants';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    const unit = dataItem.unit || payload[0].unit || 'plays';
    
    return (
      <div className="glass bg-[#15171C]/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md z-50">
        <p className="text-gray-400 font-medium text-xs mb-1 uppercase tracking-wide">{label || dataItem.name}</p>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e5a00d]"></div>
            <p className="text-white text-sm font-bold">
            {payload[0].value} <span className="text-gray-500 font-normal">{unit}</span>
            </p>
        </div>
      </div>
    );
  }
  return null;
};

export const HourlyActivityChart: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={summary.playsByHour} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="hour" 
            tick={{ fill: '#6B7280', fontSize: 10 }} 
            tickFormatter={(val) => `${val}`}
            axisLine={false}
            tickLine={false}
            interval={3} 
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)', radius: 4}} />
          <Bar dataKey="count" radius={[4, 4, 4, 4]}>
            {summary.playsByHour.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.count > 0 ? APP_COLORS.plexOrange : '#27272a'} 
                opacity={entry.count > 0 ? 0.8 + (entry.count / 200) : 0.2}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeeklyActivityChart: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={summary.playsByDayOfWeek} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis 
            dataKey="day" 
            type="category" 
            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }} 
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)', radius: 4}} />
          <Bar dataKey="count" fill={APP_COLORS.plexOrange} radius={[0, 6, 6, 0]} barSize={24}>
             {summary.playsByDayOfWeek.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={APP_COLORS.plexOrange} opacity={0.6 + (index * 0.05)} />
             ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MediaTypePieChart: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  if (!summary.mediaTypeDistribution || summary.mediaTypeDistribution.length === 0) {
    return <div className="h-64 w-full flex items-center justify-center text-gray-500 text-xs">No media data</div>;
  }

  return (
    <div className="h-64 w-full relative">
       <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={summary.mediaTypeDistribution}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={6}
            dataKey="value"
            stroke="none"
          >
            {summary.mediaTypeDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={APP_COLORS.charts[index % APP_COLORS.charts.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Centered Stat */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-white">{summary.totalPlays}</span>
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Plays</span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-0 w-full flex justify-center gap-4">
        {summary.mediaTypeDistribution.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: APP_COLORS.charts[index % APP_COLORS.charts.length] }}></div>
                <span className="text-xs text-gray-400 capitalize">{item.name}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

export const DurationDistributionChart: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
    if (!summary.durationByType || summary.durationByType.length === 0) {
      return <div className="h-64 w-full flex items-center justify-center text-gray-500 text-xs">No duration data</div>;
    }
  
    // Map custom colors for specific types for better visual distinction
    const getColor = (name: string) => {
        if(name.includes('movie')) return '#3b82f6'; // Blue
        if(name.includes('episode')) return '#22c55e'; // Green
        return '#e5a00d'; // Default Orange
    };
  
    return (
      <div className="h-64 w-full relative">
         <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart>
            <Pie
              data={summary.durationByType}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
              nameKey="name"
            >
              {summary.durationByType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Centered Stat */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-white">{summary.totalDurationHours}</span>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Hours</span>
        </div>
  
        {/* Legend */}
        <div className="absolute bottom-0 w-full flex justify-center gap-4">
          {summary.durationByType.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(item.name) }}></div>
                  <span className="text-xs text-gray-400 capitalize">{item.name}</span>
              </div>
          ))}
        </div>
      </div>
    );
  };

export const MonthlyTrendChart: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  if (!summary.playsByMonth || summary.playsByMonth.length === 0) {
    return <div className="h-64 w-full flex items-center justify-center text-gray-500 text-xs">No trend data</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={summary.playsByMonth} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={APP_COLORS.plexOrange} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={APP_COLORS.plexOrange} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#6B7280', fontSize: 10 }}
            tickFormatter={(str) => str ? str.split('-')[1] : ''} 
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke={APP_COLORS.plexOrange} 
            fillOpacity={1} 
            fill="url(#colorCount)" 
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Heatmap Implementation ---

interface ActivityHeatmapProps {
  data: any[]; 
  mode: 'weekly' | 'monthly' | 'yearly';
  year?: number; // Required for yearly mode
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, mode, year }) => {
  const [hoveredCell, setHoveredCell] = useState<{ x: number, y: number, value: number, label: string } | null>(null);

  // --- Calculations for Yearly View ---
  const { yearlyCells, monthLabels } = useMemo(() => {
    if (mode !== 'yearly' || !year) return { yearlyCells: [], monthLabels: [] };

    // Map daily data to a quick lookup
    const dailyMap = new Map<string, number>();
    data.forEach(d => dailyMap.set(d.date, d.count));

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const cells = [];
    const months = [];
    
    // Determine offset for the first week (Sunday based)
    const startDay = startDate.getDay(); // 0 = Sun
    
    // Fill empty spots before Jan 1
    for (let i = 0; i < startDay; i++) {
        cells.push({ date: null, value: 0, label: '' });
    }

    // Fill days
    let currentDate = new Date(startDate);
    let lastMonth = -1;
    let weekIndex = 0; // rough week index for labeling placement

    while (currentDate <= endDate) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const val = dailyMap.get(dateStr) || 0;
        
        // Month Labels
        if (currentDate.getMonth() !== lastMonth) {
            // Calculate column index for label
            const dayIndex = cells.length;
            const colIndex = Math.floor(dayIndex / 7);
            months.push({ name: currentDate.toLocaleString('default', { month: 'short' }), col: colIndex });
            lastMonth = currentDate.getMonth();
        }

        cells.push({
            date: dateStr,
            value: val,
            label: currentDate.toDateString()
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { yearlyCells: cells, monthLabels: months };

  }, [mode, year, data]);


  // Calculate max value for coloring (universal)
  const maxVal = useMemo(() => {
    if (mode === 'yearly') return Math.max(...data.map(d => d.count), 1);
    return Math.max(...data.map(d => d.value), 1);
  }, [data, mode]);

  const getCellColor = (value: number) => {
    if (value === 0) return 'bg-[#27272a]';
    const ratio = value / maxVal;
    if (ratio <= 0.25) return 'bg-[#4a3a18]';
    if (ratio <= 0.50) return 'bg-[#7c5d10]';
    if (ratio <= 0.75) return 'bg-[#b8860b]';
    return 'bg-[#e5a00d]';
  };

  const getCellOpacity = (value: number) => {
      if (value === 0) return 'opacity-40';
      return 'opacity-100';
  };

  // --- Render for Weekly/Monthly ---
  if (mode !== 'yearly') {
    // Dimensions: Weekly (24x7), Monthly (31x24)
    const cols = mode === 'weekly' ? 24 : 31;
    const rows = mode === 'weekly' ? 7 : 24;

    const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hourLabels = ['12a', '4a', '8a', '12p', '4p', '8p'];
    
    const getValue = (x: number, y: number) => {
        if (mode === 'weekly') {
            const pt = data.find(d => d.hour === x && d.day === y);
            return pt ? pt.value : 0;
        } else {
            const pt = data.find(d => d.day === (x + 1) && d.hour === y);
            return pt ? pt.value : 0;
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative" onMouseLeave={() => setHoveredCell(null)}>
            {/* Tooltip */}
            {hoveredCell && (
                <div 
                    className="absolute z-50 pointer-events-none transition-all duration-75"
                    style={{ 
                        left: `${(hoveredCell.x / cols) * 100}%`, 
                        top: `${(hoveredCell.y / rows) * 100}%`,
                        transform: 'translate(-50%, -130%)'
                    }}
                >
                    <div className="bg-gray-900 border border-white/10 text-white text-xs px-2 py-1 rounded-md shadow-xl whitespace-nowrap">
                    <div className="font-bold text-[#e5a00d] mb-0.5">{hoveredCell.value} plays</div>
                    <div className="text-gray-400 text-[10px]">{hoveredCell.label}</div>
                    </div>
                    <div className="w-2 h-2 bg-gray-900 border-r border-b border-white/10 transform rotate-45 absolute left-1/2 -bottom-1 -translate-x-1/2"></div>
                </div>
            )}

            {/* X Axis */}
            <div className="flex mb-2 pl-8">
                {mode === 'weekly' ? (
                    hourLabels.map((label, i) => (
                        <div key={i} className="flex-1 text-[10px] text-gray-500 font-mono text-left" style={{ flexGrow: 4 }}>{label}</div>
                    ))
                ) : (
                    Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex-1 text-[10px] text-gray-500 font-mono text-left" style={{ flexGrow: 5 }}>{i * 5 + 1}</div>
                    ))
                )}
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Y Axis */}
                <div className="flex flex-col justify-between pr-3 py-1">
                    {mode === 'weekly' ? (
                        weekLabels.map(d => (
                            <div key={d} className="text-[10px] text-gray-500 font-bold h-full flex items-center">{d}</div>
                        ))
                    ) : (
                        ['12am', '6am', '12pm', '6pm'].map(h => (
                            <div key={h} className="text-[10px] text-gray-500 font-bold h-full flex items-center">{h}</div>
                        ))
                    )}
                </div>
                
                {/* Grid */}
                <div 
                    className="flex-1 grid gap-[2px] sm:gap-1"
                    style={{ 
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                    }}
                >
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        Array.from({ length: cols }).map((_, colIdx) => {
                            const val = getValue(colIdx, rowIdx);
                            const label = mode === 'weekly' 
                                ? `${weekLabels[rowIdx]} @ ${colIdx}:00`
                                : `Day ${colIdx + 1} @ ${rowIdx}:00`;
                            return (
                                <div 
                                    key={`${rowIdx}-${colIdx}`}
                                    onMouseEnter={() => setHoveredCell({ x: colIdx, y: rowIdx, value: val, label })}
                                    className={`rounded-sm transition-all duration-200 hover:scale-125 hover:z-10 hover:border hover:border-white/50 ${getCellColor(val)} ${getCellOpacity(val)}`}
                                />
                            );
                        })
                    ))}
                </div>
            </div>
            {/* Legend */}
            <div className="flex justify-end items-center gap-2 mt-4 text-[10px] text-gray-500">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className={`w-3 h-3 rounded-sm ${getCellColor(0)}`}></div>
                    <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal * 0.2)}`}></div>
                    <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal * 0.4)}`}></div>
                    <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal * 0.7)}`}></div>
                    <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal)}`}></div>
                </div>
                <span>More</span>
            </div>
        </div>
    );
  }

  // --- Render for Yearly ---
  // GitHub Style: 7 Rows (Sun-Sat), Columns flow automatically via CSS Grid flow-col
  return (
    <div className="w-full h-full flex flex-col relative" onMouseLeave={() => setHoveredCell(null)}>
         {/* Tooltip */}
         {hoveredCell && (
            <div 
                className="absolute z-50 pointer-events-none transition-all duration-75"
                style={{ 
                    // Calculate rough position based on grid index
                    left: `calc(${(Math.floor(hoveredCell.x / 7) / 53) * 100}%)`,
                    top: `${((hoveredCell.x % 7) / 7) * 100}%`,
                    transform: 'translate(-50%, -130%)'
                }}
            >
                <div className="bg-gray-900 border border-white/10 text-white text-xs px-2 py-1 rounded-md shadow-xl whitespace-nowrap">
                   <div className="font-bold text-[#e5a00d] mb-0.5">{hoveredCell.value} plays</div>
                   <div className="text-gray-400 text-[10px]">{hoveredCell.label}</div>
                </div>
            </div>
        )}

        <div className="flex mb-2 pl-8 relative h-4">
             {/* Approximate month labels */}
             {monthLabels.map((m, i) => (
                 <div key={i} className="absolute text-[10px] text-gray-500 font-mono" style={{ left: `${(m.col / 53) * 100}%` }}>
                     {m.name}
                 </div>
             ))}
        </div>

        <div className="flex flex-1 min-h-0">
             <div className="flex flex-col justify-between pr-3 py-1 h-full">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                     // Only show Mon, Wed, Fri like GitHub
                     <div key={d} className="text-[10px] text-gray-500 font-bold h-full flex items-center opacity-0 sm:opacity-100">
                         { (i === 1 || i === 3 || i === 5) ? d : '' }
                     </div>
                ))}
             </div>

             <div className="flex-1 grid gap-[2px] sm:gap-1 grid-rows-7 grid-flow-col overflow-hidden">
                {yearlyCells.map((cell, idx) => (
                    <div 
                        key={idx}
                        onMouseEnter={() => cell.date && setHoveredCell({ x: idx, y: 0, value: cell.value, label: cell.label })}
                        className={`rounded-sm transition-all duration-200 hover:scale-125 hover:z-10 hover:border hover:border-white/50 ${cell.date ? getCellColor(cell.value) : 'bg-transparent'} ${cell.date ? getCellOpacity(cell.value) : ''}`}
                    />
                ))}
             </div>
        </div>

        <div className="flex justify-end items-center gap-2 mt-4 text-[10px] text-gray-500">
            <span>Less</span>
            <div className="flex gap-1">
                <div className={`w-3 h-3 rounded-sm ${getCellColor(0)}`}></div>
                <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal * 0.2)}`}></div>
                <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal * 0.4)}`}></div>
                <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal * 0.7)}`}></div>
                <div className={`w-3 h-3 rounded-sm ${getCellColor(maxVal)}`}></div>
            </div>
            <span>More</span>
        </div>
    </div>
  );
};