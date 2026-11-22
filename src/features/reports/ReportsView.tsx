// @ts-nocheck
import { Check, Download, FileSpreadsheet } from 'lucide-react';

import type { TimeTrackAppVm } from '../app/types';

export function ReportsView({ vm }: { vm: TimeTrackAppVm }) {
  const {
    entries,
    exportToCSV,
    getColorClasses,
    getDayOfWeekName,
    getFilteredEntries,
    isExportingSheets,
    projects,
    reportEnd,
    reportProjectFilter,
    reportRange,
    reportStart,
    reportUserFilter,
    requestExportToGoogleSheets,
    setReportEnd,
    setReportProjectFilter,
    setReportRange,
    setReportStart,
    setReportUserFilter,
    sheetsExportUrl,
    tasks,
    users,
    weekDates,
  } = vm;
  return (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-slate-200 gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Reportes
                  </h1>
                  <p className="text-xs text-slate-500">
                    Horas por colaborador, proyecto y comparativa estimado vs. real.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportToCSV}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Exportar CSV / Excel
                  </button>
                  <button
                    onClick={requestExportToGoogleSheets}
                    disabled={isExportingSheets}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {isExportingSheets
                      ? 'Exportando...'
                      : 'Exportar a Google Sheets'}
                  </button>
                </div>
              </div>

              {sheetsExportUrl && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span className="text-xs text-emerald-900 font-medium">
                      Hoja creada en tu cuenta de Google Sheets.
                    </span>
                  </div>
                  <a
                    href={sheetsExportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto"
                  >
                    Abrir en Google Sheets
                  </a>
                </div>
              )}

              {/* Filters Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Rango de fecha
                  </label>
                  <select
                    value={reportRange}
                    onChange={(e) =>
                      setReportRange(
                        e.target.value as 'week' | 'month' | 'custom'
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="week">Esta semana (Lun - Dom)</option>
                    <option value="month">Este mes</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {reportRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-700"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Colaborador
                  </label>
                  <select
                    value={reportUserFilter}
                    onChange={(e) => setReportUserFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="all">Todos</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Proyecto
                  </label>
                  <select
                    value={reportProjectFilter}
                    onChange={(e) => setReportProjectFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="all">Todos</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Horas por colaborador
                  </h3>
                  {users.length === 0 ? (
                    <p className="text-xs text-slate-400">Sin colaboradores aún.</p>
                  ) : (
                    <div className="space-y-3">
                      {users.map((user) => {
                        const userEntries = getFilteredEntries().filter(
                          (e) => e.userId === user.id
                        );
                        const hrs =
                          userEntries.reduce(
                            (sum, e) => sum + e.durationMinutes,
                            0
                          ) / 60;
                        const percent = Math.min(100, (hrs / 40) * 100);

                        return (
                          <div key={user.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700">
                                {user.name}
                              </span>
                              <span className="font-bold text-slate-900 font-mono tabular-nums">
                                {hrs.toFixed(1)} h
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-slate-900 rounded-full"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Estimado vs. Real por proyecto
                  </h3>
                  {projects.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Crea un proyecto para ver el comparativo.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((proj) => {
                        const projTasks = tasks.filter(
                          (t) => t.projectId === proj.id
                        );
                        const estHrs = projTasks.reduce(
                          (sum, t) => sum + t.estimatedHours,
                          0
                        );
                        const projEntries = getFilteredEntries().filter(
                          (e) => e.projectId === proj.id
                        );
                        const actHrs =
                          projEntries.reduce(
                            (sum, e) => sum + e.durationMinutes,
                            0
                          ) / 60;
                        const percentOfEst =
                          estHrs > 0
                            ? Math.min(130, (actHrs / estHrs) * 100)
                            : 0;
                        const colorClasses = getColorClasses(proj.color);

                        return (
                          <div key={proj.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700">
                                {proj.name}
                              </span>
                              <span className="text-slate-500 font-mono tabular-nums">
                                Est: {estHrs}h · Real: {actHrs.toFixed(1)}h
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                              <div
                                className={`h-full ${colorClasses.bgSel} rounded-full`}
                                style={{
                                  width: `${Math.min(100, percentOfEst)}%`,
                                }}
                              ></div>
                              {percentOfEst > 100 && (
                                <div
                                  className="h-full bg-red-500 rounded-r-full"
                                  style={{ width: `${percentOfEst - 100}%` }}
                                ></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Timesheet Grid */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Planilla Semanal Detallada
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dedicación semanal de lunes a domingo (América/Bogotá).
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="px-4 py-2.5 border-r border-slate-200">
                          Colaborador
                        </th>
                        {weekDates.map((d) => (
                          <th
                            key={d}
                            className="px-3 py-2.5 text-center border-r border-slate-200 font-mono tabular-nums"
                          >
                            {getDayOfWeekName(d)} {d.slice(8)}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => {
                        let totalUserHours = 0;
                        const dayHours = weekDates.map((dateStr) => {
                          const hours =
                            entries
                              .filter(
                                (e) => e.userId === user.id && e.date === dateStr
                              )
                              .reduce((sum, e) => sum + e.durationMinutes, 0) /
                            60;
                          totalUserHours += hours;
                          return hours;
                        });

                        return (
                          <tr key={user.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 border-r border-slate-200 font-semibold text-slate-800">
                              {user.name}
                            </td>
                            {dayHours.map((hours, idx) => (
                              <td
                                key={idx}
                                className="px-3 py-3 text-center border-r border-slate-200 font-mono tabular-nums text-slate-600"
                              >
                                {hours > 0 ? hours.toFixed(1) : '-'}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right font-bold font-mono tabular-nums text-slate-900 bg-slate-50">
                              {totalUserHours.toFixed(1)} h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

  );
}
