import { RESOURCE_NAMES, makeSeed } from '../seed.js';
const DB_NAME = 'rubezh-access-control-v1';
let dbPromise;
export function openDatabase() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('data'); request.result.createObjectStore('photos'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Браузер не разрешил локальное хранение. Проверьте настройки приватности.'));
  });
  return dbPromise;
}
async function transaction(store, mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result;
    const request = callback(tx.objectStore(store));
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('Не удалось сохранить данные.'));
    tx.onabort = () => reject(tx.error || new Error('Сохранение отменено.'));
  });
}
export const readLocal = async () => {
  let data = await transaction('data', 'readonly', store => store.get('snapshot'));
  if (!data) { data = makeSeed(); await writeLocal(data); }
  return Object.fromEntries(RESOURCE_NAMES.map(name => [name, data[name] || []]));
};
export const writeLocal = data => transaction('data', 'readwrite', store => store.put(JSON.parse(JSON.stringify(data)), 'snapshot'));
export const putPhoto = (id, blob) => transaction('photos', 'readwrite', store => store.put(blob, id));
export const getPhoto = id => transaction('photos', 'readonly', store => store.get(id));
export const removePhoto = id => transaction('photos', 'readwrite', store => store.delete(id));

// A snapshot update is performed within one IndexedDB transaction, including across tabs.
export async function mutateLocal(resource, method, record) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readwrite'), store = tx.objectStore('data');
    let result;
    const request = store.get('snapshot');
    request.onsuccess = () => {
      try {
        const data = request.result || makeSeed(), items = data[resource];
        if (!items) throw new Error('Неизвестный ресурс.');
        if (method === 'POST') {
          if (record.operationId && items.some(x => x.operationId === record.operationId)) { result = items.find(x => x.operationId === record.operationId); return; }
          result = { ...record, id: Math.max(0, ...items.map(x => Number(x.id) || 0)) + 1 };
          items.push(result);
        } else if (method === 'PATCH') {
          const index = items.findIndex(x => String(x.id) === String(record.id));
          if (index < 0) throw new Error('Запись не найдена.');
          result = { ...items[index], ...record };
          items[index] = result;
        } else if (method === 'DELETE') {
          data[resource] = items.filter(x => String(x.id) !== String(record.id));
          result = record;
        }
        store.put(data, 'snapshot');
      } catch (error) { reject(error); tx.abort(); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('Не удалось сохранить запись.'));
    tx.onabort = () => reject(tx.error || new Error('Сохранение отменено.'));
  });
}
