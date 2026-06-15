import {
  buildFrequencyWaitSignal,
  buildTimetableDelaySignal,
} from '../../../src/busReliabilitySignals.js';

const DEFAULT_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const DEFAULT_BASIC_BASE_URL = 'https://tdx.transportdata.tw/api/basic/v2';
const DEFAULT_CITY = 'Taipei';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const route = String(url.searchParams.get('route') ?? '').trim();
  const city = String(url.searchParams.get('city') ?? env.TDX_CITY ?? DEFAULT_CITY).trim();

  if (!route) return jsonResponse({ ok: false, error: 'route query parameter is required' }, 400);
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) {
    return jsonResponse({
      ok: false,
      route,
      city,
      error: 'TDX credentials are not configured for this Pages environment.',
      fallbackPath: `/data/tdx-bus/reliability-evidence/route-${safeFileName(route)}.json`,
    }, 503);
  }

  try {
    const config = {
      authUrl: env.TDX_AUTH_URL ?? DEFAULT_AUTH_URL,
      apiBaseUrl: stripTrailingSlash(env.TDX_BASIC_API_BASE_URL ?? env.TDX_API_BASE_URL ?? DEFAULT_BASIC_BASE_URL),
      city,
      route,
      clientId: env.TDX_CLIENT_ID,
      clientSecret: env.TDX_CLIENT_SECRET,
    };
    const accessToken = await fetchAccessToken(config);
    const [etaRows, scheduleRows, stopOfRouteRows] = await Promise.all([
      fetchEndpointRows(config, accessToken, 'EstimatedTimeOfArrival'),
      fetchEndpointRows(config, accessToken, 'Schedule'),
      fetchEndpointRows(config, accessToken, 'StopOfRoute'),
    ]);

    return jsonResponse(buildDelayPoc({
      route,
      city,
      etaRows,
      scheduleRows,
      stopOfRouteRows,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    return jsonResponse({
      ok: false,
      route,
      city,
      error: error.message,
    }, 502);
  }
}

async function fetchAccessToken(config) {
  const response = await fetch(config.authUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId ?? globalThis.TDX_CLIENT_ID,
      client_secret: config.clientSecret ?? globalThis.TDX_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`TDX token request failed with HTTP ${response.status}`);
  }
  return payload.access_token;
}

async function fetchEndpointRows(config, accessToken, endpointName) {
  const endpointUrl = new URL(`${config.apiBaseUrl}/Bus/${endpointName}/City/${encodeURIComponent(config.city)}/${encodeURIComponent(config.route)}`);
  endpointUrl.searchParams.set('$format', 'JSON');
  const response = await fetch(endpointUrl.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${endpointName} HTTP ${response.status}`);
  return normalizeRows(payload).filter((row) => localizedName(row.RouteName) === config.route);
}

export function buildDelayPoc({ route, city, etaRows, scheduleRows, stopOfRouteRows, generatedAt }) {
  const stopIndex = buildStopIndex(stopOfRouteRows);
  const currentMinutes = taipeiMinutesOfDay(generatedAt);
  const scheduleIndex = buildScheduleIndex(scheduleRows, generatedAt);
  const etaEvidence = etaRows.map((row) => {
    const direction = numberOrNull(row.Direction);
    const stop = findStop(stopIndex, direction, row.StopUID, row.StopID);
    const schedule = scheduleIndex.get(String(direction)) ?? null;
    const etaMinutes = secondsToMinutes(row.EstimateTime);
    const stopStatus = numberOrNull(row.StopStatus);
    const timetableMatch = schedule?.timetableCount > 0
      ? findTimetableMatch(schedule, row, currentMinutes, etaMinutes)
      : null;
    const signal = timetableMatch
      ? buildTimetableDelaySignal({
          etaMinutes,
          currentMinutes,
          scheduledArrivalMinutes: timetableMatch.scheduledArrivalMinutes,
          scheduledArrivalTime: timetableMatch.arrivalTime,
          stopSequence: timetableMatch.stopSequence,
          stopStatus,
        })
      : schedule?.activeFrequency
        ? buildFrequencyWaitSignal({
          etaMinutes,
          expectedMaxWaitMinutes: schedule.activeFrequency.maxHeadwayMins,
          stopStatus,
          scheduleWindow: schedule.activeFrequency.window,
        })
        : buildNoScheduleSignal({ etaMinutes, stopStatus });

    return {
      routeName: route,
      routeUID: row.RouteUID ?? null,
      direction,
      stopUID: row.StopUID ?? null,
      stopID: row.StopID ?? null,
      stopName: localizedName(row.StopName),
      stopSequence: stop?.sequence ?? null,
      stopJoined: Boolean(stop),
      etaMinutes: signal.etaMinutes,
      expectedMaxWaitMinutes: signal.expectedMaxWaitMinutes,
      expectedScheduledArrivalMinutes: signal.expectedScheduledArrivalMinutes,
      predictedArrivalMinutes: signal.predictedArrivalMinutes,
      predictedDelayMinutes: signal.predictedDelayMinutes,
      thresholdMinutes: signal.thresholdMinutes,
      severity: signal.severity,
      candidateEligible: signal.candidateEligible,
      signalSubtype: signal.signalSubtype,
      signalVariant: signal.signalVariant ?? null,
      userFacingSignal: signal.userFacingSignal,
      claimStatus: signal.claimStatus ?? 'candidate',
      manualReviewThresholdMinutes: signal.manualReviewThresholdMinutes ?? null,
      stopStatus,
      stopStatusLabel: stopStatusLabel(stopStatus),
      scheduleBasis: signal.scheduleBasis,
      scheduleWindow: signal.scheduleWindow ?? null,
      scheduledArrivalTime: signal.scheduledArrivalTime ?? null,
      sourceUpdateTime: row.SrcUpdateTime ?? null,
      updateTime: row.UpdateTime ?? null,
    };
  });

  const delayCandidates = etaEvidence
    .filter((row) => row.severity === 'critical' || row.severity === 'warning' || row.severity === 'watch')
    .sort((left, right) => (
      severityRank(left.severity) - severityRank(right.severity)
      || Number(right.predictedDelayMinutes) - Number(left.predictedDelayMinutes)
    ))
    .slice(0, 8);

  return {
    ok: true,
    schema: 'twfoundry.bus.delay-poc.v1',
    generatedAt,
    source: {
      provider: 'TDX',
      city,
      route,
      endpoints: [
        'Bus.EstimatedTimeOfArrival.City',
        'Bus.Schedule.City',
        'Bus.StopOfRoute.City',
      ],
    },
    signalPolicy: {
      userFacingSignal: delayCandidates.some((row) => row.signalSubtype === 'timetable_delay')
        ? '發車誤點 / 表定誤點 / 候車超時（ETA）'
        : '候車超時（ETA）',
      confidence: delayCandidates.length > 0 ? 'candidate' : 'reference',
      reason: 'ETA is compared with exact stop timetables when available, otherwise with the active frequency schedule window. Rows outside normal operation or without schedule evidence are not promoted to alert candidates.',
    },
    rowCounts: {
      eta: etaRows.length,
      schedule: scheduleRows.length,
      stopOfRoute: stopOfRouteRows.length,
      etaEvidence: etaEvidence.length,
      delayCandidates: delayCandidates.length,
    },
    joinQuality: {
      etaStopJoinRate: ratio(etaEvidence.filter((row) => row.stopJoined).length, etaEvidence.length),
      scheduledEtaRows: etaEvidence.filter((row) => (
        Number.isFinite(row.expectedMaxWaitMinutes)
        || Number.isFinite(row.expectedScheduledArrivalMinutes)
      )).length,
      timetableEtaRows: etaEvidence.filter((row) => Number.isFinite(row.expectedScheduledArrivalMinutes)).length,
      frequencyEtaRows: etaEvidence.filter((row) => Number.isFinite(row.expectedMaxWaitMinutes)).length,
    },
    scheduleSummary: summarizeSchedule(scheduleRows, generatedAt),
    delayCandidates,
    etaEvidence: etaEvidence
      .sort((left, right) => (
        (left.direction ?? 99) - (right.direction ?? 99)
        || (left.stopSequence ?? 9999) - (right.stopSequence ?? 9999)
      ))
      .slice(0, 120),
  };
}

function buildStopIndex(stopOfRouteRows) {
  const byUID = new Map();
  const byID = new Map();
  for (const route of stopOfRouteRows) {
    const direction = numberOrNull(route.Direction);
    for (const stop of route.Stops ?? []) {
      const record = {
        direction,
        stopUID: stop.StopUID ?? null,
        stopID: stop.StopID ?? null,
        name: localizedName(stop.StopName),
        sequence: numberOrNull(stop.StopSequence),
      };
      if (record.stopUID) byUID.set(joinKey(direction, record.stopUID), record);
      if (record.stopID) byID.set(joinKey(direction, record.stopID), record);
    }
  }
  return { byUID, byID };
}

function findStop(stopIndex, direction, stopUID, stopID) {
  return (stopUID ? stopIndex.byUID.get(joinKey(direction, stopUID)) : null)
    ?? (stopID ? stopIndex.byID.get(joinKey(direction, stopID)) : null)
    ?? null;
}

function buildScheduleIndex(scheduleRows, generatedAt) {
  const currentMinutes = taipeiMinutesOfDay(generatedAt);
  const weekdayKey = taipeiWeekdayKey(generatedAt);
  const index = new Map();
  for (const row of scheduleRows) {
    const direction = numberOrNull(row.Direction);
    const key = String(direction);
    const record = index.get(key) ?? {
      basis: 'none',
      activeFrequency: null,
      timetableCount: 0,
      timetablesByUID: new Map(),
      timetablesByID: new Map(),
    };

    const timetableIndex = buildTimetableIndex(row.Timetables, weekdayKey);
    if (timetableIndex.count > 0) {
      record.timetableCount += timetableIndex.count;
      mergeMapLists(record.timetablesByUID, timetableIndex.byUID);
      mergeMapLists(record.timetablesByID, timetableIndex.byID);
    }

    const frequencies = Array.isArray(row.Frequencys) ? row.Frequencys : [];
    const active = frequencies.find((item) => timeWindowContains(item.StartTime, item.EndTime, currentMinutes)) ?? null;
    if (active) {
      record.activeFrequency = {
        minHeadwayMins: numberOrNull(active.MinHeadwayMins),
        maxHeadwayMins: numberOrNull(active.MaxHeadwayMins),
        window: [active.StartTime ?? null, active.EndTime ?? null].filter(Boolean).join('-') || null,
      };
    }

    record.basis = record.timetableCount > 0 ? 'timetable' : record.activeFrequency ? 'frequency' : 'none';
    index.set(key, record);
  }
  return index;
}

function summarizeSchedule(scheduleRows, generatedAt) {
  const currentMinutes = taipeiMinutesOfDay(generatedAt);
  const weekdayKey = taipeiWeekdayKey(generatedAt);
  return scheduleRows.map((row) => {
    const frequencies = Array.isArray(row.Frequencys) ? row.Frequencys : [];
    const active = frequencies.find((item) => timeWindowContains(item.StartTime, item.EndTime, currentMinutes)) ?? null;
    const timetableStopCount = countUsableTimetableStopTimes(row.Timetables, weekdayKey);
    return {
      routeName: localizedName(row.RouteName),
      direction: numberOrNull(row.Direction),
      basis: timetableStopCount > 0 ? 'timetable' : active ? 'frequency' : 'none',
      frequencyCount: frequencies.length,
      timetableCount: Array.isArray(row.Timetables) ? row.Timetables.length : 0,
      activeFrequency: active ? {
        startTime: active.StartTime ?? null,
        endTime: active.EndTime ?? null,
        minHeadwayMins: numberOrNull(active.MinHeadwayMins),
        maxHeadwayMins: numberOrNull(active.MaxHeadwayMins),
      } : null,
      timetableStops: timetableStopCount,
      updateTime: row.UpdateTime ?? null,
    };
  });
}

function buildNoScheduleSignal({ etaMinutes, stopStatus }) {
  return {
    signalSubtype: 'eta_reference',
    userFacingSignal: 'ETA 參考',
    scheduleBasis: 'none',
    etaMinutes: numberOrNull(etaMinutes),
    expectedMaxWaitMinutes: null,
      expectedScheduledArrivalMinutes: null,
      predictedArrivalMinutes: null,
      predictedDelayMinutes: null,
      thresholdMinutes: null,
      manualReviewThresholdMinutes: null,
      severity: 'ok',
      candidateEligible: stopStatus === 0,
      claimStatus: 'reference',
    };
}

function buildTimetableIndex(timetables, weekdayKey) {
  const byUID = new Map();
  const byID = new Map();
  let count = 0;
  for (const timetable of Array.isArray(timetables) ? timetables : []) {
    if (!serviceDayMatches(timetable.ServiceDay, weekdayKey)) continue;
    for (const item of normalizeTimetableStopTimes(timetable)) {
      const arrivalTime = item.ArrivalTime ?? item.DepartureTime ?? null;
      const arrivalMinutes = parseTimeMinutes(arrivalTime);
      if (!Number.isFinite(arrivalMinutes)) continue;
      const record = {
        tripID: timetable.TripID ?? null,
        stopUID: item.StopUID ?? null,
        stopID: item.StopID ?? null,
        stopSequence: numberOrNull(item.StopSequence),
        arrivalTime,
        arrivalMinutes,
      };
      if (record.stopUID) appendMapList(byUID, record.stopUID, record);
      if (record.stopID) appendMapList(byID, record.stopID, record);
      count += 1;
    }
  }
  return { byUID, byID, count };
}

function findTimetableMatch(schedule, etaRow, currentMinutes, etaMinutes) {
  const records = [
    ...(etaRow.StopUID ? schedule.timetablesByUID.get(etaRow.StopUID) ?? [] : []),
    ...(etaRow.StopID ? schedule.timetablesByID.get(etaRow.StopID) ?? [] : []),
  ];
  if (records.length === 0 || !Number.isFinite(etaMinutes)) return null;

  const predictedArrival = currentMinutes + etaMinutes;
  const candidates = records.map((record) => {
    const scheduledArrivalMinutes = alignScheduleToPredictedDay(record.arrivalMinutes, predictedArrival);
    return {
      ...record,
      scheduledArrivalMinutes,
      absoluteDelta: Math.abs(predictedArrival - scheduledArrivalMinutes),
    };
  }).filter((record) => record.absoluteDelta <= 180);

  return candidates.sort((left, right) => left.absoluteDelta - right.absoluteDelta)[0] ?? null;
}

function alignScheduleToPredictedDay(scheduleMinutes, predictedArrivalMinutes) {
  const candidates = [scheduleMinutes - 1440, scheduleMinutes, scheduleMinutes + 1440];
  return candidates.sort((left, right) => (
    Math.abs(predictedArrivalMinutes - left) - Math.abs(predictedArrivalMinutes - right)
  ))[0];
}

function appendMapList(map, key, value) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function severityRank(severity) {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  if (severity === 'watch') return 2;
  return 3;
}

function mergeMapLists(target, source) {
  for (const [key, values] of source.entries()) {
    const existing = target.get(key) ?? [];
    target.set(key, [...existing, ...values]);
  }
}

function countUsableTimetableStopTimes(timetables, weekdayKey) {
  return (Array.isArray(timetables) ? timetables : []).reduce((count, timetable) => {
    if (!serviceDayMatches(timetable.ServiceDay, weekdayKey)) return count;
    return count + normalizeTimetableStopTimes(timetable)
      .filter((item) => Number.isFinite(parseTimeMinutes(item.ArrivalTime ?? item.DepartureTime)))
      .length;
  }, 0);
}

function normalizeTimetableStopTimes(timetable) {
  if (Array.isArray(timetable?.StopTimes)) return timetable.StopTimes;
  if (timetable && typeof timetable === 'object') return [timetable];
  return [];
}

function serviceDayMatches(serviceDay, weekdayKey) {
  if (!serviceDay || typeof serviceDay !== 'object') return true;
  const values = Object.values(serviceDay).map(Number).filter((value) => Number.isFinite(value));
  if (values.length === 0 || values.every((value) => value === 0)) return true;
  return Number(serviceDay[weekdayKey]) === 1;
}

function taipeiWeekdayKey(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'long',
  }).format(date);
}

function taipeiMinutesOfDay(value) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

function timeWindowContains(start, end, currentMinutes) {
  const startMinutes = parseTimeMinutes(start);
  const endMinutes = parseTimeMinutes(end);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return false;
  if (startMinutes <= endMinutes) return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function parseTimeMinutes(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function stopStatusLabel(value) {
  if (value === 0) return '正常營運';
  if (value === 1) return '尚未發車';
  if (value === 2) return '交管不停靠';
  if (value === 3) return '末班已過';
  if (value === 4) return '今日未營運';
  return '狀態未知';
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

function localizedName(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  return value.Zh_tw ?? value.En ?? value.zh_tw ?? value.en ?? null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function secondsToMinutes(value) {
  const number = numberOrNull(value);
  return number === null ? null : Math.round((number / 60) * 10) / 10;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : null;
}

function joinKey(direction, id) {
  return `${direction ?? 'unknown'}:${id}`;
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function safeFileName(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '-');
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: jsonHeaders,
  });
}
