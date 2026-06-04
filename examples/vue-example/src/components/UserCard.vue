<template>
  <article class="user-card">
    <h2>{{ user.name }}</h2>
    <p>{{ user.role }}</p>
  </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { UserProfile } from '../types';

export default defineComponent({
  name: 'UserCard',
  props: {
    user: {
      type: Object as PropType<UserProfile>,
      required: true,
    },
  },
});
</script>

<style scoped>
.user-card {
  border: 1px solid #35495e;
  padding: 1rem;
}
</style>
