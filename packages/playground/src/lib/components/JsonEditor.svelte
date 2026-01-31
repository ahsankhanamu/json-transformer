<script>
  import CodeEditor from './CodeEditor.svelte';

  let { value = $bindable(''), isValid = true, label = 'JSON' } = $props();

  function prettyPrint() {
    try {
      const parsed = JSON.parse(value);
      value = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Invalid JSON, can't prettify
    }
  }
</script>

<div class="panel h-full flex flex-col">
  <div class="panel-header flex items-center justify-between">
    <span>{label}</span>
    <div class="flex items-center gap-2">
      {#if !isValid}
        <span class="text-[var(--color-error)] text-xs normal-case">Invalid JSON</span>
      {/if}
      <button
        onclick={prettyPrint}
        disabled={!isValid}
        class="text-xs px-2 py-1 rounded transition-colors normal-case
          {isValid
            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50'}"
        title="Format JSON"
      >
        Prettify
      </button>
    </div>
  </div>
  <div class="flex-1 min-h-0">
    <CodeEditor bind:value lang="json" />
  </div>
</div>
