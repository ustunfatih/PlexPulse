import React, { useState } from 'react';
import { Upload, AlertCircle, FileText } from 'lucide-react';
import { PlayHistoryItem } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: PlayHistoryItem[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n');
      if (lines.length < 2) throw new Error("File appears empty");

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      
      const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('name'));
      const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('started'));
      const durationIdx = headers.findIndex(h => h.includes('duration'));
      const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('media_type'));
      const grandparentIdx = headers.findIndex(h => h.includes('grandparent') || h.includes('show'));
      const userIdx = headers.findIndex(h => h.includes('user') || h.includes('friendly name'));

      if (titleIdx === -1 || dateIdx === -1) {
        throw new Error("Could not find required columns: 'Title' and 'Date'");
      }

      const items: PlayHistoryItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Simple CSV split (note: production apps should use a library like papaparse)
        const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));

        if (row.length < headers.length) continue;

        const title = row[titleIdx];
        const dateStr = row[dateIdx];
        const date = new Date(Number(dateStr) * 1000 || dateStr); 

        if (!title || isNaN(date.getTime())) continue;

        let duration = 0;
        if (durationIdx !== -1) {
            duration = parseInt(row[durationIdx]) || 0;
            if (duration > 10000) duration = duration / 60000; // ms to min
            else if (duration > 300) duration = duration / 60; // sec to min
        }

        let type: PlayHistoryItem['type'] = 'unknown';
        if (typeIdx !== -1) {
            const t = row[typeIdx].toLowerCase();
            if (t.includes('movie')) type = 'movie';
            else if (t.includes('episode') || t.includes('show')) type = 'episode';
            else if (t.includes('track')) type = 'track';
        } else {
            if (grandparentIdx !== -1 && row[grandparentIdx]) type = 'episode';
            else type = 'movie';
        }

        const grandparentTitle = grandparentIdx !== -1 ? row[grandparentIdx] : undefined;
        const user = userIdx !== -1 ? row[userIdx] : undefined;

        items.push({
          title,
          date,
          durationMinutes: Math.round(duration),
          type,
          grandparentTitle,
          user
        });
      }

      if (items.length === 0) throw new Error("No valid watch history found in rows.");
      onDataLoaded(items);

    } catch (err: any) {
      setError(err.message || "Failed to parse CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setError("Failed to read file");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto glass-card rounded-3xl p-1">
      <div className="bg-[#15171C] rounded-[22px] border border-white/5 p-8 flex flex-col items-center text-center space-y-6">
        
        <div className="w-16 h-16 bg-[#e5a00d]/10 rounded-2xl flex items-center justify-center">
          <Upload className="w-8 h-8 text-[#e5a00d]" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white">Upload History CSV</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
            Drag and drop or select your exported history file from Tautulli.
          </p>
        </div>
        
        <label className="cursor-pointer group relative overflow-hidden bg-white text-black px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]">
          <span className="relative z-10">Select CSV File</span>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>

        {loading && <p className="text-sm text-[#e5a00d] animate-pulse font-medium">Parsing data...</p>}
        
        {error && (
          <div className="flex items-center gap-3 text-red-200 bg-red-900/30 border border-red-500/20 p-4 rounded-xl text-sm w-full text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};