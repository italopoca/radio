import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerState } from '../types';

export const useRadio = (url: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const currentTrackRef = useRef<string>("Conectando...");
  
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    isLoading: true,
    volume: 0.5, // Começa em 50%
    error: null,
    currentTrack: "Conectando...",
    history: [],
    coverUrl: null,
    notificationsEnabled: false,
  });

  const getMountKey = (streamUrl: string) => {
    const parts = streamUrl.split('/');
    return parts[parts.length - 1];
  };

  const fetchCoverArt = async (query: string) => {
    try {
        const cleanQuery = query.replace(/ft\.|feat\.|original mix|remix/gi, '').trim();
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&limit=1`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0].artworkUrl100.replace('100x100', '600x600');
        }
        return null;
    } catch (e) {
        return null;
    }
  };

  useEffect(() => {
    if (state.notificationsEnabled && state.currentTrack && state.currentTrack !== "Conectando..." && state.currentTrack !== "Rádio Ao Vivo") {
      if (Notification.permission === 'granted') {
        try {
          new Notification("No Ar 🔴", {
            body: state.currentTrack,
            icon: state.coverUrl || undefined,
            silent: true
          });
        } catch (e) {
          console.error("Notification failed", e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTrack]);

  const toggleNotifications = useCallback(async () => {
    if (state.notificationsEnabled) {
      setState(s => ({ ...s, notificationsEnabled: false }));
    } else {
      if (!("Notification" in window)) {
        alert("Este navegador não suporta notificações de desktop.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setState(s => ({ ...s, notificationsEnabled: true }));
        new Notification("Notificações Ativadas", {
          body: "Você será avisado quando a música mudar."
        });
      } else {
        setState(s => ({ ...s, notificationsEnabled: false }));
      }
    }
  }, [state.notificationsEnabled]);

  // --- Main Audio Effect ---
  useEffect(() => {
    let isMounted = true;
    
    // 1. Setup Audio Object
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = "anonymous"; // Necessário para visualizador
    audio.preload = "auto";
    audio.volume = state.volume; // Set initial volume
    
    // Referência global imediata
    audioRef.current = audio;

    // 2. Define Context Initializer (Lazy Load)
    // We do NOT call this immediately. We wait for the audio to actually start playing.
    // This prevents "Silent Autoplay" issues where AudioContext starts suspended.
    const initAudioContext = () => {
      if (audioContextRef.current) return; // Already exists

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; 
        
        try {
          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
  
          audioContextRef.current = ctx;
          analyserRef.current = analyser;
          sourceRef.current = source;
        } catch (e) {
          console.warn("Visualizer setup warning (CORS restricted?)", e);
        }
      }
    };

    // 3. Event Handlers
    const handleLoadStart = () => {
        if(isMounted) setState(s => ({ ...s, isLoading: true, error: null }));
    };
    
    const handleCanPlay = () => {
        if(isMounted) setState(s => ({ ...s, isLoading: false }));
    };
    
    const handlePlaying = () => {
        if(isMounted) {
            setState(s => ({ ...s, isPlaying: true, isLoading: false, error: null }));
            
            // NOW we initialize/resume the visualizer, ensuring audio is already flowing
            initAudioContext();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume().catch(() => {});
            }
        }
    };
    
    const handlePause = () => {
        if(isMounted) setState(s => ({ ...s, isPlaying: false }));
    };
    
    const handleError = (e: Event) => {
        if(!isMounted) return;
        const target = e.target as HTMLAudioElement;
        if (target.error && target.error.code !== target.error.MEDIA_ERR_ABORTED) {
            console.error("Audio Error:", target.error);
            setState(s => ({ 
                ...s, 
                isPlaying: false, 
                isLoading: false, 
                error: "Clique no Play." 
            }));
        }
    };
    
    // Add Listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // 4. Force Autoplay
    const startPlayback = async () => {
        try {
            await audio.play();
        } catch (error) {
            console.log("Autoplay blocked by browser. User interaction needed.");
            if (isMounted) setState(s => ({ ...s, isPlaying: false, isLoading: false }));
        }
    };
    startPlayback();

    // 5. Metadata Logic
    let eventSource: EventSource | null = null;
    try {
        const mountKey = getMountKey(url);
        eventSource = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${mountKey}`);
        
        eventSource.onmessage = async (e) => {
            if (!isMounted) return;
            if (e.data) {
                try {
                    const data = JSON.parse(e.data);
                    const newTitle = data.streamTitle;

                    if (newTitle && newTitle !== currentTrackRef.current) {
                        const previousTrack = currentTrackRef.current;
                        
                        setState(s => {
                            let newHistory = s.history;
                            if (previousTrack !== "Conectando..." && previousTrack !== "Rádio Ao Vivo") {
                                newHistory = [previousTrack, ...s.history].slice(0, 10);
                            }
                            return { 
                                ...s, 
                                currentTrack: newTitle,
                                history: newHistory
                            };
                        });

                        currentTrackRef.current = newTitle;

                        let artUrl = data.image || null;
                        if (!artUrl && newTitle !== "Rádio Ao Vivo") {
                            artUrl = await fetchCoverArt(newTitle);
                        }

                        if(isMounted) setState(s => ({ ...s, coverUrl: artUrl }));
                    }
                } catch (jsonErr) {}
            }
        };
    } catch (err) {
        // Silent catch
    }

    return () => {
      isMounted = false;
      audio.pause();
      audio.src = "";
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      
      if (eventSource) eventSource.close();
      audioRef.current = null;
    };
  }, [url]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;

    // Critical: Resume context on user interaction if it was suspended
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
    }

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      setState(s => ({ ...s, isLoading: true, error: null }));
      try {
          if (!audioRef.current.src) audioRef.current.src = url;
          await audioRef.current.play();
      } catch (error) {
          console.error("Play retry failed", error);
          setState(s => ({ ...s, isLoading: false, isPlaying: false }));
          // Fallback: force reload
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
      }
    }
  }, [state.isPlaying, url]);

  const setVolume = useCallback((val: number) => {
    const newVolume = Math.max(0, Math.min(1, val));
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setState(s => ({ ...s, volume: newVolume }));
  }, []);

  const reloadStream = useCallback(() => {
    if (!audioRef.current) return;
    setState(s => ({ ...s, isLoading: true, error: null }));
    audioRef.current.src = url;
    audioRef.current.load();
    audioRef.current.play().catch(() => {
        setState(s => ({ ...s, isLoading: false, isPlaying: false }));
    });
  }, [url]);

  return {
    ...state,
    togglePlay,
    setVolume,
    reloadStream,
    toggleNotifications,
    analyser: analyserRef.current 
  };
};