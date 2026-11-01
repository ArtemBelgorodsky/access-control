<script setup>
import { computed, ref } from 'vue';
import Icon from '../components/Icon.vue';
import { data, events, employees, byId, employeeName, roomName } from '../store.js';
import { buildVisits, idEqual, localDateParts } from '../domain.js'; import { downloadCsv } from '../format.js';
const group = ref('employee'), from = ref(localDateParts().date), to = ref(localDateParts().date), room = ref(''), department = ref('');
const validDates = computed(() => !!from.value && !!to.value && from.value <= to.value);
const included = event => (!room.value || idEqual(event.roomId, room.value)) && (!department.value || idEqual(byId('employees', event.employeeId)?.departmentId, department.value));
const filtered = computed(() => validDates.value ? events.value.filter(e => localDateParts(e.timestamp).date >= from.value && localDateParts(e.timestamp).date <= to.value && included(e)) : []);
const rows = computed(() => {
  if (!validDates.value) return [];
  const map = new Map();
  const getKey = event => group.value === 'room' ? String(event.roomId) : group.value === 'department' ? String(byId('employees', event.employeeId)?.departmentId || 'unknown') : String(event.employeeId ?? 'unknown');
  const label = event => group.value === 'room' ? roomName(event.roomId) : group.value === 'department' ? byId('departments', byId('employees', event.employeeId)?.departmentId)?.name || 'Не установлено' : employeeName(event.employeeId);
  const ensure = event => { const key = getKey(event); if (!map.has(key)) map.set(key, { key, name: label(event), entries: 0, exits: 0, denials: 0, minutes: 0 }); return map.get(key); };
  for (const e of filtered.value) { const row = ensure(e); if (e.result === 'denied') row.denials++; else if (e.direction === 'entry') row.entries++; else row.exits++; }
  // Pair the complete history first, then clip visits to the requested date range.
  const start = Date.parse(`${from.value}T00:00:00+03:00`), end = Math.min(Date.now(), Date.parse(`${to.value}T23:59:59.999+03:00`));
  for (const visit of buildVisits(events.value)) {
    if (!included(visit)) continue;
    const milliseconds = Math.min(end, Date.parse(visit.end)) - Math.max(start, Date.parse(visit.start));
    if (milliseconds > 0) ensure(visit).minutes += milliseconds / 60000;
  }
  return [...map.values()].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name, 'ru'));
});
const timeText = minutes => `${Math.floor(minutes / 60)} ч ${Math.floor(minutes % 60)} мин`;
function exportReport() { downloadCsv('Отчёт по посещениям.csv', [['Период', from.value, to.value], [group.value === 'room' ? 'Помещение' : group.value === 'department' ? 'Подразделение' : 'Сотрудник', 'Входы', 'Выходы', 'Отказы', 'Время пребывания (минуты)'], ...rows.value.map(r => [r.name, r.entries, r.exits, r.denials, Math.floor(r.minutes)])]); }
</script>
<template><div class="page-header"><div><span class="eyebrow">АНАЛИТИКА ПОСЕЩЕНИЙ</span><h1>Отчёты<span class="heading-dot">.</span></h1><p>Посещения и время пребывания за выбранный период.</p></div><button class="button primary" :disabled="!rows.length || !validDates" @click="exportReport"><Icon name="download" :size="17" />Скачать CSV</button></div><section class="panel report-filter"><label>Группировать по<select v-model="group"><option value="employee">Сотрудникам</option><option value="department">Подразделениям</option><option value="room">Помещениям</option></select></label><label>Начало периода<input v-model="from" type="date" required /></label><label>Конец периода<input v-model="to" type="date" required /></label><label>Подразделение<select v-model="department"><option value="">Все подразделения</option><option v-for="d in data.departments" :key="d.id" :value="d.id">{{ d.name }}</option></select></label><label>Помещение<select v-model="room"><option value="">Все помещения</option><option v-for="r in data.rooms" :key="r.id" :value="r.id">{{ r.name }}</option></select></label></section><div v-if="!validDates" class="alert-box" role="alert">Укажите корректный период: дата окончания должна быть не раньше даты начала.</div><div class="report-stats"><div><span>Успешных входов</span><strong>{{ filtered.filter(e => e.result === 'allowed' && e.direction === 'entry').length }}</strong></div><div><span>Отказов в доступе</span><strong>{{ filtered.filter(e => e.result === 'denied').length }}</strong></div><div><span>Время пребывания</span><strong>{{ timeText(rows.reduce((sum, r) => sum + r.minutes, 0)) }}</strong></div></div><section class="panel"><header class="panel-header"><div><h2>{{ group === 'room' ? 'Посещения помещений' : group === 'department' ? 'Посещения по подразделениям' : 'Посещения сотрудников' }}</h2><p>{{ from }} — {{ to }} · Московское время</p></div><Icon name="file" :size="21" /></header><div v-if="!rows.length" class="empty-state"><Icon name="reports" :size="38" /><h3>За этот период нет данных</h3><p>Зарегистрируйте проход или выберите другой период.</p></div><div v-else class="table-scroll"><table class="data-table"><thead><tr><th>{{ group === 'room' ? 'Помещение' : group === 'department' ? 'Подразделение' : 'Сотрудник' }}</th><th>Входы</th><th>Выходы</th><th>Отказы</th><th>Время пребывания</th></tr></thead><tbody><tr v-for="row in rows" :key="row.key"><td><strong>{{ row.name }}</strong></td><td>{{ row.entries }}</td><td>{{ row.exits }}</td><td><span :class="{ 'text-red': row.denials }">{{ row.denials }}</span></td><td class="mono">{{ timeText(row.minutes) }}</td></tr></tbody></table></div></section><div class="subtle-note"><Icon name="clock" :size="17" /><p>Время рассчитывается по парам входов и выходов, включая переходы между помещениями. Незакрытое посещение учитывается до текущего времени.</p></div></template>
