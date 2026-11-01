export const TIME_ZONE = 'Europe/Moscow';
export const ROLES = { admin: 'Администратор', security: 'Служба безопасности', manager: 'Руководитель' };

export function localDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const day = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay();
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, day };
}
export const idEqual = (a, b) => a != null && b != null && String(a) === String(b);

export function derivePresence(events) {
  const presence = new Map();
  const ordered = events.filter(e => e.result === 'allowed' && e.employeeId != null && Number.isFinite(Date.parse(e.timestamp)))
    .map((e, index) => ({ ...e, index })).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.index - b.index);
  for (const event of ordered) {
    const key = String(event.employeeId);
    if (event.direction === 'entry') presence.set(key, { roomId: event.roomId, since: event.timestamp });
    else if (event.direction === 'exit' && idEqual(presence.get(key)?.roomId, event.roomId)) presence.delete(key);
  }
  return presence;
}

export function scheduleMatches(rule, value = new Date()) {
  const { date, time, day } = localDateParts(value);
  if (rule.validFrom && date < rule.validFrom || rule.validTo && date > rule.validTo || rule.active === false) return false;
  const start = rule.startTime || '00:00', end = rule.endTime || '23:59';
  if (start <= end) return (!rule.days?.length || rule.days.includes(day)) && time >= start && time <= end;
  const previousDay = (day + 6) % 7;
  return (time >= start && (!rule.days?.length || rule.days.includes(day))) || (time <= end && (!rule.days?.length || rule.days.includes(previousDay)));
}

export function checkPassage({ employee, room, direction, permissions, events, timestamp = new Date().toISOString() }) {
  if (!room) throw new Error('Выберите помещение.');
  if (!['entry', 'exit'].includes(direction)) throw new Error('Неизвестное направление прохода.');
  const presence = derivePresence(events);
  const current = employee && presence.get(String(employee.id));
  if (!employee) return { result: 'denied', reason: 'Лицо не распознано' };
  if (direction === 'exit') {
    if (!idEqual(current?.roomId, room.id)) return { result: 'invalid', reason: 'В этом помещении нет зарегистрированного входа сотрудника. Местоположение не изменено.' };
    return { result: 'allowed', reason: 'Выход зарегистрирован' };
  }
  if (employee.status !== 'active') return { result: 'denied', reason: 'Сотрудник заблокирован' };
  if (idEqual(current?.roomId, room.id)) return { result: 'invalid', reason: 'Сотрудник уже находится в этом помещении. Повторный вход не зарегистрирован.' };
  const relevant = permissions.filter(p => idEqual(p.roomId, room.id) && (idEqual(p.employeeId, employee.id) || idEqual(p.accessLevelId, employee.accessLevelId)));
  if (!relevant.length) return { result: 'denied', reason: 'Нет разрешения на вход в помещение' };
  if (!relevant.some(p => scheduleMatches(p, timestamp))) return { result: 'denied', reason: 'Разрешение не действует в выбранное время' };
  if (room.capacity > 0 && [...presence.values()].filter(p => idEqual(p.roomId, room.id)).length >= room.capacity) return { result: 'denied', reason: 'Достигнута вместимость помещения' };
  return { result: 'allowed', reason: current ? 'Переход в помещение зарегистрирован' : 'Вход зарегистрирован', fromRoomId: current?.roomId ?? null };
}

export function rankMatches(candidates, threshold = 0.5, margin = 0.06) {
  const bestByEmployee = new Map();
  for (const item of candidates) {
    if (!Number.isFinite(item.similarity)) continue;
    const key = String(item.employeeId);
    if (!bestByEmployee.has(key) || bestByEmployee.get(key).similarity < item.similarity) bestByEmployee.set(key, item);
  }
  const ranked = [...bestByEmployee.values()].sort((a, b) => b.similarity - a.similarity);
  const best = ranked[0], next = ranked[1];
  return { employeeId: best && best.similarity >= threshold && (!next || best.similarity - next.similarity >= margin) ? best.employeeId : null, similarity: best?.similarity ?? 0, ambiguous: !!best && best.similarity >= threshold && !!next && best.similarity - next.similarity < margin };
}

export function buildVisits(events, end = new Date().toISOString()) {
  const open = new Map(), visits = [];
  for (const event of events.filter(e => e.result === 'allowed' && e.employeeId != null).slice().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))) {
    const key = String(event.employeeId), previous = open.get(key);
    if (event.direction === 'entry') {
      if (previous && idEqual(previous.roomId, event.roomId)) continue;
      if (previous) visits.push({ ...previous, end: event.timestamp });
      open.set(key, { employeeId: event.employeeId, roomId: event.roomId, start: event.timestamp });
    } else if (event.direction === 'exit' && idEqual(previous?.roomId, event.roomId)) {
      visits.push({ ...previous, end: event.timestamp });
      open.delete(key);
    }
  }
  for (const visit of open.values()) visits.push({ ...visit, end, ongoing: true });
  return visits;
}
