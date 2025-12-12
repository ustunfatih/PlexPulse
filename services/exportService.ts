import { PlayHistoryItem, AnalyticsSummary, YearlyReport } from '../types';

/**
 * Export data to CSV format
 */
export const exportToCSV = (data: PlayHistoryItem[], filename: string = 'plexpulse-export.csv') => {
  // CSV Headers
  const headers = ['Title', 'Type', 'Date', 'Duration (minutes)', 'User', 'Show/Series', 'Season'];
  
  // Convert data to CSV rows
  const rows = data.map(item => [
    item.title || '',
    item.type || 'unknown',
    item.date ? item.date.toISOString().split('T')[0] : '',
    item.durationMinutes?.toString() || '0',
    item.user || '',
    item.grandparentTitle || '',
    item.parentTitle || ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export summary statistics to CSV
 */
export const exportSummaryToCSV = (summary: AnalyticsSummary, filename: string = 'plexpulse-summary.csv') => {
  const rows: string[] = [];
  
  rows.push('PlexPulse Analytics Summary');
  rows.push('');
  rows.push(`Total Plays,${summary.totalPlays}`);
  rows.push(`Total Duration (hours),${summary.totalDurationHours}`);
  rows.push('');
  rows.push('Top Movies');
  rows.push('Name,Plays,Total Duration (minutes),Last Watched');
  summary.topMovies.slice(0, 20).forEach(movie => {
    rows.push(`"${movie.name}",${movie.count},${movie.totalDurationMinutes},${movie.lastWatched.toISOString().split('T')[0]}`);
  });
  rows.push('');
  rows.push('Top Shows');
  rows.push('Name,Plays,Total Duration (minutes),Last Watched');
  summary.topShows.slice(0, 20).forEach(show => {
    rows.push(`"${show.name}",${show.count},${show.totalDurationMinutes},${show.lastWatched.toISOString().split('T')[0]}`);
  });
  rows.push('');
  rows.push('Plays by Hour');
  rows.push('Hour,Count');
  summary.playsByHour.forEach(h => {
    rows.push(`${h.hour},${h.count}`);
  });
  rows.push('');
  rows.push('Plays by Day of Week');
  rows.push('Day,Count');
  summary.playsByDayOfWeek.forEach(d => {
    rows.push(`${d.day},${d.count}`);
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export yearly report to CSV
 */
export const exportYearlyReportToCSV = (report: YearlyReport, filename: string = `plexpulse-report-${report.year}.csv`) => {
  const rows: string[] = [];
  
  rows.push(`PlexPulse Yearly Report - ${report.year}`);
  rows.push('');
  rows.push(`Total Hours,${report.totalHours}`);
  rows.push(`Total Plays,${report.totalPlays}`);
  rows.push(`Active Days,${report.activeDays}`);
  rows.push(`Longest Streak,${report.longestStreak} days`);
  rows.push(`Busiest Month,${report.busiestMonth}`);
  rows.push('');
  rows.push('Monthly Breakdown');
  rows.push('Month,Total Hours,Top Item,Top Item Type,Play Count,Binge Score');
  report.monthlyBreakdown.forEach(month => {
    rows.push(`"${month.monthName}",${month.totalHours},"${month.topItem}","${month.topItemType}",${month.playCount},${month.bingeScore}`);
  });
  rows.push('');
  rows.push('Daily Activity');
  rows.push('Date,Count');
  report.dailyActivity.forEach(day => {
    rows.push(`${day.date},${day.count}`);
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export dashboard as PDF (using html2canvas and jsPDF)
 * Note: This requires additional libraries - html2canvas and jspdf
 * This function uses string-based dynamic imports to avoid build-time errors
 */
export const exportDashboardToPDF = async (
  elementId: string, 
  filename: string = 'plexpulse-dashboard.pdf'
): Promise<void> => {
  try {
    // String-based dynamic import to avoid build-time resolution
    // @ts-ignore - Dynamic import with string to prevent build errors
    const html2canvasModule = await import(/* @vite-ignore */ 'html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;
    
    // @ts-ignore - Dynamic import with string to prevent build errors
    const jspdfModule = await import(/* @vite-ignore */ 'jspdf');
    const { jsPDF } = jspdfModule;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    // Create canvas from element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#000000'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF export failed:', error);
    // Fallback: Show error message
    alert('PDF export requires additional libraries. Please install html2canvas and jspdf, or use CSV export instead.');
  }
};

