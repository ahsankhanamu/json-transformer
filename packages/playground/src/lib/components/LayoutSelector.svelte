<script>
  import { onMount } from 'svelte';
  import {
    currentLayout,
    layoutDirection,
    getAvailableLayouts,
  } from '$lib/stores/settingsStore.js';

  let isOpen = $state(false);
  let dropdownRef = $state(null);

  const layoutsAvailable = getAvailableLayouts();

  function toggleDropdown(e) {
    e.stopPropagation();
    isOpen = !isOpen;
  }

  function toggleDirection() {
    layoutDirection.toggle();
  }

  function selectLayout(layoutId) {
    currentLayout.set(layoutId);
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

  // Layout preview SVGs
  const layoutPreviews = {
    standard: `<rect x="2" y="2" width="10" height="12" rx="1" fill="currentColor" opacity="0.4"/>
               <rect x="14" y="2" width="10" height="12" rx="1" fill="currentColor" opacity="0.3"/>
               <rect x="2" y="16" width="22" height="6" rx="1" fill="currentColor" opacity="0.5"/>`,
    stacked: `<rect x="2" y="2" width="22" height="6" rx="1" fill="currentColor" opacity="0.4"/>
              <rect x="2" y="10" width="22" height="6" rx="1" fill="currentColor" opacity="0.3"/>
              <rect x="2" y="18" width="22" height="4" rx="1" fill="currentColor" opacity="0.5"/>`,
    sidepanel: `<rect x="2" y="2" width="10" height="8" rx="1" fill="currentColor" opacity="0.4"/>
                <rect x="2" y="12" width="10" height="10" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="14" y="2" width="10" height="20" rx="1" fill="currentColor" opacity="0.3"/>`,
    focus: `<rect x="2" y="2" width="10" height="10" rx="1" fill="currentColor" opacity="0.5"/>
            <rect x="2" y="14" width="10" height="8" rx="1" fill="currentColor" opacity="0.4"/>
            <rect x="14" y="2" width="10" height="20" rx="1" fill="currentColor" opacity="0.3"/>`,
  };

  // Direction icons
  const directionIcons = {
    ltr: `<rect x="3" y="6" width="8" height="12" rx="1" fill="currentColor" opacity="0.5"/>
          <rect x="13" y="6" width="8" height="12" rx="1" fill="currentColor" opacity="0.3"/>
          <path d="M6 12h12M15 9l3 3-3 3" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.8"/>`,
    rtl: `<rect x="3" y="6" width="8" height="12" rx="1" fill="currentColor" opacity="0.3"/>
          <rect x="13" y="6" width="8" height="12" rx="1" fill="currentColor" opacity="0.5"/>
          <path d="M18 12H6M9 9l-3 3 3 3" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  };
</script>

<div class="relative flex items-center" bind:this={dropdownRef}>
  <!-- Split button container -->
  <div class="flex items-center rounded-lg overflow-hidden border border-[var(--color-border)]">
    <!-- LTR/RTL Toggle Button -->
    <button
      onclick={toggleDirection}
      class="flex items-center gap-1.5 px-2 py-1.5 transition-colors bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
      title="Toggle direction ({$layoutDirection === 'ltr' ? 'Left to Right' : 'Right to Left'})"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {@html directionIcons[$layoutDirection]}
      </svg>
      <span class="text-xs font-medium uppercase">{$layoutDirection}</span>
    </button>

    <!-- Divider -->
    <div class="w-px h-5 bg-[var(--color-border)]"></div>

    <!-- Dropdown trigger for layouts -->
    <button
      onclick={toggleDropdown}
      class="flex items-center px-1.5 py-1.5 transition-colors bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
      title="Select layout"
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
      class="absolute right-0 top-full mt-1 w-56 rounded-lg shadow-xl z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
    >
      <div class="p-2">
        <div
          class="text-[9px] font-medium text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wide"
        >
          Layout
        </div>
        <div class="flex flex-col gap-1">
          {#each layoutsAvailable as layout}
            <button
              onclick={() => selectLayout(layout.id)}
              class="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors {$currentLayout ===
              layout.id
                ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30'
                : 'hover:bg-[var(--color-bg-tertiary)] border border-transparent'}"
            >
              <svg viewBox="0 0 26 24" class="w-8 h-6 text-[var(--color-text-secondary)] shrink-0">
                {@html layoutPreviews[layout.id]}
              </svg>
              <div class="flex-1 text-left">
                <div class="text-xs font-medium text-[var(--color-text)]">{layout.name}</div>
                <div class="text-[10px] text-[var(--color-text-muted)]">{layout.description}</div>
              </div>
              {#if $currentLayout === layout.id}
                <svg
                  class="w-4 h-4 text-[var(--color-accent)] shrink-0"
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

      <!-- Direction hint -->
      <div class="px-2 py-1.5 border-t border-[var(--color-border)]">
        <div class="text-[9px] text-[var(--color-text-muted)]">
          Click LTR/RTL to flip panel positions
        </div>
      </div>
    </div>
  {/if}
</div>
