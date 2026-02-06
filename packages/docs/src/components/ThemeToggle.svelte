<script lang="ts">
  import { onMount } from 'svelte';

  let isDark = $state(false);

  onMount(() => {
    // Check initial theme
    isDark = document.documentElement.dataset.theme === 'dark';
  });

  function toggleTheme() {
    isDark = !isDark;
    const newTheme = isDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('starlight-theme', newTheme);
  }
</script>

<button
  class="theme-toggle"
  onclick={toggleTheme}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDark}
    <!-- Sun icon -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  {:else}
    <!-- Moon icon -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .theme-toggle:hover {
    background: #f1f5f9;
    color: #6366f1;
  }

  :global([data-theme='dark']) .theme-toggle {
    color: #94a3b8;
  }

  :global([data-theme='dark']) .theme-toggle:hover {
    background: #1e293b;
    color: #818cf8;
  }
</style>
