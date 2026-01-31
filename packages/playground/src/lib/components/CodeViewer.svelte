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

  // Syntax highlighting colors (VS Code Dark+ inspired)
  const syntaxColors = HighlightStyle.define([
    // Keywords
    { tag: tags.keyword, color: '#569cd6' },
    { tag: tags.controlKeyword, color: '#c586c0' },

    // Functions and methods
    { tag: tags.function(tags.variableName), color: '#dcdcaa' },
    { tag: tags.function(tags.propertyName), color: '#dcdcaa' },

    // Variables and parameters
    { tag: tags.variableName, color: '#9cdcfe' },
    { tag: tags.definition(tags.variableName), color: '#9cdcfe' },

    // Properties
    { tag: tags.propertyName, color: '#9cdcfe' },
    { tag: tags.definition(tags.propertyName), color: '#9cdcfe' },

    // Strings
    { tag: tags.string, color: '#ce9178' },
    { tag: tags.special(tags.string), color: '#ce9178' },

    // Numbers and booleans
    { tag: tags.number, color: '#b5cea8' },
    { tag: tags.bool, color: '#569cd6' },
    { tag: tags.null, color: '#569cd6' },

    // Operators and punctuation
    { tag: tags.operator, color: '#d4d4d4' },
    { tag: tags.punctuation, color: '#d4d4d4' },
    { tag: tags.bracket, color: '#ffd700' },

    // Types
    { tag: tags.typeName, color: '#4ec9b0' },
    { tag: tags.className, color: '#4ec9b0' },

    // Comments
    { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
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
