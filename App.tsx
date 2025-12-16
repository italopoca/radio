import React, { useState, useEffect } from 'react';
import { RadioPlayer } from './components/RadioPlayer';
import { Radio } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { BroadcastStatus } from './types';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<BroadcastStatus>('LIVE');

  // --- GLOBAL STATE SYNCHRONIZATION ---
  useEffect(() => {
    // 1. Initial Fetch
    const fetchInitialStatus = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('status')
        .eq('id', 1)
        .single();
      
      if (data && (data.status === 'LIVE' || data.status === 'AUTODJ')) {
        setBroadcastStatus(data.status as BroadcastStatus);
      }
    };
    fetchInitialStatus();

    // 2. Realtime Subscription (Updates status automatically without refresh)
    const channel = supabase
      .channel('global_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new && payload.new.status) {
             setBroadcastStatus(payload.new.status as BroadcastStatus);
          }
        }
      )
      .subscribe();

    // 3. Realtime Broadcast Listener (Trigger Notifications for Users)
    const alertChannel = supabase
      .channel('broadcast_alerts')
      .on(
        'broadcast',
        { event: 'push_notification' },
        ({ payload }) => {
           // Create local notification when admin sends one
           if ("Notification" in window && Notification.permission === "granted") {
              // Register SW if needed to show via SW (more robust on mobile)
              if ('serviceWorker' in navigator) {
                 navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(payload.title, {
                        body: payload.message,
                        icon: payload.image || undefined,
                        vibrate: [200, 100, 200]
                    } as any);
                 });
              } else {
                 new Notification(payload.title, {
                     body: payload.message,
                     icon: payload.image
                 });
              }
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(alertChannel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decor - Optimized with hardware acceleration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div 
            className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] will-change-transform translate-z-0"
            style={{ transform: 'translate3d(0,0,0)' }}
        ></div>
        <div 
            className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] will-change-transform translate-z-0"
            style={{ transform: 'translate3d(0,0,0)' }}
        ></div>
      </div>

      <AdminPanel 
        isOpen={showAdmin} 
        onClose={() => setShowAdmin(false)}
        currentStatus={broadcastStatus}
        // Instead of local state set, we pass a dummy function because AdminPanel handles DB updates now
        onStatusChange={() => {}} 
      />

      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Zeno FM Player</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Web Streamer</p>
          </div>
        </div>
        
        {/* Secret Trigger on Click */}
        <div 
            onClick={() => setShowAdmin(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full cursor-pointer hover:bg-green-500/20 transition-colors select-none"
        >
          <div className={`w-2 h-2 rounded-full ${broadcastStatus === 'LIVE' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
          <span className={`text-xs font-medium ${broadcastStatus === 'LIVE' ? 'text-green-400' : 'text-blue-400'}`}>
            {broadcastStatus === 'LIVE' ? 'Online' : 'Auto DJ'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-4 sm:p-8">
        <RadioPlayer 
            streamUrl="https://stream.zeno.fm/o1yikowvzzwuv" 
            broadcastStatus={broadcastStatus}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-slate-500 text-sm border-t border-white/5 backdrop-blur-sm">
        <p>&copy; {new Date().getFullYear()} Zeno Web Player. Stream provided by Zeno FM.</p>
      </footer>
    </div>
  );
};

export default App;