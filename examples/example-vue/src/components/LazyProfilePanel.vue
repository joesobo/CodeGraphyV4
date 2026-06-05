<template>
  <aside class="lazy-profile-panel">
    <h2>Lazy profile</h2>
    <p>{{ sampleUser.name }} loads through an async component edge.</p>
  </aside>
</template>

<script setup lang="ts">
import { sampleUser } from '../data/users';
</script>

<style scoped>
.lazy-profile-panel {
  border: 1px dashed #42b883;
  padding: 1rem;
}
</style>
