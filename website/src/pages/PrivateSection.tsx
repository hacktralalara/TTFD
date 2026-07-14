import { Shield } from 'lucide-react';
import { useGameContext } from '../Layout';

export function PrivateSection() {
  const { isAdmin } = useGameContext();

  if (!isAdmin) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center text-center">
        <Shield size={64} className="text-rose-500 opacity-50 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2">Доступ запрещён</h1>
        <p className="text-slate-400">У вас нет прав для просмотра этой страницы.</p>
      </div>
    );
  }

  return <div className="w-full min-h-[50vh]" />;
}
