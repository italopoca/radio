export type BroadcastStatus = 'LIVE' | 'AUTODJ';

export interface HistoryItem {
  id?: string;
  song: string;
  artist: string;
  cover_url: string | null;
  played_at: string;
}

export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  error: string | null;
  currentTrack: string;
  history: HistoryItem[];
  coverUrl: string | null;
  notificationsEnabled: boolean;
}

export interface RadioPlayerProps {
  streamUrl: string;
  broadcastStatus: BroadcastStatus;
}
