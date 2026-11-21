import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Briefcase,
  CheckSquare,
  FileText,
  Settings,
  Plus,
  Play,
  Square,
  Trash2,
  Edit3,
  AlertCircle,
  TrendingUp,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Menu,
  X,
  Check,
  LogOut,
  Archive,
  UserPlus,
  Shield,
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

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}

const GoogleGIcon = () => (
  <svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    style={{ display: 'block' }}
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const UserAvatar = ({
  name,
  avatar,
  size = 'sm',
}: {
  name?: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md';
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass =
    size === 'xs'
      ? 'w-5 h-5 text-[9px]'
      : size === 'sm'
      ? 'w-7 h-7 text-[11px]'
      : 'w-9 h-9 text-xs';

  const initials = (name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (avatar && !imgFailed) {
    return (
      <img
        src={avatar}
        alt={name || 'Usuario'}
        className={`${sizeClass} rounded-full border border-slate-200 object-cover shrink-0`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0`}
    >
      {initials || 'U'}
    </div>
  );
};

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* GLOBAL TOAST BANNER */}
      {toast && (
        <div className="fixed bottom-16 md:bottom-5 right-4 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between gap-3 ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
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

        {/* Active Timer Indicator */}
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
                  onClick={() => setShowStopTimerModal(true)}
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

        {/* Authenticated User Info & Actions */}
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
              <p className="text-[10px] text-slate-400 mt-0.5">
                {activeUser.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

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
          {activeTab === 'week' && (
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
          )}

          {/* TAB 2: PROYECTOS */}
          {activeTab === 'projects' && (
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
          )}

          {/* TAB 3: TAREAS */}
          {activeTab === 'tasks' && (
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
          )}

          {/* TAB 4: HISTORIAL DE HORAS */}
          {activeTab === 'entries' && (
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
          )}

          {/* TAB 5: GOOGLE CALENDAR */}
          {activeTab === 'calendar' && (
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
          )}

          {/* TAB 6: REPORTES (ADMIN ONLY) */}
          {activeTab === 'reports' && activeUser.role === 'Admin' && (
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
          )}

          {/* TAB 7: CONFIGURACIÓN (ADMIN ONLY) */}
          {activeTab === 'settings' && activeUser.role === 'Admin' && (
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmDialog.description}
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await fn();
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
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
