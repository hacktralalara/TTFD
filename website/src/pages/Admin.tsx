import { useEffect, useState } from 'react';
import { useGameContext } from '../Layout';
import { Shield, Users, Database, Server, Settings2, Activity, Terminal, Search } from 'lucide-react';

type AdminLookupUser = {
  id: string;
  username: string;
  xp: number;
  coins: number;
  rank_id: number;
  games_played?: number;
  games_won?: number;
};

function getApiBase() {
  const runtimeValue = window.__TTFD_CONFIG__?.VITE_BOT_API_URL;
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim().replace(/\/$/, '');
  }

  const buildValue = import.meta.env.VITE_BOT_API_URL;
  return typeof buildValue === 'string' ? buildValue.trim().replace(/\/$/, '') : '';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

export function Admin() {
  const { isAdmin } = useGameContext();
  const [targetUser, setTargetUser] = useState('739566637400981506');
  const [giveXp, setGiveXp] = useState(100);
  const [giveCoins, setGiveCoins] = useState(500);
  const [lookupUser, setLookupUser] = useState<AdminLookupUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Панель готова к работе.');
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [serverStats, setServerStats] = useState({ totalMembers: 0, onlineMembers: 0 });

  const apiBase = getApiBase();

  useEffect(() => {
    async function loadStats() {
      if (!apiBase) {
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/stats`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setServerStats({
          totalMembers: Number(data.total_members || 0),
          onlineMembers: Number(data.online_members || 0),
        });
      } catch (error) {
        console.error('Failed to load server stats', error);
      }
    }

    void loadStats();
  }, [apiBase]);

  if (!isAdmin) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center text-center">
        <Shield size={64} className="text-rose-500 opacity-50 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2">Доступ запрещен</h1>
        <p className="text-slate-400">У вас нет прав для просмотра этой страницы.</p>
      </div>
    );
  }

  async function handleSearch() {
    if (!apiBase) {
      setStatusTone('error');
      setStatusMessage('Не настроен VITE_BOT_API_URL, сайт не знает адрес Discord API.');
      return;
    }

    if (!targetUser.trim()) {
      setStatusTone('error');
      setStatusMessage('Введите Discord ID пользователя.');
      return;
    }

    setIsSearching(true);
    setStatusTone('neutral');
    setStatusMessage('Ищу пользователя в базе Discord-бота...');

    try {
      const response = await fetch(`${apiBase}/api/admin/get-user?query=${encodeURIComponent(targetUser.trim())}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Пользователь не найден');
      }

      const foundUser = data.user || data.users?.[0];
      if (!foundUser) {
        throw new Error('Пользователь не найден');
      }

      const resolvedUsername = foundUser.username && foundUser.username !== 'Unknown'
        ? foundUser.username
        : String(foundUser.id);

      setLookupUser({
        id: String(foundUser.id),
        username: resolvedUsername,
        xp: Number(foundUser.xp || 0),
        coins: Number(foundUser.coins || 0),
        rank_id: Number(foundUser.rank_id || 1),
        games_played: Number(foundUser.games_played || 0),
        games_won: Number(foundUser.games_won || 0),
      });
      setTargetUser(String(foundUser.id));
      setStatusTone('success');
      setStatusMessage(`Пользователь ${resolvedUsername} загружен из Discord БД.`);
    } catch (error) {
      console.error(error);
      setLookupUser(null);
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Не удалось загрузить пользователя.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleGive() {
    if (!apiBase) {
      setStatusTone('error');
      setStatusMessage('Не настроен VITE_BOT_API_URL, сайт не знает адрес Discord API.');
      return;
    }

    if (!targetUser.trim()) {
      setStatusTone('error');
      setStatusMessage('Введите Discord ID пользователя.');
      return;
    }

    const xpAmount = Math.floor(Number(giveXp) || 0);
    const coinsAmount = Math.floor(Number(giveCoins) || 0);

    if (xpAmount === 0 && coinsAmount === 0) {
      setStatusTone('error');
      setStatusMessage('Укажите ненулевое изменение XP или монет.');
      return;
    }

    setIsSubmitting(true);
    setStatusTone('neutral');
    setStatusMessage('Применяю изменения в Discord БД...');

    try {
      if (xpAmount !== 0) {
        const xpResponse = await fetch(`${apiBase}/api/admin/give-xp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: targetUser.trim(),
            xp_amount: xpAmount,
          }),
        });

        const xpData = await xpResponse.json();
        if (!xpResponse.ok || !xpData.success) {
          throw new Error(xpData.error || 'Не удалось изменить XP');
        }
      }

      if (coinsAmount !== 0) {
        const coinsResponse = await fetch(`${apiBase}/api/admin/give-coins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: targetUser.trim(),
            coins_amount: coinsAmount,
          }),
        });

        const coinsData = await coinsResponse.json();
        if (!coinsResponse.ok || !coinsData.success) {
          throw new Error(coinsData.error || 'Не удалось изменить монеты');
        }
      }

      await handleSearch();
      setStatusTone('success');
      setStatusMessage(`Изменения записаны в Discord БД: XP ${xpAmount >= 0 ? `+${xpAmount}` : xpAmount}, монеты ${coinsAmount >= 0 ? `+${coinsAmount}` : coinsAmount}.`);
    } catch (error) {
      console.error(error);
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Не удалось применить изменения.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusClassName =
    statusTone === 'success'
      ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
      : statusTone === 'error'
        ? 'text-rose-400 border-rose-500/20 bg-rose-500/10'
        : 'text-slate-300 border-slate-700 bg-slate-900/70';

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield className="text-rose-500" />
            TTFD Control Panel
          </h1>
          <p className="text-slate-400 mt-1 uppercase text-xs font-bold tracking-widest">Система управления Discord-ботом</p>
        </div>
        <div className="px-4 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-sm font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
          ADMIN MODE
        </div>
      </div>

      <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClassName}`}>
        {statusMessage}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Users className="text-blue-400" size={20} />
              Управление пользователем
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 mb-6">
              <div>
                <label className="block text-xs uppercase text-slate-500 font-bold mb-2">ID пользователя</label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 font-mono focus:border-blue-500 outline-none transition-colors"
                  placeholder="739566637400981506"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={isSearching || isSubmitting}
                  className="h-[50px] px-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <Search size={16} />
                  {isSearching ? 'Поиск...' : 'Найти'}
                </button>
              </div>
            </div>

            {lookupUser && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs uppercase text-slate-500 font-bold mb-2">Пользователь</div>
                  <div className="text-slate-100 font-semibold break-all">{lookupUser.username}</div>
                  <div className="text-slate-500 text-xs mt-1 font-mono">{lookupUser.id}</div>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs uppercase text-slate-500 font-bold mb-2">Текущий XP</div>
                  <div className="text-2xl font-black text-white">{formatNumber(lookupUser.xp)}</div>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs uppercase text-slate-500 font-bold mb-2">Монеты</div>
                  <div className="text-2xl font-black text-white">{formatNumber(lookupUser.coins)}</div>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs uppercase text-slate-500 font-bold mb-2">Ранг</div>
                  <div className="text-2xl font-black text-white">#{lookupUser.rank_id}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                <label className="block text-xs uppercase text-slate-400 font-bold mb-3">Изменить XP</label>
                <input
                  type="number"
                  value={giveXp}
                  onChange={(e) => setGiveXp(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                <label className="block text-xs uppercase text-slate-400 font-bold mb-3">Изменить монеты</label>
                <input
                  type="number"
                  value={giveCoins}
                  onChange={(e) => setGiveCoins(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGive}
                disabled={isSubmitting || isSearching}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/20 transition-[transform,filter,opacity] duration-150 active:scale-[0.98] border border-blue-500/50"
              >
                {isSubmitting ? 'ПРИМЕНЯЮ ИЗМЕНЕНИЯ...' : 'ПРИМЕНИТЬ ИЗМЕНЕНИЯ'}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Terminal className="text-emerald-400" size={20} />
              Журнал действий
            </h2>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-400 space-y-2 h-40 overflow-y-auto">
              <div className="flex gap-3"><span className="text-blue-500">[LIVE]</span> <span>Админка теперь отправляет реальные запросы в Discord API.</span></div>
              <div className="flex gap-3"><span className="text-emerald-500">[INFO]</span> <span>Поиск читает пользователя из базы Discord-бота.</span></div>
              <div className="flex gap-3"><span className="text-emerald-500">[INFO]</span> <span>Выдача XP и монет выполняется через `/api/admin/give-xp` и `/api/admin/give-coins`.</span></div>
              <div className="flex gap-3"><span className="text-slate-500">[NOTE]</span> <span>Если Discord бот смотрит на другую БД, значения всё равно будут расходиться.</span></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={18} /></div>
              <span className="text-sm font-bold text-slate-300">Total Users</span>
            </div>
            <p className="text-3xl font-black text-white">{formatNumber(serverStats.totalMembers)}</p>
            <p className="text-xs text-emerald-400 mt-2">онлайн: {formatNumber(serverStats.onlineMembers)}</p>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400"><Database size={18} /></div>
              <span className="text-sm font-bold text-slate-300">Economy Preview</span>
            </div>
            <p className="text-3xl font-black text-white">
              {lookupUser ? formatNumber(lookupUser.coins) : '0'}
            </p>
            <p className="text-xs text-slate-400 mt-2">монеты выбранного пользователя</p>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Server size={18} /></div>
              <span className="text-sm font-bold text-slate-300">Server Status</span>
            </div>
            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Discord API</span>
                  <span className="text-slate-200">{apiBase ? 'configured' : 'missing'}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${apiBase ? 'bg-emerald-500 w-full' : 'bg-rose-500 w-1/4'}`}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">User Loaded</span>
                  <span className="text-slate-200">{lookupUser ? 'yes' : 'no'}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${lookupUser ? 'bg-blue-500 w-full' : 'bg-slate-600 w-1/4'}`}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="text-slate-400" />
              <span className="text-sm font-bold text-slate-300">Admin Sync</span>
            </div>
            <button className="text-xs px-3 py-1 bg-slate-800 rounded-md text-slate-300 cursor-default">
              Live
            </button>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 className="text-slate-400" />
              <span className="text-sm font-bold text-slate-300">Global Settings</span>
            </div>
            <button className="text-xs px-3 py-1 bg-slate-800 rounded-md text-slate-300 cursor-default">Read only</button>
          </div>
        </div>
      </div>
    </div>
  );
}
