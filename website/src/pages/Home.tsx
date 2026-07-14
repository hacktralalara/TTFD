import { useGameContext } from '../Layout';
import { Link } from 'react-router-dom';
import { User, Activity, Trophy, Coins, Dices, Bell, CheckCircle2, Target, CalendarDays } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { buildDailyTasks, buildNotifications, getRankProgress } from '../lib/dashboard';

const revealViewport = { once: true, amount: 0.25 } as const;

export function Home() {
  const { currentRank, xp, coins, user, dashboardUser } = useGameContext();
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  // Параллакс: текст hero уходит вверх чуть быстрее, карточка — медленнее фона.
  const heroTextY = useTransform(scrollY, [0, 600], [0, reducedMotion ? 0 : -60]);
  const heroCardY = useTransform(scrollY, [0, 600], [0, reducedMotion ? 0 : -24]);

  const revealTransition = { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const };
  const reveal = {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 },
    whileInView: reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: revealViewport,
    transition: revealTransition,
  };
  const rankProgress = getRankProgress(xp);
  const tasks = buildDailyTasks({
    gamesPlayed: Number(dashboardUser?.games_played || 0),
    messagesSent: Number(dashboardUser?.messages_sent || 0),
    voiceMinutes: Math.floor(Number(dashboardUser?.total_voice_time || 0) / 60),
  });
  const notifications = buildNotifications({
    rankUp: Boolean(dashboardUser?.recent_rank_up),
    rewardReady: tasks.some((task) => task.progress >= task.target),
    unreadEvents: Number(dashboardUser?.unread_events || 0),
  });

  const highlights = [
    { label: 'Текущий ранг', value: currentRank.id, icon: Trophy },
    { label: 'Всего XP', value: xp.toLocaleString('ru-RU'), icon: Activity },
    { label: 'Монеты', value: coins.toLocaleString('ru-RU'), icon: Coins },
  ];

  return (
    <div className="w-full flex-1 grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center ttfd-page-enter">
      <motion.div style={{ y: heroTextY }} className="space-y-8">
        <div 
          className="inline-flex px-4 py-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 backdrop-blur-sm text-xs font-black ttfd-kicker shadow-lg shadow-black/20"
          style={{ color: currentRank.color }}
        >
          Добро пожаловать в TTFD
        </div>
        <h1 className="text-5xl sm:text-7xl font-black tracking-[-0.06em] text-white leading-[0.95]">
          Серверный прогресс,
          <span className="block text-transparent bg-clip-text mt-2" style={{ backgroundImage: `linear-gradient(120deg, ${currentRank.color}, #5eead4 45%, #f8fafc)` }}>
            который видно.
          </span>
        </h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Link to="/profile" className="ttfd-primary-button flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black w-full sm:w-auto">
            <User fill="currentColor" size={20} />
            {user ? 'Открыть профиль' : 'Войти через Discord'}
          </Link>
          <Link to="/roulette" className="ttfd-muted-button flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black w-full sm:w-auto">
            <Dices size={20} />
            Попробовать рулетку
          </Link>
        </div>
      </motion.div>

      <motion.div style={{ y: heroCardY }} className="ttfd-shell rounded-[36px] p-5 sm:p-7 overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-7">
          <div>
            <p className="ttfd-kicker text-xs font-black mb-2">Live dashboard</p>
            <h2 className="text-2xl font-black text-white">TTFD Control Hub</h2>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-black" style={{ background: currentRank.color }}>
            {currentRank.tier}
          </div>
        </div>

        <div className="grid gap-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="ttfd-card rounded-3xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-emerald-300">
                    <Icon size={21} />
                  </div>
                  <span className="text-sm font-bold text-slate-400">{item.label}</span>
                </div>
                <span className="text-2xl font-black text-white">{item.value}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-white"><Target size={17} className="text-emerald-300" /> Прогресс ранга</div>
            <span className="text-xs font-bold text-slate-400">{rankProgress.percentage}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-500" style={{ width: `${rankProgress.percentage}%` }} /></div>
          <p className="text-xs text-slate-500 mt-2">{currentRank.next === Infinity ? 'Максимальный ранг достигнут' : `${Math.max(0, rankProgress.next - xp).toLocaleString('ru-RU')} XP до следующего ранга`}</p>
        </div>

      </motion.div>

      <div className="lg:col-span-2 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <motion.section {...reveal} className="ttfd-shell rounded-[32px] p-5 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><p className="ttfd-kicker text-xs font-black mb-2">Daily loop</p><h2 className="text-2xl font-black text-white">Задания на сегодня</h2></div><CalendarDays className="text-emerald-300" /></div>
          <div className="grid gap-3">{tasks.map((task) => { const done = task.progress >= task.target; return <div key={task.id} className="ttfd-card rounded-2xl p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-white">{task.title}</p><p className="text-xs text-slate-500 mt-1">{task.description} · +{task.reward} XP</p></div>{done ? <CheckCircle2 className="text-emerald-300 shrink-0" size={20} /> : <span className="text-xs font-black text-slate-400">{task.progress}/{task.target}</span>}</div><div className="h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden"><div className={`h-full rounded-full ${done ? 'bg-emerald-300' : 'bg-cyan-300'}`} style={{ width: `${(task.progress / task.target) * 100}%` }} /></div></div>; })}</div>
        </motion.section>

        <motion.section {...reveal} transition={{ ...revealTransition, delay: 0.1 }} className="ttfd-shell rounded-[32px] p-5 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><p className="ttfd-kicker text-xs font-black mb-2">Inbox</p><h2 className="text-2xl font-black text-white">Уведомления</h2></div><Bell className="text-amber-300" /></div>
          {notifications.length ? <div className="grid gap-3">{notifications.map((item) => <div key={item.id} className="ttfd-card rounded-2xl p-4"><p className="font-black text-white">{item.title}</p><p className="text-xs text-slate-500 mt-1">{item.description}</p></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Новых уведомлений пока нет.</div>}
        </motion.section>
      </div>
    </div>
  );
}
