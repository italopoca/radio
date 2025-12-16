import React from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onChange }) => {
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-3 w-full max-w-[200px] group">
      <button 
        onClick={() => onChange(volume === 0 ? 0.5 : 0)}
        className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        aria-label="Toggle mute"
      >
        <Icon size={20} />
      </button>
      
      <div className="relative flex-1 h-1.5 bg-slate-700 rounded-full cursor-pointer group hover:h-2 transition-all">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Volume control"
        />
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full pointer-events-none transition-all"
          style={{ width: `${volume * 100}%` }}
        />
        {/* Thumb indicator on hover */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${volume * 100}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>
    </div>
  );
};

export default VolumeControl;