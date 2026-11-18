import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  fetchGoogleCalendarEvents,
  GoogleAuthExpiredError,
} from '../services/googleWorkspace';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee';
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  color: string; // e.g., 'emerald', 'sky', 'indigo', 'amber', 'rose', 'violet'
  active: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  estimatedHours: number;
  assignedTo: string; // user id
  status: 'To do' | 'In progress' | 'Done';
  dueDate?: string; // YYYY-MM-DD
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string;
  date: string; // YYYY-MM-DD in America/Bogota
  startTime: string; // HH:MM in America/Bogota
  endTime: string; // HH:MM in America/Bogota
  durationMinutes: number;
  note: string;
  source: 'manual' | 'timer' | 'calendar';
  calendarEventId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  date: string; // YYYY-MM-DD
  matchedProjectId?: string;
  matchedTaskId?: string;
  status: 'pending' | 'confirmed' | 'discarded';
}

export interface SystemSettings {
  lockDays: number; // lock entries older than X days
  companyDomain: string; // optional restriction to company domain (empty = any Google account)
}

export interface TimerState {
  taskId: string | null;
  startTime: string | null; // ISO String when it started
}

// Bogota timezone date/time helpers
export const getBogotaDateString = (dateOffset: number = 0): string => {
  const now = new Date();
  const target = new Date(now.getTime() + dateOffset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target);
};

export const getBogotaTimeString = (dateObj: Date): string => {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);
  return formatted.startsWith('24:') ? '23:59' : formatted;
};

export const getBogotaDateFromObj = (dateObj: Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
};

export const getBogotaWeekDates = (): string[] => {
  const todayBogota = getBogotaDateString(0);
  const [y, m, d] = todayBogota.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = utcDate.getUTCDay(); // 0=Sun, 1=Mon
  const diffToMonday = -((dayOfWeek + 6) % 7);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const curr = new Date(utcDate.getTime() + (diffToMonday + i) * 86400000);
    const yyyy = curr.getUTCFullYear();
    const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(curr.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
};

const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Error parsing LocalStorage key "${key}"`, e);
    }
  }
  return defaultValue;
};

const setLocalStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const DEMO_PROJECT_IDS = new Set(['proj-1', 'proj-2', 'proj-3']);
const DEMO_TASK_IDS = new Set(['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6']);
const DEMO_ENTRY_IDS = new Set(['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5', 'entry-6']);
const DEMO_CAL_IDS = new Set(['cal-event-1', 'cal-event-2', 'cal-event-3', 'cal-event-4']);
const DEMO_USER_IDS = new Set(['user-1', 'user-2', 'user-3']);

// Clean out any legacy demo/seed items once while preserving user-created data
const ensureCleanWorkspace = () => {
  if (localStorage.getItem('tt_clean_workspace_v1')) return;

  const existingProjects = getLocalStorageItem<Project[]>('tt_projects', []);
  const cleanProjects = existingProjects.filter((p) => !DEMO_PROJECT_IDS.has(p.id));
  setLocalStorageItem('tt_projects', cleanProjects);

  const existingTasks = getLocalStorageItem<Task[]>('tt_tasks', []);
  const cleanTasks = existingTasks.filter((t) => !DEMO_TASK_IDS.has(t.id));
  setLocalStorageItem('tt_tasks', cleanTasks);

  const existingEntries = getLocalStorageItem<TimeEntry[]>('tt_entries', []);
  const cleanEntries = existingEntries.filter((e) => !DEMO_ENTRY_IDS.has(e.id));
  setLocalStorageItem('tt_entries', cleanEntries);

  const existingCal = getLocalStorageItem<CalendarEvent[]>('tt_calendar_events', []);
  const cleanCal = existingCal.filter((c) => !DEMO_CAL_IDS.has(c.id));
  setLocalStorageItem('tt_calendar_events', cleanCal);

  const existingUsers = getLocalStorageItem<User[]>('tt_users', []);
  const cleanUsers = existingUsers.filter((u) => !DEMO_USER_IDS.has(u.id));
  setLocalStorageItem('tt_users', cleanUsers);

  const activeUser = getLocalStorageItem<User | null>('tt_active_user', null);
  if (activeUser && DEMO_USER_IDS.has(activeUser.id)) {
    localStorage.removeItem('tt_active_user');
  }

  const existingSettings = getLocalStorageItem<SystemSettings | null>('tt_settings', null);
  if (!existingSettings || existingSettings.companyDomain === 'tuempresa.com') {
    setLocalStorageItem('tt_settings', {
      lockDays: existingSettings?.lockDays ?? 5,
      companyDomain: '',
    });
  }

  localStorage.setItem('tt_clean_workspace_v1', 'true');
};

export const useTimeTrackStore = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [discardedCalIds, setDiscardedCalIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    lockDays: 5,
    companyDomain: '',
  });
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [timer, setTimer] = useState<TimerState>({ taskId: null, startTime: null });
  const [isCalendarConnected, setIsCalendarConnected] = useState<boolean>(true);
  const [lastCalendarSync, setLastCalendarSync] = useState<string | null>(null);

  useEffect(() => {
    ensureCleanWorkspace();
    setUsers(getLocalStorageItem('tt_users', []));
    setProjects(getLocalStorageItem('tt_projects', []));
    setTasks(getLocalStorageItem('tt_tasks', []));
    setEntries(getLocalStorageItem('tt_entries', []));
    setCalendarEvents(getLocalStorageItem('tt_calendar_events', []));
    setDiscardedCalIds(getLocalStorageItem('tt_discarded_calendar_ids', []));
    setSettings(getLocalStorageItem('tt_settings', { lockDays: 5, companyDomain: '' }));
    setTimer(getLocalStorageItem('tt_timer', { taskId: null, startTime: null }));
    setIsCalendarConnected(getLocalStorageItem('tt_is_calendar_connected', true));
    setLastCalendarSync(localStorage.getItem('tt_last_calendar_sync'));
  }, []);

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    setLocalStorageItem('tt_users', newUsers);
  };

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    setLocalStorageItem('tt_projects', newProjects);
  };

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    setLocalStorageItem('tt_tasks', newTasks);
  };

  const saveEntries = (newEntries: TimeEntry[]) => {
    setEntries(newEntries);
    setLocalStorageItem('tt_entries', newEntries);
  };

  const saveCalendarEvents = (newEvents: CalendarEvent[]) => {
    setCalendarEvents(newEvents);
    setLocalStorageItem('tt_calendar_events', newEvents);
  };

  const saveDiscardedCalIds = (ids: string[]) => {
    setDiscardedCalIds(ids);
    setLocalStorageItem('tt_discarded_calendar_ids', ids);
  };

  const saveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    setLocalStorageItem('tt_settings', newSettings);
  };

  const setCalendarConnectedState = (connected: boolean) => {
    setIsCalendarConnected(connected);
    setLocalStorageItem('tt_is_calendar_connected', connected);
  };

  // Upsert Firebase Google user into local team directory & activeUser
  const upsertAuthenticatedUser = useCallback(
    (
      fbUser: FirebaseUser
    ): { allowed: boolean; user?: User; error?: string } => {
      const email = (fbUser.email || '').toLowerCase();
      if (!email) {
        return {
          allowed: false,
          error: 'No se pudo obtener el correo electrónico de la cuenta de Google.',
        };
      }

      const currentSettings = getLocalStorageItem<SystemSettings>('tt_settings', {
        lockDays: 5,
        companyDomain: '',
      });
      const domainFilter = currentSettings.companyDomain.trim().toLowerCase();
      if (domainFilter && !email.endsWith(`@${domainFilter}`)) {
        return {
          allowed: false,
          error: `Acceso restringido al dominio corporativo @${domainFilter}. Tu cuenta (${email}) no pertenece a este dominio.`,
        };
      }

      const currentUsers = getLocalStorageItem<User[]>('tt_users', []);
      const existingIndex = currentUsers.findIndex(
        (u) => u.email.toLowerCase() === email || u.id === fbUser.uid
      );

      let resolvedUser: User;
      let nextUsers: User[];

      if (existingIndex >= 0) {
        const existing = currentUsers[existingIndex];
        resolvedUser = {
          ...existing,
          id: fbUser.uid,
          name: fbUser.displayName || existing.name || email.split('@')[0],
          email,
          avatar: fbUser.photoURL || existing.avatar,
        };
        nextUsers = currentUsers.map((u, idx) =>
          idx === existingIndex ? resolvedUser : u
        );

        // Migrate any tasks or entries assigned to pre-registered ID over to the Firebase UID
        if (existing.id !== fbUser.uid) {
          const currentTasks = getLocalStorageItem<Task[]>('tt_tasks', []);
          const updatedTasks = currentTasks.map((t) =>
            t.assignedTo === existing.id ? { ...t, assignedTo: fbUser.uid } : t
          );
          saveTasks(updatedTasks);

          const currentEntries = getLocalStorageItem<TimeEntry[]>('tt_entries', []);
          const updatedEntries = currentEntries.map((e) =>
            e.userId === existing.id ? { ...e, userId: fbUser.uid } : e
          );
          saveEntries(updatedEntries);
        }
      } else {
        const hasAdmin = currentUsers.some((u) => u.role === 'Admin');
        resolvedUser = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0],
          email,
          role: hasAdmin ? 'Employee' : 'Admin',
          avatar: fbUser.photoURL || undefined,
        };
        nextUsers = [...currentUsers, resolvedUser];
      }

      saveUsers(nextUsers);
      setActiveUser(resolvedUser);
      setLocalStorageItem('tt_active_user', resolvedUser);
      return { allowed: true, user: resolvedUser };
    },
    []
  );

  const clearAuthenticatedUser = useCallback(() => {
    setActiveUser(null);
    localStorage.removeItem('tt_active_user');
    setTimer({ taskId: null, startTime: null });
    localStorage.removeItem('tt_timer');
  }, []);

  const addTeamMember = (
    name: string,
    email: string,
    role: 'Admin' | 'Employee'
  ): { success: boolean; error?: string } => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !name.trim()) {
      return { success: false, error: 'Ingresa el nombre y el correo electrónico.' };
    }
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'Ya existe un colaborador con este correo.' };
    }
    const newUser: User = {
      id: `member-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      role,
    };
    saveUsers([...users, newUser]);
    return { success: true };
  };

  const updateUserRole = (userId: string, role: 'Admin' | 'Employee') => {
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, role } : u));
    saveUsers(updatedUsers);
    if (activeUser?.id === userId) {
      const updatedActive = { ...activeUser, role };
      setActiveUser(updatedActive);
      setLocalStorageItem('tt_active_user', updatedActive);
    }
  };

  const removeTeamMember = (userId: string) => {
    if (activeUser?.id === userId) return;
    saveUsers(users.filter((u) => u.id !== userId));
  };

  // Calculate if entry date is locked (using America/Bogota today)
  const isEntryLocked = (dateStr: string): boolean => {
    if (!settings.lockDays || activeUser?.role === 'Admin') return false;
    const todayBogota = getBogotaDateString(0);
    const todayDate = new Date(todayBogota + 'T00:00:00Z');
    const entryDate = new Date(dateStr + 'T00:00:00Z');
    const diffDays = Math.floor(
      (todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays > settings.lockDays;
  };

  // Check for overlapping entries
  const hasOverlappingEntry = (
    userId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): boolean => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    return entries.some((entry) => {
      if (entry.userId !== userId || entry.date !== date || entry.id === excludeId)
        return false;
      const existingStart = toMinutes(entry.startTime);
      const existingEnd = toMinutes(entry.endTime);
      return newStart < existingEnd && newEnd > existingStart;
    });
  };

  // Timer actions
  const startTimer = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newTimer = {
      taskId,
      startTime: new Date().toISOString(),
    };
    setTimer(newTimer);
    setLocalStorageItem('tt_timer', newTimer);
  };

  const stopTimer = (save: boolean = true, note: string = '') => {
    if (!timer.taskId || !timer.startTime || !activeUser) return null;

    const taskId = timer.taskId;
    const startIso = timer.startTime;

    const clearedTimer = { taskId: null, startTime: null };
    setTimer(clearedTimer);
    setLocalStorageItem('tt_timer', clearedTimer);

    if (!save) return null;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    const startDateObj = new Date(startIso);
    const endDateObj = new Date();

    const startTimeStr = getBogotaTimeString(startDateObj);
    let endTimeStr = getBogotaTimeString(endDateObj);
    const dateStr = getBogotaDateFromObj(startDateObj);

    const durationMinutes = Math.max(
      1,
      Math.round((endDateObj.getTime() - startDateObj.getTime()) / 60000)
    );

    // Ensure endTimeStr is at least 1 minute after startTimeStr when stopped in < 60s
    if (endTimeStr <= startTimeStr) {
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const nextTotal = Math.min(23 * 60 + 59, sh * 60 + sm + 1);
      endTimeStr = `${String(Math.floor(nextTotal / 60)).padStart(2, '0')}:${String(
        nextTotal % 60
      ).padStart(2, '0')}`;
    }

    if (hasOverlappingEntry(activeUser.id, dateStr, startTimeStr, endTimeStr)) {
      return {
        error:
          'El tiempo registrado se cruza con otra entrada existente. Por favor ingrésalo manualmente.',
        suggested: {
          projectId: task.projectId,
          taskId,
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationMinutes,
          note: note || `Registro temporizador: ${task.name}`,
        },
      };
    }

    const newEntry: TimeEntry = {
      id: `entry-${Date.now()}`,
      userId: activeUser.id,
      projectId: task.projectId,
      taskId,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes,
      note: note || `Seguimiento de temporizador para: ${task.name}`,
      source: 'timer',
    };

    const updatedEntries = [newEntry, ...entries];
    saveEntries(updatedEntries);
    return newEntry;
  };

  // Manual Time Entry Actions
  const addTimeEntry = (
    entryData: Omit<TimeEntry, 'id' | 'durationMinutes'>
  ): { success: boolean; error?: string } => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const start = toMinutes(entryData.startTime);
    const end = toMinutes(entryData.endTime);

    if (end <= start) {
      return {
        success: false,
        error: 'La hora de fin debe ser posterior a la hora de inicio.',
      };
    }

    if (isEntryLocked(entryData.date)) {
      return {
        success: false,
        error:
          'Este período está cerrado. No puedes agregar registros con más de ' +
          settings.lockDays +
          ' días de antigüedad.',
      };
    }

    if (
      hasOverlappingEntry(
        entryData.userId,
        entryData.date,
        entryData.startTime,
        entryData.endTime
      )
    ) {
      return {
        success: false,
        error:
          'Ya existe una entrada de tiempo para este usuario que se cruza con este horario.',
      };
    }

    const durationMinutes = end - start;

    const newEntry: TimeEntry = {
      ...entryData,
      id: `entry-${Date.now()}`,
      durationMinutes,
    };

    saveEntries([newEntry, ...entries]);

    // If linked to a calendar event, mark that calendar event confirmed to avoid duplicates
    if (entryData.calendarEventId) {
      const updatedCal = calendarEvents.map((c) =>
        c.id === entryData.calendarEventId
          ? { ...c, status: 'confirmed' as const }
          : c
      );
      saveCalendarEvents(updatedCal);
    }

    return { success: true };
  };

  const updateTimeEntry = (
    id: string,
    updatedData: Partial<TimeEntry>
  ): { success: boolean; error?: string } => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return { success: false, error: 'Entrada no encontrada.' };

    if (
      isEntryLocked(entry.date) ||
      (updatedData.date && isEntryLocked(updatedData.date))
    ) {
      return {
        success: false,
        error: 'Esta entrada está bloqueada y no puede ser editada.',
      };
    }

    const finalDate = updatedData.date || entry.date;
    const finalStart = updatedData.startTime || entry.startTime;
    const finalEnd = updatedData.endTime || entry.endTime;

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const start = toMinutes(finalStart);
    const end = toMinutes(finalEnd);

    if (end <= start) {
      return {
        success: false,
        error: 'La hora de fin debe ser posterior a la hora de inicio.',
      };
    }

    if (hasOverlappingEntry(entry.userId, finalDate, finalStart, finalEnd, id)) {
      return {
        success: false,
        error: 'Esta edición genera un cruce con otra entrada existente.',
      };
    }

    const durationMinutes = end - start;

    const updatedEntries = entries.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...updatedData,
          durationMinutes,
        };
      }
      return e;
    });

    saveEntries(updatedEntries);
    return { success: true };
  };

  const deleteTimeEntry = (id: string): { success: boolean; error?: string } => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return { success: false, error: 'Entrada no encontrada.' };

    if (isEntryLocked(entry.date)) {
      return {
        success: false,
        error:
          'No se puede eliminar una entrada que pertenece a un periodo bloqueado.',
      };
    }

    const updatedEntries = entries.filter((e) => e.id !== id);
    saveEntries(updatedEntries);
    return { success: true };
  };

  // Match "[Project Name] Task Name" against current projects & tasks
  const matchEventList = useCallback(
    (
      eventsList: CalendarEvent[],
      currentProjects: Project[],
      currentTasks: Task[],
      currentEntries: TimeEntry[],
      currentDiscarded: string[]
    ): CalendarEvent[] => {
      const loggedCalIds = new Set(
        currentEntries
          .map((e) => e.calendarEventId)
          .filter((id): id is string => Boolean(id))
      );
      const discardedSet = new Set(currentDiscarded);

      return eventsList.map((evt) => {
        let matchedProjectId: string | undefined;
        let matchedTaskId: string | undefined;

        const match = evt.title.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (match) {
          const projName = match[1].trim().toLowerCase();
          const taskName = match[2].trim().toLowerCase();

          const matchedProj = currentProjects.find(
            (p) => p.name.toLowerCase() === projName
          );
          if (matchedProj) {
            matchedProjectId = matchedProj.id;
            const matchedTask = currentTasks.find(
              (t) =>
                t.projectId === matchedProj.id &&
                t.name.toLowerCase() === taskName
            );
            matchedTaskId = matchedTask?.id;
          }
        }

        let status: 'pending' | 'confirmed' | 'discarded' = evt.status;
        if (loggedCalIds.has(evt.id)) {
          status = 'confirmed';
        } else if (discardedSet.has(evt.id)) {
          status = 'discarded';
        } else {
          status = 'pending';
        }

        return {
          ...evt,
          matchedProjectId,
          matchedTaskId,
          status,
        };
      });
    },
    []
  );

  // Re-evaluate auto-matching whenever projects, tasks, or entries change
  useEffect(() => {
    if (calendarEvents.length > 0) {
      const rematched = matchEventList(
        calendarEvents,
        projects,
        tasks,
        entries,
        discardedCalIds
      );
      const changed =
        JSON.stringify(rematched) !== JSON.stringify(calendarEvents);
      if (changed) {
        saveCalendarEvents(rematched);
      }
    }
  }, [projects, tasks, entries, discardedCalIds]);

  // Real Google Calendar Sync (also auto-extracts [Proyecto] Tarea into Tasks when project exists)
  const syncGoogleCalendar = useCallback(
    async (
      accessToken: string
    ): Promise<{
      success: boolean;
      count?: number;
      extractedTasks?: number;
      authExpired?: boolean;
      error?: string;
    }> => {
      try {
        const minDate = getBogotaDateString(-7);
        const maxDate = getBogotaDateString(7);
        const timeMinIso = `${minDate}T00:00:00-05:00`;
        const timeMaxIso = `${maxDate}T23:59:59-05:00`;

        const rawEvents = await fetchGoogleCalendarEvents(
          accessToken,
          timeMinIso,
          timeMaxIso
        );

        const baseEvents: CalendarEvent[] = rawEvents.map((evt) => ({
          id: evt.id,
          title: evt.title,
          date: evt.date,
          startTime: evt.startTime,
          endTime: evt.endTime,
          status: 'pending',
        }));

        const currentProjects = getLocalStorageItem<Project[]>('tt_projects', []);
        const currentTasks = getLocalStorageItem<Task[]>('tt_tasks', []);
        const currentEntries = getLocalStorageItem<TimeEntry[]>('tt_entries', []);
        const currentDiscarded = getLocalStorageItem<string[]>(
          'tt_discarded_calendar_ids',
          []
        );
        const currentActiveUser = getLocalStorageItem<User | null>(
          'tt_active_user',
          null
        );

        const toMinutes = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        // Auto-extract tasks from events matching "[Project] Task" when project exists
        let extractedTasks = 0;
        const nextTasks = [...currentTasks];
        for (const evt of baseEvents) {
          const match = evt.title.match(/^\[([^\]]+)\]\s*(.+)$/);
          if (!match) continue;
          const projName = match[1].trim().toLowerCase();
          const taskName = match[2].trim();
          if (!taskName) continue;

          const matchedProj = currentProjects.find(
            (p) => p.name.toLowerCase() === projName
          );
          if (!matchedProj) continue;

          const existingTask = nextTasks.find(
            (t) =>
              t.projectId === matchedProj.id &&
              t.name.trim().toLowerCase() === taskName.toLowerCase()
          );
          if (!existingTask) {
            const mins = Math.max(
              30,
              toMinutes(evt.endTime) - toMinutes(evt.startTime)
            );
            nextTasks.push({
              id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              projectId: matchedProj.id,
              name: taskName,
              description: `Extraída automáticamente de Google Calendar (${evt.date} ${evt.startTime}-${evt.endTime})`,
              estimatedHours: Number((mins / 60).toFixed(1)),
              assignedTo: currentActiveUser?.id || '',
              status: 'To do',
              dueDate: evt.date,
            });
            extractedTasks++;
          }
        }

        if (extractedTasks > 0) {
          saveTasks(nextTasks);
        }

        const matched = matchEventList(
          baseEvents,
          currentProjects,
          nextTasks,
          currentEntries,
          currentDiscarded
        );

        saveCalendarEvents(matched);
        const syncTimestamp = new Date().toISOString();
        setLastCalendarSync(syncTimestamp);
        localStorage.setItem('tt_last_calendar_sync', syncTimestamp);

        return { success: true, count: matched.length, extractedTasks };
      } catch (err: unknown) {
        if (err instanceof GoogleAuthExpiredError) {
          return { success: false, authExpired: true, error: err.message };
        }
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo sincronizar Google Calendar.';
        return { success: false, error: message };
      }
    },
    [matchEventList]
  );

  // Sync / Suggestion confirmations
  const confirmCalendarSuggestion = (
    eventId: string,
    customNote?: string
  ): { success: boolean; error?: string } => {
    const evt = calendarEvents.find((e) => e.id === eventId);
    if (!evt || !activeUser)
      return { success: false, error: 'Evento no encontrado.' };

    if (!evt.matchedProjectId || !evt.matchedTaskId) {
      return {
        success: false,
        error: 'El evento no tiene un proyecto o tarea asociado para confirmar.',
      };
    }

    if (entries.some((e) => e.calendarEventId === evt.id)) {
      return {
        success: false,
        error: 'Este evento de calendario ya fue registrado previamente.',
      };
    }

    return addTimeEntry({
      userId: activeUser.id,
      projectId: evt.matchedProjectId,
      taskId: evt.matchedTaskId,
      date: evt.date,
      startTime: evt.startTime,
      endTime: evt.endTime,
      note: customNote || `Sincronizado de Calendar: ${evt.title}`,
      source: 'calendar',
      calendarEventId: evt.id,
    });
  };

  const discardCalendarSuggestion = (eventId: string) => {
    const nextDiscarded = Array.from(new Set([...discardedCalIds, eventId]));
    saveDiscardedCalIds(nextDiscarded);
    const updatedEvents = calendarEvents.map((e) => {
      if (e.id === eventId) return { ...e, status: 'discarded' as const };
      return e;
    });
    saveCalendarEvents(updatedEvents);
  };

  // Tasks CRUD
  const addTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
    };
    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    return newTask;
  };

  const updateTask = (id: string, updatedData: Partial<Task>) => {
    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, ...updatedData } : t
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
  };

  // Projects CRUD
  const addProject = (projData: Omit<Project, 'id' | 'active'>) => {
    const newProj: Project = {
      ...projData,
      id: `proj-${Date.now()}`,
      active: true,
    };
    saveProjects([...projects, newProj]);
    return newProj;
  };

  const updateProject = (id: string, updatedData: Partial<Project>) => {
    saveProjects(
      projects.map((p) => (p.id === id ? { ...p, ...updatedData } : p))
    );
  };

  const deleteProject = (id: string) => {
    saveProjects(projects.filter((p) => p.id !== id));
    saveTasks(tasks.filter((t) => t.projectId !== id));
  };

  const importProjectsAndTasksFromSheet = (
    incomingProjects: Array<{
      name: string;
      client: string;
      color: string;
      active: boolean;
    }>,
    incomingTasks: Array<{
      projectName: string;
      name: string;
      description: string;
      estimatedHours: number;
      assigneeEmail?: string;
    }> = []
  ): {
    addedProjects: number;
    updatedProjects: number;
    addedTasks: number;
  } => {
    const nextProjects = [...projects];
    let addedProjects = 0;
    let updatedProjects = 0;

    const projectByName = new Map<string, Project>();
    for (const p of nextProjects) {
      projectByName.set(p.name.trim().toLowerCase(), p);
    }

    for (const item of incomingProjects) {
      const key = item.name.trim().toLowerCase();
      if (!key) continue;
      const existing = projectByName.get(key);
      if (existing) {
        const idx = nextProjects.findIndex((p) => p.id === existing.id);
        const updated: Project = {
          ...existing,
          name: item.name.trim(),
          client: item.client.trim() || existing.client,
          color: item.color || existing.color,
          active: item.active,
        };
        if (idx >= 0) nextProjects[idx] = updated;
        projectByName.set(key, updated);
        updatedProjects++;
      } else {
        const created: Project = {
          id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.name.trim(),
          client: item.client.trim() || 'General',
          color: item.color || 'emerald',
          active: item.active,
        };
        nextProjects.push(created);
        projectByName.set(key, created);
        addedProjects++;
      }
    }

    saveProjects(nextProjects);

    let addedTasks = 0;
    if (incomingTasks.length > 0) {
      const nextTasks = [...tasks];
      const defaultAssigneeId = activeUser?.id || users[0]?.id || '';

      for (const t of incomingTasks) {
        const proj = projectByName.get(t.projectName.trim().toLowerCase());
        if (!proj || !t.name.trim()) continue;

        const alreadyExists = nextTasks.some(
          (existing) =>
            existing.projectId === proj.id &&
            existing.name.trim().toLowerCase() === t.name.trim().toLowerCase()
        );
        if (alreadyExists) continue;

        let assignedId = defaultAssigneeId;
        if (t.assigneeEmail) {
          const matchedUser = users.find(
            (u) => u.email.toLowerCase() === t.assigneeEmail!.trim().toLowerCase()
          );
          if (matchedUser) assignedId = matchedUser.id;
        }

        nextTasks.push({
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          projectId: proj.id,
          name: t.name.trim(),
          description: t.description.trim(),
          estimatedHours: t.estimatedHours > 0 ? t.estimatedHours : 8,
          assignedTo: assignedId,
          status: 'To do',
        });
        addedTasks++;
      }
      saveTasks(nextTasks);
    }

    return { addedProjects, updatedProjects, addedTasks };
  };

  const extractTasksFromCalendarEvents = (
    selections: Array<{
      eventId: string;
      projectId: string;
      taskName: string;
      estimatedHours: number;
      dueDate?: string;
      description?: string;
    }>
  ): { created: number; skipped: number } => {
    const nextTasks = [...tasks];
    let created = 0;
    let skipped = 0;
    const assigneeId = activeUser?.id || users[0]?.id || '';

    for (const sel of selections) {
      const cleanName = sel.taskName.trim();
      if (!cleanName || !sel.projectId) {
        skipped++;
        continue;
      }

      const exists = nextTasks.some(
        (t) =>
          t.projectId === sel.projectId &&
          t.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) {
        skipped++;
        continue;
      }

      nextTasks.push({
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        projectId: sel.projectId,
        name: cleanName,
        description: sel.description || 'Extraída de Google Calendar',
        estimatedHours: sel.estimatedHours > 0 ? sel.estimatedHours : 1,
        assignedTo: assigneeId,
        status: 'To do',
        dueDate: sel.dueDate,
      });
      created++;
    }

    if (created > 0) {
      saveTasks(nextTasks);
    }

    return { created, skipped };
  };

  return {
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
  };
};
