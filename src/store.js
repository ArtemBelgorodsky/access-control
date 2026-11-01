import { computed, reactive, ref } from 'vue';
import { DEFAULT_MOKKY_URL, fetchSnapshot, mutate, request } from './services/api.js';
import { RESOURCE_NAMES } from './seed.js';
import { checkPassage, derivePresence, idEqual } from './domain.js';
const CONFIG_KEY = 'rubezh.config.v1', SESSION_KEY = 'rubezh.session.v1';
function readJson(storage, key, fallback) { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } }
const savedThreshold = Number(readJson(localStorage, CONFIG_KEY, {}).threshold ?? 0.5);
export const config = reactive({ baseUrl: DEFAULT_MOKKY_URL, mode: 'mokky', threshold: Number.isFinite(savedThreshold) && savedThreshold >= 0.4 && savedThreshold <= 0.9 ? savedThreshold : 0.5 });
const savedSession = readJson(sessionStorage, SESSION_KEY, null);
export const user = ref(savedSession?.token ? savedSession.user : null), token = ref(savedSession?.token || '');
export const data = reactive(Object.fromEntries(RESOURCE_NAMES.map(name => [name, []])));
export const busy = ref(false), loadError = ref(''), ready = ref(false), lastSync = ref(null);
export const toasts = ref([]);
let sourceVersion = 0;
export const canEdit = computed(() => user.value?.role === 'admin');
export const canControl = computed(() => ['admin', 'security'].includes(user.value?.role));
export const employees = computed(() => user.value?.role === 'manager' ? data.employees.filter(e => idEqual(e.departmentId, user.value.departmentId)) : data.employees);
export const events = computed(() => user.value?.role === 'manager' ? data.access_events.filter(e => employees.value.some(p => idEqual(p.id, e.employeeId))) : data.access_events);
export const presence = computed(() => derivePresence(events.value));
export const byId = (resource, id) => data[resource].find(x => idEqual(x.id, id));
export const employeeName = id => byId('employees', id)?.fullName || (id == null ? 'Неизвестный человек' : 'Сотрудник удалён');
export const roomName = id => byId('rooms', id)?.name || 'Помещение удалено';
export function notify(message, kind = 'success') {
  const id = crypto.randomUUID(); toasts.value.push({ id, message, kind });
  setTimeout(() => { toasts.value = toasts.value.filter(x => x.id !== id); }, 6000);
}
function saveSession() { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: user.value, token: token.value })); }
export function setConfig(next) {
  const threshold = Number(next.threshold);
  if (!Number.isFinite(threshold) || threshold < 0.4 || threshold > 0.9) throw new Error('Порог сходства должен быть от 0.40 до 0.90.');
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ threshold }));
  config.threshold = threshold;
}
export function logout() { sourceVersion++; refreshing = null; busy.value = false; user.value = null; token.value = ''; sessionStorage.removeItem(SESSION_KEY); RESOURCE_NAMES.forEach(name => { data[name] = []; }); ready.value = false; loadError.value = ''; }
export async function login({ email, password }) {
    const result = await request(config.baseUrl, '/auth', { method: 'POST', body: { email, password } });
    if (!result?.token || !result.data || !['admin', 'security', 'manager'].includes(result.data.role)) throw new Error('Учётной записи не назначена допустимая роль. Обратитесь к администратору.');
    if (result.data.role === 'manager' && !result.data.departmentId) throw new Error('Для руководителя задайте departmentId.');
    token.value = result.token;
    user.value = { id: result.data.id, fullName: result.data.fullName || result.data.email, role: result.data.role, departmentId: result.data.departmentId };
  saveSession(); await refresh();
}
export async function registerAccount({ fullName, email, password, role = 'admin', departmentId }) {
  if (!fullName?.trim() || !email?.trim() || password.length < 8) throw new Error('Укажите имя, email и пароль не короче 8 символов.');
  if (!['admin', 'security', 'manager'].includes(role)) throw new Error('Выберите роль.');
  if (role === 'manager' && !departmentId) throw new Error('Выберите подразделение руководителя.');
  const result = await request(config.baseUrl, '/register', { method: 'POST', body: { fullName: fullName.trim(), email: email.trim(), password, role, departmentId: role === 'manager' ? Number(departmentId) : null } });
  if (!result?.token || !result.data) throw new Error('Сервис не подтвердил регистрацию.');
  return result;
}
let refreshing;
export async function refresh() {
  if (refreshing) return refreshing;
  busy.value = true; loadError.value = '';
  const version = sourceVersion;
  refreshing = (async () => {
    try {
      const snapshot = await fetchSnapshot(config, token.value);
      if (version !== sourceVersion) return;
      RESOURCE_NAMES.forEach(name => { data[name] = snapshot[name]; }); ready.value = true; lastSync.value = new Date();
    } catch (error) { if (version === sourceVersion) loadError.value = error.message; throw error; }
    finally { if (version === sourceVersion) { busy.value = false; refreshing = null; } }
  })();
  return refreshing;
}
export async function restore() {
  if (!user.value) return;
  if (config.mode === 'mokky') {
    try {
      const remote = await request(config.baseUrl, '/auth_me', { token: token.value });
      if (!['admin', 'security', 'manager'].includes(remote?.role)) throw new Error('Недоступная роль.');
      user.value = { id: remote.id, fullName: remote.fullName || remote.email, role: remote.role, departmentId: remote.departmentId }; saveSession();
    } catch { logout(); notify('Сессия завершена. Выполните вход ещё раз.', 'error'); return; }
  }
  try { await refresh(); } catch { /* The persistent error banner includes recovery steps. */ }
}
export async function saveRecord(resource, record) {
  if (!canEdit.value && !(resource === 'access_events' && canControl.value)) throw new Error('Недостаточно прав.');
  const saved = await mutate(config, token.value, resource, record.id != null ? 'PATCH' : 'POST', record);
  if (!saved || saved.id == null) { await refresh(); return saved; }
  const index = data[resource].findIndex(x => idEqual(x.id, saved.id));
  if (index < 0) data[resource].push(saved); else data[resource][index] = saved;
  return saved;
}
export async function deleteRecord(resource, id) {
  if (!canEdit.value || !['permissions', 'face_templates'].includes(resource)) throw new Error('Удаление недоступно.');
  await mutate(config, token.value, resource, 'DELETE', { id });
  data[resource] = data[resource].filter(x => !idEqual(x.id, id));
}
let passing = false;
export async function registerPassage(input) {
  if (!canControl.value) throw new Error('Недостаточно прав для регистрации прохода.');
  if (passing) throw new Error('Дождитесь завершения предыдущего прохода.');
  passing = true;
  const operationId = input.operationId || crypto.randomUUID();
  const execute = async () => {
    await refresh();
    const existing = data.access_events.find(e => e.operationId === operationId);
    if (existing) return existing;
    const employee = byId('employees', input.employeeId), room = byId('rooms', input.roomId);
    const timestamp = new Date().toISOString();
    const decision = checkPassage({ employee, room, direction: input.direction, permissions: data.permissions, events: data.access_events, timestamp });
    if (decision.result === 'invalid') return { ...decision, employeeId: employee?.id ?? null, roomId: room.id, direction: input.direction, source: input.source };
    return saveRecord('access_events', { ...decision, operationId, employeeId: employee?.id ?? null, roomId: room.id, direction: input.direction, timestamp, source: input.source, similarity: input.similarity ?? null, reviewed: false, operatorId: user.value.id });
  };
  try {
    // Browser locks avoid conflicting local passages in two tabs of the same origin.
    return navigator.locks ? await navigator.locks.request('rubezh-passage', execute) : await execute();
  } finally { passing = false; }
}
