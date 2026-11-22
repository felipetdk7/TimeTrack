// @ts-nocheck
import { UserAvatar } from '../../components/UserAvatar';
import { CalendarPlus, Edit3, Play, Plus, Square, Trash2 } from 'lucide-react';

import type { TimeTrackAppVm } from '../app/types';

export function TasksView({ vm }: { vm: TimeTrackAppVm }) {
  const {
    activeUser,
    deleteTask,
    entries,
    openCalendarExtractModal,
    projects,
    setConfirmDialog,
    setEditingTask,
    setShowStopTimerModal,
    setShowTaskModal,
    setTaskAssigned,
    setTaskDesc,
    setTaskDueDate,
    setTaskEst,
    setTaskName,
    setTaskProj,
    setTaskNotifyCalendar,
    setTaskStatus,
    showToast,
    startTimer,
    tasks,
    timer,
    updateTask,
    users,
  } = vm;
  return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Tareas
                  </h1>
                  <p className="text-xs text-slate-500">
                    Todas las tareas se pueden medir con el temporizador o extraer directamente desde Google Calendar.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => openCalendarExtractModal()}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                    Extraer de Calendar
                  </button>
                  {activeUser.role === 'Admin' && (
                    <button
                      onClick={() => {
                        if (projects.length === 0) {
                          showToast(
                            'info',
                            'Primero crea o importa un proyecto en la pestaña Proyectos.'
                          );
                          return;
                        }
                        setEditingTask(null);
                        setTaskName('');
                        setTaskDesc('');
                        setTaskEst(10);
                        setTaskAssigned(users[0]?.id || activeUser.id);
                        setTaskProj(projects[0]?.id || '');
                        setTaskStatus('To do');
                        setTaskDueDate('');
                        setTaskNotifyCalendar(false);
                        setShowTaskModal(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Asignar nueva tarea
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {(['To do', 'In progress', 'Done'] as const).map((status) => {
                  const statusTasks = tasks.filter((t) => {
                    const matchesStatus = t.status === status;
                    const matchesAssignee =
                      activeUser.role === 'Admin' ||
                      t.assignedTo === activeUser.id;
                    return matchesStatus && matchesAssignee;
                  });

                  return (
                    <div
                      key={status}
                      className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 flex flex-col min-h-[420px] max-h-[650px]"
                    >
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 shrink-0">
                        <span className="text-sm font-bold text-slate-800">
                          {status === 'To do'
                            ? 'Por hacer'
                            : status === 'In progress'
                            ? 'En progreso'
                            : 'Terminadas'}
                        </span>
                        <span className="font-mono tabular-nums text-xs text-slate-600 font-semibold">
                          {statusTasks.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {statusTasks.map((task) => {
                          const proj = projects.find(
                            (p) => p.id === task.projectId
                          );
                          const assignee = users.find(
                            (u) => u.id === task.assignedTo
                          );
                          const isTimerRunningOnThis = timer.taskId === task.id;

                          const taskLoggedHours =
                            entries
                              .filter((e) => e.taskId === task.id)
                              .reduce((sum, e) => sum + e.durationMinutes, 0) /
                            60;

                          return (
                            <div
                              key={task.id}
                              className="bg-white rounded-lg p-4 border border-slate-200 flex flex-col justify-between gap-3"
                            >
                              <div>
                                <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                                  <span className="truncate max-w-[140px] font-medium">
                                    {proj?.name || 'Proyecto'}
                                  </span>
                                  <span className="font-mono tabular-nums">
                                    Est: {task.estimatedHours}h · Reg:{' '}
                                    {taskLoggedHours.toFixed(1)}h
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                  {task.name}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 overflow-hidden">
                                  <UserAvatar
                                    name={assignee?.name}
                                    avatar={assignee?.avatar}
                                    size="xs"
                                  />
                                  <span className="text-xs text-slate-600 truncate max-w-[110px]">
                                    {assignee?.name.split(' ')[0] || 'Sin asignar'}
                                  </span>
                                </div>

                                <span className="text-xs text-slate-400 shrink-0 font-mono tabular-nums">
                                  {task.dueDate
                                    ? task.dueDate
                                        .split('-')
                                        .slice(1)
                                        .reverse()
                                        .join('/')
                                    : 'Sin plazo'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center gap-2 pt-1">
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    updateTask(task.id, {
                                      status: e.target.value as Task['status'],
                                    })
                                  }
                                  className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-md focus:outline-none focus:border-slate-400 cursor-pointer text-slate-700 font-medium"
                                >
                                  <option value="To do">Por hacer</option>
                                  <option value="In progress">
                                    En progreso
                                  </option>
                                  <option value="Done">Terminada</option>
                                </select>

                                <div>
                                  {isTimerRunningOnThis ? (
                                    <button
                                      onClick={() =>
                                        setShowStopTimerModal(true)
                                      }
                                      className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 font-semibold cursor-pointer"
                                    >
                                      <Square className="w-3 h-3 fill-current" />
                                      Detener
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => startTimer(task.id)}
                                      disabled={!!timer.taskId}
                                      className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1 border font-semibold cursor-pointer ${
                                        timer.taskId
                                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      Medir
                                    </button>
                                  )}
                                </div>

                                {activeUser.role === 'Admin' && (
                                  <div className="flex gap-1 ml-auto">
                                    <button
                                      onClick={() => {
                                        setEditingTask(task);
                                        setTaskName(task.name);
                                        setTaskDesc(task.description);
                                        setTaskEst(task.estimatedHours);
                                        setTaskAssigned(task.assignedTo);
                                        setTaskProj(task.projectId);
                                        setTaskStatus(task.status);
                                        setTaskDueDate(task.dueDate || '');
                                        setShowTaskModal(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                                      title="Editar tarea"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmDialog({
                                          title: 'Eliminar tarea',
                                          description: `¿Seguro que deseas eliminar la tarea "${task.name}"?`,
                                          confirmLabel: 'Eliminar tarea',
                                          variant: 'danger',
                                          onConfirm: () => {
                                            deleteTask(task.id);
                                            showToast(
                                              'success',
                                              'Tarea eliminada.'
                                            );
                                          },
                                        });
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                      title="Eliminar tarea"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {statusTasks.length === 0 && (
                          <div className="bg-white rounded-lg p-6 text-center border border-dashed border-slate-200">
                            <p className="text-xs text-slate-400">
                              No hay tareas en este estado
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

  );
}
