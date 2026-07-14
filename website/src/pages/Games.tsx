import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameContext } from '../Layout';
import { Coins, Target, RotateCw, Trophy, Gamepad2 } from 'lucide-react';

export function Games() {
  const { coins, setCoins, setXp, user, apiBase, refreshUserProgress, loginWithDiscord } = useGameContext();
  const [activeGame, setActiveGame] = useState<'none' | 'flip' | 'clicker'>('none');
  const [statusMessage, setStatusMessage] = useState('');

  const [flipBet, setFlipBet] = useState(10);
  const [choice, setChoice] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | null>(null);
  const [winStatus, setWinStatus] = useState<'win' | 'lose' | null>(null);

  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [clickerActive, setClickerActive] = useState(false);
  const [hasPlayedClicker, setHasPlayedClicker] = useState(false);
  const [clickerReward, setClickerReward] = useState(0);

  const ensureAuth = () => {
    if (user?.id) {
      return true;
    }

    loginWithDiscord();
    return false;
  };

  const startFlip = async () => {
    if (coins < flipBet || flipBet <= 0 || !choice || flipping) {
      return;
    }

    if (!ensureAuth()) {
      return;
    }

    setStatusMessage('');
    setFlipping(true);
    setFlipResult(null);
    setWinStatus(null);

    try {
      const response = await fetch(`${apiBase}/api/game/coinflip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user!.id,
          choice,
          bet: flipBet,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось сыграть в монетку');
      }

      window.setTimeout(async () => {
        setFlipResult(data.result);
        setWinStatus(data.win ? 'win' : 'lose');
        setCoins(Number(data.new_balance || 0));
        setXp(Number(data.new_xp || 0));
        setFlipping(false);
        await refreshUserProgress();
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : 'Не удалось сыграть в монетку');
      setFlipping(false);
    }
  };

  const startClicker = () => {
    if (!ensureAuth()) {
      return;
    }

    setClicks(0);
    setTimeLeft(10);
    setClickerActive(true);
    setHasPlayedClicker(false);
    setClickerReward(0);
    setStatusMessage('');
  };

  useEffect(() => {
    if (clickerActive && timeLeft > 0) {
      const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
      return () => window.clearTimeout(timer);
    }

    if (clickerActive && timeLeft === 0 && user?.id) {
      setClickerActive(false);
      setHasPlayedClicker(true);

      void (async () => {
        try {
          const response = await fetch(`${apiBase}/api/game/clicker/claim`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              clicks,
            }),
          });

          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Не удалось сохранить награду за кликер');
          }

          setClickerReward(Number(data.earned_coins || 0));
          setCoins(Number(data.new_balance || 0));
          setXp(Number(data.new_xp || 0));
          await refreshUserProgress();
        } catch (error) {
          console.error(error);
          setStatusMessage(error instanceof Error ? error.message : 'Не удалось сохранить награду за кликер');
        }
      })();
    }
  }, [apiBase, clickerActive, clicks, refreshUserProgress, setCoins, setXp, timeLeft, user?.id]);

  const clickTarget = () => {
    if (clickerActive) {
      setClicks((value) => value + 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 h-full z-20 relative">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-indigo-400/50">
          <Gamepad2 className="text-white drop-shadow-md" size={30} />
          <div className="absolute inset-0 bg-white/20 blur-md rounded-2xl animate-pulse" />
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tighter flex items-center gap-2 text-white drop-shadow-lg">
            TTFD <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Игры</span>
          </h2>
          <p className="text-xs text-indigo-300/80 font-bold tracking-widest uppercase mt-1">Награды сразу сохраняются в Discord-боте</p>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {statusMessage}
        </div>
      ) : null}

      {activeGame === 'none' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveGame('flip')}
            className="bg-slate-900/60 p-8 rounded-[32px] border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col items-center text-center gap-4 group hover:border-yellow-500/50 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] group-hover:shadow-[0_0_40px_rgba(251,191,36,0.5)] transition-shadow">
              <RotateCw className="text-yellow-950" size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Монетка</h3>
              <p className="text-slate-400 mt-2 text-sm">Угадай сторону и удвой ставку.</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveGame('clicker')}
            className="bg-slate-900/60 p-8 rounded-[32px] border border-slate-800 shadow-xl backdrop-blur-sm flex flex-col items-center text-center gap-4 group hover:border-rose-500/50 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)] group-hover:shadow-[0_0_40px_rgba(244,63,94,0.5)] transition-shadow">
              <Target className="text-rose-950" size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Кликер</h3>
              <p className="text-slate-400 mt-2 text-sm">Кликай как можно быстрее за 10 секунд.</p>
            </div>
          </motion.button>
        </div>
      )}

      {activeGame !== 'none' && (
        <button
          onClick={() => setActiveGame('none')}
          className="text-slate-400 hover:text-white self-start text-sm font-bold uppercase tracking-widest transition-colors mb-2"
        >
          ← Назад к списку игр
        </button>
      )}

      {activeGame === 'flip' && (
        <div className="bg-slate-900/80 p-8 sm:p-12 rounded-[32px] border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col items-center max-w-2xl mx-auto w-full">
          <h3 className="text-3xl font-black text-white mb-8">Монетка</h3>

          <div className="h-40 flex items-center justify-center mb-8 perspective-1000">
            <AnimatePresence mode="popLayout">
              {!flipping && flipResult === null && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-slate-500 font-bold uppercase tracking-widest">
                  Сделайте ставку
                </motion.div>
              )}
              {flipping && (
                <motion.div
                  animate={{ rotateY: 360 * 5 }}
                  transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-4 border-yellow-200 shadow-[0_0_30px_rgba(253,224,71,0.5)] flex items-center justify-center"
                >
                  <span className="font-black text-yellow-900 text-3xl">?</span>
                </motion.div>
              )}
              {!flipping && flipResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, rotateY: 180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-4 border-yellow-200 shadow-[0_0_30px_rgba(253,224,71,0.5)] flex items-center justify-center flex-col relative"
                >
                  <span className="font-black text-yellow-900 text-3xl uppercase">{flipResult === 'heads' ? 'Орёл' : 'Решка'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!flipping && winStatus && (
            <div className={`mb-8 px-6 py-3 rounded-2xl font-black text-xl flex items-center gap-2 border shadow-lg ${winStatus === 'win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
              {winStatus === 'win' ? `Вы выиграли ${flipBet.toLocaleString()} монет!` : 'Вы проиграли :('}
            </div>
          )}

          <div className="w-full flex-col sm:flex-row flex gap-4 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
            <div className="flex-1 space-y-2">
              <label className="text-xs uppercase font-bold tracking-widest text-slate-500">Ваш выбор</label>
              <div className="flex gap-2">
                <button onClick={() => setChoice('heads')} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${choice === 'heads' ? 'bg-yellow-500 text-yellow-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Орёл</button>
                <button onClick={() => setChoice('tails')} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${choice === 'tails' ? 'bg-yellow-500 text-yellow-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Решка</button>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <label className="text-xs uppercase font-bold tracking-widest text-slate-500">Ставка</label>
                <span className="text-xs font-mono text-slate-400">Баланс: {coins}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={flipping}
                  value={flipBet}
                  onChange={(event) => setFlipBet(Math.max(1, parseInt(event.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-mono text-lg text-slate-200 outline-none focus:border-slate-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => void startFlip()}
            disabled={flipping || !choice || coins < flipBet || flipBet <= 0}
            className="mt-6 w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl font-black text-yellow-950 text-xl tracking-widest uppercase hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-[transform,filter,opacity] duration-150"
          >
            {user ? 'ПОДБРОСИТЬ' : 'ВОЙТИ ЧЕРЕЗ DISCORD'}
          </button>
        </div>
      )}

      {activeGame === 'clicker' && (
        <div className="bg-slate-900/80 p-8 sm:p-12 rounded-[32px] border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col items-center max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between w-full mb-8">
            <h3 className="text-3xl font-black text-white">Кликер</h3>
            <div className="bg-slate-950 px-6 py-2 rounded-xl border border-slate-800 flex flex-col items-center">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Время</span>
              <span className={`font-mono text-2xl font-black ${timeLeft <= 3 && timeLeft > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-200'}`}>00:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div className="mb-10 w-full flex justify-center h-64 items-center">
            {!clickerActive && !hasPlayedClicker ? (
              <button onClick={startClicker} className="ttfd-game-button w-48 h-48 rounded-full bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] flex items-center justify-center font-black text-rose-950 text-2xl">
                НАЧАТЬ
              </button>
            ) : clickerActive ? (
              <button
                onClick={clickTarget}
                className="w-48 h-48 rounded-full bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] flex items-center justify-center font-black text-rose-950 text-6xl active:scale-90 transition-transform select-none"
              >
                {clicks}
              </button>
            ) : (
              <div className="text-center">
                <div className="mb-4 inline-flex w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30">
                  <Trophy size={40} />
                </div>
                <h4 className="text-3xl font-black text-white mb-2">Отлично!</h4>
                <p className="text-slate-400">Вы кликнули <strong className="text-white">{clicks}</strong> раз.</p>
                <p className="text-emerald-400 mb-2 font-bold">Награда: +{clickerReward} монет</p>
                <p className="text-slate-500 mb-6 text-sm">Награда уже записана в Discord БД.</p>
                <button onClick={startClicker} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors">
                  Играть снова
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-slate-500 max-w-md">
            <p>Кликайте по красной кнопке как можно быстрее в течение 10 секунд. Каждые 2 клика приносят 1 монету.</p>
          </div>
        </div>
      )}
    </div>
  );
}
