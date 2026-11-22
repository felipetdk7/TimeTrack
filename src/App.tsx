import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Briefcase,
  CheckSquare,
  FileText,
  Settings,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  Menu,
  X,
  Check,
  LogOut,
  CalendarPlus,
  Upload,
} from 'lucide-react';
import {
  useTimeTrackStore,
  Project,
  Task,
  TimeEntry,
  getBogotaDateString,
  getBogotaWeekDates,
} from './data/store';
import {
  initAuth,
  googleSignIn,
  logout,
  clearAccessToken,
} from './services/googleAuth';
import {
  createGoogleCalendarEvent,
  exportReportToGoogleSheets,
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  fetchSheetRows,
  GoogleAuthExpiredError,
} from './services/googleWorkspace';
import { WeekView } from './features/week/WeekView';
import { ProjectsView } from './features/projects/ProjectsView';
import { TasksView } from './features/tasks/TasksView';
import { EntriesView } from './features/entries/EntriesView';
import { CalendarView } from './features/calendar/CalendarView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';

import { ConfirmDialogModal, type ConfirmDialogState } from './components/ConfirmDialog';
import { GoogleGIcon } from './components/GoogleGIcon';
import { ToastBanner, type ToastMessage } from './components/ToastBanner';
import { UserAvatar } from './components/UserAvatar';
import { TimerHeader } from './features/timer/TimerHeader';

export default function App() {
  const store = useTimeTrackStore();
  const {
    users,
    projects,
    tasks,
    entries,
    calendarEvents,
    settings,
    activeUser,
    timer,
    isCalendarConnected,
    lastCalendarSync,
    isEntryLocked,
    upsertAuthenticatedUser,
    clearAuthenticatedUser,
    enterDemoMode,
    addTeamMember,
    updateUserRole,
    removeTeamMember,
    startTimer,
    stopTimer,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    confirmCalendarSuggestion,
    discardCalendarSuggestion,
    addTask,
    updateTask,
    deleteTask,
    addProject,
    updateProject,
    deleteProject,
    importProjectsAndTasksFromSheet,
    extractTasksFromCalendarEvents,
    syncGoogleCalendar,
    setCalendarConnectedState,
    saveSettings,
  } = store;

  // Auth State
  const [authReady, setAuthReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<
    'week' | 'projects' | 'tasks' | 'entries' | 'calendar' | 'reports' | 'settings'
  >('week');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerNote, setTimerNote] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null
  );

  // Modals / Forms State
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStopTimerModal, setShowStopTimerModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Entry Form Fields
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');
  const [formProject, setFormProject] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formCalendarEventId, setFormCalendarEventId] = useState<
    string | undefined
  >(undefined);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Project Form Fields
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projColor, setProjColor] = useState('emerald');

  // Task Form Fields
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskEst, setTaskEst] = useState(10);
  const [taskAssigned, setTaskAssigned] = useState('');
  const [taskProj, setTaskProj] = useState('');
  const [taskStatus, setTaskStatus] = useState<'To do' | 'In progress' | 'Done'>(
    'To do'
  );
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskNotifyCalendar, setTaskNotifyCalendar] = useState(false);

  // Team member invite form in Settings
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Employee'>(
    'Employee'
  );

  // Reports Filter Fields
  const [reportRange, setReportRange] = useState<'week' | 'month' | 'custom'>(
    'week'
  );
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportUserFilter, setReportUserFilter] = useState('all');
  const [reportProjectFilter, setReportProjectFilter] = useState('all');
  const [sheetsExportUrl, setSheetsExportUrl] = useState<string | null>(null);
  const [isExportingSheets, setIsExportingSheets] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Import Projects from Google Sheets Modal State
  const [showSheetsImportModal, setShowSheetsImportModal] = useState(false);
  const [sheetsInput, setSheetsInput] = useState(
    () => localStorage.getItem('tt_linked_projects_sheet_url') || ''
  );
  const [sheetsMetadata, setSheetsMetadata] = useState<{
    spreadsheetId: string;
    title: string;
    sheetTitles: string[];
  } | null>(null);
  const [selectedSheetTab, setSelectedSheetTab] = useState('');
  const [sheetsPreviewProjects, setSheetsPreviewProjects] = useState<
    Array<{ name: string; client: string; color: string; active: boolean }>
  >([]);
  const [sheetsPreviewTasks, setSheetsPreviewTasks] = useState<
    Array<{
      projectName: string;
      name: string;
      description: string;
      estimatedHours: number;
      assigneeEmail?: string;
    }>
  >([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  // Extract Tasks from Google Calendar Modal State
  const [showCalendarExtractModal, setShowCalendarExtractModal] = useState(false);
  const [calExtractDrafts, setCalExtractDrafts] = useState<
    Array<{
      eventId: string;
      selected: boolean;
      taskName: string;
      projectId: string;
      estimatedHours: number;
      date: string;
      startTime: string;
      endTime: string;
      alreadyMatched: boolean;
    }>
  >([]);

  const showToast = useCallback(
    (type: ToastMessage['type'], text: string) => {
      setToast({ type, text });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Initialize Firebase Google Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(async (fbUser, token) => {
      if (fbUser) {
        const res = upsertAuthenticatedUser(fbUser);
        if (!res.allowed) {
          setAuthError(
            res.error || 'Tu cuenta no tiene acceso autorizado a este espacio.'
          );
          clearAuthenticatedUser();
          await logout();
        } else {
          setAuthError(null);
          setAccessToken(token);
        }
      } else if (localStorage.getItem('tt_demo_mode') === 'true') {
        setAccessToken(null);
      } else {
        setAccessToken(null);
        clearAuthenticatedUser();
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [upsertAuthenticatedUser, clearAuthenticatedUser]);

  // Sign in / Reconnect Google handler
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      const res = upsertAuthenticatedUser(result.user);
      if (!res.allowed) {
        setAuthError(
          res.error || 'Tu cuenta no pertenece al dominio autorizado.'
        );
        clearAuthenticatedUser();
        await logout();
        return;
      }
      setAccessToken(result.accessToken);
      showToast(
        'success',
        `Bienvenido, ${res.user?.name}. Cuenta de Google conectada.`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo completar el inicio de sesión con Google.';
      setAuthError(msg);
      showToast('error', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAccessToken(null);
    clearAuthenticatedUser();
    setActiveTab('week');
  };

  // Automatic daily Google Calendar sync when token is available
  useEffect(() => {
    if (!activeUser || !accessToken || !isCalendarConnected) return;

    const shouldAutoSync = () => {
      if (!lastCalendarSync) return true;
      const elapsedMs = Date.now() - new Date(lastCalendarSync).getTime();
      return elapsedMs > 24 * 60 * 60 * 1000;
    };

    if (shouldAutoSync()) {
      setIsSyncing(true);
      syncGoogleCalendar(accessToken).then((res) => {
        setIsSyncing(false);
        if (res.authExpired) {
          clearAccessToken();
          setAccessToken(null);
        }
      });
    }
  }, [activeUser, accessToken, isCalendarConnected, lastCalendarSync, syncGoogleCalendar]);

  // Update timer elapsed seconds ticker
  useEffect(() => {
    if (!timer.startTime) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const diff = Math.floor(
        (Date.now() - new Date(timer.startTime!).getTime()) / 1000
      );
      setElapsedSeconds(diff >= 0 ? diff : 0);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [timer.startTime]);

  // Default filter dates (America/Bogota)
  useEffect(() => {
    const todayStr = getBogotaDateString(0);
    const prevWeekStr = getBogotaDateString(-7);
    setReportStart(prevWeekStr);
    setReportEnd(todayStr);
    setFormDate(todayStr);
  }, []);

  // Keep formTask aligned with formProject (allow picking any task in the project)
  useEffect(() => {
    if (!formProject) {
      setFormTask('');
      return;
    }
    const matchedTasks = tasks.filter((t) => t.projectId === formProject);
    if (matchedTasks.length > 0) {
      if (!matchedTasks.some((t) => t.id === formTask)) {
        setFormTask(matchedTasks[0].id);
      }
    } else {
      setFormTask('');
    }
  }, [formProject, tasks, formTask]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const formatSpanishDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr + 'T12:00:00Z');
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return `${days[dateObj.getUTCDay()]}, ${dateObj.getUTCDate()} de ${
      months[dateObj.getUTCMonth()]
    }`;
  };

  const getDayOfWeekName = (dateStr: string) => {
    const dateObj = new Date(dateStr + 'T12:00:00Z');
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dateObj.getUTCDay()];
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          bgSel: 'bg-emerald-600',
        };
      case 'sky':
        return {
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          border: 'border-sky-200',
          bgSel: 'bg-sky-600',
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          bgSel: 'bg-indigo-600',
        };
      case 'amber':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          bgSel: 'bg-amber-600',
        };
      case 'rose':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          bgSel: 'bg-rose-600',
        };
      case 'violet':
        return {
          bg: 'bg-violet-50',
          text: 'text-violet-700',
          border: 'border-violet-200',
          bgSel: 'bg-violet-600',
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          bgSel: 'bg-slate-600',
        };
    }
  };

  const runningTask = timer.taskId
    ? tasks.find((t) => t.id === timer.taskId)
    : null;
  const runningProject = runningTask
    ? projects.find((p) => p.id === runningTask.projectId)
    : null;

  const handleStopTimerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = stopTimer(true, timerNote);
    if (result && 'error' in result) {
      showToast('error', result.error);
    } else if (result) {
      showToast('success', 'Tiempo guardado en tu historial.');
    }
    setTimerNote('');
    setShowStopTimerModal(false);
  };

  // Manual Entry Form Handlers
  const openNewEntryModal = (prefill?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    note?: string;
    calendarEventId?: string;
  }) => {
    setEditingEntry(null);
    setFormDate(prefill?.date || getBogotaDateString(0));
    setFormStart(prefill?.startTime || '09:00');
    setFormEnd(prefill?.endTime || '12:00');
    setFormNote(prefill?.note || '');
    setFormCalendarEventId(prefill?.calendarEventId);
    setFormError('');
    setFormSuccess('');

    const activeProjects = projects.filter((p) => p.active);
    if (activeProjects.length > 0) {
      const initialProjId = activeProjects[0].id;
      setFormProject(initialProjId);
      const matchedTasks = tasks.filter((t) => t.projectId === initialProjId);
      setFormTask(matchedTasks.length > 0 ? matchedTasks[0].id : '');
    } else {
      setFormProject('');
      setFormTask('');
    }
    setShowManualEntryModal(true);
  };

  const openEditEntryModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormStart(entry.startTime);
    setFormEnd(entry.endTime);
    setFormProject(entry.projectId);
    setFormTask(entry.taskId);
    setFormNote(entry.note);
    setFormCalendarEventId(entry.calendarEventId);
    setFormError('');
    setFormSuccess('');
    setShowManualEntryModal(true);
  };

  const handleManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formProject || !formTask || !formDate || !formStart || !formEnd) {
      setFormError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (activeUser?.role !== 'Admin' && isEntryLocked(formDate)) {
      setFormError(
        `El período está cerrado. No puedes registrar tiempo anterior a ${settings.lockDays} días.`
      );
      return;
    }

    const entryData = {
      userId: editingEntry ? editingEntry.userId : activeUser?.id || '',
      projectId: formProject,
      taskId: formTask,
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
      note: formNote,
      source: (formCalendarEventId
        ? 'calendar'
        : editingEntry
        ? editingEntry.source
        : 'manual') as 'manual' | 'timer' | 'calendar',
      calendarEventId: formCalendarEventId,
    };

    if (editingEntry) {
      const res = updateTimeEntry(editingEntry.id, entryData);
      if (res.success) {
        setFormSuccess('Registro actualizado.');
        showToast('success', 'Registro actualizado correctamente.');
        setTimeout(() => setShowManualEntryModal(false), 500);
      } else {
        setFormError(res.error || 'Ocurrió un error al actualizar el registro.');
      }
    } else {
      const res = addTimeEntry(entryData);
      if (res.success) {
        setFormSuccess('Registro guardado.');
        showToast('success', 'Tiempo registrado correctamente.');
        setTimeout(() => setShowManualEntryModal(false), 500);
      } else {
        setFormError(res.error || 'Ocurrió un error al guardar el registro.');
      }
    }
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim() || !projClient.trim()) {
      showToast('error', 'Completa el nombre del proyecto y del cliente.');
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, {
        name: projName.trim(),
        client: projClient.trim(),
        color: projColor,
      });
      showToast('success', 'Proyecto actualizado.');
    } else {
      addProject({
        name: projName.trim(),
        client: projClient.trim(),
        color: projColor,
      });
      showToast('success', 'Proyecto creado correctamente.');
    }

    setProjName('');
    setProjClient('');
    setProjColor('emerald');
    setEditingProject(null);
    setShowProjectModal(false);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !taskProj || !taskAssigned) {
      showToast('error', 'Completa nombre, proyecto y colaborador asignado.');
      return;
    }

    const taskData = {
      projectId: taskProj,
      name: taskName.trim(),
      description: taskDesc.trim(),
      estimatedHours: taskEst,
      assignedTo: taskAssigned,
      status: taskStatus,
      dueDate: taskDueDate || undefined,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
      showToast('success', 'Tarea actualizada.');
    } else {
      addTask(taskData);
      showToast('success', 'Tarea asignada.');

      // If Admin requested creating a Google Calendar event, prompt explicit user confirmation before mutating Google Calendar
      if (taskDueDate && taskNotifyCalendar) {
        const matchedProj = projects.find((p) => p.id === taskProj);
        const assignee = users.find((u) => u.id === taskAssigned);
        const summary = `[${matchedProj?.name || 'Proyecto'}] ${taskName.trim()}`;
        const capturedDate = taskDueDate;
        const capturedDesc = taskDesc.trim();
        const capturedEmail = assignee?.email;

        setConfirmDialog({
          title: 'Crear evento en Google Calendar',
          description: `¿Deseas crear el evento "${summary}" el ${formatSpanishDate(
            capturedDate
          )} (09:00 - 10:00 América/Bogotá) en tu Google Calendar${
            capturedEmail ? ` e invitar a ${capturedEmail}` : ''
          }?`,
          confirmLabel: 'Crear evento en Calendar',
          variant: 'primary',
          onConfirm: async () => {
            let token = accessToken;
            if (!token) {
              try {
                const signInRes = await googleSignIn();
                token = signInRes.accessToken;
                setAccessToken(token);
              } catch {
                showToast(
                  'error',
                  'Debes autorizar Google para crear eventos en el calendario.'
                );
                return;
              }
            }

            try {
              await createGoogleCalendarEvent(token, {
                summary,
                description: capturedDesc,
                date: capturedDate,
                startTime: '09:00',
                endTime: '10:00',
                attendeeEmail: capturedEmail,
              });
              showToast('success', 'Evento creado en Google Calendar.');
              await syncGoogleCalendar(token);
            } catch (err: unknown) {
              if (err instanceof GoogleAuthExpiredError) {
                clearAccessToken();
                setAccessToken(null);
              }
              showToast(
                'error',
                err instanceof Error
                  ? err.message
                  : 'No se pudo crear el evento en Google Calendar.'
              );
            }
          },
        });
      }
    }

    setTaskName('');
    setTaskDesc('');
    setTaskEst(10);
    setTaskAssigned('');
    setTaskProj('');
    setTaskStatus('To do');
    setTaskDueDate('');
    setTaskNotifyCalendar(false);
    setEditingTask(null);
    setShowTaskModal(false);
  };

  // Real Google Calendar Sync Handler
  const handleSyncNow = async () => {
    let token = accessToken;
    if (!token) {
      try {
        setIsLoggingIn(true);
        const res = await googleSignIn();
        token = res.accessToken;
        setAccessToken(token);
      } catch (err: unknown) {
        showToast(
          'error',
          err instanceof Error
            ? err.message
            : 'No se pudo conectar con Google Calendar.'
        );
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    setIsSyncing(true);
    const syncRes = await syncGoogleCalendar(token);
    setIsSyncing(false);

    if (syncRes.authExpired) {
      clearAccessToken();
      setAccessToken(null);
      showToast('error', syncRes.error || 'La sesión de Google expiró.');
      return;
    }

    if (!syncRes.success) {
      showToast('error', syncRes.error || 'Error al sincronizar calendario.');
      return;
    }

    const extractedCount = syncRes.extractedTasks ?? 0;
    showToast(
      'success',
      extractedCount > 0
        ? `Calendario sincronizado (${syncRes.count ?? 0} eventos y ${extractedCount} tarea(s) extraída(s)).`
        : `Calendario sincronizado (${syncRes.count ?? 0} eventos encontrados).`
    );
  };

  // Parse Projects (and optional Tasks) from Google Sheets rows
  const parseProjectsFromSheetRows = (rows: string[][]) => {
    const palette = ['emerald', 'sky', 'indigo', 'amber', 'rose', 'violet'];
    const normalizeHeader = (val: string) =>
      val
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const mapColor = (raw: string | undefined, idx: number): string => {
      const val = normalizeHeader(raw || '');
      if (val.includes('verde') || val.includes('emerald') || val.includes('green'))
        return 'emerald';
      if (val.includes('azul claro') || val.includes('sky') || val.includes('celeste') || val === 'azul' || val === 'blue')
        return 'sky';
      if (val.includes('indigo') || val.includes('azul oscuro')) return 'indigo';
      if (val.includes('amarillo') || val.includes('naranja') || val.includes('amber') || val.includes('yellow') || val.includes('orange'))
        return 'amber';
      if (val.includes('rojo') || val.includes('rosa') || val.includes('rose') || val.includes('red') || val.includes('pink'))
        return 'rose';
      if (val.includes('violeta') || val.includes('morado') || val.includes('purpura') || val.includes('violet') || val.includes('purple'))
        return 'violet';
      return palette[idx % palette.length];
    };

    const nonEmptyRows = rows.filter((r) =>
      r.some((cell) => String(cell || '').trim().length > 0)
    );
    if (nonEmptyRows.length === 0) {
      return { parsedProjects: [], parsedTasks: [] };
    }

    const firstRowNorm = nonEmptyRows[0].map((c) => normalizeHeader(String(c || '')));
    const headerKeywords = [
      'proyecto',
      'project',
      'nombre',
      'name',
      'cliente',
      'client',
      'empresa',
      'color',
      'estado',
      'status',
      'activo',
      'tarea',
      'task',
      'horas',
      'hours',
      'estimado',
      'descripcion',
      'responsable',
      'email',
    ];
    const hasHeader = firstRowNorm.some((cell) =>
      headerKeywords.some((kw) => cell.includes(kw))
    );

    let idxProj = 0;
    let idxClient = 1;
    let idxColor = -1;
    let idxStatus = -1;
    let idxTask = -1;
    let idxHours = -1;
    let idxDesc = -1;
    let idxEmail = -1;

    if (hasHeader) {
      const findCol = (preds: string[]) =>
        firstRowNorm.findIndex((h) => preds.some((p) => h === p || h.includes(p)));
      const pIdx = findCol(['proyecto', 'project', 'nombre', 'name']);
      idxProj = pIdx >= 0 ? pIdx : 0;
      idxClient = findCol(['cliente', 'client', 'empresa', 'cuenta']);
      idxColor = findCol(['color']);
      idxStatus = findCol(['estado', 'status', 'activo', 'active']);
      idxTask = findCol(['tarea', 'task', 'actividad']);
      idxHours = findCol(['horas', 'hours', 'estimado', 'est']);
      idxDesc = findCol(['descripcion', 'description', 'detalle']);
      idxEmail = findCol(['responsable', 'email', 'correo', 'asignado']);
    }

    const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
    const projectMap = new Map<
      string,
      { name: string; client: string; color: string; active: boolean }
    >();
    const parsedTasks: Array<{
      projectName: string;
      name: string;
      description: string;
      estimatedHours: number;
      assigneeEmail?: string;
    }> = [];

    dataRows.forEach((row, rIdx) => {
      const projName = String(row[idxProj] || '').trim();
      if (!projName) return;

      const client =
        idxClient >= 0 ? String(row[idxClient] || '').trim() || 'General' : 'General';
      const rawColor = idxColor >= 0 ? String(row[idxColor] || '') : undefined;
      const rawStatus =
        idxStatus >= 0 ? normalizeHeader(String(row[idxStatus] || '')) : '';
      const isArchived =
        rawStatus.includes('archivad') ||
        rawStatus.includes('inactiv') ||
        rawStatus === 'no' ||
        rawStatus === 'false' ||
        rawStatus === '0' ||
        rawStatus.includes('cerrad');

      const key = projName.toLowerCase();
      if (!projectMap.has(key)) {
        projectMap.set(key, {
          name: projName,
          client,
          color: mapColor(rawColor, projectMap.size + rIdx),
          active: !isArchived,
        });
      }

      if (idxTask >= 0) {
        const taskTitle = String(row[idxTask] || '').trim();
        if (taskTitle) {
          const rawHours =
            idxHours >= 0
              ? parseFloat(String(row[idxHours] || '').replace(',', '.'))
              : 8;
          parsedTasks.push({
            projectName: projName,
            name: taskTitle,
            description:
              idxDesc >= 0 ? String(row[idxDesc] || '').trim() : '',
            estimatedHours: !isNaN(rawHours) && rawHours > 0 ? rawHours : 8,
            assigneeEmail:
              idxEmail >= 0 ? String(row[idxEmail] || '').trim() : undefined,
          });
        }
      }
    });

    return {
      parsedProjects: Array.from(projectMap.values()),
      parsedTasks,
    };
  };

  const handleLoadSpreadsheet = async (overrideTab?: string) => {
    const spreadsheetId = extractSpreadsheetId(sheetsInput);
    if (!spreadsheetId) {
      setSheetsError(
        'Ingresa una URL válida de Google Sheets o el ID de la hoja.'
      );
      return;
    }

    let token = accessToken;
    if (!token) {
      try {
        setIsLoggingIn(true);
        const signInRes = await googleSignIn();
        token = signInRes.accessToken;
        setAccessToken(token);
      } catch {
        setSheetsError(
          'Debes conectar tu cuenta de Google para leer la hoja de cálculo.'
        );
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    setSheetsLoading(true);
    setSheetsError(null);

    try {
      let meta = sheetsMetadata;
      if (!meta || meta.spreadsheetId !== spreadsheetId || !overrideTab) {
        const fetchedMeta = await fetchSpreadsheetMetadata(token, spreadsheetId);
        meta = {
          spreadsheetId,
          title: fetchedMeta.title,
          sheetTitles: fetchedMeta.sheetTitles,
        };
        setSheetsMetadata(meta);
      }

      const tabToRead = overrideTab || meta.sheetTitles[0];
      if (!tabToRead) {
        setSheetsError('La hoja de cálculo no contiene pestañas legibles.');
        return;
      }
      setSelectedSheetTab(tabToRead);

      const rows = await fetchSheetRows(token, spreadsheetId, tabToRead);
      const { parsedProjects, parsedTasks } = parseProjectsFromSheetRows(rows);
      setSheetsPreviewProjects(parsedProjects);
      setSheetsPreviewTasks(parsedTasks);

      localStorage.setItem('tt_linked_projects_sheet_url', sheetsInput.trim());

      if (parsedProjects.length === 0) {
        setSheetsError(
          `No se encontraron proyectos en la pestaña "${tabToRead}". Asegúrate de incluir una columna "Proyecto" (y opcionalmente "Cliente", "Color", "Estado", "Tarea", "Horas").`
        );
      }
    } catch (err: unknown) {
      if (err instanceof GoogleAuthExpiredError) {
        clearAccessToken();
        setAccessToken(null);
      }
      setSheetsError(
        err instanceof Error
          ? err.message
          : 'No se pudo leer la hoja de Google Sheets.'
      );
    } finally {
      setSheetsLoading(false);
    }
  };

  const openCalendarExtractModal = async (focusEventId?: string) => {
    let eventsSource = calendarEvents;

    if (eventsSource.length === 0 || (!accessToken && !focusEventId)) {
      let token = accessToken;
      if (!token) {
        try {
          setIsLoggingIn(true);
          const signInRes = await googleSignIn();
          token = signInRes.accessToken;
          setAccessToken(token);
        } catch (err: unknown) {
          showToast(
            'error',
            err instanceof Error
              ? err.message
              : 'Conecta tu cuenta de Google para traer eventos del calendario.'
          );
          return;
        } finally {
          setIsLoggingIn(false);
        }
      }

      if (token && eventsSource.length === 0) {
        setIsSyncing(true);
        const syncRes = await syncGoogleCalendar(token);
        setIsSyncing(false);
        if (syncRes.authExpired) {
          clearAccessToken();
          setAccessToken(null);
          showToast('error', syncRes.error || 'La sesión de Google expiró.');
          return;
        }
        try {
          const stored = localStorage.getItem('tt_calendar_events');
          if (stored) eventsSource = JSON.parse(stored);
        } catch {
          // keep current
        }
      }
    }

    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const defaultProjId =
      projects.find((p) => p.active)?.id || projects[0]?.id || '';

    const drafts = eventsSource
      .filter((e) => e.status !== 'discarded')
      .map((evt) => {
        const bracketMatch = evt.title.match(/^\[([^\]]+)\]\s*(.+)$/);
        const cleanTaskName = bracketMatch
          ? bracketMatch[2].trim()
          : evt.title.trim();
        const mins = Math.max(
          15,
          toMins(evt.endTime) - toMins(evt.startTime)
        );
        const estHrs = Math.max(0.5, Number((mins / 60).toFixed(1)));
        const alreadyMatched = Boolean(evt.matchedTaskId);

        return {
          eventId: evt.id,
          selected: focusEventId
            ? evt.id === focusEventId
            : !alreadyMatched,
          taskName: cleanTaskName,
          projectId: evt.matchedProjectId || defaultProjId,
          estimatedHours: estHrs,
          date: evt.date,
          startTime: evt.startTime,
          endTime: evt.endTime,
          alreadyMatched,
        };
      });

    setCalExtractDrafts(drafts);
    setShowCalendarExtractModal(true);
  };

  const getFilteredEntries = () => {
    const weekDates = getBogotaWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const todayBogota = getBogotaDateString(0);
    const monthPrefix = todayBogota.slice(0, 7); // YYYY-MM

    return entries.filter((e) => {
      if (activeUser?.role !== 'Admin' && e.userId !== activeUser?.id)
        return false;
      if (reportUserFilter !== 'all' && e.userId !== reportUserFilter)
        return false;
      if (reportProjectFilter !== 'all' && e.projectId !== reportProjectFilter)
        return false;

      if (reportRange === 'week') {
        return e.date >= weekStart && e.date <= weekEnd;
      }

      if (reportRange === 'month') {
        return e.date.startsWith(monthPrefix);
      }

      if (reportRange === 'custom') {
        if (reportStart && e.date < reportStart) return false;
        if (reportEnd && e.date > reportEnd) return false;
      }

      return true;
    });
  };

  const exportToCSV = () => {
    const filtered = getFilteredEntries();
    if (filtered.length === 0) {
      showToast('info', 'No hay registros en el rango seleccionado para exportar.');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent +=
      'Fecha,Colaborador,Proyecto,Tarea,Nota,Hora Inicio,Hora Fin,Duración (Horas)\n';

    filtered.forEach((entry) => {
      const userName = users.find((u) => u.id === entry.userId)?.name || '';
      const projName = projects.find((p) => p.id === entry.projectId)?.name || '';
      const taskName = tasks.find((t) => t.id === entry.taskId)?.name || '';
      const durationHours = (entry.durationMinutes / 60).toFixed(2);
      const row = `"${entry.date}","${userName}","${projName}","${taskName}","${entry.note.replace(
        /"/g,
        '""'
      )}","${entry.startTime}","${entry.endTime}",${durationHours}`;
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reporte_horas_timetrack_${getBogotaDateString(0)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Archivo CSV descargado.');
  };

  const requestExportToGoogleSheets = () => {
    const filtered = getFilteredEntries();
    if (filtered.length === 0) {
      showToast('info', 'No hay registros en el rango seleccionado para exportar.');
      return;
    }

    setConfirmDialog({
      title: 'Exportar reporte a Google Sheets',
      description: `Se creará una nueva hoja de cálculo en tu cuenta de Google con ${filtered.length} registro(s) de tiempo. ¿Deseas continuar?`,
      confirmLabel: 'Crear hoja en Google Sheets',
      variant: 'primary',
      onConfirm: async () => {
        let token = accessToken;
        if (!token) {
          try {
            const signInRes = await googleSignIn();
            token = signInRes.accessToken;
            setAccessToken(token);
          } catch {
            showToast(
              'error',
              'Debes autorizar el acceso a Google para crear hojas de cálculo.'
            );
            return;
          }
        }

        setIsExportingSheets(true);
        try {
          const rows: (string | number)[][] = [
            [
              'Fecha',
              'Colaborador',
              'Proyecto',
              'Tarea',
              'Nota',
              'Hora Inicio',
              'Hora Fin',
              'Duración (Horas)',
            ],
            ...filtered.map((entry) => [
              entry.date,
              users.find((u) => u.id === entry.userId)?.name || '',
              projects.find((p) => p.id === entry.projectId)?.name || '',
              tasks.find((t) => t.id === entry.taskId)?.name || '',
              entry.note,
              entry.startTime,
              entry.endTime,
              Number((entry.durationMinutes / 60).toFixed(2)),
            ]),
          ];

          const title = `TimeTrack Reporte ${getBogotaDateString(0)}`;
          const result = await exportReportToGoogleSheets(token, title, rows);
          setSheetsExportUrl(result.spreadsheetUrl);
          showToast('success', 'Reporte exportado exitosamente a Google Sheets.');
        } catch (err: unknown) {
          if (err instanceof GoogleAuthExpiredError) {
            clearAccessToken();
            setAccessToken(null);
          }
          showToast(
            'error',
            err instanceof Error
              ? err.message
              : 'No se pudo exportar a Google Sheets.'
          );
        } finally {
          setIsExportingSheets(false);
        }
      },
    });
  };

  // "My Week" computations in America/Bogota
  const getMyWeekReport = () => {
    const weekDates = getBogotaWeekDates();
    const daysData: {
      [key: string]: { date: string; dayName: string; loggedMinutes: number };
    } = {};
    let totalMinutes = 0;

    for (const dateStr of weekDates) {
      const dayEntries = activeUser
        ? entries.filter((e) => e.userId === activeUser.id && e.date === dateStr)
        : [];
      const dayMinutes = dayEntries.reduce(
        (sum, e) => sum + e.durationMinutes,
        0
      );
      totalMinutes += dayMinutes;
      daysData[dateStr] = {
        date: dateStr,
        dayName: getDayOfWeekName(dateStr),
        loggedMinutes: dayMinutes,
      };
    }

    return { days: daysData, total: totalMinutes, weekDates };
  };

  const { days: myWeekDays, total: myWeekTotal, weekDates } = getMyWeekReport();
  const pendingSuggestionsCount = calendarEvents.filter(
    (e) => e.status === 'pending' && e.matchedProjectId && e.matchedTaskId
  ).length;

  // Loading auth state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-500">
            Cargando TimeTrack...
          </p>
        </div>
      </div>
    );
  }

  // Google Sign-In Gate
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-600 p-2.5 rounded-xl text-white">
              <Clock className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                TimeTrack
              </h1>
              <p className="text-xs text-slate-500">
                Control de horas · Google Workspace
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-5">
            <h2 className="text-base font-semibold text-slate-900">
              Inicia sesión con tu cuenta de Google
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Conecta tu cuenta para registrar horas en proyectos y tareas,
              sincronizar eventos de Google Calendar como sugerencias y exportar
              reportes a Google Sheets.
            </p>
            {settings.companyDomain && (
              <p className="text-xs text-slate-500 pt-1">
                Dominio corporativo requerido:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  @{settings.companyDomain}
                </span>
              </p>
            )}
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button w-full"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <GoogleGIcon />
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn
                    ? 'Conectando con Google...'
                    : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              enterDemoMode();
              setAuthError(null);
              showToast('info', 'Modo demo activo: datos de ejemplo, sin Google.');
            }}
            className="w-full border border-slate-200 rounded-lg py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Entrar en modo demo (sin Google)
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            Zona horaria configurada: América/Bogotá (GMT-5)
          </p>
        </div>
      </div>
    );
  }

      const vm: import('./features/app/types').TimeTrackAppVm = {
    accessToken,
    activeTab,
    activeUser,
    addProject,
    addTask,
    addTeamMember,
    addTimeEntry,
    authError,
    authReady,
    calExtractDrafts,
    calendarEvents,
    clearAuthenticatedUser,
    confirmCalendarSuggestion,
    confirmDialog,
    deleteProject,
    deleteTask,
    deleteTimeEntry,
    discardCalendarSuggestion,
    editingEntry,
    editingProject,
    editingTask,
    elapsedSeconds,
    enterDemoMode,
    entries,
    exportToCSV,
    extractTasksFromCalendarEvents,
    formCalendarEventId,
    formDate,
    formEnd,
    formError,
    formNote,
    formProject,
    formStart,
    formSuccess,
    formTask,
    formatDuration,
    formatSpanishDate,
    formatTime,
    getColorClasses,
    getDayOfWeekName,
    getFilteredEntries,
    getMyWeekReport,
    handleGoogleSignIn,
    handleLoadSpreadsheet,
    handleLogout,
    handleManualEntrySubmit,
    handleProjectSubmit,
    handleStopTimerSubmit,
    handleSyncNow,
    handleTaskSubmit,
    importProjectsAndTasksFromSheet,
    isCalendarConnected,
    isEntryLocked,
    isExportingSheets,
    isLoggingIn,
    isMobileMenuOpen,
    isSyncing,
    lastCalendarSync,
    myWeekDays,
    myWeekTotal,
    newMemberEmail,
    newMemberName,
    newMemberRole,
    openCalendarExtractModal,
    openEditEntryModal,
    openNewEntryModal,
    parseProjectsFromSheetRows,
    pendingSuggestionsCount,
    projClient,
    projColor,
    projName,
    projects,
    removeTeamMember,
    reportEnd,
    reportProjectFilter,
    reportRange,
    reportStart,
    reportUserFilter,
    setNewMemberEmail,
    setNewMemberName,
    setNewMemberRole,
    setReportEnd,
    setReportProjectFilter,
    setReportRange,
    setReportStart,
    setReportUserFilter,
    requestExportToGoogleSheets,
    runningProject,
    runningTask,
    saveSettings,
    selectedSheetTab,
    setCalendarConnectedState,
    settings,
    sheetsError,
    sheetsExportUrl,
    sheetsInput,
    sheetsLoading,
    sheetsMetadata,
    sheetsPreviewProjects,
    sheetsPreviewTasks,
    showCalendarExtractModal,
    showManualEntryModal,
    showProjectModal,
    showSheetsImportModal,
    showStopTimerModal,
    showTaskModal,
    showToast,
    startTimer,
    stopTimer,
    store,
    syncGoogleCalendar,
    taskAssigned,
    taskDesc,
    taskDueDate,
    taskEst,
    taskName,
    taskNotifyCalendar,
    setTaskNotifyCalendar,
    taskProj,
    taskStatus,
    tasks,
    timer,
    timerNote,
    toast,
    updateProject,
    updateTask,
    updateTimeEntry,
    updateUserRole,
    upsertAuthenticatedUser,
    users,
    weekDates,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* GLOBAL TOAST BANNER */}
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      <TimerHeader
        activeUser={activeUser}
        timer={timer}
        runningProject={runningProject}
        runningTask={runningTask}
        elapsedSeconds={elapsedSeconds}
        formatTime={formatTime}
        onStopTimer={() => setShowStopTimerModal(true)}
        onLogout={handleLogout}
      />

      {/* BODY WRAPPER */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-5 shrink-0">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('week')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'week'
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock
                className={`w-4.5 h-4.5 ${
                  activeTab === 'week' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>Mi Semana</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Briefcase
                className={`w-4.5 h-4.5 ${
                  activeTab === 'projects'
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              />
              <span>Proyectos</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckSquare
                className={`w-4.5 h-4.5 ${
                  activeTab === 'tasks' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>Tareas</span>
            </button>

            <button
              onClick={() => setActiveTab('entries')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'entries'
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText
                className={`w-4.5 h-4.5 ${
                  activeTab === 'entries'
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              />
              <span>Historial de Horas</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar
                className={`w-4.5 h-4.5 ${
                  activeTab === 'calendar'
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              />
              <span>Google Calendar</span>
              {pendingSuggestionsCount > 0 && (
                <span className="ml-auto font-mono tabular-nums text-xs font-bold text-amber-700">
                  {pendingSuggestionsCount}
                </span>
              )}
            </button>

            {activeUser.role === 'Admin' && (
              <>
                <div className="pt-4 pb-1">
                  <p className="text-[11px] font-semibold text-slate-400 px-3">
                    Administración
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === 'reports'
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp
                    className={`w-4.5 h-4.5 ${
                      activeTab === 'reports'
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>Reportes</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Settings
                    className={`w-4.5 h-4.5 ${
                      activeTab === 'settings'
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>Configuración</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-auto border-t border-slate-100 pt-4 flex items-center space-x-3">
            <UserAvatar
              name={activeUser.name}
              avatar={activeUser.avatar}
              size="md"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {activeUser.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {activeUser.email}
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN DISPLAY CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {/* TAB 1: MI SEMANA */}
          {activeTab === 'week' && <WeekView vm={vm} />}

          {/* TAB 2: PROYECTOS */}
          {activeTab === 'projects' && <ProjectsView vm={vm} />}

          {/* TAB 3: TAREAS */}
          {activeTab === 'tasks' && <TasksView vm={vm} />}

          {/* TAB 4: HISTORIAL DE HORAS */}
          {activeTab === 'entries' && <EntriesView vm={vm} />}

          {/* TAB 5: GOOGLE CALENDAR */}
          {activeTab === 'calendar' && <CalendarView vm={vm} />}

          {/* TAB 6: REPORTES (ADMIN ONLY) */}
          {activeTab === 'reports' && activeUser.role === 'Admin' && (
            <ReportsView vm={vm} />
          )}

          {/* TAB 7: CONFIGURACIÓN (ADMIN ONLY) */}
          {activeTab === 'settings' && activeUser.role === 'Admin' && (
            <SettingsView vm={vm} />
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around text-slate-600">
        <button
          onClick={() => setActiveTab('week')}
          className={`flex flex-col items-center space-y-0.5 ${
            activeTab === 'week' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mi Semana</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center space-y-0.5 ${
            activeTab === 'projects' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px] font-medium">Proyectos</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center space-y-0.5 ${
            activeTab === 'tasks' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Tareas</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center space-y-0.5 relative ${
            activeTab === 'calendar' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">Calendario</span>
          {pendingSuggestionsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] px-1 rounded-full font-bold">
              {pendingSuggestionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center space-y-0.5 ${
            isMobileMenuOpen ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 flex justify-end"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white w-64 h-full p-5 flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Menú</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('entries');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 text-slate-700 hover:bg-slate-50"
              >
                <FileText className="w-4 h-4" />
                <span>Historial de Horas</span>
              </button>

              {activeUser.role === 'Admin' && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('reports');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 text-slate-700 hover:bg-slate-50"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Reportes</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configuración</span>
                  </button>
                </>
              )}
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <div>
                <p className="font-semibold text-slate-800">{activeUser.name}</p>
                <p className="truncate">{activeUser.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <ConfirmDialogModal
          dialog={confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* MODAL 1: STOP TIMER */}
      {showStopTimerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Guardar Tiempo Transcurrido
              </span>
              <button onClick={() => setShowStopTimerModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleStopTimerSubmit} className="p-5 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Proyecto:</span>
                  <span className="font-bold text-slate-700">
                    {runningProject?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tarea:</span>
                  <span className="font-bold text-slate-700">
                    {runningTask?.name}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 mt-1.5">
                  <span className="text-slate-400 font-semibold">
                    Duración medida:
                  </span>
                  <span className="font-mono tabular-nums font-bold text-emerald-700">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nota u observación
                </label>
                <textarea
                  value={timerNote}
                  onChange={(e) => setTimerNote(e.target.value)}
                  placeholder="Describe brevemente lo que estuviste haciendo..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    stopTimer(false);
                    setShowStopTimerModal(false);
                  }}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Descartar tiempo
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Guardar registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL ENTRY / EDIT TIME ENTRY */}
      {showManualEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="text-sm font-bold">
                {editingEntry
                  ? 'Editar Registro de Tiempo'
                  : 'Registrar Tiempo de Trabajo'}
              </span>
              <button onClick={() => setShowManualEntryModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleManualEntrySubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proyecto
                </label>
                <select
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                >
                  <option value="">Selecciona un proyecto...</option>
                  {projects
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarea asociada
                </label>
                <select
                  value={formTask}
                  onChange={(e) => setFormTask(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  disabled={!formProject}
                >
                  <option value="">Selecciona una tarea...</option>
                  {tasks
                    .filter((t) => t.projectId === formProject)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha (América/Bogotá)
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción / Nota
                </label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ingresa detalles del trabajo realizado..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualEntryModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {editingEntry ? 'Guardar Cambios' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE / EDIT PROJECT */}
      {showProjectModal && activeUser.role === 'Admin' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="text-sm font-bold">
                {editingProject ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
              </span>
              <button onClick={() => setShowProjectModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  placeholder="Ej: Portal Clientes"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={projClient}
                  onChange={(e) => setProjClient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  placeholder="Ej: Interno / Cliente SAS"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Color representativo
                </label>
                <div className="grid grid-cols-6 gap-2 mt-1.5">
                  {(
                    [
                      'emerald',
                      'sky',
                      'indigo',
                      'amber',
                      'rose',
                      'violet',
                    ] as const
                  ).map((color) => {
                    const mapped = getColorClasses(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setProjColor(color)}
                        className={`w-full h-8 rounded-lg cursor-pointer ${
                          mapped.bgSel
                        } border-2 ${
                          projColor === color
                            ? 'border-slate-900 ring-2 ring-slate-400'
                            : 'border-transparent'
                        }`}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE / EDIT TASK */}
      {showTaskModal && activeUser.role === 'Admin' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="text-sm font-bold">
                {editingTask ? 'Editar Tarea' : 'Asignar Nueva Tarea'}
              </span>
              <button onClick={() => setShowTaskModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Tarea
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  placeholder="Ej: Diseño de vistas móviles"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proyecto asociado
                </label>
                <select
                  value={taskProj}
                  onChange={(e) => setTaskProj(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  required
                >
                  <option value="">Selecciona...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Colaborador Asignado
                </label>
                <select
                  value={taskAssigned}
                  onChange={(e) => setTaskAssigned(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  required
                >
                  <option value="">Selecciona...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'Admin' ? 'Admin' : 'Empleado'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estimación (Horas)
                  </label>
                  <input
                    type="number"
                    value={taskEst}
                    onChange={(e) => setTaskEst(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado actual
                </label>
                <select
                  value={taskStatus}
                  onChange={(e) =>
                    setTaskStatus(e.target.value as Task['status'])
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                >
                  <option value="To do">Por hacer</option>
                  <option value="In progress">En progreso</option>
                  <option value="Done">Terminada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                  placeholder="Detalles sobre lo requerido..."
                  rows={2}
                />
              </div>

              {taskDueDate && !editingTask && (
                <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="chkNotify"
                    checked={taskNotifyCalendar}
                    onChange={(e) => setTaskNotifyCalendar(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="chkNotify"
                    className="text-xs text-slate-600 cursor-pointer font-medium"
                  >
                    Crear evento en Google Calendar para la fecha límite
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {editingTask ? 'Guardar Cambios' : 'Asignar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: IMPORT PROJECTS FROM GOOGLE SHEETS */}
      {showSheetsImportModal && activeUser.role === 'Admin' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <span className="text-sm font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Importar Proyectos desde Google Sheets
              </span>
              <button onClick={() => setShowSheetsImportModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Columnas recomendadas en tu Google Sheet:
                </p>
                <p>
                  <span className="font-mono text-slate-800">Proyecto</span>,{' '}
                  <span className="font-mono text-slate-800">Cliente</span>,{' '}
                  <span className="font-mono text-slate-800">Color</span> (opcional),{' '}
                  <span className="font-mono text-slate-800">Estado</span> (Activo / Archivado).
                </p>
                <p className="text-[11px] text-slate-500">
                  Si además incluyes las columnas <span className="font-mono">Tarea</span> y{' '}
                  <span className="font-mono">Horas</span>, también se importarán esas tareas automáticamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL o ID de la hoja de Google Sheets
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={sheetsInput}
                    onChange={(e) => setSheetsInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleLoadSpreadsheet()}
                    disabled={sheetsLoading || isLoggingIn}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {sheetsLoading ? 'Leyendo...' : 'Cargar hoja'}
                  </button>
                </div>
              </div>

              {sheetsError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{sheetsError}</span>
                </div>
              )}

              {sheetsMetadata && sheetsMetadata.sheetTitles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        {sheetsMetadata.title}
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        {sheetsPreviewProjects.length} proyecto(s)
                        {sheetsPreviewTasks.length > 0
                          ? ` y ${sheetsPreviewTasks.length} tarea(s)`
                          : ''}{' '}
                        listos para importar
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-900 font-medium">
                        Pestaña:
                      </span>
                      <select
                        value={selectedSheetTab}
                        onChange={(e) => handleLoadSpreadsheet(e.target.value)}
                        className="bg-white border border-emerald-300 rounded-md px-2.5 py-1 text-xs font-medium text-slate-800"
                      >
                        {sheetsMetadata.sheetTitles.map((tabName) => (
                          <option key={tabName} value={tabName}>
                            {tabName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {sheetsPreviewProjects.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Proyecto</th>
                            <th className="px-3 py-2">Cliente</th>
                            <th className="px-3 py-2">Color</th>
                            <th className="px-3 py-2">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sheetsPreviewProjects.map((p, idx) => (
                            <tr key={`${p.name}-${idx}`}>
                              <td className="px-3 py-2 font-semibold text-slate-800">
                                {p.name}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {p.client}
                              </td>
                              <td className="px-3 py-2 capitalize text-slate-600">
                                {p.color}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`font-semibold ${
                                    p.active
                                      ? 'text-emerald-700'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {p.active ? 'Activo' : 'Archivado'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSheetsImportModal(false)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sheetsPreviewProjects.length === 0}
                onClick={() => {
                  const res = importProjectsAndTasksFromSheet(
                    sheetsPreviewProjects,
                    sheetsPreviewTasks
                  );
                  showToast(
                    'success',
                    `Importación lista: ${res.addedProjects} proyecto(s) nuevo(s), ${res.updatedProjects} actualizado(s)${
                      res.addedTasks > 0
                        ? ` y ${res.addedTasks} tarea(s) creada(s)`
                        : ''
                    }.`
                  );
                  setShowSheetsImportModal(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Importar proyectos ({sheetsPreviewProjects.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: EXTRACT TASKS FROM GOOGLE CALENDAR */}
      {showCalendarExtractModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <span className="text-sm font-bold flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-emerald-400" />
                Extraer Tareas desde Google Calendar
              </span>
              <button onClick={() => setShowCalendarExtractModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {projects.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-2">
                  <p className="font-semibold">
                    Primero necesitas al menos un proyecto para asociar las tareas extraídas.
                  </p>
                  <p>
                    Crea un proyecto o impórtalos desde Google Sheets en la pestaña Proyectos.
                  </p>
                </div>
              ) : calExtractDrafts.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center space-y-3">
                  <p className="text-xs text-slate-600">
                    No hay eventos sincronizados disponibles para extraer tareas.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSyncNow();
                      await openCalendarExtractModal();
                    }}
                    disabled={isSyncing || isLoggingIn}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                    />
                    Sincronizar Google Calendar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Selecciona los eventos que deseas convertir en tareas medibles:
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleSyncNow();
                        await openCalendarExtractModal();
                      }}
                      disabled={isSyncing || isLoggingIn}
                      className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`}
                      />
                      Actualizar eventos
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {calExtractDrafts.map((draft, idx) => (
                      <div
                        key={draft.eventId}
                        className={`border rounded-lg p-3 space-y-2.5 ${
                          draft.selected
                            ? 'border-emerald-300 bg-emerald-50/40'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCalExtractDrafts((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, selected: checked }
                                      : item
                                  )
                                );
                              }}
                              className="rounded border-slate-300 text-emerald-600 w-4 h-4"
                            />
                            <span className="font-mono text-[11px] text-slate-500">
                              {draft.date} · {draft.startTime} - {draft.endTime}
                            </span>
                          </label>
                          {draft.alreadyMatched && (
                            <span className="text-[11px] text-emerald-700 font-semibold">
                              Ya vinculada
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={draft.taskName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCalExtractDrafts((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, taskName: val } : item
                                )
                              );
                            }}
                            placeholder="Nombre de la tarea"
                            className="sm:col-span-6 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-xs text-slate-800"
                          />
                          <select
                            value={draft.projectId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCalExtractDrafts((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, projectId: val } : item
                                )
                              );
                            }}
                            className="sm:col-span-4 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-xs text-slate-700"
                          >
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <div className="sm:col-span-2 flex items-center gap-1 bg-white border border-slate-200 px-2 py-1.5 rounded-md">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={draft.estimatedHours}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                setCalExtractDrafts((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, estimatedHours: val }
                                      : item
                                  )
                                );
                              }}
                              className="w-full text-xs font-mono text-slate-800 focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400">h</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCalendarExtractModal(false)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  projects.length === 0 ||
                  calExtractDrafts.filter((d) => d.selected).length === 0
                }
                onClick={() => {
                  const selectedItems = calExtractDrafts
                    .filter((d) => d.selected)
                    .map((d) => ({
                      eventId: d.eventId,
                      projectId: d.projectId,
                      taskName: d.taskName,
                      estimatedHours: d.estimatedHours,
                      dueDate: d.date,
                      description: `Extraída de Google Calendar (${d.date} ${d.startTime}-${d.endTime})`,
                    }));
                  const res = extractTasksFromCalendarEvents(selectedItems);
                  showToast(
                    'success',
                    `${res.created} tarea(s) extraída(s) de Google Calendar${
                      res.skipped > 0
                        ? ` (${res.skipped} omitida(s) por ya existir)`
                        : ''
                    }.`
                  );
                  setShowCalendarExtractModal(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Crear tareas ({calExtractDrafts.filter((d) => d.selected).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
