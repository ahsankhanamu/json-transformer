<script>
  import { onMount } from 'svelte';
  import { currentTheme, getAvailableThemes } from '$lib/stores/settingsStore.js';

  let isOpen = $state(false);
  let dropdownRef = $state(null);

  const themesAvailable = getAvailableThemes();

  function toggleDropdown(e) {
    e.stopPropagation();
    isOpen = !isOpen;
  }

  function toggleLightDark() {
    // Toggle between light and dark only
    if ($currentTheme === 'light') {
      currentTheme.set('dark');
    } else if ($currentTheme === 'dark') {
      currentTheme.set('light');
    } else {
      // If on a custom theme, go to light
      currentTheme.set('light');
    }
  }

  function selectTheme(themeId) {
    currentTheme.set(themeId);
    isOpen = false;
  }

  function handleClickOutside(e) {
    if (dropdownRef && !dropdownRef.contains(e.target)) {
      isOpen = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  // Theme icons
  const themeIcons = {
    light: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
    dark: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
    midnight: `<circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0 0 14 7 7 0 0 0 0-14z" fill="currentColor" opacity="0.3"/>`,
  };

  // Theme preview colors - matching adeo-data-mapper
  const themeColors = {
    light: '#f5f6fa',
    dark: '#1c1c24',
    midnight: '#0a1628',
  };

  $effect(() => {
    // This will be reactive to currentTheme
    $currentTheme;
  });
</script>

<div class="relative flex items-center" bind:this={dropdownRef}>
  <!-- Split button container - matching adeo-data-mapper ThemeSelector -->
  <div class="flex items-center rounded-lg overflow-hidden border border-[var(--color-border)]">
    <!-- Light/Dark Toggle Button -->
    <button
      onclick={toggleLightDark}
      class="flex items-center gap-1.5 px-2 py-1.5 transition-colors bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
      title="Toggle light/dark mode"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {@html themeIcons[$currentTheme] || themeIcons.dark}
      </svg>
      <span class="text-xs font-medium"
        >{themesAvailable.find((t) => t.id === $currentTheme)?.name || 'Theme'}</span
      >
    </button>

    <!-- Divider -->
    <div class="w-px h-5 bg-[var(--color-border)]"></div>

    <!-- Dropdown trigger for more options -->
    <button
      onclick={toggleDropdown}
      class="flex items-center px-1.5 py-1.5 transition-colors bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
      title="More options"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="transition-transform {isOpen ? 'rotate-180' : ''}"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  </div>

  <!-- Dropdown menu -->
  {#if isOpen}
    <div
      class="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-xl z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
    >
      <!-- Theme Section -->
      <div class="p-2">
        <div
          class="text-[9px] font-medium text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wide"
        >
          Theme
        </div>
        <div class="flex flex-col gap-0.5">
          {#each themesAvailable as theme}
            <button
              onclick={() => selectTheme(theme.id)}
              class="flex items-center gap-2 px-2 py-1.5 rounded transition-colors {$currentTheme ===
              theme.id
                ? 'bg-[var(--color-accent)]/10'
                : 'hover:bg-[var(--color-bg-tertiary)]'}"
            >
              <div
                class="w-4 h-4 rounded border border-[var(--color-border)] flex items-center justify-center"
                style="background-color: {themeColors[theme.id]}"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.id === 'light' ? '#1f2937' : '#f0f0f5'}
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  {@html themeIcons[theme.id]}
                </svg>
              </div>
              <span class="text-xs text-[var(--color-text)]">{theme.name}</span>
              {#if $currentTheme === theme.id}
                <svg
                  class="w-3 h-3 ml-auto text-[var(--color-accent)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Quick toggle hint -->
      <div class="px-2 py-1.5 border-t border-[var(--color-border)]">
        <div class="text-[9px] text-[var(--color-text-muted)]">Click icon to toggle light/dark</div>
      </div>
    </div>
  {/if}
</div>
