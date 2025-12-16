export type BroadcastStatus = 'LIVE' | 'AUTODJ';

export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  error: string | null;
  currentTrack: string;
  history: string[];
  coverUrl: string | null;
  notificationsEnabled: boolean;
}

export interface RadioPlayerProps {
  streamUrl: string;
  broadcastStatus: BroadcastStatus;
}