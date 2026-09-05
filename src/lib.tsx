import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type Player = {
  id: string;
  discord_nickname: string;
  discord_username: string;
  participant_code: string;
  coins: number;
  rank: number | null;
  created_at: string;
};
export type CoinTransaction = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  admin_id: string | null;
  discord_nickname?: string;
};
export type User = Player & {
  discord_id: string;
  status: string;
  games_played: number;
  daily_games: number;
  daily_complete: boolean;
  transactions: CoinTransaction[];
  best_results: { id: string; name: string; best_score: number; best_reward: number; games_played: number }[];
  achievements: { achievement_key: string; created_at: string }[];
};
export type Game = {
  id: string;
  engine: string;
  name: string;
  description: string;
  max_reward: number;
  category: string;
  difficulty: string;
  accent: string;
  tag: string;
  enabled: number;
  attempts_left: number;
  played_today: number;
  cooldown_until: number | null;
};
export type Reward = { place: number; title: string; items: string[] };
export type EventSettings = {
  event_name: string;
  start_date: string;
  end_date: string;
  event_status: string;
  rewards: Reward[];
  final_results: Player[] | null;
  finalized_at: string | null;
};
export type Bootstrap = {
  user: User | null;
  games: Game[];
  leaderboard: Player[];
  event: EventSettings;
  total_players: number;
  server_time: number;
};
// Each engine has a different public projection; secret state is never part of this protocol.
export type GameState = {
  engine: string;
  version: number;
  score: number;
  finished: boolean;
  won?: boolean;
  message?: string;
  expiresAt: number;
  startedAt: number;
  [key: string]: any;
};
export type GameSession = {
  id: string;
  state: GameState;
  result?: { coins: number; bonus: number; score: number } | null;
};
export class ApiError extends Error {
  status: number;
  state?: GameState;
  constructor(message: string, status: number, state?: GameState) {
    super(message);
    this.status = status;
    this.state = state;
  }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const payload = await response.json();
  if (!response.ok)
    throw new ApiError(payload.error || 'Не удалось выполнить запрос.', response.status, payload.state);
  return payload;
}
export const post = <T = any,>(path: string, body: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T = any,>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const number = (n: number = 0) => new Intl.NumberFormat('ru-RU').format(n);
export const date = (d: string, short = false) =>
  new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    ...(short ? {} : { year: 'numeric' }),
  });
// Event boundaries are shared by all players; never shift them to a browser's local calendar.
export const eventDateTime = (d: string) =>
  `${new Date(d).toLocaleString('ru-RU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })} UTC`;
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Произошла ошибка. Попробуй ещё раз.';
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
type AppContextValue = {
  data: Bootstrap | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  acceptAuthenticatedUser: (user: User) => void;
  notify: (message: string, type?: Toast['type']) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
  copy: (value: string, label?: string) => Promise<void>;
  authMode: 'register' | 'login';
  setAuthMode: (mode: 'register' | 'login') => void;
  rulesOpen: boolean;
  setRulesOpen: (open: boolean) => void;
  recovery: string | null;
  setRecovery: (key: string | null) => void;
};
const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]),
    [authMode, setAuthMode] = useState<'register' | 'login'>('register'),
    [rulesOpen, setRulesOpen] = useState(false),
    [recovery, setRecovery] = useState<string | null>(null);
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const d = await api<Bootstrap>('/bootstrap');
      if (version !== refreshVersion.current) return;
      setData(d);
      setError('');
    } catch (e) {
      if (version === refreshVersion.current) setError(errorMessage(e));
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);
  const acceptAuthenticatedUser = useCallback((user: User) => {
    // Authentication already returns the complete server-owned profile. Do not wait for another request,
    // or let an older guest bootstrap response overwrite the newly authenticated participant.
    ++refreshVersion.current;
    setData((current) => (current ? { ...current, user } : current));
    setError('');
    setLoading(false);
  }, []);
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);
    const visibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [refresh]);
  const notify = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((v) => v.id !== id)), 5000);
  }, []);
  const copy = useCallback(
    async (value: string, label = 'Скопировано') => {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
        else {
          const el = document.createElement('textarea');
          el.value = value;
          el.style.position = 'fixed';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.select();
          const ok = document.execCommand('copy');
          el.remove();
          if (!ok) throw new Error();
        }
        notify(label, 'success');
      } catch {
        notify('Не удалось скопировать. Выдели и скопируй текст вручную.', 'error');
      }
    },
    [notify],
  );
  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        error,
        refresh,
        acceptAuthenticatedUser,
        notify,
        toasts,
        dismiss: (id) => setToasts((t) => t.filter((v) => v.id !== id)),
        copy,
        authMode,
        setAuthMode,
        rulesOpen,
        setRulesOpen,
        recovery,
        setRecovery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
