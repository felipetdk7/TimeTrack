export interface RawGoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
}

export interface ParsedCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD in America/Bogota
  startTime: string; // HH:MM in America/Bogota
  endTime: string; // HH:MM in America/Bogota
}

export class GoogleAuthExpiredError extends Error {
  constructor(message = 'Tu sesión de Google expiró. Vuelve a conectar tu cuenta.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

const formatInBogota = (isoDateTime: string): { date: string; time: string } => {
  const d = new Date(isoDateTime);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  // Normalize "24:00" edge case to "23:59" if any
  const normalizedTime = timeParts.startsWith('24:') ? '23:59' : timeParts;

  return {
    date: dateParts,
    time: normalizedTime,
  };
};

export const fetchGoogleCalendarEvents = async (
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<ParsedCalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    timeZone: 'America/Bogota',
    maxResults: '100',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthExpiredError(
      'No tienes autorización vigente para leer Google Calendar. Por favor reconecta tu cuenta de Google.'
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al consultar Google Calendar (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const items: RawGoogleCalendarEvent[] = Array.isArray(data.items) ? data.items : [];

  const parsed: ParsedCalendarEvent[] = [];
  for (const item of items) {
    if (item.status === 'cancelled') continue;
    // Skip all-day events without explicit start/end time
    if (!item.start?.dateTime || !item.end?.dateTime) continue;

    const startFormatted = formatInBogota(item.start.dateTime);
    const endFormatted = formatInBogota(item.end.dateTime);

    // Ensure valid positive same-day duration
    if (startFormatted.date !== endFormatted.date) continue;
    if (endFormatted.time <= startFormatted.time) continue;

    parsed.push({
      id: item.id,
      title: item.summary?.trim() || '(Evento sin título)',
      date: startFormatted.date,
      startTime: startFormatted.time,
      endTime: endFormatted.time,
    });
  }

  return parsed;
};

export const createGoogleCalendarEvent = async (
  accessToken: string,
  payload: {
    summary: string;
    description?: string;
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:MM
    endTime?: string; // HH:MM
    attendeeEmail?: string;
  }
): Promise<{ id: string; htmlLink?: string }> => {
  const startClock = payload.startTime || '09:00';
  const endClock = payload.endTime || '10:00';

  const body: Record<string, unknown> = {
    summary: payload.summary,
    description: payload.description || '',
    start: {
      dateTime: `${payload.date}T${startClock}:00-05:00`,
      timeZone: 'America/Bogota',
    },
    end: {
      dateTime: `${payload.date}T${endClock}:00-05:00`,
      timeZone: 'America/Bogota',
    },
  };

  if (payload.attendeeEmail) {
    body.attendees = [{ email: payload.attendeeEmail }];
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthExpiredError(
      'No tienes autorización vigente para crear eventos en Google Calendar. Reconecta tu cuenta.'
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear evento en Google Calendar (${res.status}): ${errText}`);
  }

  return res.json();
};

export const exportReportToGoogleSheets = async (
  accessToken: string,
  title: string,
  rows: (string | number)[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  // 1. Create a new spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        timeZone: 'America/Bogota',
      },
    }),
  });

  if (createRes.status === 401 || createRes.status === 403) {
    throw new GoogleAuthExpiredError(
      'No tienes autorización vigente para crear hojas en Google Sheets. Reconecta tu cuenta.'
    );
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear hoja de Google Sheets (${createRes.status}): ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string = created.spreadsheetUrl;

  // 2. Fetch spreadsheet metadata to get the exact first sheet name (never hardcode "Sheet1")
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const meta = metaRes.ok ? await metaRes.json() : created;
  const firstSheetTitle: string =
    meta?.sheets?.[0]?.properties?.title ||
    created?.sheets?.[0]?.properties?.title ||
    'Sheet1';

  const escapedTitle = `'${firstSheetTitle.replace(/'/g, "''")}'`;

  // 3. Populate values
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${escapedTitle}!A1`
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Hoja creada, pero falló la escritura de datos (${updateRes.status}): ${errText}`);
  }

  return { spreadsheetId, spreadsheetUrl };
};

export const extractSpreadsheetId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

export const fetchSpreadsheetMetadata = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetTitles: string[] }> => {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthExpiredError(
      'No tienes autorización vigente para leer Google Sheets. Reconecta tu cuenta de Google.'
    );
  }

  if (res.status === 404) {
    throw new Error(
      'No se encontró la hoja de cálculo. Verifica la URL o el ID y que tu cuenta tenga acceso.'
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al leer Google Sheets (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const title: string = data?.properties?.title || 'Hoja de cálculo';
  const sheetTitles: string[] = Array.isArray(data?.sheets)
    ? data.sheets
        .map((s: { properties?: { title?: string } }) => s?.properties?.title)
        .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0)
    : [];

  return { title, sheetTitles };
};

export const fetchSheetRows = async (
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<string[][]> => {
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  const range = encodeURIComponent(`${escapedTitle}!A1:Z500`);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthExpiredError(
      'No tienes autorización vigente para leer datos de Google Sheets. Reconecta tu cuenta de Google.'
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al obtener filas de Google Sheets (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data?.values) ? data.values : [];
};

