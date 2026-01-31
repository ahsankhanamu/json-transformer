<script>
  import { getCategories, filterFunctions } from '$lib/language/transformerLanguage.js';

  const { onInsert = () => {} } = $props();

  let search = $state('');
  let selectedCategory = $state('All');

  const categories = getCategories();

  const filteredFunctions = $derived(filterFunctions(selectedCategory, search));
</script>

<div
  class="h-full flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]"
>
  <!-- Search + Category dropdown -->
  <div class="p-2 border-b border-[var(--color-border)] space-y-1.5 bg-[var(--color-bg)]">
    <input
      bind:value={search}
      placeholder="Search functions..."
      class="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
    />
    <select
      bind:value={selectedCategory}
      class="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] cursor-pointer"
    >
      {#each categories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
  </div>

  <!-- Functions list -->
  <div class="flex-1 overflow-auto p-1.5">
    {#each filteredFunctions as fn}
      <button
        onclick={() => onInsert(fn)}
        class="w-full text-left p-2 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors mb-0.5 group"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-mono text-[var(--color-accent)]">{fn.name}</span>
          <span class="text-xs text-[var(--color-text-muted)]">{fn.desc}</span>
        </div>
        <div
          class="text-xs text-[var(--color-text-muted)] font-mono mt-0.5 opacity-60 group-hover:opacity-100"
        >
          {fn.syntax}
        </div>
      </button>
    {/each}

    {#if filteredFunctions.length === 0}
      <div class="text-center text-[var(--color-text-muted)] text-sm py-8">No functions found</div>
    {/if}
  </div>

  <!-- Syntax hints -->
  <div
    class="p-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)]"
  >
    <div class="font-semibold mb-1 text-[var(--color-text-secondary)]">Array Access</div>
    <div class="font-mono space-y-0.5">
      <div>
        <span class="text-[var(--color-accent)]">[0]</span> first,
        <span class="text-[var(--color-accent)]">[-1]</span> last
      </div>
      <div>
        <span class="text-[var(--color-accent)]">[*]</span> spread,
        <span class="text-[var(--color-accent)]">[? x]</span> filter
      </div>
    </div>
  </div>
</div>
