import { Coins, LayoutDashboard, User, Dices, ShieldAlert, Menu, X, Gamepad2, LockKeyhole } from 'lucide-react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { GalacticBackground } from './components/GalacticBackground';

export const RANKS = [
  { id: 'F', tier: 'F', min: 0, max: 2249, color: '#95a5a6', emoji: '🔰', next: 2250 },
  { id: 'E', tier: 'E', min: 2250, max: 6749, color: '#7f8c8d', emoji: '⚪', next: 6750 },
  { id: 'D', tier: 'D', min: 6750, max: 13499, color: '#3498db', emoji: '🔵', next: 13500 },
  { id: 'C', tier: 'C', min: 13500, max: 22499, color: '#2ecc71', emoji: '🟢', next: 22500 },
  { id: 'B', tier: 'B', min: 22500, max: 33749, color: '#f39c12', emoji: '🟡', next: 33750 },
  { id: 'A', tier: 'A', min: 33750, max: 47249, color: '#e74c3c', emoji: '🔴', next: 47250 },
  { id: 'S', tier: 'S', min: 47250, max: Infinity, color: '#9b59b6', emoji: '🟣', next: Infinity },
];
export const PROFILE_RANKS = RANKS;
export type User = {
  id: string;
  username: string;
  avatarUrl: string;
};

const USER_STORAGE_KEY = 'ttfd-user';
const OAUTH_STATE_KEY = 'ttfd-discord-oauth-state';
const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize';

function getPublicConfig() {
  return window.__TTFD_CONFIG__ || {};
}

function readPublicEnv(name: keyof NonNullable<Window['__TTFD_CONFIG__']>) {
  const runtimeValue = getPublicConfig()[name];
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim();
  }

  const buildValue = import.meta.env[name];
  return typeof buildValue === 'string' ? buildValue.trim() : '';
}

function getAvatarUrl(user: { id: string; avatar?: string | null; discriminator?: string | null }) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  }
  const fallbackIndex = user.discriminator ? Number(user.discriminator) % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
}

type GameContextType = {
  xp: number;
  setXp: (v: number | ((prev: number) => number)) => void;
  coins: number;
  setCoins: (v: number | ((prev: number) => number)) => void;
  currentRank: typeof PROFILE_RANKS[0];
  isAdmin: boolean;
  user: User | null;
  apiBase: string;
  refreshUserProgress: () => Promise<any>;
  loginWithDiscord: () => void;
  logout: () => void;
  dashboardUser: Record<string, any> | null;
};

export function useGameContext() {
  return useOutletContext<GameContextType>();
}

export function Layout() {
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [dashboardUser, setDashboardUser] = useState<Record<string, any> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const apiBase = readPublicEnv('VITE_BOT_API_URL').replace(/\/$/, '');
  const discordClientId = readPublicEnv('VITE_DISCORD_CLIENT_ID');
  const discordRedirectUri = readPublicEnv('VITE_DISCORD_REDIRECT_URI') || `${window.location.origin}/auth/discord/callback`;
  const adminIds = readPublicEnv('VITE_ADMIN_IDS')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUser) {
      return;
    }

    try {
      setUser(JSON.parse(rawUser));
    } catch {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  async function refreshUserProgress() {
    if (!apiBase || !user?.id) {
      return null;
    }

    try {
      const response = await fetch(`${apiBase}/api/user/${user.id}`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data.success || !data.user) {
        return null;
      }

      setXp(Number(data.user.xp || 0));
      setCoins(Number(data.user.coins || 0));
      setDashboardUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Failed to load user progress', error);
      return null;
    }
  }

  useEffect(() => {
    if (user?.id) {
      void refreshUserProgress();
    }
  }, [apiBase, user?.id]);

  useEffect(() => {
    async function completeDiscordAuth(code: string, state: string | null) {
      const storedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
      if (storedState && state !== storedState) {
        throw new Error('OAuth state mismatch');
      }

      if (!apiBase) {
        throw new Error('VITE_BOT_API_URL is not configured');
      }

      const response = await fetch(`${apiBase}/api/auth/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: discordRedirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth exchange failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.user?.id) {
        throw new Error('Discord user payload is missing');
      }

      const nextUser = {
        id: data.user.id,
        username: data.user.global_name || data.user.username,
        avatarUrl: getAvatarUrl(data.user),
      };

      setUser(nextUser);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      window.sessionStorage.removeItem(OAUTH_STATE_KEY);
      navigate('/profile', { replace: true });
    }

    if (location.pathname !== '/auth/discord/callback') {
      return;
    }

    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (error) {
      console.error('Discord OAuth error', error);
      window.sessionStorage.removeItem(OAUTH_STATE_KEY);
      navigate('/profile', { replace: true });
      return;
    }

    if (!code) {
      navigate('/profile', { replace: true });
      return;
    }

    void completeDiscordAuth(code, state).catch((oauthError) => {
      console.error(oauthError);
      window.sessionStorage.removeItem(OAUTH_STATE_KEY);
      navigate('/profile', { replace: true });
    });
  }, [apiBase, discordRedirectUri, location.pathname, location.search, navigate]);

  const currentRank = PROFILE_RANKS.find((r) => xp >= r.min && xp <= r.max) || PROFILE_RANKS[0];
  const isAdmin = user ? adminIds.includes(user.id) : false;
  const isGamesRoute = location.pathname === '/games' || location.pathname.startsWith('/games/');

  const loginWithDiscord = () => {
    if (!discordClientId) {
      window.alert('Discord OAuth не настроен: отсутствует VITE_DISCORD_CLIENT_ID.');
      return;
    }

    const state = crypto.randomUUID();
    window.sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const params = new URLSearchParams({
      client_id: discordClientId,
      redirect_uri: discordRedirectUri,
      response_type: 'code',
      scope: 'identify email',
      state,
    });

    window.location.href = `${DISCORD_OAUTH_URL}?${params.toString()}`;
  };

  const logout = () => {
    setUser(null);
    setXp(0);
    setCoins(0);
    setDashboardUser(null);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.sessionStorage.removeItem(OAUTH_STATE_KEY);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative w-full overflow-x-hidden">
      <GalacticBackground />

      <nav className="ttfd-header sticky top-0 z-30 h-18 shrink-0" aria-label="Основная навигация">
        <div className="ttfd-header-brand flex items-center space-x-3 pointer-events-none">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-slate-950 font-black transition-colors duration-200"
            style={{
              background: `linear-gradient(to bottom right, ${currentRank.color}, #94a3b8)`,
              boxShadow: `0 0 24px ${currentRank.color}55`,
            }}
          >
            T
          </div>
          <span className="font-black tracking-tight text-xl hidden sm:block">
            TT<span className="text-slate-400 transition-colors duration-200" style={{ color: currentRank.color }}>FD</span>
          </span>
        </div>

        <div className="ttfd-header-actions">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="ttfd-pressable flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white px-4 py-2.5 rounded-2xl border border-white/10 hover:border-white/20 font-bold text-sm shadow-lg"
              aria-label="Навигация"
              aria-expanded={isMenuOpen}
              aria-controls="ttfd-navigation-menu"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="hidden sm:inline">Навигация</span>
            </button>

            {isMenuOpen && (
              <div id="ttfd-navigation-menu" onMouseDown={(event) => event.stopPropagation()} className="ttfd-popover ttfd-navigation-panel absolute right-0 top-[calc(100%+0.75rem)] w-[min(18rem,calc(100vw-2rem))] ttfd-shell rounded-[28px] overflow-hidden z-50 flex flex-col p-2">
                <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} className={`ttfd-pressable px-4 py-3 hover:bg-white/[0.06] rounded-2xl flex items-center gap-3 text-sm font-bold w-full text-left ${location.pathname === '/' ? 'text-white bg-white/[0.08]' : 'text-slate-400'}`}>
                  <LayoutDashboard size={18} /> Главная
                </button>
                <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className={`ttfd-pressable px-4 py-3 hover:bg-white/[0.06] rounded-2xl flex items-center gap-3 text-sm font-bold w-full text-left ${location.pathname === '/profile' ? 'text-white bg-white/[0.08]' : 'text-slate-400'}`}>
                  <User size={18} /> Кабинет
                </button>
                <button onClick={() => { navigate('/games'); setIsMenuOpen(false); }} className={`ttfd-pressable px-4 py-3 hover:bg-white/[0.06] rounded-2xl flex items-center gap-3 text-sm font-bold w-full text-left ${isGamesRoute ? 'text-white bg-white/[0.08]' : 'text-slate-400'}`}>
                  <Gamepad2 size={18} /> Игры
                </button>
                <button onClick={() => { navigate('/roulette'); setIsMenuOpen(false); }} className={`ttfd-pressable px-4 py-3 hover:bg-white/[0.06] rounded-2xl flex items-center gap-3 text-sm font-bold w-full text-left ${location.pathname === '/roulette' ? 'text-white bg-white/[0.08]' : 'text-slate-400'}`}>
                  <Dices size={18} /> Рулетка
                </button>

                {isAdmin && (
                  <>
                    <button onClick={() => { navigate('/private'); setIsMenuOpen(false); }} className={`ttfd-pressable px-4 py-3 hover:bg-emerald-500/10 rounded-2xl flex items-center gap-3 text-sm font-bold w-full text-left ${location.pathname === '/private' ? 'text-emerald-300 bg-emerald-500/10' : 'text-emerald-400/80'}`}>
                      <LockKeyhole size={18} /> Приватный раздел
                    </button>
                    <button onClick={() => { navigate('/admin'); setIsMenuOpen(false); }} className={`ttfd-pressable px-4 py-3 hover:bg-rose-500/10 rounded-2xl flex items-center gap-3 text-sm font-bold w-full text-left ${location.pathname === '/admin' ? 'text-rose-400 bg-rose-500/10' : 'text-rose-500/80'}`}>
                      <ShieldAlert size={18} /> Админ-панель
                    </button>
                  </>
                )}

                <div className="h-px bg-white/10 my-2"></div>

                {user ? (
                  <>
                    <div className="px-4 py-3 flex items-center gap-3 text-sm">
                      <img src={user.avatarUrl} alt={user.username} className="w-9 h-9 rounded-2xl border border-white/10" />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{user.username}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Coins size={12} className="text-yellow-500" /> {coins.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { logout(); setIsMenuOpen(false); }}
                      className="ttfd-pressable px-4 py-3 hover:bg-rose-500/10 text-rose-400 rounded-2xl flex items-center gap-3 text-sm font-bold text-left w-full"
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { loginWithDiscord(); setIsMenuOpen(false); }}
                    className="ttfd-pressable mx-2 my-2 flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] px-4 py-3 rounded-2xl text-white font-black text-sm shadow-lg shadow-indigo-500/20"
                  >
                    Войти через Discord
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-8 gap-8 relative z-10 mx-auto w-full max-w-6xl">
        <Outlet context={{ xp, setXp, coins, setCoins, currentRank, isAdmin, user, apiBase, refreshUserProgress, loginWithDiscord, logout, dashboardUser }} />
      </div>
    </div>
  );
}
