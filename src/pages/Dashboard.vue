<script setup>
import { computed } from 'vue';
import Icon from '../components/Icon.vue';
import Avatar from '../components/Avatar.vue';
import EventTable from '../components/EventTable.vue';
import { data, employees, events, presence, canControl, busy, refresh, notify, lastSync, employeeName, roomName } from '../store.js';
import { idEqual, localDateParts } from '../domain.js';
import { time } from '../format.js';

const emit = defineEmits(['navigate']);
const today = computed(() => localDateParts(lastSync.value || new Date()).date);
const todayEvents = computed(() => events.value.filter(e => localDateParts(e.timestamp).date === today.value));
const occupied = computed(() => new Set([...presence.value.values()].map(p => String(p.roomId))).size);
const openViolations = computed(() => events.value.filter(e => e.result === 'denied' && !e.reviewed));
const latest = computed(() => [...events.value].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 5));
const rooms = computed(() => [...data.rooms].sort((a, b) => a.floor - b.floor || String(a.number).localeCompare(String(b.number))).slice(0, 6));
const occupants = id => employees.value.filter(e => idEqual(presence.value.get(String(e.id))?.roomId, id));
const hours = computed(() => {
  const current = Number(localDateParts(lastSync.value || new Date()).time.slice(0, 2));
  const first = Math.max(0, current - 11);
  return Array.from({ length: current - first + 1 }, (_, i) => {
    const hour = first + i;
    return { hour, count: todayEvents.value.filter(e => Number(localDateParts(e.timestamp).time.slice(0, 2)) === hour).length };
  });
});
const maxCount = computed(() => Math.max(2, ...hours.value.map(h => h.count)));
const headingDate = computed(() => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric' }).format(lastSync.value || new Date()));
async function reload() { try { await refresh(); notify('Данные обновлены.'); } catch {} }
</script>

<template>
  <div class="page-header dashboard-header">
    <div>
      <span class="eyebrow"><span class="eyebrow-rule"></span>ОПЕРАТИВНЫЙ КОНТРОЛЬ</span>
      <h1>Сводка по организации<span class="heading-dot">.</span></h1>
      <p>Люди в помещениях. Проходы. События, требующие внимания.</p>
    </div>
    <div class="page-actions">
      <button class="button" :disabled="busy" @click="reload"><Icon name="refresh" :size="17" :class="{ spin: busy }" />Обновить</button>
      <button v-if="canControl" class="button primary" @click="emit('navigate', 'control')"><Icon name="scan" :size="19" />Проверить проход<Icon name="arrow" :size="16" /></button>
    </div>
  </div>
  <div class="overview-meta"><span><Icon name="calendar" :size="15" />{{ headingDate }}</span><span><span class="dot"></span>Обновление каждые 30 секунд</span></div>

  <div class="stat-grid">
    <article class="stat-card presence-stat"><div class="stat-top"><span>Сотрудники в помещениях</span><Icon name="users" :size="20" /></div><strong>{{ presence.size }}<small>из {{ employees.length }}</small></strong><span class="stat-caption"><span class="dot"></span>По зарегистрированным проходам</span><span class="stat-corner" aria-hidden="true">01</span></article>
    <article class="stat-card"><div class="stat-top"><span>Занятые помещения</span><Icon name="rooms" :size="20" /></div><strong>{{ occupied }}<small>/ {{ data.rooms.length }}</small></strong><span class="stat-caption">{{ data.rooms.length - occupied }} свободно сейчас</span><span class="stat-corner" aria-hidden="true">02</span></article>
    <article class="stat-card"><div class="stat-top"><span>Успешные проходы</span><Icon name="activity" :size="20" /></div><strong>{{ todayEvents.filter(e => e.result === 'allowed').length }}<small>сегодня</small></strong><span class="stat-caption">Входы и выходы сотрудников</span><span class="stat-corner" aria-hidden="true">03</span></article>
    <article class="stat-card alert-stat"><div class="stat-top"><span>Отказы в доступе</span><Icon name="alert" :size="20" /></div><strong>{{ todayEvents.filter(e => e.result === 'denied').length }}<small>сегодня</small></strong><span class="stat-caption">{{ openViolations.length }} не просмотрено</span><span class="stat-corner" aria-hidden="true">04</span></article>
  </div>

  <div class="dashboard-middle">
    <section class="panel zone-panel">
      <header class="panel-header"><div><span class="section-code">01 / ПРОСТРАНСТВО</span><h2>Помещения сейчас</h2></div><button class="text-button" @click="emit('navigate', 'occupancy')">Открыть реестр<Icon name="arrow" :size="16" /></button></header>
      <div v-if="!rooms.length" class="empty-state"><Icon name="rooms" :size="35" /><h3>Пока нет помещений</h3><p>Добавьте помещения организации, чтобы отслеживать присутствие сотрудников.</p></div>
      <div v-else class="zone-ledger">
        <div class="zone-ledger-head"><span>Помещение / расположение</span><span>Присутствие</span><span>Занятость</span><span></span></div>
        <button v-for="room in rooms" :key="room.id" class="zone-row" @click="emit('navigate', 'occupancy')">
          <span class="zone-identity"><span class="room-code">{{ room.number || '—' }}</span><span><strong>{{ room.name }}</strong><small>{{ room.floor }} этаж <span>·</span> {{ room.zone }}</small></span></span>
          <span class="zone-presence"><span v-if="occupants(room.id).length" class="avatar-stack"><Avatar v-for="person in occupants(room.id).slice(0, 3)" :key="person.id" :person="person" size="xs" /></span><span v-else class="zone-vacant">Свободно</span></span>
          <span class="zone-capacity"><strong>{{ occupants(room.id).length }}<small> / {{ room.capacity }}</small></strong><span class="capacity-track"><span :style="{ width: `${Math.min(100, occupants(room.id).length / Math.max(1, room.capacity) * 100)}%` }"></span></span></span><Icon name="right" :size="17" />
        </button>
      </div>
      <div class="activity-ribbon"><div class="activity-ribbon-label"><Icon name="activity" :size="18" /><span><strong>Ритм проходов</strong><small>События за сегодня по часам</small></span></div><div class="spark-chart" role="img" :aria-label="`Событий сегодня: ${todayEvents.length}`"><div v-for="hour in hours" :key="hour.hour" class="spark-column"><span class="spark-space"><i :style="{ height: `${Math.max(3, hour.count / maxCount * 100)}%` }" :title="`${hour.hour}:00 — ${hour.count} событий`"></i></span><small>{{ String(hour.hour).padStart(2, '0') }}</small></div></div><strong class="activity-total">{{ todayEvents.length }}<small>событий</small></strong></div>
    </section>

    <section class="panel passage-feed">
      <header class="panel-header"><div><span class="section-code">02 / МОНИТОРИНГ</span><h2>Лента проходов</h2></div><span class="live-label"><span class="dot"></span>Последние</span></header>
      <div v-if="!latest.length" class="empty-state"><Icon name="events" :size="35" /><h3>Ожидание событий</h3><p>Зарегистрированные проходы появятся в этой ленте.</p></div>
      <div v-else class="feed-list"><button v-for="event in latest" :key="event.id" class="feed-event" @click="emit('navigate', 'events')"><span class="feed-event-icon" :class="event.result"><Icon :name="event.result === 'denied' ? 'lock' : event.direction" :size="18" /></span><span class="feed-event-content"><strong>{{ employeeName(event.employeeId) }}</strong><span>{{ roomName(event.roomId) }}</span><small>{{ event.result === 'allowed' ? (event.direction === 'entry' ? 'Вход разрешён' : 'Выход зарегистрирован') : 'Отказ в доступе' }}</small></span><time>{{ time(event.timestamp) }}</time></button></div>
      <button class="feed-summary" :class="{ attention: openViolations.length }" @click="emit('navigate', 'events')"><span class="feed-summary-icon"><Icon :name="openViolations.length ? 'alert' : 'shield'" :size="22" /></span><span><strong>{{ openViolations.length ? 'Требуют внимания' : 'Журнал событий' }}</strong><small>{{ openViolations.length ? `Непросмотренных отказов: ${openViolations.length}` : 'Просмотр истории проходов' }}</small></span><Icon name="arrow" :size="18" /></button>
    </section>
  </div>
  <section class="panel"><header class="panel-header"><div><span class="section-code">03 / ИСТОРИЯ</span><h2>Последние события<span class="counter">{{ events.length }}</span></h2></div><button class="text-button" @click="emit('navigate', 'events')">Весь журнал<Icon name="arrow" :size="16" /></button></header><EventTable :items="latest" compact /></section>
  <div class="subtle-note"><Icon name="shield" :size="17" /><p>Местоположение определяется по зарегистрированным входам и выходам. Время событий — московское.</p></div>
</template>
