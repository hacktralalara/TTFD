import { Coins, LogIn } from 'lucide-react';
import { useGameContext, PROFILE_RANKS } from '../Layout';

export function Profile() {
  const { xp, coins, currentRank, user, loginWithDiscord, isAdmin } = useGameContext();

  // If user is not logged in, show a prompt
  if (!user) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center text-center ttfd-page-enter">
        <div className="w-full max-w-xl ttfd-shell rounded-[36px] p-8 sm:p-10 flex flex-col items-center">
        <div className="w-24 h-24 bg-slate-900 border border-white/10 rounded-[28px] flex items-center justify-center mb-6 shadow-xl relative overflow-hidden">
           <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Guest" className="opacity-20 grayscale" />
           <div className="absolute inset-0 flex items-center justify-center text-slate-500">
             <LogIn size={32} />
           </div>
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Авторизация</h1>
        <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
          Для просмотра профиля и сохранения прогресса необходимо войти в систему через Discord.
        </p>
        <button 
          onClick={loginWithDiscord}
          className="ttfd-pressable flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] px-8 py-4 rounded-2xl text-white font-black text-lg shadow-[0_0_28px_rgba(88,101,242,0.35)]"
        >
          Войти через Discord
        </button>
        </div>
      </div>
    );
  }

  const isMaxRank = currentRank.id === 'S';

  const xpInCurrentRank = isMaxRank ? 1 : xp - currentRank.min;
  const rankTotalXp = isMaxRank ? 1 : currentRank.next - currentRank.min;
  const progressPercentage = Math.min(100, Math.max(0, (xpInCurrentRank / rankTotalXp) * 100));
  const xpToNext = isMaxRank ? 0 : currentRank.next - xp;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 items-center h-full ttfd-page-enter">
      <div className="w-full ttfd-shell rounded-[36px] overflow-hidden relative flex flex-col">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none overflow-hidden h-full flex items-center justify-center">
          <span className="text-[220px] font-black leading-none select-none transition-colors duration-200" style={{ color: currentRank.color }}>
            {currentRank.tier}
          </span>
        </div>

        <div 
          className="h-36 w-full opacity-40 relative"
          style={{ background: `linear-gradient(135deg, ${currentRank.color}80 0%, transparent 100%)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <div className="px-6 md:px-12 pb-12 pt-0 relative z-10 flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div className="relative -mt-16 group">
              <div 
                className="absolute inset-0 rounded-3xl blur-[15px] opacity-40 transition-opacity duration-300"
                style={{ backgroundColor: currentRank.color }}
              />
              <img 
                src={user.avatarUrl} 
                alt={user.username} 
                className="w-32 h-32 rounded-[32px] border-2 p-1 relative z-10 bg-slate-900 object-cover shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                style={{ borderColor: currentRank.color }}
              />
              <div 
                className="absolute -bottom-3 -right-3 w-12 h-12 rounded-xl border-4 border-slate-950 flex items-center justify-center text-xl z-20 shadow-lg text-slate-900 font-bold"
                style={{ backgroundColor: currentRank.color }}
              >
                {currentRank.tier}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.06] px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md self-end sm:self-auto shadow-lg">
              <div className="text-yellow-500">
                <Coins size={20} />
              </div>
              <span className="text-base font-mono font-bold text-slate-200">{coins.toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-12 flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-[-0.05em]">{user.username}</h1>
              {isAdmin && (
                 <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest">
                    Admin
                 </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <div
                className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border"
                style={{ backgroundColor: `${currentRank.color}15`, color: currentRank.color, borderColor: `${currentRank.color}40`, boxShadow: `0 0 10px ${currentRank.color}20` }}
              >
                Текущий ранг: {currentRank.id}
              </div>
              <div className="text-sm text-slate-500">
                Всего XP: <span className="text-slate-300 font-mono font-medium">{xp.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 relative group">
            <div
              className="absolute inset-0 blur-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-1000 -z-10"
              style={{ backgroundImage: `linear-gradient(to right, ${currentRank.color}, transparent)` }}
            />

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1 transition-colors duration-300" style={{ color: currentRank.color }}>
                  Ваш Прогресс
                </p>
                <div className="text-sm font-medium text-slate-300">
                  {isMaxRank ? (
                    <span className="text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                      MAX RANK
                    </span>
                  ) : (
                    <span className="text-4xl font-mono font-black">
                      {xpInCurrentRank.toLocaleString()} <span className="text-slate-600 text-2xl font-bold">/ {rankTotalXp.toLocaleString()} XP</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {!isMaxRank && (
                  <>
                    <p className="text-xs text-slate-500 font-medium mb-1">До следующего ранга:</p>
                    <p className="text-xl font-mono text-slate-300 font-bold">{xpToNext.toLocaleString()} XP</p>
                  </>
                )}
              </div>
            </div>

            <div
              className="relative h-8 bg-slate-950/60 w-full rounded-full border border-white/10 overflow-hidden shadow-inner mt-2"
              role="progressbar"
              aria-label="Прогресс текущего ранга"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercentage)}
            >
              <div
                className="ttfd-progress-fill h-full w-full relative origin-left shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                style={{
                  background: `linear-gradient(to right, ${currentRank.color}, ${currentRank.color}dd)`,
                  transform: `scaleX(${progressPercentage / 100})`,
                }}
              >
                <div className="absolute top-0 right-0 w-12 h-full bg-white/20 blur-sm"></div>
              </div>
            </div>
            
            <div className="flex justify-between text-[11px] uppercase font-bold tracking-widest text-slate-500 pt-1">
              <span>{currentRank.id} (0%)</span>
              <span>{isMaxRank ? 'MAX' : (PROFILE_RANKS[PROFILE_RANKS.indexOf(currentRank) + 1]?.id || 'MAX')} (100%)</span>
            </div>

            {isMaxRank && (
              <div className="mt-8 text-sm text-center text-purple-300 bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 shadow-lg">
                ✨ Доступна новая команда: <strong className="font-mono bg-purple-500/20 px-2 py-1 rounded text-purple-200">/color</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
