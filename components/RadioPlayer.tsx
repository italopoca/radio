import React from 'react';
import { Play, Pause, RefreshCw, Radio, Music, Share2, Disc, Bell, BellOff } from 'lucide-react';
import { useRadio } from '../hooks/useRadio';
import { RadioPlayerProps } from '../types';
import Visualizer from './Visualizer';
import VolumeControl from './VolumeControl';
import TrackHistory from './TrackHistory';

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ streamUrl }) => {
  const { 
    isPlaying, 
    isLoading, 
    error, 
    volume, 
    togglePlay, 
    setVolume, 
    reloadStream, 
    currentTrack, 
    history, 
    coverUrl, 
    analyser,
    notificationsEnabled,
    toggleNotifications
  } = useRadio(streamUrl);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getTrackDetails = (trackString: string) => {
    if (trackString.includes(' - ')) {
        const [artist, ...songParts] = trackString.split(' - ');
        return { artist, song: songParts.join(' - ') };
    }
    return { artist: 'Tenda Cast', song: trackString };
  };

  const { artist, song } = getTrackDetails(currentTrack);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-8">
      
      {/* --- Main Player Card --- */}
      <div className="w-full max-w-md mx-auto lg:mx-0 flex-shrink-0">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative group">
          
          {/* Background Blurred Cover Effect */}
          {coverUrl && (
            <div 
                className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl scale-125 pointer-events-none transition-all duration-1000"
                style={{ backgroundImage: `url(${coverUrl})` }}
            ></div>
          )}
          
          {/* Top Controls / Status */}
          <div className="relative p-6 flex justify-between items-start z-10">
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-2 ${
                  isPlaying 
                  ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                  : 'bg-slate-700/50 border-slate-600/50 text-slate-400'
              }`}>
                  {isPlaying && (
                      <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                  )}
                  {isPlaying ? 'Ao Vivo' : 'Offline'}
              </div>

              <div className="flex items-center gap-2">
                  <button 
                      onClick={toggleNotifications}
                      className={`p-2 transition-colors rounded-full hover:bg-white/5 ${
                          notificationsEnabled ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                      }`}
                      title={notificationsEnabled ? "Notificações ativadas" : "Ativar notificações de música"}
                  >
                      {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                  </button>
                  <button 
                      onClick={handleShare}
                      className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                      title="Compartilhar"
                  >
                      <Share2 size={18} />
                  </button>
              </div>
          </div>

          {/* Album Art Area */}
          <div className="relative px-8 pt-4 pb-8 flex flex-col items-center justify-center z-10">
              
              {/* Cover Art Container */}
              <div className="relative w-64 h-64 mb-6 shadow-2xl rounded-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 ease-out border border-white/10 bg-slate-900">
                  {coverUrl ? (
                      <img 
                          src={coverUrl} 
                          alt={`${artist} - ${song}`}
                          className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-out]"
                          onError={(e) => {
                              // Fallback if image fails
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                      />
                  ) : null}
                  
                  {/* Fallback Placeholder (shown if no cover or error) */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900 ${coverUrl ? 'hidden' : ''}`}>
                      <Disc size={64} className={`text-slate-600 mb-2 ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`} />
                      <span className="text-slate-500 text-xs font-medium uppercase tracking-widest">Tenda Cast</span>
                  </div>
              </div>

              {/* Track Info */}
              <div className="text-center space-y-1 px-2 w-full">
                  <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md line-clamp-1" title={song}>
                      {song}
                  </h2>
                  <p className="text-base text-indigo-300 font-medium line-clamp-1" title={artist}>
                      {artist}
                  </p>
              </div>
          </div>

          {/* Visualizer */}
          <div className="relative px-6 pb-2 h-16 flex items-center justify-center z-10">
              <Visualizer isPlaying={isPlaying} analyser={analyser} />
          </div>

          {/* Error Message */}
          {error && (
              <div className="relative mx-6 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 z-10">
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                  <p className="text-xs text-red-200">{error}</p>
                  <button 
                      onClick={reloadStream}
                      className="ml-auto p-1.5 hover:bg-red-500/20 rounded-full transition-colors"
                  >
                      <RefreshCw size={14} className="text-red-300" />
                  </button>
              </div>
          )}

          {/* Controls */}
          <div className="relative p-6 bg-slate-900/40 backdrop-blur-md border-t border-white/5 space-y-6 z-10">
              {/* Play/Pause Button Area */}
              <div className="flex items-center justify-center gap-8">
                  <button 
                      onClick={reloadStream}
                      className="p-3 text-slate-400 hover:text-white transition-all hover:bg-white/5 rounded-full"
                      title="Recarregar Stream"
                  >
                      <RefreshCw size={20} />
                  </button>

                  <button 
                      onClick={togglePlay}
                      disabled={isLoading}
                      className="relative group disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                      <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                      <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200">
                          {isLoading ? (
                              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : isPlaying ? (
                              <Pause size={28} className="text-indigo-600 fill-current" />
                          ) : (
                              <Play size={28} className="text-indigo-600 fill-current ml-1" />
                          )}
                      </div>
                  </button>

                  <button 
                      className="p-3 text-slate-400 hover:text-white transition-all hover:bg-white/5 rounded-full"
                      title="Informações"
                  >
                      <Music size={20} />
                  </button>
              </div>

              {/* Volume */}
              <div className="flex justify-center pt-2">
                  <VolumeControl volume={volume} onChange={setVolume} />
              </div>
          </div>
        </div>
      </div>

      {/* --- History Panel --- */}
      <div className="w-full max-w-md mx-auto lg:mx-0 flex-shrink-0">
         <TrackHistory history={history} />
      </div>

    </div>
  );
};