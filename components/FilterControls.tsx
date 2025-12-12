import React from 'react';
import { Users, ChevronDown, Film, Tv } from 'lucide-react';

export type MediaTypeOption = 'all' | 'movie' | 'episode';

interface UserFilterDropdownProps {
  users: string[];
  selected: string;
  onSelect: (user: string) => void;
}

export const UserFilterDropdown: React.FC<UserFilterDropdownProps> = ({ users, selected, onSelect }) => (
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
      {users.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
      <ChevronDown className="w-4 h-4" />
    </div>
  </div>
);

interface MediaTypeSelectorProps {
  selected: MediaTypeOption;
  onSelect: (value: MediaTypeOption) => void;
}

export const MediaTypeSelector: React.FC<MediaTypeSelectorProps> = ({ selected, onSelect }) => (
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

