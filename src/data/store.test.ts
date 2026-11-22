import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getBogotaDateFromObj,
  getBogotaDateString,
  getBogotaTimeString,
  getBogotaWeekDates,
} from './store';
import {
  hasOverlappingEntry,
  isEntryDateLocked,
  matchCalendarEventList,
} from './storeRules';
import type { CalendarEvent, Project, Task, TimeEntry } from './store';

describe('SPEC-002 AC-1: Bogotá date/time helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats calendar dates in America/Bogota', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T06:30:00Z'));
    expect(getBogotaDateString(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getBogotaDateString(0)).toBe(getBogotaDateFromObj(new Date('2026-03-15T06:30:00Z')));
  });

  it('maps UTC midnight cross into Bogotá evening previous calendar day', () => {
    const d = new Date('2026-01-02T04:30:00Z');
    expect(getBogotaDateFromObj(d)).toBe('2026-01-01');
    expect(getBogotaTimeString(d)).toBe('23:30');
  });

  it('returns seven Monday–Sunday week dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T15:00:00Z'));
    const week = getBogotaWeekDates();
    expect(week).toHaveLength(7);
    expect(week[0] <= week[6]).toBe(true);
    const utc = new Date(week[0] + 'T12:00:00Z');
    const dow = utc.getUTCDay();
    expect(dow).toBe(1);
  });
});

describe('SPEC-002 AC-2: overlap validation', () => {
  const base: TimeEntry[] = [
    {
      id: 'e1',
      userId: 'u1',
      projectId: 'p1',
      taskId: 't1',
      date: '2026-03-10',
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      note: '',
      source: 'manual',
    },
  ];

  it('rejects intersecting intervals for same user and day', () => {
    expect(
      hasOverlappingEntry(base, 'u1', '2026-03-10', '09:30', '09:45')
    ).toBe(true);
  });

  it('allows adjacent non-overlapping intervals', () => {
    expect(
      hasOverlappingEntry(base, 'u1', '2026-03-10', '10:00', '11:00')
    ).toBe(false);
    expect(hasOverlappingEntry(base, 'u2', '2026-03-10', '09:30', '10:30')).toBe(
      false
    );
  });

  it('excludes entry id when updating', () => {
    expect(
      hasOverlappingEntry(base, 'u1', '2026-03-10', '09:00', '10:00', 'e1')
    ).toBe(false);
  });
});

describe('SPEC-002 AC-3: lockDays', () => {
  const today = '2026-03-15';

  it('blocks non-admin edits beyond lockDays', () => {
    expect(isEntryDateLocked('2026-03-01', 5, 'Employee', today)).toBe(true);
    expect(isEntryDateLocked('2026-03-14', 5, 'Employee', today)).toBe(false);
  });

  it('never locks for Admin', () => {
    expect(isEntryDateLocked('2025-01-01', 5, 'Admin', today)).toBe(false);
  });

  it('treats lockDays 0 as no lock', () => {
    expect(isEntryDateLocked('2020-01-01', 0, 'Employee', today)).toBe(false);
  });
});

describe('SPEC-002 AC-4: calendar title [Proyecto] Tarea', () => {
  const projects: Project[] = [
    {
      id: 'proj-a',
      name: 'Rediseño Web',
      client: 'Acme',
      color: 'emerald',
      active: true,
    },
  ];
  const tasks: Task[] = [
    {
      id: 'task-a',
      projectId: 'proj-a',
      name: 'Wireframes home',
      description: '',
      estimatedHours: 4,
      assignedTo: 'u1',
      status: 'To do',
    },
  ];

  it('matches project and task case-insensitively', () => {
    const events: CalendarEvent[] = [
      {
        id: 'cal-1',
        title: '[rediseño web] Wireframes Home',
        date: '2026-03-10',
        startTime: '10:00',
        endTime: '11:00',
        status: 'pending',
      },
    ];
    const [matched] = matchCalendarEventList(events, projects, tasks, [], []);
    expect(matched.matchedProjectId).toBe('proj-a');
    expect(matched.matchedTaskId).toBe('task-a');
    expect(matched.status).toBe('pending');
  });

  it('leaves ids unset when project name is unknown', () => {
    const events: CalendarEvent[] = [
      {
        id: 'cal-2',
        title: '[Unknown] Something',
        date: '2026-03-10',
        startTime: '10:00',
        endTime: '11:00',
        status: 'pending',
      },
    ];
    const [matched] = matchCalendarEventList(events, projects, tasks, [], []);
    expect(matched.matchedProjectId).toBeUndefined();
    expect(matched.matchedTaskId).toBeUndefined();
  });
});