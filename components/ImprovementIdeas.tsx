import React from 'react';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { ImprovementIdea } from '../types';
import { APP_COLORS } from '../constants';

interface ImprovementIdeasProps {
  ideas: ImprovementIdea[];
}

export const ImprovementIdeas: React.FC<ImprovementIdeasProps> = ({ ideas }) => {
  if (!ideas.length) return null;

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gray-800/50 p-2 rounded-lg">
          <Lightbulb className="w-5 h-5 text-[#e5a00d]" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">Improvement ideas</h3>
          <p className="text-xs text-gray-400">Actionable tweaks to make the dashboard and charts clearer.</p>
        </div>
      </div>

      <div className="space-y-4">
        {ideas.map((idea) => (
          <div
            key={idea.title}
            className="border border-white/5 rounded-2xl p-4 bg-[#0f1115]"
          >
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              {idea.title}
            </h4>
            <p className="text-sm text-gray-300 mt-1 leading-relaxed">{idea.description}</p>
            <p
              className="text-xs font-semibold mt-2 uppercase tracking-wide"
              style={{ color: APP_COLORS.accent }}
            >
              Next: {idea.action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
