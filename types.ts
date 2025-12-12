
export interface PlayHistoryItem {
  title: string;
  parentTitle?: string; // For TV Shows (Series Name)
  grandparentTitle?: string;
  date: Date;
  durationMinutes: number;
  type: 'movie' | 'episode' | 'track' | 'unknown';
  user?: string;
  player?: string;
}

export interface TopItem {
  name: string;
  count: number;
  totalDurationMinutes: number;
  lastWatched: Date;
}

export interface AnalyticsSummary {
  totalPlays: number;
  totalDurationHours: number;
  topMovies: TopItem[];
  topShows: TopItem[];
  playsByHour: { hour: number; count: number }[];
  playsByDayOfWeek: { day: string; count: number }[];
  playsByMonth: { month: string; count: number }[];
  mediaTypeDistribution: { name: string; value: number }[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  secondary?: number;
}

// --- New Reporting Types ---

export interface HeatmapPoint {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number; // intensity/count
}

export interface MonthlyReport {
  monthKey: string; // YYYY-MM
  monthName: string;
  year: number;
  totalHours: number;
  topItem: string;
  topItemType: string;
  playCount: number;
  bingeScore: number; // 0-10 scale based on avg episodes per day
}

export interface YearlyReport {
  year: number;
  totalHours: number;
  totalPlays: number;
  activeDays: number;
  longestStreak: number;
  busiestMonth: string;
  monthlyBreakdown: MonthlyReport[];
  heatmapData: HeatmapPoint[];
}
