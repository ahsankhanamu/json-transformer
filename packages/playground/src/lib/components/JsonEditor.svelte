<script>
  import CodeEditor from './CodeEditor.svelte';
  import { loadSample } from '../stores/fileStore.js';

  let { value = $bindable(''), isValid = true, label = 'JSON' } = $props();
  const isEmpty = $derived(!value.trim());

  let editorRef = $state(null);
  let isCollapsed = $state(false);
  let isCompact = $state(false);
</script>

<div class="panel h-full flex flex-col">
  <div class="panel-header flex items-center justify-between">
    <span>{label}</span>
    <div class="flex items-center gap-1">
      {#if isEmpty}
        <button class="load-sample" onclick={loadSample}>Load sample</button>
        <div class="w-px h-4 bg-[var(--color-border)] mx-1"></div>
      {:else if !isValid}
        <span class="text-[var(--color-error)] text-xs normal-case mr-2">Invalid JSON</span>
      {/if}
      <!-- Expand/Collapse toggle group -->
      <div class="toggle-group" class:disabled={!isValid}>
        <button
          onclick={() => {
            editorRef?.expandAllFolds();
            isCollapsed = false;
          }}
          disabled={!isValid}
          class="toggle-btn"
          class:active={!isCollapsed}
          title="Expand All"
        >
          <!-- Expand all: two arrows pointing away from center line -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="m 10.5,9 0,-2 -2.5,0 L 12,2 l 4,5 -2.5,0 0,2 -3,0 z" />
            <path d="m 5,12 14,0" stroke="currentColor" stroke-width="2" fill="none" />
            <path d="m 10.5,15 0,2 -2.5,0 L 12,22 l 4,-5 -2.5,0 0,-2 -3,0 z" />
          </svg>
        </button>
        <button
          onclick={() => {
            editorRef?.collapseAllFolds();
            isCollapsed = true;
          }}
          disabled={!isValid}
          class="toggle-btn"
          class:active={isCollapsed}
          title="Collapse All"
        >
          <!-- Collapse all: two arrows pointing toward center line -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="m 10.5,2 0,2 -2.5,0 L 12,9 l 4,-5 -2.5,0 0,-2 -3,0 z" />
            <path d="m 5,12 14,0" stroke="currentColor" stroke-width="2" fill="none" />
            <path d="m 10.5,22 0,-2 -2.5,0 L 12,15 l 4,5 -2.5,0 0,2 -3,0 z" />
          </svg>
        </button>
      </div>
      <div class="w-px h-4 bg-[var(--color-border)] mx-1"></div>
      <!-- Format/Compact toggle group -->
      <div class="toggle-group" class:disabled={!isValid}>
        <button
          onclick={() => {
            try {
              value = JSON.stringify(JSON.parse(value), null, 2);
              isCompact = false;
            } catch {
              /* invalid JSON */
            }
          }}
          disabled={!isValid}
          class="toggle-btn"
          class:active={!isCompact}
          title="Format JSON"
        >
          <!-- Format: lines with indentation -->
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="1" width="12" height="2" />
            <rect x="4" y="5" width="10" height="2" />
            <rect x="4" y="9" width="9" height="2" />
            <rect x="0" y="13" width="10" height="2" />
          </svg>
        </button>
        <button
          onclick={() => {
            try {
              value = JSON.stringify(JSON.parse(value));
              isCompact = true;
            } catch {
              /* invalid JSON */
            }
          }}
          disabled={!isValid}
          class="toggle-btn"
          class:active={isCompact}
          title="Compact JSON"
        >
          <!-- Compact: aligned lines -->
          <svg width="16" height="16" viewBox="0 0 16 12" fill="currentColor">
            <rect x="0" y="0" width="14" height="2" />
            <rect x="0" y="4" width="14" height="2" />
            <rect x="0" y="8" width="9" height="2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
  <div class="flex-1 min-h-0">
    <CodeEditor bind:this={editorRef} bind:value lang="json" />
  </div>
</div>

<style>
  .load-sample {
    background: none;
    border: none;
    color: var(--color-accent);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.15s ease;
  }

  .load-sample:hover {
    background: var(--color-bg-tertiary);
  }

  .toggle-group {
    display: flex;
    padding: 3px;
    gap: 2px;
    border-radius: 8px;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
  }

  .toggle-group.disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    border-radius: 5px;
    transition: all 0.2s ease;
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
  }

  .toggle-btn:hover:not(.active) {
    color: var(--color-text-secondary);
    background: rgba(128, 128, 128, 0.15);
  }

  .toggle-btn:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  .toggle-btn:active:not(.active) {
    transform: scale(0.95);
  }

  .toggle-btn.active {
    background: var(--color-bg);
    color: var(--color-accent);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.08);
  }
</style>
