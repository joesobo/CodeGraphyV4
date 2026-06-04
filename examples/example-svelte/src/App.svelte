<script context="module" lang="ts">
  import { loadFeature } from './loadFeature';
</script>

<script lang="ts">
  import UserCard from './components/UserCard.svelte';
  import type { UserProfile } from './types';

  const sampleUser: UserProfile = {
    name: 'Ada',
    role: 'Graph explorer',
  };
  const LazyPanel = () => import('./components/LazyPanel.svelte');
  const feature = loadFeature();
</script>

<main>
  <UserCard user={sampleUser} />
  {#await LazyPanel() then module}
    <svelte:component this={module.default} label={feature.label} />
  {/await}
</main>
