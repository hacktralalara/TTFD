import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameContext } from '../Layout';
import { Coins, Volume2, VolumeX, History, Sparkles, Dices } from 'lucide-react';

const MULTIPLIERS = [2, 0, 1.5, 0, 3, 0, 1.2, 0];
const WHEEL_COLORS = ['#EF4444', '#1F2937', '#10B981', '#1F2937', '#8B5CF6', '#1F2937', '#F59E0B', '#1F2937'];

type HistoryItem = {
  id: string;
  game: 'wheel' | 'coinflip' | 'clicker' | string;
  bet?: number;
  multiplier?: number;
  win_amount?: number;
  delta_coins?: number;
  xp_earned?: number;
  result?: string;
  created_at?: string;
  clicks?: number;
};

function formatHistoryLabel(item: HistoryItem) {
  if (item.game === 'wheel') {
    return item.multiplier && item.multiplier > 0 ? `${item.multiplier}x` : 'X';
  }
  if (item.game === 'coinflip') {
    return item.result === 'win' ? 'WIN' : 'LOSE';
  }
  if (item.game === 'clicker') {
    return `${item.clicks || 0}x`;
  }
  return 'GAME';
}

function formatHistoryTitle(item: HistoryItem) {
  if (item.game === 'wheel') {
    return 'Рулетка';
  }
  if (item.game === 'coinflip') {
    return 'Монетка';
  }
  if (item.game === 'clicker') {
    return 'Кликер';
  }
  return 'Игра';
}

function formatHistoryTime(value?: string) {
  if (!value) {
    return 'сейчас';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'сейчас';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function Roulette() {
  const { coins, setCoins, setXp, currentRank, user, apiBase, refreshUserProgress, loginWithDiscord } = useGameContext();
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const sliceDegrees = 360 / MULTIPLIERS.length;

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.id || !apiBase) {
        setHistory([]);
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/user/${user.id}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const recentGames = Array.isArray(data.user?.recent_games) ? data.user.recent_games : [];
        setHistory(recentGames.slice(0, 8));
      } catch (error) {
        console.error('Failed to load wheel history', error);
      }
    }

    void loadHistory();
  }, [apiBase, user?.id]);

  const playSound = (type: 'tick' | 'win' | 'lose') => {
    if (!soundEnabled || !audioCtxRef.current) {
      return;
    }

    const actx = audioCtxRef.current;
    if (actx.state === 'suspended') {
      void actx.resume();
    }

    const osc = actx.createOscillator();
    const gain = actx.createGain();

    osc.connect(gain);
    gain.connect(actx.destination);

    if (type === 'tick') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, actx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.05);
      osc.start();
      osc.stop(actx.currentTime + 0.05);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, actx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 1);
      osc.start();
      osc.stop(actx.currentTime + 1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.5);
      osc.start();
      osc.stop(actx.currentTime + 0.5);
    }
  };

  const spin = async () => {
    if (spinning || coins < bet || bet <= 0) {
      return;
    }

    if (!user?.id) {
      loginWithDiscord();
      return;
    }

    setErrorMessage('');

    try {
      const response = await fetch(`${apiBase}/api/wheel/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          bet,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось прокрутить рулетку');
      }

      setSpinning(true);
      setResult(null);
      setCoins(Number(data.new_balance || 0));
      setXp(Number(data.new_xp || 0));

      const targetIndex = Number(data.segment_index || 0);
      const targetOffset = (targetIndex * sliceDegrees) + (sliceDegrees / 2);
      const fullSpins = 360 * 6;
      const currentRotMod = rotation % 360;
      const paddingToNext0 = 360 - currentRotMod;
      const finalRot = rotation + paddingToNext0 + fullSpins + (360 - targetOffset);
      const multiplier = Number(data.multiplier || 0);

      setRotation(finalRot);

      let tickCount = 0;
      const totalTicks = 6 * MULTIPLIERS.length;
      const tickInterval = window.setInterval(() => {
        playSound('tick');
        tickCount += 1;
        if (tickCount > totalTicks) {
          window.clearInterval(tickInterval);
        }
      }, 4500 / totalTicks);

      window.setTimeout(async () => {
        window.clearInterval(tickInterval);
        setSpinning(false);
        setResult(multiplier);
        setHistory(Array.isArray(data.recent_games) ? data.recent_games.slice(0, 8) : []);

        if (multiplier > 0) {
          playSound('win');
        } else {
          playSound('lose');
        }

        await refreshUserProgress();
      }, 4500);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось прокрутить рулетку');
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 max-w-6xl mx-auto items-stretch h-full">
      <div className="flex-1 bg-slate-900/60 p-6 sm:p-10 rounded-[32px] border border-slate-800 shadow-2xl backdrop-blur-sm relative z-20 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-rose-500 to-red-700 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.4)] border border-rose-400/50">
              <Dices className="text-white drop-shadow-md" size={30} />
              <div className="absolute inset-0 bg-white/20 blur-md rounded-2xl animate-[pulse_2s_infinite]" />
            </div>
            <div>
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-2 text-white drop-shadow-lg">
                TTFD <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-500">Рулетка</span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-colors text-slate-300"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-slate-500" />}
          </button>
        </div>

        <div className="relative w-72 h-72 mb-12 shrink-0">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-0 w-24 h-24 bg-white/10 blur-xl rounded-full" />

          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-4 border-slate-100 bg-slate-900 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] flex items-center justify-center relative translate-y-3 z-40" />
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-slate-100 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] relative -translate-y-2 z-30" />
          </div>

          <div className="absolute inset-0 rounded-full border border-slate-600/30 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] z-20 pointer-events-none" />

          <motion.div
            className="w-full h-full rounded-full border-[10px] border-slate-800/90 shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden relative"
            animate={{ rotate: rotation }}
            transition={{ duration: 4.5, ease: [0.15, 0.85, 0.25, 1] }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full absolute inset-0">
              {MULTIPLIERS.map((multiplier, index) => {
                const total = MULTIPLIERS.length;
                const startAngle = (index * 360) / total;
                const endAngle = ((index + 1) * 360) / total;
                const startAngleRad = (startAngle - 90) * Math.PI / 180;
                const endAngleRad = (endAngle - 90) * Math.PI / 180;
                const x1 = 150 + 150 * Math.cos(startAngleRad);
                const y1 = 150 + 150 * Math.sin(startAngleRad);
                const x2 = 150 + 150 * Math.cos(endAngleRad);
                const y2 = 150 + 150 * Math.sin(endAngleRad);
                const pathData = `M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`;
                const midAngle = startAngle + (360 / total) / 2;

                return (
                  <g key={index}>
                    <path d={pathData} fill={WHEEL_COLORS[index]} stroke="#0f172a" strokeWidth="3" />
                    <g transform={`rotate(${midAngle}, 150, 150)`}>
                      <text
                        x="150"
                        y="65"
                        textAnchor="middle"
                        fill="white"
                        fontSize="28"
                        fontWeight="900"
                        style={{ textShadow: '0px 3px 5px rgba(0,0,0,0.9)' }}
                        className="font-black drop-shadow-xl"
                      >
                        {multiplier === 0 ? 'X' : `${multiplier}x`}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            <div className="absolute inset-0 m-auto w-[68px] h-[68px] rounded-full bg-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,1)] shadow-[0_0_15px_rgba(0,0,0,0.8)] z-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[8px] border-slate-800" />
              <div className="w-6 h-6 rounded-full border-2 border-slate-700 bg-slate-800 relative z-20" />
            </div>
          </motion.div>
        </div>

        <div className="w-full space-y-6 flex-1 flex flex-col justify-end">
          <div className="h-20 flex flex-col items-center justify-end gap-3">
            <AnimatePresence mode="popLayout">
              {result !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`px-8 py-3 rounded-2xl font-black text-xl flex items-center gap-2 border shadow-lg ${result > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}
                >
                  {result > 0 ? (
                    <>
                      <Sparkles size={24} />
                      +{Math.floor(bet * result)} 🪙
                    </>
                  ) : (
                    'LOSE'
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {errorMessage ? <div className="text-sm text-rose-400 text-center">{errorMessage}</div> : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 bg-slate-950/60 p-4 sm:p-6 rounded-[28px] border border-slate-800/80 shadow-inner">
            <div className="w-full space-y-2">
              <div className="flex justify-between px-1">
                <label className="text-xs uppercase font-bold tracking-widest text-slate-500">Ставка</label>
                <span className="text-xs font-mono text-slate-400">Баланс: {coins.toLocaleString()}</span>
              </div>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500/80">
                    <Coins size={18} />
                  </div>
                  <input
                    type="number"
                    value={bet}
                    onChange={(event) => setBet(Math.max(1, parseInt(event.target.value, 10) || 0))}
                    className="w-full h-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-3 font-mono text-xl text-slate-200 outline-none focus:border-slate-500 focus:bg-slate-800/80 transition-[background-color,border-color] duration-150 font-bold"
                    disabled={spinning}
                  />
                </div>
                <div className="flex gap-2 h-full">
                  <button
                    onClick={() => setBet((value) => Math.max(1, Math.floor(value / 2)))}
                    disabled={spinning || bet <= 1}
                    className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-3 rounded-xl border border-slate-700 transition-colors text-slate-300 disabled:opacity-50"
                  >
                    1/2
                  </button>
                  <button
                    onClick={() => setBet((value) => value * 2)}
                    disabled={spinning || bet * 2 > coins}
                    className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-3 rounded-xl border border-slate-700 transition-colors text-slate-300 disabled:opacity-50"
                  >
                    x2
                  </button>
                  <button
                    onClick={() => setBet(coins)}
                    disabled={spinning || coins === 0}
                    className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 rounded-xl border border-slate-700 transition-colors text-blue-400 disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => void spin()}
              disabled={spinning || coins < bet || bet <= 0}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-950 transition-[transform,filter,opacity] duration-150 shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: currentRank.color,
                boxShadow: spinning ? 'none' : `0 0 25px ${currentRank.color}4d`,
              }}
            >
              {spinning ? 'ВРАЩЕНИЕ...' : user ? 'КРУТИТЬ' : 'ВОЙТИ И КРУТИТЬ'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 bg-slate-900/40 p-6 rounded-[32px] border border-slate-800/50 backdrop-blur-sm flex flex-col shrink-0">
        <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
          <History size={16} /> Последние игры
        </h3>

        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence>
            {history.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-600 text-xs text-center py-10 font-mono">
                Нет истории игр
              </motion.div>
            )}
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 ${item.delta_coins && item.delta_coins > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {formatHistoryLabel(item)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-bold uppercase">{formatHistoryTitle(item)}</p>
                    <p className="font-mono text-slate-300 truncate">
                      {item.bet ? `Ставка: ${item.bet.toLocaleString()}` : `Кликов: ${(item.clicks || 0).toLocaleString()}`}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatHistoryTime(item.created_at)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold text-lg ${(item.delta_coins || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(item.delta_coins || 0) >= 0 ? '+' : ''}{(item.delta_coins || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500">XP +{item.xp_earned || 0}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
