<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, Compartment } from '@codemirror/state';
  import { json } from '@codemirror/lang-json';
  import { javascript } from '@codemirror/lang-javascript';
  import { autocompletion, completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
  import { keymap } from '@codemirror/view';
  import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
  import { tags } from '@lezer/highlight';
  import { functions, keywords } from '$lib/language/mapqlLanguage.js';

  let {
    value = $bindable(''),
    lang = 'mapql',
    placeholder = '',
    readonly = false,
    onchange = () => {}
  } = $props();

  let editorContainer;
  let editorView;
  const languageConf = new Compartment();

  // Create MapQL autocomplete source
  function mapqlCompletions(context) {
    // Get the word before cursor
    const word = context.matchBefore(/[\w$]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const options = [];

    // Add functions
    for (const fn of functions) {
      if (fn.name.toLowerCase().startsWith(word.text.toLowerCase())) {
        options.push({
          label: fn.name,
          type: 'function',
          detail: fn.desc,
          info: fn.syntax,
          apply: fn.insertText,
          boost: fn.category === 'Utility' ? 1 : 0
        });
      }
    }

    // Add keywords
    for (const kw of keywords) {
      if (kw.toLowerCase().startsWith(word.text.toLowerCase())) {
        options.push({
          label: kw,
          type: 'keyword'
        });
      }
    }

    return {
      from: word.from,
      options,
      validFor: /^[\w$]*$/
    };
  }

  // Create dot-completion for methods after a dot
  function dotCompletions(context) {
    const beforeDot = context.matchBefore(/\.[\w]*/);
    if (!beforeDot) return null;

    const word = beforeDot.text.slice(1); // Remove the dot
    const options = [];

    // Common JS methods that make sense in MapQL context
    const methods = [
      { name: 'length', type: 'property' },
      { name: 'toString', type: 'method', apply: 'toString()' },
      { name: 'toFixed', type: 'method', apply: 'toFixed(2)' },
      { name: 'charAt', type: 'method', apply: 'charAt(0)' },
      { name: 'slice', type: 'method', apply: 'slice(0)' },
      { name: 'includes', type: 'method', apply: 'includes("")' },
      { name: 'indexOf', type: 'method', apply: 'indexOf("")' },
      { name: 'map', type: 'method', apply: 'map(x => x)' },
      { name: 'filter', type: 'method', apply: 'filter(x => x)' },
      { name: 'find', type: 'method', apply: 'find(x => x)' },
      { name: 'reduce', type: 'method', apply: 'reduce((acc, x) => acc, 0)' },
      { name: 'join', type: 'method', apply: 'join(", ")' },
      { name: 'split', type: 'method', apply: 'split("")' },
      { name: 'toLowerCase', type: 'method', apply: 'toLowerCase()' },
      { name: 'toUpperCase', type: 'method', apply: 'toUpperCase()' },
      { name: 'trim', type: 'method', apply: 'trim()' },
    ];

    for (const m of methods) {
      if (m.name.toLowerCase().startsWith(word.toLowerCase())) {
        options.push({
          label: m.name,
          type: m.type,
          apply: m.apply || m.name
        });
      }
    }

    return {
      from: beforeDot.from + 1, // After the dot
      options,
      validFor: /^[\w]*$/
    };
  }

  // Get language extension based on lang prop
  function getLanguageExtension() {
    switch (lang) {
      case 'json':
        return json();
      case 'javascript':
      case 'js':
        return javascript();
      case 'mapql':
      default:
        // Use JavaScript as base with MapQL autocompletion
        return [
          javascript(),
          autocompletion({
            override: [mapqlCompletions, dotCompletions],
            icons: true,
            optionClass: (completion) => `cm-completion-${completion.type}`
          })
        ];
    }
  }

  // Syntax highlighting colors
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
      backgroundColor: 'var(--color-bg-secondary)'
    },
    '.cm-content': {
      caretColor: 'var(--color-text)',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-text)'
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.3)'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(59, 130, 246, 0.1)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-muted)',
      border: 'none',
      borderRight: '1px solid var(--color-border)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-bg-tertiary)'
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px'
    },
    '.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '12px'
      },
      '& > ul > li': {
        padding: '4px 8px'
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: 'var(--color-accent)',
        color: 'white'
      }
    },
    '.cm-completionIcon': {
      width: '16px',
      marginRight: '4px'
    },
    '.cm-completionIcon-function::after': {
      content: '"ƒ"',
      color: '#a78bfa'
    },
    '.cm-completionIcon-keyword::after': {
      content: '"K"',
      color: '#f472b6'
    },
    '.cm-completionIcon-method::after': {
      content: '"M"',
      color: '#60a5fa'
    },
    '.cm-completionIcon-property::after': {
      content: '"P"',
      color: '#34d399'
    },
    '.cm-completionDetail': {
      color: 'var(--color-text-muted)',
      marginLeft: '8px',
      fontStyle: 'italic'
    }
  });

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        if (newValue !== value) {
          value = newValue;
          onchange(newValue);
        }
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        darkTheme,
        syntaxHighlighting(syntaxColors),
        languageConf.of(getLanguageExtension()),
        updateListener,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readonly),
        keymap.of([
          { key: 'Tab', run: acceptCompletion },
          ...completionKeymap
        ])
      ]
    });

    editorView = new EditorView({
      state,
      parent: editorContainer
    });
  });

  onDestroy(() => {
    editorView?.destroy();
  });

  // Update editor content when value changes externally
  $effect(() => {
    if (editorView && value !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: value
        }
      });
    }
  });
</script>

<div bind:this={editorContainer} class="h-full w-full overflow-hidden"></div>

<style>
  :global(.cm-editor) {
    height: 100% !important;
  }
  :global(.cm-scroller) {
    overflow: auto !important;
  }
</style>
