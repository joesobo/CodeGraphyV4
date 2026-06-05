<script lang="ts">
  import type { UserProfile } from '../types';

  export let user: UserProfile;
</script>

<article>
  <h1>{user.name}</h1>
  <p>{user.role}</p>
</article>
