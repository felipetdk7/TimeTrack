// @ts-nocheck
import { Calendar, CalendarPlus, Play, Plus, Square } from 'lucide-react';

import { getBogotaDateString } from '../../data/store';
import type { TimeTrackAppVm } from '../app/types';

export function WeekView({ vm }: { vm: TimeTrackAppVm }) {
  const {
    accessToken,
    activeUser,
    elapsedSeconds,
    formatSpanishDate,
    formatTime,
    handleSyncNow,
    isCalendarConnected,
    isLoggingIn,
    isSyncing,
    myWeekDays,
    myWeekTotal,
    openCalendarExtractModal,
    openNewEntryModal,
    pendingSuggestionsCount,
    projects,
    setActiveTab,
    setShowStopTimerModal,
    startTimer,
    tasks,
    timer,
  } = vm;
  return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    ¡Hola, {activeUser.name}!
                  </h1>
                  <p className="text-xs text-slate-500">
                    Resumen de tu semana · Zona Horaria: América/Bogotá
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openNewEntryModal()}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar tiempo manual
                  </button>
                </div>
              </div>

              {/* Weekly Progress Bar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">
                      Total esta semana
                    </span>
                    <h3 className="text-3xl font-mono tabular-nums font-bold text-slate-900 mt-1">
                      {(myWeekTotal / 60).toFixed(1)} h
                    </h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                    <span>Meta: 40h semanales</span>
                    <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                      {Math.round((myWeekTotal / 2400) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Horas diarias
                  </span>
                  <div className="grid grid-cols-7 gap-2 mt-4 text-center">
                    {Object.values(myWeekDays).map((day) => {
                      const hours = day.loggedMinutes / 60;
                      const isToday = day.date === getBogotaDateString(0);
                      return (
                        <div key={day.date} className="flex flex-col items-center">
                          <span
                            className={`text-xs font-semibold leading-none ${
                              isToday ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {day.dayName}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                            {day.date.split('-')[2]}
                          </span>

                          <div className="w-3.5 h-20 bg-slate-100 rounded-full mt-2 relative overflow-hidden">
                            <div
                              className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ${
                                isToday ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                              style={{
                                height: `${Math.min(
                                  100,
                                  (day.loggedMinutes / 480) * 100
                                )}%`,
                              }}
                            ></div>
                          </div>

                          <span className="text-xs font-mono tabular-nums font-semibold text-slate-700 mt-1.5">
                            {hours > 0 ? hours.toFixed(1) : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Calendar Connection / Suggestions Banner */}
              {!accessToken && isCalendarConnected && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Conecta tu Google Calendar para sincronizar eventos
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Autoriza tu sesión actual para leer los eventos de tu calendario y generar sugerencias de tiempo.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncNow}
                    disabled={isLoggingIn || isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap self-start sm:self-center transition-colors cursor-pointer"
                  >
                    {isLoggingIn || isSyncing
                      ? 'Conectando...'
                      : 'Conectar y sincronizar'}
                  </button>
                </div>
              )}

              {isCalendarConnected && pendingSuggestionsCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 p-2 rounded-lg text-emerald-800 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-950">
                        Sugerencias de Google Calendar disponibles
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Tienes {pendingSuggestionsCount} evento(s) que coinciden
                        con tus proyectos y tareas listos para confirmar en un clic.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap self-start sm:self-center transition-colors cursor-pointer"
                  >
                    Ver sugerencias
                  </button>
                </div>
              )}

              {/* Measurable Tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Tareas listas para medir
                  </h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Ver todas las tareas
                  </button>
                </div>

                {(() => {
                  const myPending = tasks.filter(
                    (t) =>
                      t.assignedTo === activeUser.id && t.status !== 'Done'
                  );
                  const weekVisibleTasks =
                    myPending.length > 0
                      ? myPending.slice(0, 6)
                      : tasks.filter((t) => t.status !== 'Done').slice(0, 6);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {weekVisibleTasks.map((task) => {
                        const proj = projects.find(
                          (p) => p.id === task.projectId
                        );
                        const isTimerRunningOnThis = timer.taskId === task.id;

                        return (
                          <div
                            key={task.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
                                <span>
                                  {proj?.name || 'Proyecto'} ·{' '}
                                  {proj?.client || 'Cliente'}
                                </span>
                                <span className="font-mono tabular-nums">
                                  Est: {task.estimatedHours}h
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900">
                                {task.name}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-xs text-slate-400">
                                {task.dueDate
                                  ? `Vence: ${formatSpanishDate(task.dueDate)}`
                                  : 'Sin fecha límite'}
                              </span>

                              <div>
                                {isTimerRunningOnThis ? (
                                  <button
                                    onClick={() => setShowStopTimerModal(true)}
                                    className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Square className="w-3 h-3 fill-current" />
                                    Detener ({formatTime(elapsedSeconds)})
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startTimer(task.id)}
                                    disabled={!!timer.taskId}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                                      timer.taskId
                                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    Iniciar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {weekVisibleTasks.length === 0 && (
                        <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-300 md:col-span-2 space-y-2">
                          <p className="text-sm font-medium text-slate-700">
                            No hay tareas activas todavía.
                          </p>
                          <p className="text-xs text-slate-500">
                            Extrae tareas desde tu Google Calendar o importa proyectos desde Google Sheets para empezar a medir tu tiempo.
                          </p>
                          <div className="pt-2 flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => openCalendarExtractModal()}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              Extraer tareas de Calendar
                            </button>
                            {activeUser.role === 'Admin' && (
                              <button
                                onClick={() => setActiveTab('projects')}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Ir a Proyectos
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

  );
}
