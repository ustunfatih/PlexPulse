import { AnalyticsSummary, ImprovementIdea } from '../types';

const pickTop = <T>(items: T[], count: number) => items.slice(0, Math.max(0, count));

export const buildImprovementIdeas = (summary: AnalyticsSummary): ImprovementIdea[] => {
  const ideas: ImprovementIdea[] = [];

  const busiestHour = summary.playsByHour.reduce(
    (best, current) => (current.count > best.count ? current : best),
    { hour: 0, count: 0 }
  );

  const busiestDay = summary.playsByDayOfWeek.reduce(
    (best, current) => (current.count > best.count ? current : best),
    { day: 'Sun', count: 0 }
  );

  if (summary.totalPlays === 0) {
    return [
      {
        title: 'No data yet',
        description: 'Connect Plex or import a CSV to unlock analytics and recommendations.',
        action: 'Connect your server or upload history to generate insights.'
      }
    ];
  }

  ideas.push({
    title: 'Sharpen the user filter',
    description:
      'Keep accountIDs enabled so every family member shows up in the reports filter. This prevents the “server owner only” issue.',
    action: 'Use accountID=all for history requests and surface every unique viewer name in filters and tables.'
  });

  ideas.push({
    title: 'Highlight peak engagement',
    description: `Your busiest time is around ${busiestHour.hour}:00 on ${busiestDay.day}. Call this out visually so users can spot habits fast.`,
    action: 'Add an annotation or badge on hourly and weekly charts to mark peak viewing times.'
  });

  const heavyMovieShare = summary.mediaTypeDistribution.find((m) => m.name === 'movie');
  if (heavyMovieShare && heavyMovieShare.value > summary.totalPlays * 0.6) {
    ideas.push({
      title: 'Balance movie vs. TV analytics',
      description: 'Movies dominate your history, so breakout charts for runtimes and franchises will be more helpful than per-episode stats.',
      action: 'Add a "franchise focus" card that groups movies by series (e.g., MCU) with total hours and last watch.'
    });
  } else {
    ideas.push({
      title: 'Lean into binge tracking',
      description: 'TV makes up a big slice of your viewing. Highlight streaks and per-show session lengths to surface binge behavior.',
      action: 'Add a streak counter and “episodes per session” chart for the top 3 shows this month.'
    });
  }

  const topMovies = pickTop(summary.topMovies, 2);
  if (topMovies.length > 0) {
    ideas.push({
      title: 'Surface rewatch champions',
      description: `Titles like ${topMovies.map((m) => m.name).join(' & ')} are repeat favorites. Make them easy to filter and export.`,
      action: 'Add quick filters on reports for top titles and expose “rewatch count” as a column.'
    });
  }

  ideas.push({
    title: 'Export with context',
    description: 'CSV exports are more useful when they include user and device columns with readable headers.',
    action: 'Append viewer name and player device to exports so teams can reconcile watch parties or shared screens.'
  });

  return ideas;
};
