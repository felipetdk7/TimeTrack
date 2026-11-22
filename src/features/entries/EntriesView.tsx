// @ts-nocheck
import { Edit3, Plus, Trash2 } from 'lucide-react';

import type { TimeTrackAppVm } from '../app/types';

export function EntriesView({ vm }: { vm: TimeTrackAppVm }) {
  const { activeUser, deleteTimeEntry, entries, formatDuration, isEntryLocked, openEditEntryModal, openNewEntryModal, projects, setConfirmDialog, showToast, tasks, users } = vm;
  return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Historial de Horas
                  </h1>
                  <p className="text-xs text-slate-500">
                    {activeUser.role === 'Admin'
                      ? 'Todos los registros cargados del equipo.'
                      : 'Tus registros de tiempo ingresados.'}
                  </p>
                </div>
                <button
                  onClick={() => openNewEntryModal()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar entrada manual
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Fecha</th>
                        {activeUser.role === 'Admin' && (
                          <th className="px-5 py-3">Colaborador</th>
                        )}
                        <th className="px-5 py-3">Proyecto / Tarea</th>
                        <th className="px-5 py-3">Nota</th>
                        <th className="px-5 py-3">Horario</th>
                        <th className="px-5 py-3 text-right">Duración</th>
                        <th className="px-5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries
                        .filter(
                          (e) =>
                            activeUser.role === 'Admin' ||
                            e.userId === activeUser.id
                        )
                        .map((entry) => {
                          const userName =
                            users.find((u) => u.id === entry.userId)?.name || '';
                          const proj = projects.find(
                            (p) => p.id === entry.projectId
                          );
                          const task = tasks.find((t) => t.id === entry.taskId);
                          const isLocked = isEntryLocked(entry.date);

                          return (
                            <tr
                              key={entry.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono tabular-nums font-medium text-slate-700">
                                {entry.date}
                              </td>

                              {activeUser.role === 'Admin' && (
                                <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800">
                                  {userName}
                                </td>
                              )}

                              <td className="px-5 py-3.5">
                                <span className="text-xs text-slate-400">
                                  {proj?.name || 'N/A'}
                                </span>
                                <p className="text-xs font-bold text-slate-800">
                                  {task?.name || 'N/A'}
                                </p>
                              </td>

                              <td className="px-5 py-3.5 max-w-xs truncate text-xs text-slate-500">
                                {entry.note || 'Sin nota'}
                              </td>

                              <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono tabular-nums">
                                {entry.startTime} - {entry.endTime}
                              </td>

                              <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-mono tabular-nums font-bold text-slate-900">
                                {formatDuration(entry.durationMinutes)}
                              </td>

                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {isLocked ? (
                                    <span className="text-xs text-slate-400">
                                      Bloqueado
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => openEditEntryModal(entry)}
                                        className="p-1.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                        title="Editar entrada"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setConfirmDialog({
                                            title: 'Eliminar registro de tiempo',
                                            description:
                                              '¿Seguro que deseas eliminar este registro de horas?',
                                            confirmLabel: 'Eliminar',
                                            variant: 'danger',
                                            onConfirm: () => {
                                              const res = deleteTimeEntry(
                                                entry.id
                                              );
                                              if (!res.success && res.error) {
                                                showToast('error', res.error);
                                              } else {
                                                showToast(
                                                  'success',
                                                  'Registro eliminado.'
                                                );
                                              }
                                            },
                                          });
                                        }}
                                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                        title="Eliminar entrada"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {entries.filter(
                        (e) =>
                          activeUser.role === 'Admin' ||
                          e.userId === activeUser.id
                      ).length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-10 text-slate-400 text-xs"
                          >
                            Aún no hay registros de horas. Inicia un temporizador o agrega una entrada manual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

  );
}
