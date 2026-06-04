<template>
  <main class="app-shell">
    <UserCard :user="sampleUser" />
    <CounterPanel title="Vue baseline" :count="count" @increment="increment" />
  </main>
</template>

<script setup lang="ts">
import CounterPanel from './components/CounterPanel.vue';
import UserCard from './components/UserCard.vue';
import { sampleUser } from './data/users.js';
import { useCounter } from './composables/useCounter.js';

const { count, increment } = useCounter(2);
</script>

<style scoped>
.app-shell {
  display: grid;
  gap: 1rem;
  max-width: 48rem;
  margin: 2rem auto;
  font-family: Inter, system-ui, sans-serif;
}
</style>
