
import { PlayHistoryItem, AnalyticsSummary, YearlyReport, MonthlyReport, HeatmapPoint, TopItem } from '../types';
import { MOCK_TITLES_MOVIES, MOCK_TITLES_SHOWS } from '../constants';

export const processHistoryData = (data: PlayHistoryItem[]): AnalyticsSummary => {
  const summary: AnalyticsSummary = {
    totalPlays: 0,
    totalDurationHours: 0,
    topMovies: [],
    topShows: [],
    playsByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
    playsByDayOfWeek: [],
    playsByMonth: [],
    mediaTypeDistribution: [],
  };

  const movieStats: Record<string, TopItem> = {};
  const showStats: Record<string, TopItem> = {};
  
  const dayCounts: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }; // 0=Sun
  const monthCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = { movie: 0, episode: 0, track: 0, unknown: 0 };

  data.forEach(item => {
    const duration = (typeof item.durationMinutes === 'number' && !isNaN(item.durationMinutes)) 
      ? item.durationMinutes 
      : 0;
    
    summary.totalPlays++;
    summary.totalDurationHours += duration / 60;

    const type = item.type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Top Lists
    if (type === 'movie' && item.title) {
      if (!movieStats[item.title]) {
        movieStats[item.title] = { name: item.title, count: 0, totalDurationMinutes: 0, lastWatched: item.date };
      }
      movieStats[item.title].count++;
      movieStats[item.title].totalDurationMinutes += duration;
      if (item.date > movieStats[item.title].lastWatched) {
        movieStats[item.title].lastWatched = item.date;
      }
    } else if (type === 'episode') {
      const showName = item.grandparentTitle || item.parentTitle || item.title || "Unknown Show";
      if (!showStats[showName]) {
        showStats[showName] = { name: showName, count: 0, totalDurationMinutes: 0, lastWatched: item.date };
      }
      showStats[showName].count++;
      showStats[showName].totalDurationMinutes += duration;
      if (item.date > showStats[showName].lastWatched) {
        showStats[showName].lastWatched = item.date;
      }
    }

    if (item.date && !isNaN(item.date.getTime())) {
      const hour = item.date.getHours();
      if (summary.playsByHour[hour]) summary.playsByHour[hour].count++;

      const day = item.date.getDay();
      dayCounts[day]++;

      const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  });

  summary.topMovies = Object.values(movieStats).sort((a, b) => b.count - a.count).slice(0, 50);
  summary.topShows = Object.values(showStats).sort((a, b) => b.count - a.count).slice(0, 50);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  summary.playsByDayOfWeek = days.map((day, index) => ({
    day,
    count: dayCounts[index]
  }));

  summary.playsByMonth = Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  summary.mediaTypeDistribution = Object.entries(typeCounts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  summary.totalDurationHours = Math.round(summary.totalDurationHours || 0);

  return summary;
};

export const processReports = (data: PlayHistoryItem[]): YearlyReport[] => {
  const years: Record<number, PlayHistoryItem[]> = {};

  data.forEach(item => {
    if (!item.date || isNaN(item.date.getTime())) return;
    const y = item.date.getFullYear();
    if (!years[y]) years[y] = [];
    years[y].push(item);
  });

  const reports: YearlyReport[] = [];

  Object.keys(years).forEach(yearStr => {
    const year = parseInt(yearStr);
    const items = years[year];
    
    // Heatmap (Yearly/Weekly aggregation)
    const heatmapGrid: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    items.forEach(item => {
      // For Weekly Heatmap
      const key = `${item.date.getDay()}-${item.date.getHours()}`;
      heatmapGrid[key] = (heatmapGrid[key] || 0) + 1;

      // For Yearly Heatmap
      const dateKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}`;
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    });
    
    const heatmapData: HeatmapPoint[] = [];
    for(let d=0; d<7; d++) {
      for(let h=0; h<24; h++) {
        heatmapData.push({
          day: d,
          hour: h,
          value: heatmapGrid[`${d}-${h}`] || 0
        });
      }
    }

    const dailyActivity = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));

    // Monthly Breakdown
    const months: Record<string, PlayHistoryItem[]> = {};
    items.forEach(item => {
      const mKey = `${year}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[mKey]) months[mKey] = [];
      months[mKey].push(item);
    });

    const monthlyBreakdown: MonthlyReport[] = Object.keys(months).map(mKey => {
      const mItems = months[mKey];
      const totalMinutes = mItems.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
      const totalHours = Math.round(totalMinutes / 60);
      
      const counts: Record<string, number> = {};
      mItems.forEach(i => {
        const name = i.type === 'episode' ? (i.grandparentTitle || i.title) : i.title;
        if (name) counts[name] = (counts[name] || 0) + 1;
      });
      const sortedEntries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
      const topEntry: [string, number] = sortedEntries.length > 0 ? sortedEntries[0] : ['None', 0];
      
      // Binge Score
      const activeDaysSet = new Set(mItems.map(i => i.date.toDateString()));
      const episodes = mItems.filter(i => i.type === 'episode').length;
      const bingeScore = activeDaysSet.size > 0 ? (episodes / activeDaysSet.size) : 0;

      const dateObj = new Date(mItems[0].date);
      const monthName = dateObj.toLocaleString('default', { month: 'long' });

      return {
        monthKey: mKey,
        monthName,
        year,
        totalHours: isNaN(totalHours) ? 0 : totalHours,
        topItem: topEntry[0],
        topItemType: 'mixed',
        playCount: mItems.length,
        bingeScore: Math.min(10, Math.round(bingeScore * 10) / 10)
      };
    }).sort((a,b) => a.monthKey.localeCompare(b.monthKey));

    // Streaks
    const uniqueDays = Array.from(new Set(items.map(i => i.date.toDateString())))
      .map(d => new Date(d).getTime())
      .sort((a, b) => a - b);
    
    let maxStreak = 0;
    let currentStreak = 0;
    let prevTime = 0;
    const oneDay = 24 * 60 * 60 * 1000;

    uniqueDays.forEach((time, index) => {
      if (index === 0) {
        currentStreak = 1;
      } else {
        if (time - prevTime <= oneDay + 10000000) { 
           const diffDays = Math.round((time - prevTime) / oneDay);
           if (diffDays === 1) currentStreak++;
           else if (diffDays > 1) currentStreak = 1;
        } else {
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      prevTime = time;
    });

    const busiest = monthlyBreakdown.sort((a,b) => b.totalHours - a.totalHours)[0];
    const totalYearMinutes = items.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const finalYearHours = Math.round(totalYearMinutes / 60);

    reports.push({
      year,
      totalHours: isNaN(finalYearHours) ? 0 : finalYearHours,
      totalPlays: items.length,
      activeDays: uniqueDays.length,
      longestStreak: maxStreak,
      busiestMonth: busiest ? busiest.monthName : 'N/A',
      monthlyBreakdown,
      heatmapData,
      dailyActivity
    });
  });

  return reports.sort((a,b) => b.year - a.year);
};

export const generateMonthlyHeatmap = (data: PlayHistoryItem[], year: number, monthIndex: number): HeatmapPoint[] => {
  const items = data.filter(d => 
    d.date && 
    d.date.getFullYear() === year && 
    d.date.getMonth() === monthIndex
  );

  const heatmapGrid: Record<string, number> = {};
  items.forEach(item => {
    const day = item.date.getDate(); 
    const hour = item.date.getHours();
    const key = `${day}-${hour}`;
    heatmapGrid[key] = (heatmapGrid[key] || 0) + 1;
  });

  const points: HeatmapPoint[] = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    for (let h = 0; h < 24; h++) {
      points.push({
        day: d,
        hour: h,
        value: heatmapGrid[`${d}-${h}`] || 0
      });
    }
  }

  return points;
};

export const generateMockData = (): PlayHistoryItem[] => {
  const items: PlayHistoryItem[] = [];
  const count = 800;
  const now = new Date();
  const users = ["Admin", "Partner", "Kids", "Guest"];

  for (let i = 0; i < count; i++) {
    const isMovie = Math.random() > 0.4;
    const date = new Date(now.getTime() - Math.random() * 1000 * 60 * 60 * 24 * 400); 
    
    let hour = Math.floor(Math.random() * 24);
    if (Math.random() > 0.3) {
      hour = Math.floor(Math.random() * 6) + 18; 
    }
    date.setHours(hour);

    const user = users[Math.floor(Math.random() * users.length)];

    if (isMovie) {
      items.push({
        title: MOCK_TITLES_MOVIES[Math.floor(Math.random() * MOCK_TITLES_MOVIES.length)],
        date: date,
        durationMinutes: 90 + Math.random() * 60,
        type: 'movie',
        user
      });
    } else {
      const show = MOCK_TITLES_SHOWS[Math.floor(Math.random() * MOCK_TITLES_SHOWS.length)];
      items.push({
        title: `Episode ${Math.floor(Math.random() * 10) + 1}`,
        grandparentTitle: show,
        parentTitle: `Season ${Math.floor(Math.random() * 3) + 1}`,
        date: date,
        durationMinutes: 20 + Math.random() * 40,
        type: 'episode',
        user
      });
    }
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
};
