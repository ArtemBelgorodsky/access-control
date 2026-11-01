import { RESOURCE_NAMES } from '../seed.js';
export const DEFAULT_MOKKY_URL = 'https://c748fc988f763776.mokky.dev';
export function validateBaseUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.mokky.dev') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Укажите корректный HTTPS-адрес сервиса данных без пути и параметров.');
  return url.origin;
}
export async function request(baseUrl, path, { method = 'GET', token, body } = {}) {
  let response;
  try {
    response = await fetch(`${validateBaseUrl(baseUrl)}${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000),
    });
  } catch { throw new Error('Сервис данных не ответил. Проверьте подключение к интернету. Запись не подтверждена; перед повтором обновите данные.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (path === '/auth' && [400, 401, 404].includes(response.status)) throw new Error('Неверный email или пароль. При первом запуске создайте администратора.');
    if (['/auth', '/register'].includes(path) && response.status === 403) throw new Error('Авторизация или регистрация отключена. Обратитесь к администратору системы.');
    if (path === '/register' && [400, 409].includes(response.status)) throw new Error('Не удалось зарегистрировать пользователя. Проверьте email; возможно, такая учётная запись уже существует.');
    const message = response.status === 401 || response.status === 403 ? 'Требуется вход в систему или разрешение на эту операцию.' : response.status === 404 ? `Ресурс ${path.split('?')[0]} не найден. Обратитесь к администратору.` : `Сервис данных вернул ошибку ${response.status}. Запись не подтверждена.`;
    throw new Error(message);
  }
  return data;
}
export async function fetchSnapshot(config, token) {
  const results = await Promise.all(RESOURCE_NAMES.map(async name => {
    const data = await request(config.baseUrl, `/${name}`, { token });
    if (!Array.isArray(data)) throw new Error(`/${name}: ожидается массив JSON. Отключите пагинацию по умолчанию для этого ресурса.`);
    return [name, data];
  }));
  return Object.fromEntries(results);
}
export async function mutate(config, token, resource, method, record) {
  if (!RESOURCE_NAMES.includes(resource)) throw new Error('Неизвестный ресурс.');
  const { id, ...fields } = record;
  return request(config.baseUrl, `/${resource}${method === 'POST' ? '' : `/${encodeURIComponent(id)}`}`, { method, token, body: method === 'DELETE' ? undefined : fields });
}
export async function uploadPhoto(config, token, blob) {
  const form = new FormData(); form.append('file', blob, 'face.jpg');
  const result = await request(config.baseUrl, '/uploads', { method: 'POST', token, body: form });
  if (!result?.url) throw new Error('Сервис не вернул ссылку на фото. Проверьте настройку загрузки файлов.');
  return { photoUrl: result.url };
}
