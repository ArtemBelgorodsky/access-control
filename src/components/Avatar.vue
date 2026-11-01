<script setup>
import { onUnmounted, ref, watch } from 'vue';
import { initials } from '../format.js';
import { getPhoto } from '../services/storage.js';
const props = defineProps({ person: Object, size: { type: String, default: '' } });
const src = ref(''); let objectUrl, generation = 0;
watch(() => [props.person?.photoKey, props.person?.photoUrl], async () => {
  const current = ++generation;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  src.value = ''; objectUrl = null;
  if (props.person?.photoUrl) src.value = props.person.photoUrl;
  else if (props.person?.photoKey) {
    const blob = await getPhoto(props.person.photoKey).catch(() => null);
    if (blob && current === generation) { objectUrl = URL.createObjectURL(blob); src.value = objectUrl; }
  }
}, { immediate: true });
onUnmounted(() => { generation++; if (objectUrl) URL.revokeObjectURL(objectUrl); });
</script>
<template><span class="avatar" :class="[size, `tone-${(Number(person?.id) || 0) % 5}`]"><img v-if="src" :src="src" :alt="person?.fullName || 'Фото'" @error="src = ''" /><template v-else>{{ initials(person?.fullName) }}</template></span></template>
