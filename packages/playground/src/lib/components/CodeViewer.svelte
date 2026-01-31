<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { javascript } from '@codemirror/lang-javascript';
  import { json } from '@codemirror/lang-json';
  import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
  import { tags } from '@lezer/highlight';

  const { code = '', lang = 'javascript' } = $props();

  let editorContainer;
  let editorView;

  // Syntax highlighting colors (matching CodeEditor)
  const syntaxColors = HighlightStyle.define([
    { tag: tags.keyword, color: '#c792ea' },
    { tag: tags.operator, color: '#89ddff' },
    { tag: tags.punctuation, color: '#89ddff' },
    { tag: tags.string, color: '#c3e88d' },
    { tag: tags.number, color: '#f78c6c' },
    { tag: tags.bool, color: '#ff9cac' },
    { tag: tags.null, color: '#ff9cac' },
    { tag: tags.variableName, color: '#e4e4e7' },
    { tag: tags.definition(tags.variableName), color: '#82aaff' },
    { tag: tags.propertyName, color: '#82aaff' },
    { tag: tags.function(tags.variableName), color: '#82aaff' },
    { tag: tags.typeName, color: '#ffcb6b' },
    { tag: tags.comment, color: '#676e95', fontStyle: 'italic' },
    { tag: tags.bracket, color: '#89ddff' },
  ]);

  // Dark theme
  const darkTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '13px',
      backgroundColor: 'transparent',
    },
    '.cm-content': {
      caretColor: 'transparent',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      padding: '0',
    },
    '.cm-line': {
      padding: '0',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '.cm-cursor': {
      display: 'none',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'visible',
    },
  });

  function getLanguageExtension() {
    return lang === 'json' ? json() : javascript();
  }

  function createEditor() {
    if (editorView) {
      editorView.destroy();
    }

    const state = EditorState.create({
      doc: code,
      extensions: [
        EditorView.editable.of(false),
        darkTheme,
        syntaxHighlighting(syntaxColors),
        getLanguageExtension(),
        EditorView.lineWrapping,
      ],
    });

    editorView = new EditorView({
      state,
      parent: editorContainer,
    });
  }

  onMount(() => {
    createEditor();
  });

  onDestroy(() => {
    editorView?.destroy();
  });

  // Update editor content when code changes
  $effect(() => {
    if (editorView && code !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: code,
        },
      });
    }
  });
</script>

<div bind:this={editorContainer} class="code-viewer"></div>

<style>
  .code-viewer {
    width: 100%;
  }
  .code-viewer :global(.cm-editor) {
    background: transparent !important;
  }
  .code-viewer :global(.cm-scroller) {
    overflow: visible !important;
  }
</style>
