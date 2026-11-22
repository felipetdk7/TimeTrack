import type { CalendarEvent, Project, Task, TimeEntry, User } from './store';

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Returns true when the entry date is older than lockDays (Bogotá calendar days); admins are never locked. */
export const isEntryDateLocked = (
  entryDateStr: string,
  lockDays: number,
  userRole: User['role'] | undefined,
  todayBogota: string
): boolean => {
  if (!lockDays || userRole === 'Admin') return false;
  const todayDate = new Date(todayBogota + 'T00:00:00Z');
  const entryDate = new Date(entryDateStr + 'T00:00:00Z');
  const diffDays = Math.floor(
    (todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays > lockDays;
};

export const hasOverlappingEntry = (
  entries: TimeEntry[],
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): boolean => {
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  return entries.some((entry) => {
    if (entry.userId !== userId || entry.date !== date || entry.id === excludeId)
      return false;
    const existingStart = timeToMinutes(entry.startTime);
    const existingEnd = timeToMinutes(entry.endTime);
    return newStart < existingEnd && newEnd > existingStart;
  });
};

export const matchCalendarEventList = (
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
};