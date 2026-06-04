<template>
  <section class="counter-panel">
    <StatusBadge :label="summary" />
    <h1>{{ title }}</h1>
    <button type="button" @click="$emit('increment')">
      Count is {{ count }}
    </button>
  </section>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue';
import { formatCount } from '../composables/useCounter.js';
import type { CounterPanelProps } from '../types.js';

defineEmits<{
  increment: [];
}>();

const props = defineProps<CounterPanelProps>();
const summary = formatCount(props.count);
</script>

<style scoped>
.counter-panel {
  border: 1px solid #42b883;
  padding: 1rem;
}
</style>
