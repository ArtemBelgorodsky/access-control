import { TIME_ZONE } from './domain.js';
export const initials = name => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('');
export const time = value => new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const date = value => new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, day: '2-digit', month: 'short' }).format(new Date(value));
export const dateTime = value => `${date(value)}, ${time(value)}`;
export const duration = (start, end = new Date()) => { const m = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 60000)); return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`; };
export const weekdays = [ { value: 1, label: 'Пн' }, { value: 2, label: 'Вт' }, { value: 3, label: 'Ср' }, { value: 4, label: 'Чт' }, { value: 5, label: 'Пт' }, { value: 6, label: 'Сб' }, { value: 0, label: 'Вс' } ];
export function downloadJson(name, value) { downloadBlob(name, new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); }
export function downloadBlob(name, blob) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function downloadCsv(name, rows) {
  const safe = value => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
  downloadBlob(name, new Blob(['\uFEFF', rows.map(row => row.map(safe).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
}
