<script>
  import CodeEditor from './CodeEditor.svelte';

  let {
    value = $bindable(''),
    isValid = true,
    strictMode = $bindable(false),
    inputPaths = [],
  } = $props();
</script>

<div class="panel h-full flex flex-col">
  <div class="panel-header flex items-center justify-between flex-shrink-0">
    <span>Expression</span>
    <div class="flex items-center gap-4">
      <!-- Strict mode toggle -->
      <label class="flex items-center gap-2 cursor-pointer">
        <span class="text-xs normal-case text-[var(--color-text-secondary)]">Strict Mode</span>
        <button
          class="toggle"
          class:active={strictMode}
          onclick={() => (strictMode = !strictMode)}
          aria-label="Toggle strict mode"
        ></button>
      </label>

      <!-- Validation status -->
      <div class="status">
        <span class="status-dot" class:valid={isValid} class:invalid={!isValid}></span>
        <span
          class="text-xs normal-case"
          class:text-[var(--color-success)]={isValid}
          class:text-[var(--color-error)]={!isValid}
        >
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>
    </div>
  </div>
  <div class="flex-1 min-h-0">
    <CodeEditor bind:value lang="transformer" {inputPaths} />
  </div>
</div>
