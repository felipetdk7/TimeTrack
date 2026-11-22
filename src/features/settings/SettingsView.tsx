// @ts-nocheck
import { UserAvatar } from '../../components/UserAvatar';
import { Shield, Trash2, UserPlus } from 'lucide-react';

import type { TimeTrackAppVm } from '../app/types';

export function SettingsView({ vm }: { vm: TimeTrackAppVm }) {
  const {
    activeUser,
    addTeamMember,
    newMemberEmail,
    newMemberName,
    newMemberRole,
    removeTeamMember,
    saveSettings,
    setNewMemberEmail,
    setNewMemberName,
    setNewMemberRole,
    settings,
    showToast,
    updateUserRole,
    users,
  } = vm;
  return (
            <div className="space-y-6 max-w-2xl">
              <div className="pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Configuración y Equipo
                </h1>
                <p className="text-xs text-slate-500">
                  Reglas de bloqueo de horas, restricción de dominio Google Workspace y roles del equipo.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast(
                    'success',
                    'Políticas actualizadas correctamente.'
                  );
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bloquear registros antiguos (Días)
                  </label>
                  <input
                    type="number"
                    value={settings.lockDays}
                    onChange={(e) =>
                      saveSettings({
                        ...settings,
                        lockDays: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-700"
                    min="0"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Los empleados no podrán editar ni eliminar registros con más días de antigüedad (0 = desactivado).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Dominio corporativo permitido (opcional)
                  </label>
                  <input
                    type="text"
                    value={settings.companyDomain}
                    onChange={(e) =>
                      saveSettings({
                        ...settings,
                        companyDomain: e.target.value.trim(),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-700"
                    placeholder="Ej: tuempresa.com (vacío = cualquier cuenta Google)"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Si ingresas un dominio, solo las cuentas de Google de ese dominio podrán iniciar sesión.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Guardar configuración
                  </button>
                </div>
              </form>

              {/* Team Directory & Roles */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Colaboradores y Roles
                  </h3>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = addTeamMember(
                      newMemberName,
                      newMemberEmail,
                      newMemberRole
                    );
                    if (!res.success) {
                      showToast(
                        'error',
                        res.error || 'No se pudo agregar el colaborador.'
                      );
                    } else {
                      setNewMemberName('');
                      setNewMemberEmail('');
                      setNewMemberRole('Employee');
                      showToast('success', 'Colaborador agregado.');
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2"
                >
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Nombre completo"
                    className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                    required
                  />
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                    className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                    required
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) =>
                      setNewMemberRole(e.target.value as 'Admin' | 'Employee')
                    }
                    className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                  >
                    <option value="Employee">Empleado</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                </form>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={u.role}
                          disabled={u.id === activeUser.id}
                          onChange={(e) =>
                            updateUserRole(
                              u.id,
                              e.target.value as 'Admin' | 'Employee'
                            )
                          }
                          className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-md disabled:opacity-60"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Employee">Empleado</option>
                        </select>
                        {u.id !== activeUser.id && (
                          <button
                            onClick={() => removeTeamMember(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Quitar colaborador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

  );
}
