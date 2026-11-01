<script setup>
import { ref } from 'vue';
import { config, setConfig, notify } from '../store.js';

const threshold = ref(config.threshold);
const error = ref('');

function save() {
  error.value = '';
  try {
    setConfig({ threshold: threshold.value });
    notify('Порог сходства сохранён.');
  } catch (e) { error.value = e.message; }
}
</script>

<template>
  <div class="page-header">
    <div>
      <span class="eyebrow">НАСТРОЙКИ ПРИЛОЖЕНИЯ</span>
      <h1>Настройки<span class="heading-dot">.</span></h1>
      <p>Параметры распознавания лиц.</p>
    </div>
  </div>
  <section class="panel settings-panel" style="max-width: 640px">
    <header class="panel-header"><h2>Порог сходства лиц</h2></header>
    <form class="settings-form" @submit.prevent="save">
      <label>
        Минимальное сходство <span class="value-label">{{ Number(threshold).toFixed(2) }}</span>
        <input v-model.number="threshold" type="range" min="0.4" max="0.9" step="0.01" />
        <small class="muted">Более высокий порог уменьшает число случайных совпадений, но может увеличить число отказов. Настройте его на отдельных проверочных фотографиях.</small>
      </label>
      <div v-if="error" class="alert-box" role="alert">{{ error }}</div>
      <div class="form-actions"><button class="button primary" type="submit">Сохранить настройки</button></div>
    </form>
  </section>
</template>
