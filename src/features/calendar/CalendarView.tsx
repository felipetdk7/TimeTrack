// @ts-nocheck
import { GoogleGIcon } from '../../components/GoogleGIcon';
import { CalendarPlus, Check, RefreshCw } from 'lucide-react';

import type { TimeTrackAppVm } from '../app/types';

export function CalendarView({ vm }: { vm: TimeTrackAppVm }) {
  const { accessToken, calendarEvents, confirmCalendarSuggestion, discardCalendarSuggestion, handleSyncNow, isCalendarConnected, isLoggingIn, isSyncing, lastCalendarSync, openCalendarExtractModal, openNewEntryModal, pendingSuggestionsCount, projects, setCalendarConnectedState, showToast, tasks } = vm;
  return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Google Calendar
                  </h1>
                  <p className="text-xs text-slate-500">
                    Los eventos de tu calendario con formato{' '}
                    <span className="font-mono font-semibold text-slate-700">
                      [Proyecto] Tarea
                    </span>{' '}
                    se sugieren automáticamente para confirmar en un clic.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing || isLoggingIn || !isCalendarConnected}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                    />
                    {isSyncing
                      ? 'Sincronizando...'
                      : accessToken
                      ? 'Sincronizar ahora'
                      : 'Conectar y sincronizar'}
                  </button>

                  <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                    <span className="text-xs text-slate-600 font-medium">
                      Sync activo:
                    </span>
                    <button
                      onClick={() =>
                        setCalendarConnectedState(!isCalendarConnected)
                      }
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        isCalendarConnected ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                          isCalendarConnected
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {isCalendarConnected ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Sidebar Info */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Estado de conexión
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {accessToken
                            ? 'Conectado a tu Google Calendar primario.'
                            : 'Autoriza tu sesión actual para leer nuevos eventos de Google Calendar.'}
                        </p>
                        {lastCalendarSync && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Última sincronización:{' '}
                            {new Date(lastCalendarSync).toLocaleString('es-CO', {
                              timeZone: 'America/Bogota',
                            })}
                          </p>
                        )}
                      </div>

                      {!accessToken && (
                        <button
                          type="button"
                          onClick={handleSyncNow}
                          disabled={isLoggingIn || isSyncing}
                          className="gsi-material-button w-full"
                        >
                          <div className="gsi-material-button-state" />
                          <div className="gsi-material-button-content-wrapper">
                            <div className="gsi-material-button-icon">
                              <GoogleGIcon />
                            </div>
                            <span className="gsi-material-button-contents">
                              Conectar Google Calendar
                            </span>
                            <span style={{ display: 'none' }}>
                              Conectar Google Calendar
                            </span>
                          </div>
                        </button>
                      )}

                      <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Sugerencias pendientes:
                          </span>
                          <span className="font-bold text-amber-700 font-mono tabular-nums">
                            {pendingSuggestionsCount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Confirmados:
                          </span>
                          <span className="font-bold text-emerald-700 font-mono tabular-nums">
                            {
                              calendarEvents.filter(
                                (e) => e.status === 'confirmed'
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Events List */}
                  <div className="lg:col-span-2 space-y-3">
                    <h3 className="text-base font-bold text-slate-900">
                      Eventos del calendario (±7 días · América/Bogotá)
                    </h3>

                    {calendarEvents.length === 0 ? (
                      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
                        <p className="text-sm font-medium text-slate-700">
                          No hay eventos sincronizados todavía.
                        </p>
                        <p className="text-xs text-slate-500">
                          Haz clic en &quot;Sincronizar ahora&quot; para traer tus eventos reales de Google Calendar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {calendarEvents.map((evt) => {
                          const hasMatch = Boolean(
                            evt.matchedProjectId && evt.matchedTaskId
                          );
                          const matchedProj = projects.find(
                            (p) => p.id === evt.matchedProjectId
                          );
                          const matchedTsk = tasks.find(
                            (t) => t.id === evt.matchedTaskId
                          );

                          return (
                            <div
                              key={evt.id}
                              className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                                evt.status === 'confirmed'
                                  ? 'border-emerald-200 opacity-75'
                                  : evt.status === 'discarded'
                                  ? 'border-slate-100 opacity-45'
                                  : hasMatch
                                  ? 'border-amber-300'
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span
                                    className={`font-semibold ${
                                      evt.status === 'confirmed'
                                        ? 'text-emerald-700'
                                        : evt.status === 'discarded'
                                        ? 'text-slate-400'
                                        : hasMatch
                                        ? 'text-amber-700'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {evt.status === 'confirmed'
                                      ? '✓ Registrado'
                                      : evt.status === 'discarded'
                                      ? 'Descartado'
                                      : hasMatch
                                      ? 'Sugerencia lista'
                                      : 'Sin coincidencia'}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    {evt.date} · {evt.startTime} - {evt.endTime}
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900">
                                  {evt.title}
                                </h4>

                                {hasMatch && evt.status === 'pending' && (
                                  <p className="text-xs text-slate-600">
                                    Coincidencia:{' '}
                                    <span className="font-semibold">
                                      {matchedProj?.name}
                                    </span>{' '}
                                    / {matchedTsk?.name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                                {evt.status === 'pending' && (
                                  <>
                                    {hasMatch ? (
                                      <button
                                        onClick={() => {
                                          const res = confirmCalendarSuggestion(
                                            evt.id
                                          );
                                          if (!res.success && res.error) {
                                            showToast('error', res.error);
                                          } else {
                                            showToast(
                                              'success',
                                              'Evento registrado como entrada de tiempo.'
                                            );
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        Confirmar
                                      </button>
                                    ) : (
                                      <>
                                        {!evt.matchedTaskId && (
                                          <button
                                            onClick={() =>
                                              openCalendarExtractModal(evt.id)
                                            }
                                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                                          >
                                            <CalendarPlus className="w-3.5 h-3.5" />
                                            Crear tarea
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            openNewEntryModal({
                                              date: evt.date,
                                              startTime: evt.startTime,
                                              endTime: evt.endTime,
                                              note: `Calendario: ${evt.title}`,
                                              calendarEventId: evt.id,
                                            })
                                          }
                                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                          Asociar
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() =>
                                        discardCalendarSuggestion(evt.id)
                                      }
                                      className="bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                                    >
                                      Descartar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Sincronización pausada
                  </h3>
                  <p className="text-xs text-slate-500">
                    Has desactivado la sincronización con Google Calendar.
                  </p>
                  <button
                    onClick={() => setCalendarConnectedState(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Reactivar sincronización
                  </button>
                </div>
              )}
            </div>

  );
}
