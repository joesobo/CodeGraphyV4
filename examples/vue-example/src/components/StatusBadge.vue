<template>
  <span class="status-badge">{{ label }}</span>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.status-badge {
  color: #35495e;
  font-weight: 700;
}
</style>
