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
    return JSON.stringify(data, null, 2);
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
    <!-- Copy button - absolute positioned -->
    {#if canCopy}
      <button
        onclick={copyToClipboard}
        class="absolute top-2 right-2 text-xs px-2 py-1 rounded transition-all z-10
          {copied
          ? 'bg-[var(--color-success)] text-white'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}"
        title="Copy to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    {/if}

    {#if activeTab === 'preview'}
      {#if previewResult.success}
        <CodeViewer code={formatOutput(previewResult.data)} lang="json" />
      {:else}
        <div class="text-[var(--color-error)]">
          <div class="font-semibold mb-2">Error</div>
          <pre class="whitespace-pre-wrap break-all">{previewResult.error}</pre>
        </div>
      {/if}
    {:else if activeTab === 'ast'}
      {#if astResult}
        <CodeViewer code={formatOutput(astResult)} lang="json" />
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
