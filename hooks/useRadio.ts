import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerState, HistoryItem } from '../types';
import { supabase, VAPID_PUBLIC_KEY } from '../lib/supabaseClient';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
 
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
 
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useRadio = (url: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const currentTrackRef = useRef<string>("Conectando...");
  
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    isLoading: true,
    volume: 0.5,
    error: null,
    currentTrack: "Conectando...",
    history: [],
    coverUrl: null,
    notificationsEnabled: false,
  });

  // --- Initial Check for Notification Permission ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission === 'granted') {
      setState(s => ({ ...s, notificationsEnabled: true }));
    }
  }, []);

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

  // --- Load History ---
  useEffect(() => {
    const loadHistory = async () => {
        const { data, error } = await supabase
            .from('play_history')
            .select('*')
            .order('played_at', { ascending: false })
            .limit(50);

        if (data && !error) {
            setState(s => ({ ...s, history: data as HistoryItem[] }));
        }
    };
    loadHistory();
  }, []);

  const saveTrackToSupabase = async (song: string, artist: string, cover: string | null) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const { data: existing } = await supabase
            .from('play_history')
            .select('id')
            .eq('song', song)
            .eq('artist', artist)
            .gte('played_at', todayISO)
            .limit(1);

        if (!existing || existing.length === 0) {
            await supabase.from('play_history').insert([{ song, artist, cover_url: cover }]);
            // Refresh
            const { data: freshData } = await supabase
                .from('play_history')
                .select('*')
                .order('played_at', { ascending: false })
                .limit(50);
            if (freshData) setState(s => ({ ...s, history: freshData as HistoryItem[] }));
        }
      } catch (err) {}
  };

  const toggleNotifications = useCallback(async () => {
    if (state.notificationsEnabled) {
      // Just visually disable, cannot revoke browser perm programmatically easily
      setState(s => ({ ...s, notificationsEnabled: false }));
    } else {
      if (!("Notification" in window)) {
        alert("Navegador não suporta notificações.");
        return;
      }
      
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        setState(s => ({ ...s, notificationsEnabled: true }));
        
        // --- SUBSCRIBE FOR PUSH (DATA COLLECTION) ---
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.ready;
                const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                
                const subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                });

                // Save to DB correctly formatted
                const { error } = await supabase
                    .from('push_subscriptions')
                    .upsert({ subscription: subscription.toJSON() }, { onConflict: 'subscription' });

                if (error) {
                    console.warn("Falha ao salvar usuário no DB (Talvez falte criar a tabela):", error);
                }

                reg.showNotification("Notificações Ativadas", { 
                    body: "Você receberá alertas da rádio!",
                    icon: '/icon.png',
                    vibrate: [100, 50, 100]
                } as any);

            } catch (err) {
                console.error("Push Sub Error:", err);
                // Fallback
                new Notification("Notificações Ativadas", { body: "Alertas ativados." });
            }
        }
      } else {
        alert("Permissão necessária para notificações.");
      }
    }
  }, [state.notificationsEnabled]);

  // --- Audio Logic ---
  useEffect(() => {
    let isMounted = true;
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = state.volume;
    audioRef.current = audio;

    const initAudioContext = () => {
      if (audioContextRef.current) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; 
        analyser.smoothingTimeConstant = 0.8;
        
        try {
          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          audioContextRef.current = ctx;
          analyserRef.current = analyser;
          sourceRef.current = source;
        } catch (e) {}
      }
    };

    const handleLoadStart = () => { if(isMounted) setState(s => ({ ...s, isLoading: true, error: null })); };
    const handleCanPlay = () => { if(isMounted) setState(s => ({ ...s, isLoading: false })); };
    const handlePlaying = () => {
        if(isMounted) {
            setState(s => ({ ...s, isPlaying: true, isLoading: false, error: null }));
            initAudioContext();
            if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume().catch(() => {});
        }
    };
    const handlePause = () => { if(isMounted) setState(s => ({ ...s, isPlaying: false })); };
    const handleError = (e: Event) => {
        if(!isMounted) return;
        const target = e.target as HTMLAudioElement;
        if (target.error && target.error.code !== target.error.MEDIA_ERR_ABORTED) {
            setState(s => ({ ...s, isPlaying: false, isLoading: false, error: "Toque para iniciar" }));
        }
    };
    
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    audio.play().catch(() => { if (isMounted) setState(s => ({ ...s, isPlaying: false, isLoading: false })); });

    // Metadata & Visualizer Logic
    let eventSource: EventSource | null = null;
    try {
        const mountKey = getMountKey(url);
        eventSource = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${mountKey}`);
        
        eventSource.onmessage = async (e) => {
            if (!isMounted || !e.data) return;
            try {
                const data = JSON.parse(e.data);
                const newTitle = data.streamTitle;

                if (newTitle && newTitle !== currentTrackRef.current) {
                    currentTrackRef.current = newTitle;
                    let artUrl = data.image || null;
                    if (!artUrl && newTitle !== "Rádio Ao Vivo") artUrl = await fetchCoverArt(newTitle);

                    if (newTitle !== "Conectando..." && newTitle !== "Rádio Ao Vivo") {
                        let artist = "Desconhecido", song = newTitle;
                        if (newTitle.includes(' - ')) {
                            const parts = newTitle.split(' - ');
                            artist = parts[0];
                            song = parts.slice(1).join(' - ');
                        }
                        saveTrackToSupabase(song, artist, artUrl);
                    }

                    if (isMounted) setState(s => ({ ...s, currentTrack: newTitle, coverUrl: artUrl }));
                }
            } catch (jsonErr) {}
        };
    } catch (err) {}

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
    if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume().catch(() => {});
    
    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      setState(s => ({ ...s, isLoading: true, error: null }));
      try {
          if (!audioRef.current.src) audioRef.current.src = url;
          await audioRef.current.play();
      } catch (error) {
          setState(s => ({ ...s, isLoading: false, isPlaying: false }));
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
      }
    }
  }, [state.isPlaying, url]);

  const setVolume = useCallback((val: number) => {
    const newVolume = Math.max(0, Math.min(1, val));
    if (audioRef.current) audioRef.current.volume = newVolume;
    setState(s => ({ ...s, volume: newVolume }));
  }, []);

  const reloadStream = useCallback(() => {
    if (!audioRef.current) return;
    setState(s => ({ ...s, isLoading: true, error: null }));
    audioRef.current.src = url;
    audioRef.current.load();
    audioRef.current.play().catch(() => { setState(s => ({ ...s, isLoading: false, isPlaying: false })); });
  }, [url]);

  return { ...state, togglePlay, setVolume, reloadStream, toggleNotifications, analyser: analyserRef.current };
};