<script>
  import { onMount } from 'svelte';
  import {
    JsonEditor,
    ExpressionEditor,
    OutputPanel,
    FunctionReference,
    SettingsDropdown,
    LayoutSelector,
    Resizer,
    inputJson,
    expression,
    strictMode,
    activeTab,
    parsedInput,
    validationResult,
    evaluationResult,
    previewEvaluationResult,
    astResult,
    generatedJs,
    nativeJs,
    initTransformer,
    currentTheme,
    currentLayout,
    layoutDirection,
  } from '$lib';

  let showFunctions = $state(true);

  // Panel sizes (percentages)
  let horizontalSplit = $state(50);
  let verticalSplit = $state(70);

  // Stacked layout panel sizes (percentages)
  let stackedSplit1 = $state(35); // Input JSON
  let stackedSplit2 = $state(45); // Output Panel

  // Container ref for calculating percentages
  let containerRef = $state(null);

  // Initialize on mount
  onMount(() => {
    initTransformer();
    currentTheme.init();
  });

  function handleInsertFunction(fn) {
    $expression = $expression + fn.insertText;
  }

  // Resize handlers - calculate percentage from mouse position
  function handleHorizontalResize(e) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = (x / rect.width) * 100;
    // Invert for RTL mode
    if ($layoutDirection === 'rtl') {
      percent = 100 - percent;
    }
    horizontalSplit = Math.min(Math.max(percent, 20), 80);
  }

  function handleVerticalResize(e) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = (y / rect.height) * 100;
    verticalSplit = Math.min(Math.max(percent, 20), 85);
  }

  function handleStackedResize1(e) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = (y / rect.height) * 100;
    const maxSplit1 = 100 - stackedSplit2 - 15;
    stackedSplit1 = Math.min(Math.max(percent, 15), maxSplit1);
  }

  function handleStackedResize2(e) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = (y / rect.height) * 100;
    const newSplit2 = percent - stackedSplit1;
    stackedSplit2 = Math.min(Math.max(newSplit2, 15), 100 - stackedSplit1 - 15);
  }
</script>

<div class="h-screen flex flex-col bg-[var(--color-bg)]">
  <!-- Header -->
  <header
    class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
  >
    <div class="flex items-center gap-3">
      <h1 class="text-sm font-semibold text-[var(--color-text)]">JSON Transformer Playground</h1>
      <span
        class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
        >v0.1.0</span
      >
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={() => (showFunctions = !showFunctions)}
        class="text-xs px-2.5 py-1.5 rounded-md transition-colors {showFunctions
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}"
      >
        Functions
      </button>
      <LayoutSelector />
      <SettingsDropdown />
      <a
        href="/"
        rel="external"
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
        <div
          class="flex min-h-0 {$layoutDirection === 'rtl' ? 'flex-row-reverse' : ''}"
          style="height: {verticalSplit}%"
        >
          <div class="flex flex-col min-h-0 min-w-0" style="width: {horizontalSplit}%">
            <JsonEditor bind:value={$inputJson} isValid={$parsedInput.success} label="Input JSON" />
          </div>

          <Resizer direction="horizontal" onResize={handleHorizontalResize} />

          <div class="flex-1 flex flex-col min-h-0 min-w-0">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$previewEvaluationResult || $evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
              isPreview={!!$previewEvaluationResult}
            />
          </div>
        </div>

        <Resizer direction="vertical" onResize={handleVerticalResize} />

        <div class="flex-1 min-h-0">
          <ExpressionEditor
            bind:value={$expression}
            isValid={$validationResult.valid}
            bind:strictMode={$strictMode}
          />
        </div>
      {:else if $currentLayout === 'stacked'}
        <!-- Stacked Layout: All vertical with resize handles -->
        <div class="flex flex-col min-h-0 h-full">
          <div class="min-h-0" style="height: {stackedSplit1}%">
            <JsonEditor bind:value={$inputJson} isValid={$parsedInput.success} label="Input JSON" />
          </div>

          <Resizer direction="vertical" onResize={handleStackedResize1} />

          <div class="min-h-0" style="height: {stackedSplit2}%">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$previewEvaluationResult || $evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
              isPreview={!!$previewEvaluationResult}
            />
          </div>

          <Resizer direction="vertical" onResize={handleStackedResize2} />

          <div class="flex-1 min-h-0">
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
          <div class="flex flex-col min-h-0" style="width: {horizontalSplit}%">
            <div class="min-h-0" style="height: {verticalSplit}%">
              <JsonEditor
                bind:value={$inputJson}
                isValid={$parsedInput.success}
                label="Input JSON"
              />
            </div>

            <Resizer direction="vertical" onResize={handleVerticalResize} />

            <div class="flex-1 min-h-0">
              <ExpressionEditor
                bind:value={$expression}
                isValid={$validationResult.valid}
                bind:strictMode={$strictMode}
              />
            </div>
          </div>

          <Resizer direction="horizontal" onResize={handleHorizontalResize} />

          <div class="flex-1 flex flex-col min-h-0 min-w-0">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$previewEvaluationResult || $evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
              isPreview={!!$previewEvaluationResult}
            />
          </div>
        </div>
      {:else if $currentLayout === 'focus'}
        <!-- Focus Layout: Expression on top, Input below, Preview on right -->
        <div class="flex min-h-0 h-full {$layoutDirection === 'rtl' ? 'flex-row-reverse' : ''}">
          <div class="flex flex-col min-h-0" style="width: {horizontalSplit}%">
            <div class="min-h-0" style="height: {verticalSplit}%">
              <ExpressionEditor
                bind:value={$expression}
                isValid={$validationResult.valid}
                bind:strictMode={$strictMode}
              />
            </div>

            <Resizer direction="vertical" onResize={handleVerticalResize} />

            <div class="flex-1 min-h-0">
              <JsonEditor
                bind:value={$inputJson}
                isValid={$parsedInput.success}
                label="Input JSON"
              />
            </div>
          </div>

          <Resizer direction="horizontal" onResize={handleHorizontalResize} />

          <div class="flex-1 flex flex-col min-h-0 min-w-0">
            <OutputPanel
              bind:activeTab={$activeTab}
              previewResult={$previewEvaluationResult || $evaluationResult}
              astResult={$astResult}
              generatedJs={$generatedJs}
              nativeJs={$nativeJs}
              isPreview={!!$previewEvaluationResult}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
