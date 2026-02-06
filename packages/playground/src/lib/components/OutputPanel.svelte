<script>
  import * as prettier from 'prettier/standalone';
  import * as prettierBabel from 'prettier/plugins/babel';
  import * as prettierEstree from 'prettier/plugins/estree';
  import CodeViewer from './CodeViewer.svelte';
  import CodeEditor from './CodeEditor.svelte';

  let {
    activeTab = $bindable('preview'),
    previewResult = {},
    astResult = null,
    generatedJs = '',
    nativeJs = '',
    isPreview = false,
  } = $props();

  let copied = $state(false);
  let formattedJs = $state('');
  let formattedNativeJs = $state('');
  let previewViewerRef = $state(null);
  let astViewerRef = $state(null);
  let isCollapsed = $state(false);
  let isCompact = $state(false);

  function expandAll() {
    if (activeTab === 'preview') previewViewerRef?.expandAllFolds();
    else if (activeTab === 'ast') astViewerRef?.expandAllFolds();
    isCollapsed = false;
  }

  function collapseAll() {
    if (activeTab === 'preview') previewViewerRef?.collapseAllFolds();
    else if (activeTab === 'ast') astViewerRef?.collapseAllFolds();
    isCollapsed = true;
  }

  function setFormat() {
    isCompact = false;
    isCollapsed = false;
  }

  function setCompact() {
    isCompact = true;
    isCollapsed = true;
  }

  // Format JS with Prettier only when tab is open
  $effect(() => {
    if (activeTab === 'js' && generatedJs) {
      formatJsWithPrettier(generatedJs, 'js');
    } else if (!generatedJs) {
      formattedJs = '';
    }
  });

  // Format Native JS with Prettier only when tab is open
  $effect(() => {
    if (activeTab === 'native' && nativeJs) {
      formatJsWithPrettier(nativeJs, 'native');
    } else if (!nativeJs) {
      formattedNativeJs = '';
    }
  });

  async function formatJsWithPrettier(code, target = 'js') {
    try {
      const result = await prettier.format(code, {
        parser: 'babel',
        plugins: [prettierBabel, prettierEstree],
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        printWidth: 80,
      });
      if (target === 'native') {
        formattedNativeJs = result;
      } else {
        formattedJs = result;
      }
    } catch (e) {
      // If formatting fails, use the original
      console.warn('Prettier formatting failed:', e);
      if (target === 'native') {
        formattedNativeJs = code;
      } else {
        formattedJs = code;
      }
    }
  }

  function formatOutput(data) {
    return isCompact ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  }

  function getCurrentOutput() {
    if (activeTab === 'preview' && previewResult.success) {
      return formatOutput(previewResult.data);
    } else if (activeTab === 'ast' && astResult) {
      return formatOutput(astResult);
    } else if (activeTab === 'js' && formattedJs) {
      return formattedJs;
    } else if (activeTab === 'native' && formattedNativeJs) {
      return formattedNativeJs;
    }
    return '';
  }

  async function copyToClipboard() {
    const text = getCurrentOutput();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }

  const canCopy = $derived(
    (activeTab === 'preview' && previewResult.success) ||
      (activeTab === 'ast' && astResult) ||
      (activeTab === 'js' && formattedJs) ||
      (activeTab === 'native' && formattedNativeJs)
  );
</script>

<div class="panel h-full flex flex-col min-w-0">
  <div class="panel-header">
    <div class="flex items-center gap-1">
      <button
        class="tab"
        class:active={activeTab === 'preview'}
        onclick={() => (activeTab = 'preview')}
      >
        Preview
        {#if isPreview}
          <span class="ml-1 text-[10px] px-1 py-0.5 rounded bg-[var(--color-accent)] text-white"
            >↑↓</span
          >
        {/if}
      </button>
      <button class="tab" class:active={activeTab === 'ast'} onclick={() => (activeTab = 'ast')}>
        AST
      </button>
      <button class="tab" class:active={activeTab === 'js'} onclick={() => (activeTab = 'js')}>
        Lib JS
      </button>
      <button
        class="tab"
        class:active={activeTab === 'native'}
        onclick={() => (activeTab = 'native')}
      >
        Standalone JS
      </button>
    </div>
  </div>
  <div class="flex-1 min-h-0 min-w-0 overflow-hidden font-mono text-sm relative">
    <!-- Toolbar - absolute positioned -->
    {#if canCopy}
      <div class="absolute top-2 right-2 flex items-center gap-2 z-10">
        <!-- JSON controls for Preview/AST tabs -->
        {#if activeTab === 'preview' || activeTab === 'ast'}
          <!-- Expand/Collapse All toggle -->
          <div class="toggle-group" class:disabled={isCompact}>
            <button
              onclick={expandAll}
              class="toggle-btn"
              class:active={!isCollapsed && !isCompact}
              disabled={isCompact}
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
              class:active={isCollapsed && !isCompact}
              disabled={isCompact}
              title="Collapse All"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="m 10.5,2 0,2 -2.5,0 L 12,9 l 4,-5 -2.5,0 0,-2 -3,0 z" />
                <path d="m 5,12 14,0" stroke="currentColor" stroke-width="2" fill="none" />
                <path d="m 10.5,22 0,-2 -2.5,0 L 12,15 l 4,5 -2.5,0 0,2 -3,0 z" />
              </svg>
            </button>
          </div>
          <!-- Format/Compact toggle -->
          <div class="toggle-group">
            <button
              onclick={setFormat}
              class="toggle-btn"
              class:active={!isCompact}
              title="Format JSON"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="0" y="1" width="12" height="2" />
                <rect x="4" y="5" width="10" height="2" />
                <rect x="4" y="9" width="9" height="2" />
                <rect x="0" y="13" width="10" height="2" />
              </svg>
            </button>
            <button
              onclick={setCompact}
              class="toggle-btn"
              class:active={isCompact}
              title="Compact JSON"
            >
              <svg width="14" height="14" viewBox="0 0 16 12" fill="currentColor">
                <rect x="0" y="0" width="14" height="2" />
                <rect x="0" y="4" width="14" height="2" />
                <rect x="0" y="8" width="9" height="2" />
              </svg>
            </button>
          </div>
        {/if}
        <button
          onclick={copyToClipboard}
          class="text-xs px-2 py-1 rounded transition-all
            {copied
            ? 'bg-[var(--color-success)] text-white'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}"
          title="Copy to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    {/if}

    {#if activeTab === 'preview'}
      {#if previewResult.success}
        <CodeViewer
          bind:this={previewViewerRef}
          code={formatOutput(previewResult.data)}
          lang="json"
        />
      {:else}
        <div class="text-[var(--color-error)]">
          <div class="font-semibold mb-2">Error</div>
          <pre class="whitespace-pre-wrap break-all">{previewResult.error}</pre>
        </div>
      {/if}
    {:else if activeTab === 'ast'}
      {#if astResult}
        <CodeViewer bind:this={astViewerRef} code={formatOutput(astResult)} lang="json" />
      {:else}
        <div class="text-[var(--color-text-muted)]">Invalid expression</div>
      {/if}
    {:else if activeTab === 'js'}
      {#if formattedJs || generatedJs}
        <CodeEditor value={formattedJs || generatedJs} lang="javascript" readonly={true} />
      {:else}
        <div class="text-[var(--color-text-muted)]">Invalid expression</div>
      {/if}
    {:else if activeTab === 'native'}
      {#if formattedNativeJs || nativeJs}
        <CodeEditor value={formattedNativeJs || nativeJs} lang="javascript" readonly={true} />
      {:else}
        <div class="text-[var(--color-text-muted)]">Invalid expression</div>
      {/if}
    {/if}
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

  .toggle-group.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
</style>
