import { Clock, LogOut, Square } from 'lucide-react';
import type { Project, Task, User } from '../../data/store';
import { UserAvatar } from '../../components/UserAvatar';

export const TimerHeader = ({
  activeUser,
  timer,
  runningProject,
  runningTask,
  elapsedSeconds,
  formatTime,
  onStopTimer,
  onLogout,
}: {
  activeUser: User;
  timer: { taskId: string | null };
  runningProject: Project | null | undefined;
  runningTask: Task | null | undefined;
  elapsedSeconds: number;
  formatTime: (seconds: number) => string;
  onStopTimer: () => void;
  onLogout: () => void;
}) => (
  <header className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 shadow-md flex flex-wrap md:flex-nowrap items-center justify-between border-b border-slate-800 gap-2">
    <div className="flex items-center space-x-3 shrink-0">
      <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
        <span className="bg-emerald-600 p-1.5 rounded-lg text-white">
          <Clock className="w-5 h-5" />
        </span>
        TimeTrack
      </span>
      <span className="hidden sm:inline text-xs text-slate-400 border-l border-slate-700 pl-3">
        América/Bogotá GMT-5
      </span>
    </div>

    <div className="flex items-center space-x-2 my-1 md:my-0 flex-1 md:flex-none justify-center px-2 max-w-lg w-full md:w-auto">
      {timer.taskId ? (
        <div className="bg-emerald-950/80 border border-emerald-800/80 px-4 py-1.5 rounded-full flex items-center space-x-3 w-full justify-between shadow-inner">
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-xs text-emerald-200 font-medium truncate">
              {runningProject ? `[${runningProject.name}] ` : ''}
              {runningTask?.name || 'Midiendo tiempo...'}
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="font-mono tabular-nums text-emerald-300 text-sm font-semibold tracking-wider">
              {formatTime(elapsedSeconds)}
            </span>
            <button
              onClick={onStopTimer}
              className="bg-red-600 hover:bg-red-700 p-1 rounded-full text-white transition-all cursor-pointer"
              title="Detener temporizador"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Sin temporizador activo</span>
        </div>
      )}
    </div>

    <div className="flex items-center space-x-3 shrink-0">
      <div className="hidden lg:flex items-center space-x-2">
        <UserAvatar name={activeUser.name} avatar={activeUser.avatar} />
        <div className="text-left leading-none">
          <p className="text-xs font-semibold text-white">
            {activeUser.name} ·{' '}
            <span className="text-emerald-400">
              {activeUser.role === 'Admin' ? 'Admin' : 'Empleado'}
            </span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{activeUser.email}</p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        title="Cerrar sesión"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </div>
  </header>
);