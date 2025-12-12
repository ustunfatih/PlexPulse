import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, CartesianGrid
} from 'recharts';
import { AnalyticsSummary, HeatmapPoint } from '../types';
import { APP_COLORS } from '../constants';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass bg-[#15171C]/90 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md z-50">
        <p className="text-gray-400 font-medium text-xs mb-1 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e5a00d]"></div>
            <p className="text-white text-sm font-bold">
            {payload[0].value} <span className="text-gray-500 font-normal">{payload[0].name === 'durationHours' ? 'hrs' : 'plays'}</span>
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

export const ActivityHeatmap: React.FC<{ data: HeatmapPoint[], mode: 'weekly' | 'monthly' }> = ({ data, mode }) => {
  const [hoveredCell, setHoveredCell] = useState<{ x: number, y: number, value: number, label: string } | null>(null);
  
  // Calculate max value for normalization
  const maxVal = Math.max(...data.map(d => d.value), 1);

  // GitHub-style color scale function
  const getCellColor = (value: number) => {
    if (value === 0) return 'bg-[#27272a]'; // Empty (Zinc-800 equivalent)
    const ratio = value / maxVal;
    if (ratio <= 0.25) return 'bg-[#4a3a18]'; // Darkest Orange
    if (ratio <= 0.50) return 'bg-[#7c5d10]'; // Medium-Dark
    if (ratio <= 0.75) return 'bg-[#b8860b]'; // Medium-Light
    return 'bg-[#e5a00d]'; // Full Plex Orange
  };

  const getCellOpacity = (value: number) => {
      // Add slight opacity variation for "glow" feel in dark mode, but keep solid colors for distinct blocks
      if (value === 0) return 'opacity-40';
      return 'opacity-100';
  };

  // Dimensions
  // Weekly: X=Hour (24), Y=Day (7)
  // Monthly: X=Day (31), Y=Hour (24)
  const cols = mode === 'weekly' ? 24 : 31; // Max days in month is 31
  const rows = mode === 'weekly' ? 7 : 24;

  const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourLabels = ['12a', '4a', '8a', '12p', '4p', '8p'];
  
  // Helper to get value at specific coord
  const getValue = (x: number, y: number) => {
      // In Weekly: x=Hour, y=Day
      // In Monthly: x=Day(1-31), y=Hour
      if (mode === 'weekly') {
          const pt = data.find(d => d.hour === x && d.day === y);
          return pt ? pt.value : 0;
      } else {
          // Monthly data: day is 1-based index usually
          const pt = data.find(d => d.day === (x + 1) && d.hour === y);
          return pt ? pt.value : 0;
      }
  };

  return (
    <div className="w-full h-full flex flex-col relative" onMouseLeave={() => setHoveredCell(null)}>
        
        {/* Hover Tooltip - Absolute positioned relative to container */}
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
                {/* Arrow */}
                <div className="w-2 h-2 bg-gray-900 border-r border-b border-white/10 transform rotate-45 absolute left-1/2 -bottom-1 -translate-x-1/2"></div>
            </div>
        )}

        {/* Labels Top (X-Axis) */}
        <div className="flex mb-2 pl-8">
            {mode === 'weekly' ? (
                // Hourly Labels
                hourLabels.map((label, i) => (
                    <div key={i} className="flex-1 text-[10px] text-gray-500 font-mono text-left" style={{ flexGrow: 4 }}>{label}</div>
                ))
            ) : (
                // Daily Labels (every 5 days)
                Array.from({ length: 7 }).map((_, i) => (
                     <div key={i} className="flex-1 text-[10px] text-gray-500 font-mono text-left" style={{ flexGrow: 5 }}>{i * 5 + 1}</div>
                ))
            )}
        </div>

        <div className="flex flex-1 min-h-0">
             {/* Labels Left (Y-Axis) */}
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
             
             {/* The Grid */}
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
};