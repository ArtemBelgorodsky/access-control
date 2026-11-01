<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import Icon from './Icon.vue';
defineProps({ title: String, wide: Boolean });
const emit = defineEmits(['close']); const panel = ref(); let previous;
function keys(event) {
  const open = document.querySelectorAll('.modal');
  if (open[open.length - 1] !== panel.value) return;
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); }
  if (event.key !== 'Tab') return;
  const items = [...panel.value.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.offsetParent !== null);
  if (!items.length) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
  if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
}
onMounted(async () => { previous = document.activeElement; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', keys); await nextTick(); panel.value.querySelector('input, select, button')?.focus(); });
onUnmounted(() => { document.body.style.overflow = document.querySelectorAll('.modal').length ? 'hidden' : ''; document.removeEventListener('keydown', keys); previous?.focus?.(); });
</script>
<template><Teleport to="body"><div class="modal-backdrop" @mousedown.self="emit('close')"><section ref="panel" class="modal" :class="{ wide }" role="dialog" aria-modal="true" :aria-label="title"><header class="modal-header"><div><span class="eyebrow">РУБЕЖ / УПРАВЛЕНИЕ ДОСТУПОМ</span><h2>{{ title }}</h2></div><button class="icon-button" title="Закрыть" aria-label="Закрыть" @click="emit('close')"><Icon name="close" /></button></header><div class="modal-body"><slot /></div><footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer></section></div></Teleport></template>
