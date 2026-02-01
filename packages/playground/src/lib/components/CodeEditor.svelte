<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, Compartment, StateField, StateEffect } from '@codemirror/state';
  import { json } from '@codemirror/lang-json';
  import { javascript } from '@codemirror/lang-javascript';
  import {
    autocompletion,
    completionKeymap,
    acceptCompletion,
    currentCompletions,
    selectedCompletion,
  } from '@codemirror/autocomplete';
  import { keymap, WidgetType, Decoration } from '@codemirror/view';
  import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
  import { tags } from '@lezer/highlight';
  import { functions, keywords } from '$lib/language/transformerLanguage.js';
  import {
    previewExpression,
    inputPaths as inputPathsStore,
  } from '$lib/stores/transformerStore.js';
  import { get } from 'svelte/store';

  // Ghost text widget for completion preview
  class GhostTextWidget extends WidgetType {
    constructor(text) {
      super();
      this.text = text;
    }
    toDOM() {
      const span = document.createElement('span');
      span.textContent = this.text;
      span.className = 'cm-ghost-text';
      return span;
    }
    eq(other) {
      return other.text === this.text;
    }
  }

  // Effect to update ghost text
  const setGhostText = StateEffect.define();

  // State field to track ghost text decoration
  const ghostTextField = StateField.define({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      for (const e of tr.effects) {
        if (e.is(setGhostText)) {
          if (e.value && e.value.text && e.value.pos >= 0) {
            try {
              const widget = Decoration.widget({
                widget: new GhostTextWidget(e.value.text),
                side: 1,
              });
              // Ensure position is within document bounds
              const pos = Math.min(e.value.pos, tr.newDoc.length);
              return Decoration.set([widget.range(pos)]);
            } catch {
              return Decoration.none;
            }
          }
          return Decoration.none;
        }
      }
      // Clear on document changes
      if (tr.docChanged) return Decoration.none;
      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  let {
    value = $bindable(''),
    lang = 'transformer',
    placeholder: _placeholder = '',
    readonly = false,
    onchange = () => {},
  } = $props();

  let editorContainer;
  let editorView;
  const languageConf = new Compartment();

  // Timer refs for cleanup
  let pendingGhostUpdate = null;
  let previewDebounceTimer = null;

  // Create input path autocomplete source (property suggestions from input JSON)
  // Shows paths up to ONE level deeper than what user has typed
  function inputPathCompletions(context) {
    // Read from store directly to ensure we get current value (not stale prop closure)
    const currentInputPaths = get(inputPathsStore);
    if (currentInputPaths.length === 0) return null;

    // Check if we're after a dot (e.g., "user." or "user.addr")
    const afterDot = context.matchBefore(/\.[\w]*$/);
    if (afterDot) {
      // After a dot: show properties of the parent object
      const fullMatch = context.matchBefore(/[\w$][\w$.[\]]*\.[\w]*$/);
      if (!fullMatch) return null;

      const typed = fullMatch.text;
      const lastDotIndex = typed.lastIndexOf('.');
      const parentPath = typed.slice(0, lastDotIndex); // e.g., "user" or "user.address"
      const propertyPrefix = typed.slice(lastDotIndex + 1).toLowerCase(); // e.g., "" or "addr"

      const options = [];
      const parentPathLower = parentPath.toLowerCase();

      for (const p of currentInputPaths) {
        const pathLower = p.path.toLowerCase();

        // Path must be a direct child of parent (e.g., "user.firstName" for parent "user")
        if (!pathLower.startsWith(parentPathLower + '.')) continue;

        // Get the property name after the parent path
        const remainder = p.path.slice(parentPath.length + 1); // e.g., "firstName" or "address.city"

        // Only show direct children (no dots in remainder)
        if (remainder.includes('.') || remainder.includes('[')) continue;

        // Filter by what's typed after the dot
        if (propertyPrefix && !remainder.toLowerCase().startsWith(propertyPrefix)) continue;

        options.push({
          label: remainder,
          type: p.type,
          detail: p.detail,
          boost: 3, // Higher boost for property completions
          fullPath: p.path, // Store full path for preview evaluation
        });
      }

      if (options.length === 0) return null;

      return {
        from: fullMatch.from + lastDotIndex + 1, // Start after the dot
        options,
        validFor: /^[\w]*$/,
      };
    }

    // No dot: show top-level paths that match
    const pathMatch = context.matchBefore(/[\w$][\w$.[\]]*$/);
    if (!pathMatch) return null;

    const typed = pathMatch.text;
    const typedLower = typed.toLowerCase();
    const options = [];

    for (const p of currentInputPaths) {
      const pathLower = p.path.toLowerCase();

      // Only show top-level paths (no dots)
      if (p.path.includes('.') || p.path.includes('[')) continue;

      // Path must start with typed text (case-insensitive)
      if (!pathLower.startsWith(typedLower)) continue;

      options.push({
        label: p.path,
        type: p.type,
        detail: p.detail,
        boost: 2, // Boost input paths above functions
        fullPath: p.path, // Store full path for preview evaluation
      });
    }

    if (options.length === 0) return null;

    return {
      from: pathMatch.from,
      options,
      validFor: /^[\w]*$/,
    };
  }

  // Create transformer expression autocomplete source
  function transformerCompletions(context) {
    // Don't show function suggestions after a dot (property access context)
    const afterDot = context.matchBefore(/\.[\w]*$/);
    if (afterDot) return null;

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
          boost: fn.category === 'Utility' ? 1 : 0,
        });
      }
    }

    // Add keywords
    for (const kw of keywords) {
      if (kw.toLowerCase().startsWith(word.text.toLowerCase())) {
        options.push({
          label: kw,
          type: 'keyword',
        });
      }
    }

    return {
      from: word.from,
      options,
      validFor: /^[\w$]*$/,
    };
  }

  // Create dot-completion for methods after a dot
  function dotCompletions(context) {
    const beforeDot = context.matchBefore(/\.[\w]*/);
    if (!beforeDot) return null;

    const word = beforeDot.text.slice(1); // Remove the dot
    const options = [];

    // Common JS methods that make sense in transformer context
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
          apply: m.apply || m.name,
        });
      }
    }

    return {
      from: beforeDot.from + 1, // After the dot
      options,
      validFor: /^[\w]*$/,
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
      case 'transformer':
      default:
        // Use JavaScript as base with transformer expression autocompletion
        return [
          javascript(),
          autocompletion({
            override: [inputPathCompletions, transformerCompletions, dotCompletions],
            icons: true,
            optionClass: (completion) => `cm-completion-${completion.type}`,
            // Don't auto-accept - require explicit Tab/Enter/Click
            defaultKeymap: true,
            activateOnTyping: true,
            selectOnOpen: true,
            closeOnBlur: true,
          }),
        ];
    }
  }

  // Syntax highlighting using CSS variables for theme support
  // Colors are defined in app.css and change with theme
  const syntaxColors = HighlightStyle.define([
    // Keywords: function, return, const, let, if, else, etc.
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

    // Strings and template literals
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
    { tag: tags.lineComment, class: 'cm-syntax-comment' },
    { tag: tags.blockComment, class: 'cm-syntax-comment' },
  ]);

  // Dark theme
  const darkTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '13px',
      backgroundColor: 'var(--color-bg-secondary)',
    },
    '.cm-content': {
      caretColor: 'var(--color-text)',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-text)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-muted)',
      border: 'none',
      borderRight: '1px solid var(--color-border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-bg-tertiary)',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '12px',
      },
      '& > ul > li': {
        padding: '4px 8px',
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: 'var(--color-accent)',
        color: 'white',
      },
    },
    '.cm-completionIcon': {
      width: '16px',
      marginRight: '4px',
    },
    '.cm-completionIcon-function::after': {
      content: '"ƒ"',
      color: '#a78bfa',
    },
    '.cm-completionIcon-keyword::after': {
      content: '"K"',
      color: '#f472b6',
    },
    '.cm-completionIcon-method::after': {
      content: '"M"',
      color: '#60a5fa',
    },
    '.cm-completionIcon-property::after': {
      content: '"P"',
      color: '#34d399',
    },
    '.cm-completionDetail': {
      color: 'var(--color-text-muted)',
      marginLeft: '8px',
      fontStyle: 'italic',
    },
  });

  onMount(() => {
    // Track document changes
    const docUpdateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        if (newValue !== value) {
          value = newValue;
          onchange(newValue);
        }
      }
    });

    // Track completion selection for ghost text preview and live evaluation
    let lastSelectedLabel = null;
    let wasAutocompleteOpen = false;

    const completionListener = EditorView.updateListener.of((update) => {
      const completion = selectedCompletion(update.state);
      const completions = currentCompletions(update.state);
      const isAutocompleteOpen = completions !== null;
      const currentLabel = completion?.label || null;

      // Only update when selection or open state changes
      if (currentLabel !== lastSelectedLabel || wasAutocompleteOpen !== isAutocompleteOpen) {
        const justClosed = wasAutocompleteOpen && !isAutocompleteOpen;
        lastSelectedLabel = currentLabel;
        wasAutocompleteOpen = isAutocompleteOpen;

        // Clear any pending updates
        if (pendingGhostUpdate) cancelAnimationFrame(pendingGhostUpdate);
        if (previewDebounceTimer) clearTimeout(previewDebounceTimer);

        if (completion && completions) {
          // Autocomplete is open with a selection
          const applyText =
            typeof completion.apply === 'string' ? completion.apply : completion.label;
          const typed = update.state.doc.sliceString(completions.from, completions.to);

          // Ghost text (inline preview of completion)
          let ghostText = '';
          if (applyText.toLowerCase().startsWith(typed.toLowerCase())) {
            ghostText = applyText.slice(typed.length);
          }
          const pos = completions.to;
          pendingGhostUpdate = requestAnimationFrame(() => {
            if (editorView) {
              editorView.dispatch({
                effects: setGhostText.of(ghostText ? { text: ghostText, pos } : null),
              });
            }
          });

          // Preview: only for properties (items with fullPath)
          const fullPath = completion.fullPath;
          if (fullPath && lang === 'transformer') {
            previewDebounceTimer = setTimeout(() => {
              previewExpression.set(fullPath);
            }, 100);
          }
          // For methods/functions: don't change preview (keep last property preview)
        } else if (justClosed) {
          // Autocomplete just closed - clear ghost text and preview
          pendingGhostUpdate = requestAnimationFrame(() => {
            if (editorView) {
              editorView.dispatch({ effects: setGhostText.of(null) });
            }
          });
          previewExpression.set(null);
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
        ghostTextField,
        docUpdateListener,
        completionListener,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readonly),
        // Only accept completion on Tab or Enter (arrow keys just navigate)
        keymap.of([
          { key: 'Tab', run: acceptCompletion },
          { key: 'Enter', run: acceptCompletion },
          ...completionKeymap,
        ]),
      ],
    });

    editorView = new EditorView({
      state,
      parent: editorContainer,
    });
  });

  onDestroy(() => {
    // Clean up timers
    if (pendingGhostUpdate) cancelAnimationFrame(pendingGhostUpdate);
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
    previewExpression.set(null);
    editorView?.destroy();
  });

  // Update editor content when value changes externally
  $effect(() => {
    if (editorView && value !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: value,
        },
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
  /* Ghost text preview for autocomplete */
  :global(.cm-ghost-text) {
    opacity: 0.4;
    font-style: italic;
    pointer-events: none;
  }
</style>
