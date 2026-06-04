<template>
  <main class="app-shell">
    <UserCard :user="sampleUser" />
    <CounterPanel title="Vue baseline" :count="count" @increment="increment" />
  </main>
</template>

<script setup lang="ts">
import CounterPanel from './components/CounterPanel.vue';
import UserCard from './components/UserCard';
import { sampleUser } from './data/users';
import { useCounter } from './composables/useCounter';

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
