<script>
  import {
    files,
    activeFileId,
    switchFile,
    createFile,
    duplicateFile,
    renameFile,
    deleteFileById,
    isFileEmpty,
    reorderFiles,
  } from '../stores/fileStore.js';

  /** @type {{ id: string, name: string }[]} */
  const fileList = $derived($files);
  const currentId = $derived($activeFileId);
  const canDelete = $derived(fileList.length > 1);

  // Inline rename state
  let renamingId = $state(null);
  let renameValue = $state('');
  let renameInput = $state(null);

  // Context menu state
  let contextMenu = $state(null); // { x, y, fileId }

  // Tab list dropdown state
  let showTabList = $state(false);
  let tabListSearch = $state('');
  let tabListSearchInput = $state(null);
  let tabListBtnRef = $state(null);
  const filteredFiles = $derived(
    tabListSearch.trim()
      ? fileList.filter((f) => f.name.toLowerCase().includes(tabListSearch.trim().toLowerCase()))
      : fileList
  );

  function scrollTabIntoView(id) {
    requestAnimationFrame(() => {
      const tab = tabsRef?.querySelector(`[data-file-id="${id}"]`);
      tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    });
  }

  function handleTabClick(id) {
    if (renamingId) return;
    switchFile(id);
  }

  function handleDoubleClick(id, name) {
    renamingId = id;
    renameValue = name;
    requestAnimationFrame(() => renameInput?.select());
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      renameFile(renamingId, renameValue);
    }
    renamingId = null;
  }

  function cancelRename() {
    renamingId = null;
  }

  function handleRenameKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }

  function handleContextMenu(e, fileId) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, fileId };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function ctxRename() {
    if (!contextMenu) return;
    const file = fileList.find((f) => f.id === contextMenu.fileId);
    if (file) handleDoubleClick(file.id, file.name);
    closeContextMenu();
  }

  function ctxDuplicate() {
    if (!contextMenu) return;
    duplicateFile(contextMenu.fileId);
    closeContextMenu();
  }

  function confirmAndDelete(id) {
    if (isFileEmpty(id) || confirm(`Close "${fileList.find((f) => f.id === id)?.name}"?`)) {
      deleteFileById(id);
    }
  }

  function ctxDelete() {
    if (!contextMenu) return;
    confirmAndDelete(contextMenu.fileId);
    closeContextMenu();
  }

  function handleCloseClick(e, id) {
    e.stopPropagation();
    confirmAndDelete(id);
  }

  // Tab list dropdown
  function toggleTabList(e) {
    e.stopPropagation();
    showTabList = !showTabList;
    if (showTabList) {
      tabListSearch = '';
      requestAnimationFrame(() => tabListSearchInput?.focus());
    }
  }

  function closeTabList() {
    showTabList = false;
    tabListSearch = '';
  }

  function handleTabListSelect(id) {
    switchFile(id);
    closeTabList();
    scrollTabIntoView(id);
  }

  function handleTabListKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeTabList();
    }
  }

  // Drag to reorder
  let dragId = $state(null);
  let dropTargetId = $state(null);

  function handleDragStart(e, id) {
    dragId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Make the dragged tab semi-transparent
    requestAnimationFrame(() => {
      e.target.classList.add('dragging');
    });
  }

  function handleDragOver(e, id) {
    if (!dragId || dragId === id) {
      dropTargetId = null;
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dropTargetId = id;
  }

  function handleDrop(e, id) {
    e.preventDefault();
    if (dragId && dragId !== id) {
      reorderFiles(dragId, id);
    }
    dragId = null;
    dropTargetId = null;
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    dragId = null;
    dropTargetId = null;
  }

  // Compact mode: detect when tabs are squeezed
  let compact = $state(false);
  let tabsRef = $state(null);

  $effect(() => {
    if (!tabsRef) return;
    const ro = new ResizeObserver(() => {
      compact = tabsRef.scrollWidth > tabsRef.clientWidth;
    });
    ro.observe(tabsRef);
    return () => ro.disconnect();
  });

  // Re-check compact when file list changes
  $effect(() => {
    fileList; // track dependency
    if (!tabsRef) return;
    // Wait for DOM update
    requestAnimationFrame(() => {
      compact = tabsRef.scrollWidth > tabsRef.clientWidth;
    });
  });

  // Close menus on outside click
  function handleWindowClick(e) {
    if (contextMenu) closeContextMenu();
    if (showTabList && tabListBtnRef && !tabListBtnRef.contains(e.target)) {
      // Check if click is inside the dropdown itself
      const dropdown = document.querySelector('.filebar-tablist-dropdown');
      if (!dropdown || !dropdown.contains(e.target)) {
        closeTabList();
      }
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="filebar" class:compact>
  <div class="filebar-tabs" bind:this={tabsRef}>
    {#each fileList as file (file.id)}
      <div
        class="filebar-tab"
        class:active={file.id === currentId}
        class:drop-target={dropTargetId === file.id}
        data-file-id={file.id}
        role="tab"
        tabindex="0"
        aria-selected={file.id === currentId}
        draggable="true"
        onclick={() => handleTabClick(file.id)}
        ondblclick={() => handleDoubleClick(file.id, file.name)}
        onkeydown={(e) => {
          if (e.key === 'Enter') handleTabClick(file.id);
        }}
        oncontextmenu={(e) => handleContextMenu(e, file.id)}
        ondragstart={(e) => handleDragStart(e, file.id)}
        ondragover={(e) => handleDragOver(e, file.id)}
        ondrop={(e) => handleDrop(e, file.id)}
        ondragend={handleDragEnd}
        title={file.name}
      >
        {#if renamingId === file.id}
          <input
            class="filebar-rename"
            bind:this={renameInput}
            bind:value={renameValue}
            onblur={commitRename}
            onkeydown={handleRenameKeydown}
          />
        {:else}
          <span class="filebar-tab-name">{file.name}</span>
          {#if canDelete}
            <button
              class="filebar-tab-close"
              tabindex="-1"
              onclick={(e) => handleCloseClick(e, file.id)}
              title="Close"
            >
              &times;
            </button>
          {/if}
        {/if}
      </div>
    {/each}

    <button class="filebar-new" onclick={createFile} title="New file">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </div>

  <div class="filebar-actions">
    <div class="filebar-tablist-wrapper" bind:this={tabListBtnRef}>
      <button
        class="filebar-chevron"
        class:active={showTabList}
        onclick={toggleTabList}
        title="Show all tabs"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      {#if showTabList}
        <div class="filebar-tablist-dropdown">
          <div class="filebar-tablist-search">
            <svg
              class="filebar-tablist-search-icon"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M10.5 10.5L14 14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <input
              class="filebar-tablist-input"
              bind:this={tabListSearchInput}
              bind:value={tabListSearch}
              onkeydown={handleTabListKeydown}
              placeholder="Search tabs..."
            />
          </div>
          <div class="filebar-tablist-items">
            {#each filteredFiles as file (file.id)}
              <button
                class="filebar-tablist-item"
                class:active={file.id === currentId}
                onclick={() => handleTabListSelect(file.id)}
              >
                <span class="filebar-tablist-item-name">{file.name}</span>
                {#if file.id === currentId}
                  <span class="filebar-tablist-item-badge">active</span>
                {/if}
              </button>
            {:else}
              <div class="filebar-tablist-empty">No matching tabs</div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Context menu -->
{#if contextMenu}
  <div class="filebar-context" style="left:{contextMenu.x}px;top:{contextMenu.y}px">
    <button onclick={ctxRename}>Rename</button>
    <button onclick={ctxDuplicate}>Duplicate</button>
    {#if canDelete}
      <button onclick={ctxDelete}>Delete</button>
    {/if}
  </div>
{/if}
