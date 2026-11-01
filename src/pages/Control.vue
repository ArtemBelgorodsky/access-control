<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import Icon from '../components/Icon.vue'; import Avatar from '../components/Avatar.vue';
import { data, byId, config, registerPassage, notify, employeeName, roomName } from '../store.js';
import { extractFace, loadImage, matchFace, MODEL_ID } from '../services/recognition.js';
import { dateTime } from '../format.js';
const method = ref('photo'), roomId = ref(data.rooms[0]?.id || ''), direction = ref('entry'), employeeId = ref(''), fileInput = ref(), imageData = ref(null), preview = ref(''), box = ref(null), result = ref(null), error = ref(''), working = ref(false), processing = ref(''), pending = ref(null);
const locked = computed(() => working.value || !!pending.value);
const boxStyle = computed(() => box.value && imageData.value ? { left: `${box.value[0] / imageData.value.canvas.width * 100}%`, top: `${box.value[1] / imageData.value.canvas.height * 100}%`, width: `${box.value[2] / imageData.value.canvas.width * 100}%`, height: `${box.value[3] / imageData.value.canvas.height * 100}%` } : {});
const templatesCount = computed(() => data.face_templates.filter(t => t.modelId === MODEL_ID).length);
watch([method, roomId, direction, employeeId], () => { if (!pending.value) { result.value = null; error.value = ''; box.value = null; } });
function chooseMethod(value) { if (!locked.value) method.value = value; }
async function selectFile(event) {
  if (locked.value) return;
  const file = event.target.files?.[0]; if (!file) return;
  error.value = ''; result.value = null; box.value = null;
  try {
    const image = await loadImage(file);
    if (preview.value) URL.revokeObjectURL(preview.value);
    imageData.value = image; preview.value = URL.createObjectURL(image.blob);
  } catch (e) { error.value = e.message; imageData.value = null; }
  finally { event.target.value = ''; }
}
async function run() {
  working.value = true; error.value = ''; result.value = null;
  try {
    if (!pending.value) {
      if (!roomId.value) throw new Error('Сначала добавьте и выберите помещение.');
      let matchedId = employeeId.value || null, similarity = null;
      if (method.value === 'photo') {
        if (!imageData.value) throw new Error('Загрузите фотографию для проверки.');
        if (!templatesCount.value) throw new Error('Сначала добавьте фотографии в карточку сотрудника. Зарегистрированных лиц пока нет.');
        const face = await extractFace(imageData.value.canvas, text => { processing.value = text; }); box.value = face.box;
        processing.value = 'Сравниваем лицо с фотографиями сотрудников…';
        const match = await matchFace(face.embedding, data.face_templates, config.threshold);
        matchedId = match.employeeId; similarity = match.similarity;
        if (match.ambiguous) throw new Error('Результат неоднозначен: похожи несколько сотрудников. Загрузите другой снимок. Проход не зарегистрирован.');
      } else if (!matchedId && employeeId.value !== 'unknown') throw new Error('Выберите сотрудника для ручной имитации.');
      pending.value = { employeeId: matchedId, roomId: roomId.value, direction: direction.value, source: method.value === 'photo' ? 'photo' : 'manual', similarity, operationId: crypto.randomUUID() };
    }
    processing.value = 'Проверяем допуск и сохраняем событие…';
    const event = await registerPassage(pending.value);
    result.value = event; pending.value = null;
    if (event.result === 'allowed') notify('Проход зарегистрирован. Занятость обновлена.');
  } catch (e) { error.value = e.message; }
  finally { working.value = false; processing.value = ''; }
}
function clear() { if (working.value) return; if (pending.value && !confirm('Сохранение предыдущего события не подтверждено. Сначала рекомендуется повторить проверку. Начать новую проверку?')) return; pending.value = null; result.value = null; error.value = ''; box.value = null; imageData.value = null; if (preview.value) URL.revokeObjectURL(preview.value); preview.value = ''; }
onUnmounted(() => { if (preview.value) URL.revokeObjectURL(preview.value); });
</script>
<template><div class="page-header"><div><span class="eyebrow">ИМИТАЦИЯ ПРОХОДНОЙ</span><h1>Точка контроля<span class="heading-dot">.</span></h1><p>Проверьте сотрудника и зарегистрируйте вход или выход.</p></div></div><div class="control-layout"><section class="panel control-main"><header class="panel-header"><div><h2>Проверка прохода</h2><p>Выберите способ идентификации</p></div><span class="step-number">01</span></header><div class="control-body"><div class="segmented"><button :disabled="locked" :class="{ active: method === 'photo' }" @click="chooseMethod('photo')"><Icon name="scan" :size="17" />По фотографии</button><button :disabled="locked" :class="{ active: method === 'manual' }" @click="chooseMethod('manual')"><Icon name="user" :size="17" />Ручная имитация</button></div><div class="control-fields"><label>Помещение<select v-model="roomId" :disabled="locked"><option value="" disabled>Выберите помещение</option><option v-for="room in data.rooms" :key="room.id" :value="room.id">{{ room.name }} · {{ room.number }}</option></select></label><label>Направление<select v-model="direction" :disabled="locked"><option value="entry">Вход в помещение</option><option value="exit">Выход из помещения</option></select></label></div><template v-if="method === 'photo'"><input ref="fileInput" type="file" class="sr-only" accept="image/jpeg,image/png,image/webp" @change="selectFile" /><button v-if="!preview" class="photo-dropzone" :disabled="locked" @click="fileInput.click()"><span class="scan-corners"><Icon name="scan" :size="52" /></span><strong>Загрузите фотографию сотрудника</strong><span>Другой ракурс, другое фото — тот же человек</span><span class="button small"><Icon name="upload" :size="16" />Выбрать фотографию</span><small>JPG, PNG, WebP · до 12 МБ · одно лицо</small></button><div v-else class="photo-stage"><div class="photo-image"><img :src="preview" alt="Фотография для проверки прохода" /><div v-if="box" class="face-box" :style="boxStyle"><span>{{ result?.employeeId ? employeeName(result.employeeId) : 'Лицо обнаружено' }}</span></div></div><button class="button small change-photo" :disabled="locked" @click="fileInput.click()"><Icon name="image" :size="15" />Другое фото</button><span class="photo-caption">Загруженный кадр · обработка в браузере</span></div></template><div v-else class="manual-entry"><span class="manual-symbol"><Icon name="user" :size="36" /></span><h3>Проверка правил доступа</h3><p>Выберите сотрудника вручную.<br />Распознавание лица в этом режиме не выполняется.</p><label>Сотрудник<select v-model="employeeId" :disabled="locked"><option value="" disabled>Выберите сотрудника</option><option v-for="person in data.employees" :key="person.id" :value="person.id">{{ person.fullName }} · {{ person.personnelNumber }}</option><option value="unknown">Неизвестный человек</option></select></label></div><p v-if="processing" class="processing-status" role="status"><Icon name="loader" class="spin" :size="17" />{{ processing }}</p><div v-if="error" class="alert-box" role="alert">{{ error }}</div><div class="control-actions"><button class="button" :disabled="working" @click="clear">Сбросить</button><button class="button primary" :disabled="working || !roomId" @click="run"><Icon :name="working ? 'loader' : 'shield'" :size="18" :class="{ spin: working }" />{{ working ? 'Проверяем…' : pending ? 'Проверить сохранение' : 'Проверить проход' }}</button></div></div></section><div class="control-side"><section class="panel result-panel"><header class="panel-header"><div><h2>Результат проверки</h2><p>Идентификация и решение о доступе</p></div><span class="step-number">02</span></header><div v-if="!result" class="result-placeholder"><span class="result-placeholder-icon"><Icon :name="working ? 'loader' : 'shield'" :size="37" :class="{ spin: working }" /></span><h3>{{ working ? 'Проверяем сотрудника' : 'Ожидание проверки' }}</h3><p>{{ working ? 'Результат появится после сохранения события.' : 'Загрузите фото или выберите сотрудника и нажмите «Проверить проход».' }}</p></div><div v-else class="result-content"><div class="result-banner" :class="result.result"><Icon :name="result.result === 'allowed' ? 'success' : result.result === 'invalid' ? 'warning' : 'error'" :size="34" /><h3>{{ result.result === 'allowed' ? 'Доступ разрешён' : result.result === 'invalid' ? 'Проход не зарегистрирован' : 'Доступ запрещён' }}</h3><p>{{ result.reason }}</p></div><div class="result-person"><Avatar :person="byId('employees', result.employeeId)" size="lg" /><h3>{{ employeeName(result.employeeId) }}</h3><p>{{ byId('departments', byId('employees', result.employeeId)?.departmentId)?.name || 'Личность не установлена' }}</p></div><dl class="details compact"><dt>Помещение</dt><dd>{{ roomName(result.roomId || roomId) }}</dd><dt>Направление</dt><dd>{{ direction === 'entry' ? 'Вход' : 'Выход' }}</dd><template v-if="result.timestamp"><dt>Время</dt><dd>{{ dateTime(result.timestamp) }}</dd></template><template v-if="result.similarity != null"><dt>Сходство</dt><dd>{{ result.similarity.toFixed(3) }}</dd></template></dl><p v-if="result.id" class="saved-confirmation"><Icon name="check" :size="15" />Событие №{{ result.id }} сохранено</p></div></section><section class="control-hint"><span class="hint-icon"><Icon name="help" :size="20" /></span><div><h3>Как это работает</h3><p>Распознавание устанавливает личность. Правила доступа проверяют помещение и время. Успешная проверка имитирует проход и обновляет занятость.</p><p v-if="method === 'photo'" class="muted">Зарегистрировано фотографий: {{ templatesCount }}. Оценка сходства не является вероятностью.</p></div></section></div></div></template>
