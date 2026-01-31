<script>
  import * as prettier from 'prettier/standalone';
  import * as prettierBabel from 'prettier/plugins/babel';
  import * as prettierEstree from 'prettier/plugins/estree';

  let {
    activeTab = $bindable('preview'),
    previewResult = {},
    astResult = null,
    generatedJs = '',
    nativeJs = ''
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
        printWidth: 80
      });
      if (target === 'native') {
        formattedNativeJs = result;
      } else {
        formattedJs = result;
      }
    } catch (e) {
      // If formatting fails, use the original
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
      setTimeout(() => copied = false, 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }

  let canCopy = $derived(
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
        onclick={() => activeTab = 'preview'}
      >
        Preview
      </button>
      <button
        class="tab"
        class:active={activeTab === 'ast'}
        onclick={() => activeTab = 'ast'}
      >
        AST
      </button>
      <button
        class="tab"
        class:active={activeTab === 'js'}
        onclick={() => activeTab = 'js'}
      >
        Generated JS
      </button>
      <button
        class="tab"
        class:active={activeTab === 'native'}
        onclick={() => activeTab = 'native'}
      >
        Native JS
      </button>
    </div>
  </div>
  <div class="flex-1 min-h-0 min-w-0 overflow-auto p-4 font-mono text-sm relative">
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
        <pre class="text-[var(--color-success)] whitespace-pre-wrap break-all">{formatOutput(previewResult.data)}</pre>
      {:else}
        <div class="text-[var(--color-error)]">
          <div class="font-semibold mb-2">Error</div>
          <pre class="whitespace-pre-wrap break-all">{previewResult.error}</pre>
        </div>
      {/if}
    {:else if activeTab === 'ast'}
      {#if astResult}
        <pre class="text-[var(--color-text-secondary)] whitespace-pre-wrap break-all">{formatOutput(astResult)}</pre>
      {:else}
        <div class="text-[var(--color-text-muted)]">Invalid expression</div>
      {/if}
    {:else if activeTab === 'js'}
      {#if formattedJs}
        <pre class="text-[var(--color-text-secondary)] whitespace-pre-wrap break-all">{formattedJs}</pre>
      {:else if generatedJs}
        <pre class="text-[var(--color-text-muted)] whitespace-pre-wrap break-all">{generatedJs}</pre>
      {:else}
        <div class="text-[var(--color-text-muted)]">Invalid expression</div>
      {/if}
    {:else if activeTab === 'native'}
      {#if formattedNativeJs}
        <pre class="text-[var(--color-text-secondary)] whitespace-pre-wrap break-all">{formattedNativeJs}</pre>
      {:else if nativeJs}
        <pre class="text-[var(--color-text-muted)] whitespace-pre-wrap break-all">{nativeJs}</pre>
      {:else}
        <div class="text-[var(--color-text-muted)]">Invalid expression</div>
      {/if}
    {/if}
  </div>
</div>
