// @ts-nocheck
import { Archive, Briefcase, Edit3, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';

import type { TimeTrackAppVm } from '../app/types';

export function ProjectsView({ vm }: { vm: TimeTrackAppVm }) {
  const {
    activeUser,
    deleteProject,
    entries,
    getColorClasses,
    projects,
    setConfirmDialog,
    setEditingProject,
    setProjClient,
    setProjColor,
    setProjName,
    setSheetsError,
    setShowProjectModal,
    setShowSheetsImportModal,
    showToast,
    tasks,
    updateProject,
  } = vm;
  return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Proyectos
                  </h1>
                  <p className="text-xs text-slate-500">
                    Gestiona los proyectos y clientes de tu equipo o impórtalos desde Google Sheets.
                  </p>
                </div>
                {activeUser.role === 'Admin' && (
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => {
                        setSheetsError(null);
                        setShowSheetsImportModal(true);
                      }}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Importar de Google Sheets
                    </button>
                    <button
                      onClick={() => {
                        setEditingProject(null);
                        setProjName('');
                        setProjClient('');
                        setProjColor('emerald');
                        setShowProjectModal(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Crear nuevo proyecto
                    </button>
                  </div>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center space-y-3">
                  <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Aún no hay proyectos creados
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeUser.role === 'Admin'
                      ? 'Crea tu primer proyecto manualmente o impórtalos directamente desde una hoja de Google Sheets.'
                      : 'Tu administrador aún no ha creado proyectos.'}
                  </p>
                  {activeUser.role === 'Admin' && (
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSheetsError(null);
                          setShowSheetsImportModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Importar de Google Sheets
                      </button>
                      <button
                        onClick={() => {
                          setEditingProject(null);
                          setProjName('');
                          setProjClient('');
                          setProjColor('emerald');
                          setShowProjectModal(true);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Crear primer proyecto
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {projects.map((proj) => {
                    const colorSet = getColorClasses(proj.color);
                    const projTasks = tasks.filter(
                      (t) => t.projectId === proj.id
                    );
                    const completedTasks = projTasks.filter(
                      (t) => t.status === 'Done'
                    );
                    const percentComplete =
                      projTasks.length > 0
                        ? Math.round(
                            (completedTasks.length / projTasks.length) * 100
                          )
                        : 0;
                    const projEntries = entries.filter(
                      (e) => e.projectId === proj.id
                    );
                    const totalHrsLogged =
                      projEntries.reduce(
                        (sum, e) => sum + e.durationMinutes,
                        0
                      ) / 60;

                    return (
                      <div
                        key={proj.id}
                        className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between relative overflow-hidden"
                      >
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorSet.bgSel}`}
                        ></div>

                        <div className="pl-2 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-xs text-slate-500 font-medium">
                                {proj.client} ·{' '}
                                <span
                                  className={
                                    proj.active
                                      ? 'text-emerald-700 font-semibold'
                                      : 'text-slate-400'
                                  }
                                >
                                  {proj.active ? 'Activo' : 'Archivado'}
                                </span>
                              </span>
                              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                                {proj.name}
                              </h3>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Progreso de tareas</span>
                              <span className="font-mono tabular-nums">
                                {completedTasks.length}/{projTasks.length}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${colorSet.bgSel}`}
                                style={{ width: `${percentComplete}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <div>
                              <span className="block font-bold font-mono tabular-nums text-slate-800">
                                {totalHrsLogged.toFixed(1)} h
                              </span>
                              <span>Horas registradas</span>
                            </div>
                            <div className="text-right">
                              <span className="block font-bold font-mono tabular-nums text-slate-800">
                                {projTasks.length}
                              </span>
                              <span>Tareas</span>
                            </div>
                          </div>
                        </div>

                        {activeUser.role === 'Admin' && (
                          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 pl-2">
                            <button
                              onClick={() =>
                                updateProject(proj.id, { active: !proj.active })
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                              title={
                                proj.active
                                  ? 'Archivar proyecto'
                                  : 'Reactivar proyecto'
                              }
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingProject(proj);
                                setProjName(proj.name);
                                setProjClient(proj.client);
                                setProjColor(proj.color);
                                setShowProjectModal(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                              title="Editar proyecto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Eliminar proyecto',
                                  description: `¿Estás seguro de que deseas eliminar el proyecto "${proj.name}" y todas sus tareas asociadas?`,
                                  confirmLabel: 'Eliminar proyecto',
                                  variant: 'danger',
                                  onConfirm: () => {
                                    deleteProject(proj.id);
                                    showToast('success', 'Proyecto eliminado.');
                                  },
                                });
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Eliminar proyecto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

  );
}
