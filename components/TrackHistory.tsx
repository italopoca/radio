import React from 'react';
import { Clock, Music2, ExternalLink } from 'lucide-react';

interface TrackHistoryProps {
  history: string[];
}

// Ícones SVG Simples para as marcas
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const YoutubeMusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
    <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="currentColor" />
    <path d="M9.5 8.5v7l6-3.5z" fill="white"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M22.586 5.89l-1.034-.258c-1.354-.337-1.859-.464-2.812-1.517-1.464-1.619-4.329-2.222-7.238-1.523-2.909.699-5.116 2.818-5.578 5.352-.303 1.666-.34 3.755.77 5.252.016.022.034.043.053.062.062.064.086.155.062.241-.061.21-.295.334-.503.267-.803-.257-1.636-.214-2.428.124-1.776.758-2.404 2.812-1.402 4.588.667 1.182 1.993 1.815 3.328 1.59 1.838-.309 3.018-2.126 2.658-4.088l-.022-.116c2.722-.593 5.385-1.583 6.643-2.463l.389-.272c2.083-1.458 3.518-2.85 4.161-4.082.977-1.874.685-2.618 2.952-3.157zm-11.45 12.016c-.958.161-1.912-.294-2.392-1.144-.439-.778-.387-1.748.126-2.48.514-.733 1.34-1.106 2.213-1.002.046.006.091.014.136.024l.033.181c.259 1.411-.589 2.719-1.911 2.941l1.795 1.48z"/>
  </svg>
);

const DeezerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M10.66 8.35h2.64v7.3h-2.64zM1.77 11.23h2.64v4.42H1.77zM6.21 11.23h2.65v4.42H6.21zM15.1 8.35h2.65v7.3H15.1zM19.55 4.63h2.64v11.02h-2.64z"/>
  </svg>
);

const TrackHistory: React.FC<TrackHistoryProps> = ({ history }) => {
  // Helper to split "Artist - Song"
  const getTrackDetails = (trackString: string) => {
    if (trackString.includes(' - ')) {
        const [artist, ...songParts] = trackString.split(' - ');
        return { artist, song: songParts.join(' - ') };
    }
    return { artist: '', song: trackString };
  };

  const getSearchLink = (platform: string, artist: string, song: string) => {
    const query = encodeURIComponent(`${artist} ${song}`);
    switch (platform) {
        case 'spotify': return `https://open.spotify.com/search/${query}`;
        case 'youtube': return `https://music.youtube.com/search?q=${query}`;
        case 'apple': return `https://music.apple.com/us/search?term=${query}`;
        case 'deezer': return `https://www.deezer.com/search/${query}`;
        default: return '#';
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[400px] md:h-[600px]">
      <div className="p-6 border-b border-white/5 bg-slate-900/30">
        <div className="flex items-center gap-2 text-indigo-300 mb-1">
          <Clock size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Histórico</span>
        </div>
        <h3 className="text-lg font-bold text-white">Tocadas Recentemente</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Music2 size={32} className="opacity-20" />
            <p className="text-sm">As músicas aparecerão aqui.</p>
          </div>
        ) : (
          history.map((track, index) => {
            const { artist, song } = getTrackDetails(track);
            const displayArtist = artist || 'Tenda Cast';

            return (
              <div 
                key={`${track}-${index}`}
                className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{song}</p>
                    {artist && (
                      <p className="text-xs text-slate-500 truncate group-hover:text-indigo-200 transition-colors">{artist}</p>
                    )}
                  </div>
                </div>

                {/* Platform Links */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <PlatformLink 
                        url={getSearchLink('spotify', displayArtist, song)} 
                        name="Spotify" 
                        icon={<SpotifyIcon />} 
                        hoverColor="hover:text-[#1DB954]"
                    />
                    <PlatformLink 
                        url={getSearchLink('youtube', displayArtist, song)} 
                        name="YouTube Music" 
                        icon={<YoutubeMusicIcon />} 
                        hoverColor="hover:text-red-500"
                    />
                    <PlatformLink 
                        url={getSearchLink('apple', displayArtist, song)} 
                        name="Apple Music" 
                        icon={<AppleMusicIcon />} 
                        hoverColor="hover:text-pink-500"
                    />
                    <PlatformLink 
                        url={getSearchLink('deezer', displayArtist, song)} 
                        name="Deezer" 
                        icon={<DeezerIcon />} 
                        hoverColor="hover:text-purple-400"
                    />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const PlatformLink: React.FC<{ url: string; name: string; icon: React.ReactNode; hoverColor: string }> = ({ url, name, icon, hoverColor }) => (
    <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`relative group/link text-slate-500 transition-colors p-1.5 rounded-full hover:bg-white/10 ${hoverColor}`}
    >
        {icon}
        {/* Tooltip */}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-bold text-white bg-slate-900 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/link:opacity-100 transition-opacity pointer-events-none">
            {name}
            {/* Arrow */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
        </span>
    </a>
);

export default TrackHistory;