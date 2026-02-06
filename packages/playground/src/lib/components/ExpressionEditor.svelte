<script>
  import * as prettier from 'prettier/standalone';
  import * as prettierBabel from 'prettier/plugins/babel';
  import * as prettierEstree from 'prettier/plugins/estree';
  import CodeEditor from './CodeEditor.svelte';

  let { value = $bindable(''), isValid = true, strictMode = $bindable(false) } = $props();

  let editorRef = $state(null);
  let isCollapsed = $state(false);

  function expandAll() {
    editorRef?.expandAllFolds();
    isCollapsed = false;
  }

  function collapseAll() {
    editorRef?.collapseAllFolds();
    isCollapsed = true;
  }

  async function prettify() {
    try {
      // Wrap in assignment to make it valid JS for prettier (won't be simplified away)
      const marker = '__EXPR__';
      const wrapped = `const ${marker} = ${value}`;
      const formatted = await prettier.format(wrapped, {
        parser: 'babel',
        plugins: [prettierBabel, prettierEstree],
        semi: false,
        singleQuote: true,
        tabWidth: 2,
        printWidth: 80,
      });
      // Extract expression after the assignment
      const prefix = `const ${marker} = `;
      let result = formatted.trim();
      if (result.startsWith(prefix)) {
        result = result.slice(prefix.length).trim();
      }
      value = result;
    } catch {
      // If formatting fails, leave as-is
    }
  }
</script>

<div class="panel h-full flex flex-col">
  <div class="panel-header flex items-center justify-between flex-shrink-0">
    <span>Expression</span>
    <div class="flex items-center gap-3">
      <!-- Fold/Format controls -->
      <div class="flex items-center gap-1">
        <div class="toggle-group">
          <button
            onclick={expandAll}
            class="toggle-btn"
            class:active={!isCollapsed}
            title="Expand All"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="m 10.5,9 0,-2 -2.5,0 L 12,2 l 4,5 -2.5,0 0,2 -3,0 z" />
              <path d="m 5,12 14,0" stroke="currentColor" stroke-width="2" fill="none" />
              <path d="m 10.5,15 0,2 -2.5,0 L 12,22 l 4,-5 -2.5,0 0,-2 -3,0 z" />
            </svg>
          </button>
          <button
            onclick={collapseAll}
            class="toggle-btn"
            class:active={isCollapsed}
            title="Collapse All"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="m 10.5,2 0,2 -2.5,0 L 12,9 l 4,-5 -2.5,0 0,-2 -3,0 z" />
              <path d="m 5,12 14,0" stroke="currentColor" stroke-width="2" fill="none" />
              <path d="m 10.5,22 0,-2 -2.5,0 L 12,15 l 4,5 -2.5,0 0,2 -3,0 z" />
            </svg>
          </button>
        </div>
        <div class="w-px h-4 bg-[var(--color-border)]"></div>
        <div class="toggle-group">
          <button onclick={prettify} class="toggle-btn" title="Format Expression">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="1" width="12" height="2" />
              <rect x="4" y="5" width="10" height="2" />
              <rect x="4" y="9" width="9" height="2" />
              <rect x="0" y="13" width="10" height="2" />
            </svg>
          </button>
        </div>
      </div>

      <div class="w-px h-4 bg-[var(--color-border)]"></div>

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
    <CodeEditor bind:this={editorRef} bind:value lang="transformer" />
  </div>
</div>

<style>
  .toggle-group {
    display: flex;
    padding: 3px;
    gap: 2px;
    border-radius: 8px;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 22px;
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
