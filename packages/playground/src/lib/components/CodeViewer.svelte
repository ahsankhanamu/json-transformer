<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { lineNumbers } from '@codemirror/view';
  import { javascript } from '@codemirror/lang-javascript';
  import { json } from '@codemirror/lang-json';
  import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
  import { tags } from '@lezer/highlight';

  const { code = '', lang = 'javascript' } = $props();

  let editorContainer;
  let editorView;

  // Syntax highlighting using CSS variables for theme support
  // Colors are defined in app.css and change with theme
  const syntaxColors = HighlightStyle.define([
    // Keywords
    { tag: tags.keyword, class: 'cm-syntax-keyword' },
    { tag: tags.controlKeyword, class: 'cm-syntax-control' },

    // Functions and methods
    { tag: tags.function(tags.variableName), class: 'cm-syntax-function' },
    { tag: tags.function(tags.propertyName), class: 'cm-syntax-function' },

    // Variables and parameters
    { tag: tags.variableName, class: 'cm-syntax-variable' },
    { tag: tags.definition(tags.variableName), class: 'cm-syntax-variable' },

    // Properties
    { tag: tags.propertyName, class: 'cm-syntax-property' },
    { tag: tags.definition(tags.propertyName), class: 'cm-syntax-property' },

    // Strings
    { tag: tags.string, class: 'cm-syntax-string' },
    { tag: tags.special(tags.string), class: 'cm-syntax-string' },

    // Numbers and booleans
    { tag: tags.number, class: 'cm-syntax-number' },
    { tag: tags.bool, class: 'cm-syntax-bool' },
    { tag: tags.null, class: 'cm-syntax-bool' },

    // Operators and punctuation
    { tag: tags.operator, class: 'cm-syntax-operator' },
    { tag: tags.punctuation, class: 'cm-syntax-operator' },
    { tag: tags.bracket, class: 'cm-syntax-bracket' },

    // Types
    { tag: tags.typeName, class: 'cm-syntax-type' },
    { tag: tags.className, class: 'cm-syntax-type' },

    // Comments
    { tag: tags.comment, class: 'cm-syntax-comment' },
  ]);

  // Theme matching CodeEditor
  const viewerTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '13px',
      backgroundColor: 'transparent',
    },
    '.cm-content': {
      caretColor: 'transparent',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      padding: '4px 0',
    },
    '.cm-line': {
      padding: '0 8px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg-secondary)',
      borderRight: '1px solid var(--color-border)',
      color: 'var(--color-text-muted)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 12px',
      minWidth: '40px',
      fontSize: '12px',
    },
    '.cm-cursor': {
      display: 'none',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--color-selection)',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
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
        lineNumbers(),
        viewerTheme,
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
    height: 100%;
  }
  .code-viewer :global(.cm-editor) {
    background: transparent !important;
    height: 100%;
  }
  .code-viewer :global(.cm-scroller) {
    overflow: auto !important;
  }
</style>
