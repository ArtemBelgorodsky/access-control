import { rankMatches } from '../domain.js';
export const MODEL_ID = 'human-3.3.6-faceres';
let humanPromise;
export async function getHuman(onStatus = () => {}) {
  if (!humanPromise) humanPromise = (async () => {
    onStatus('Загружаем модели распознавания…');
    const { Human } = await import('@vladmandic/human');
    const human = new Human({
      modelBasePath: '/models/', backend: 'webgl', cacheModels: true,
      filter: { enabled: true, equalization: true },
      face: {
        enabled: true,
        detector: { enabled: true, maxDetected: 3, minConfidence: 0.6, rotation: true },
        mesh: { enabled: true }, description: { enabled: true },
        iris: { enabled: false }, emotion: { enabled: false }, antispoof: { enabled: false }, liveness: { enabled: false },
      },
      body: { enabled: false }, hand: { enabled: false }, object: { enabled: false }, gesture: { enabled: false },
    });
    try { await human.load(); await human.warmup(); }
    catch (error) { throw new Error(`Не удалось запустить распознавание. Проверьте поддержку WebGL в браузере и наличие файлов моделей. ${error.message || ''}`); }
    return human;
  })().catch(error => { humanPromise = null; throw error; });
  return humanPromise;
}
export async function loadImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Выберите фотографию JPG, PNG или WebP.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Фотография слишком большая. Максимум — 12 МБ.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    if (image.width * image.height > 50000000) throw new Error('Разрешение фотографии слишком большое. Уменьшите изображение.');
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('Не удалось прочитать изображение.');
    return { canvas, blob };
  } catch (error) { throw new Error(error.message || 'Не удалось открыть фотографию.'); }
  finally { URL.revokeObjectURL(url); }
}
export async function extractFace(canvas, onStatus) {
  const human = await getHuman(onStatus);
  onStatus?.('Находим лицо и вычисляем признаки…');
  const result = await human.detect(canvas);
  if (!result.face?.length) throw new Error('Лицо не найдено. Выберите более чёткое фото с видимым лицом.');
  if (result.face.length !== 1) throw new Error('На фото несколько лиц. Загрузите фотографию одного человека.');
  const face = result.face[0];
  if (Math.min(face.box[2], face.box[3]) < 70) throw new Error('Лицо слишком маленькое. Используйте более крупный план.');
  if (!face.embedding?.length || face.embedding.some(x => !Number.isFinite(x))) throw new Error('Не удалось вычислить признаки лица. Попробуйте другое фото.');
  return { embedding: Array.from(face.embedding), box: face.box, modelId: MODEL_ID };
}
export async function matchFace(embedding, templates, threshold, onStatus) {
  const human = await getHuman(onStatus);
  const candidates = templates.filter(t => t.modelId === MODEL_ID && Array.isArray(t.embedding) && t.embedding.length === embedding.length).map(t => ({ employeeId: t.employeeId, similarity: human.match.similarity(embedding, t.embedding) }));
  return rankMatches(candidates, threshold);
}
