<script>
  import { onMount } from 'svelte';
  import {
    JsonEditor,
    ExpressionEditor,
    OutputPanel,
    FunctionReference,
    SettingsDropdown,
    LayoutSelector,
    inputJson,
    expression,
    strictMode,
    activeTab,
    parsedInput,
    validationResult,
    evaluationResult,
    astResult,
    generatedJs,
    nativeJs,
    initMapQL,
    currentTheme,
    currentLayout,
    layoutDirection
  } from '$lib';

  let showFunctions = $state(true);

  // Panel sizes (percentages)
  let horizontalSplit = $state(50);
  let verticalSplit = $state(70);

  // Resize state
  let isResizingH = $state(false);
  let isResizingV = $state(false);
  let containerRef = $state(null);

  // Initialize on mount
  onMount(() => {
    initMapQL();
    currentTheme.init();
  });

  function handleInsertFunction(fn) {
    $expression = $expression + fn.insertText;
  }

  function startHorizontalResize(e) {
    if ($currentLayout === 'stacked') return;
    e.preventDefault();
    isResizingH = true;
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', handleHorizontalResize);
    document.addEventListener('mouseup', stopResize);
  }

  function startVerticalResize(e) {
    e.preventDefault();
    isResizingV = true;
    document.body.classList.add('resizing', 'resizing-v');
    document.addEventListener('mousemove', handleVerticalResize);
    document.addEventListener('mouseup', stopResize);
  }

  function handleHorizontalResize(e) {
    if (!isResizingH || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    horizontalSplit = Math.min(Math.max(percent, 20), 80);
  }

  function handleVerticalResize(e) {
    if (!isResizingV || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = (y / rect.height) * 100;
    verticalSplit = Math.min(Math.max(percent, 30), 85);
  }

  function stopResize() {
    isResizingH = false;
    isResizingV = false;
    document.body.classList.remove('resizing', 'resizing-v');
    document.removeEventListener('mousemove', handleHorizontalResize);
    document.removeEventListener('mousemove', handleVerticalResize);
    document.removeEventListener('mouseup', stopResize);
  }
</script>

<div class="h-screen flex flex-col bg-[var(--color-bg)]">
  <!-- Header - matching adeo-data-mapper navbar -->
  <header class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
    <div class="flex items-center gap-3">
      <h1 class="text-sm font-semibold text-[var(--color-text)]">MapQL Playground</h1>
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">v0.1.0</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={() => showFunctions = !showFunctions}
        class="text-xs px-2.5 py-1.5 rounded-md transition-colors {showFunctions
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}"
      >
        Functions
      </button>
      <LayoutSelector />
      <SettingsDropdown />
      <a
        href="https://github.com/your-repo/mapql"
        target="_blank"
        class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-xs px-2"
      >
        Docs
      </a>
    </div>
  </header>

  <!-- Main content -->
  <div class="flex-1 flex min-h-0">
    <!-- Left: Function Reference (collapsible) -->
    {#if showFunctions}
      <div class="w-64 flex-shrink-0">
        <FunctionReference onInsert={handleInsertFunction} />
      </div>
    {/if}

    <!-- Editors Container -->
    <div class="flex-1 flex flex-col min-h-0 p-3" bind:this={containerRef}>

      {#if $currentLayout === 'standard'}
        <!-- Standard Layout: Input & Preview side by side, Expression below -->
        <div class="flex min-h-0 {$layoutDirection === 'rtl' ? 'flex-row-reverse' : ''}" style="height: {verticalSplit}%">
          <div class="flex flex-col min-h-0 min-w-0" style="width: {horizontalSplit}%">
            <JsonEditor
              bind:value={$inputJson}
              isValid={$parsedInput.success}
              label="Input JSON"
            />
          </div>

          <div
            class="w-3 flex-shrink-0 cursor-col-resize flex items-center justify-center group hover:bg-[var(--color-accent)]/10 transition-colors"
            onmousedown={startHorizontalResize}
            role="separator"
            aria-orientation="vertical"
          >
            <div class="w-0.5 h-12 bg-[var(--color-border)] rounded group-hover:bg-[var(--color-accent)] transition-colors"></div>
          </div>

          <div class="flex-1 flex flex-col min-h-0 min-w-0">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
            />
          </div>
        </div>

        <div
          class="h-3 flex-shrink-0 cursor-row-resize flex items-center justify-center group hover:bg-[var(--color-accent)]/10 transition-colors"
          onmousedown={startVerticalResize}
          role="separator"
          aria-orientation="horizontal"
        >
          <div class="h-0.5 w-12 bg-[var(--color-border)] rounded group-hover:bg-[var(--color-accent)] transition-colors"></div>
        </div>

        <div class="flex-1 min-h-0">
          <ExpressionEditor
            bind:value={$expression}
            isValid={$validationResult.valid}
            bind:strictMode={$strictMode}
          />
        </div>

      {:else if $currentLayout === 'stacked'}
        <!-- Stacked Layout: All vertical -->
        <div class="flex flex-col min-h-0 gap-3 h-full">
          <div class="flex-1 min-h-0">
            <JsonEditor
              bind:value={$inputJson}
              isValid={$parsedInput.success}
              label="Input JSON"
            />
          </div>

          <div class="flex-1 min-h-0">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
            />
          </div>

          <div class="h-32 flex-shrink-0">
            <ExpressionEditor
              bind:value={$expression}
              isValid={$validationResult.valid}
              bind:strictMode={$strictMode}
            />
          </div>
        </div>

      {:else if $currentLayout === 'sidepanel'}
        <!-- Side Panel Layout: Input & Expression on left, Preview on right -->
        <div class="flex min-h-0 h-full {$layoutDirection === 'rtl' ? 'flex-row-reverse' : ''}">
          <!-- Left side: Input + Expression stacked -->
          <div class="flex flex-col min-h-0" style="width: {horizontalSplit}%">
            <div class="min-h-0" style="height: {verticalSplit}%">
              <JsonEditor
                bind:value={$inputJson}
                isValid={$parsedInput.success}
                label="Input JSON"
              />
            </div>

            <div
              class="h-3 flex-shrink-0 cursor-row-resize flex items-center justify-center group hover:bg-[var(--color-accent)]/10 transition-colors"
              onmousedown={startVerticalResize}
              role="separator"
              aria-orientation="horizontal"
            >
              <div class="h-0.5 w-12 bg-[var(--color-border)] rounded group-hover:bg-[var(--color-accent)] transition-colors"></div>
            </div>

            <div class="flex-1 min-h-0">
              <ExpressionEditor
                bind:value={$expression}
                isValid={$validationResult.valid}
                bind:strictMode={$strictMode}
              />
            </div>
          </div>

          <div
            class="w-3 flex-shrink-0 cursor-col-resize flex items-center justify-center group hover:bg-[var(--color-accent)]/10 transition-colors"
            onmousedown={startHorizontalResize}
            role="separator"
            aria-orientation="vertical"
          >
            <div class="w-0.5 h-12 bg-[var(--color-border)] rounded group-hover:bg-[var(--color-accent)] transition-colors"></div>
          </div>

          <!-- Right side: Preview -->
          <div class="flex-1 flex flex-col min-h-0 min-w-0">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body.resizing) {
    user-select: none;
    cursor: col-resize;
  }
  :global(body.resizing-v) {
    cursor: row-resize;
  }
</style>
