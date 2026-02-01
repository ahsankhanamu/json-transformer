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
    inputPaths = [],
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
    // Match property paths: word, word.word, word[].word, etc.
    const pathMatch = context.matchBefore(/[\w$][\w$.[\]]*$/);
    if (!pathMatch || inputPaths.length === 0) return null;

    const typed = pathMatch.text;
    const typedLower = typed.toLowerCase();
    const options = [];

    // Count depth: number of '.' plus number of '[]' or '[n]' segments
    const countDepth = (s) => {
      const dots = (s.match(/\./g) || []).length;
      const brackets = (s.match(/\[[^\]]*\]/g) || []).length;
      return dots + brackets;
    };

    const typedDepth = countDepth(typed);

    for (const p of inputPaths) {
      const pathLower = p.path.toLowerCase();

      // Path must start with typed text (case-insensitive)
      if (!pathLower.startsWith(typedLower)) continue;

      // Path depth must be at most one more than typed depth
      const pathDepth = countDepth(p.path);
      if (pathDepth > typedDepth + 1) continue;

      // Show just the suffix (what comes after typed text) for cleaner display
      // e.g., if user typed "user.address.", show "city" not "user.address.city"
      const suffix = p.path.slice(typed.length);
      const displayLabel = suffix || p.path;

      options.push({
        label: displayLabel,
        apply: p.path, // Insert full path
        type: p.type,
        detail: p.detail,
        boost: 2, // Boost input paths above functions
      });
    }

    if (options.length === 0) return null;

    return {
      from: pathMatch.from,
      options,
      validFor: /^[\w$.[\]]*$/,
    };
  }

  // Create transformer expression autocomplete source
  function transformerCompletions(context) {
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

    const completionListener = EditorView.updateListener.of((update) => {
      const completion = selectedCompletion(update.state);
      const completions = currentCompletions(update.state);

      // Get current selection label (or null if no selection)
      const currentLabel = completion?.label || null;

      // If completion changed, update ghost text and preview
      if (currentLabel !== lastSelectedLabel) {
        lastSelectedLabel = currentLabel;

        // Clear any pending ghost update
        if (pendingGhostUpdate) {
          cancelAnimationFrame(pendingGhostUpdate);
        }

        if (completion && completions) {
          // Get the text that would be inserted
          const applyText =
            typeof completion.apply === 'string' ? completion.apply : completion.label;
          // Get what's already typed (the part that matches)
          const typed = update.state.doc.sliceString(completions.from, completions.to);
          // Ghost text is the remaining part (case-insensitive match)
          let ghostText = '';
          if (applyText.toLowerCase().startsWith(typed.toLowerCase())) {
            ghostText = applyText.slice(typed.length);
          }

          // Schedule ghost text update for next frame to avoid dispatch during update
          const pos = completions.to;
          pendingGhostUpdate = requestAnimationFrame(() => {
            if (ghostText && editorView) {
              editorView.dispatch({
                effects: setGhostText.of({ text: ghostText, pos }),
              });
            } else if (editorView) {
              editorView.dispatch({ effects: setGhostText.of(null) });
            }
          });

          // For input path completions, show live preview evaluation
          // Check if this completion is from inputPaths (not a function or keyword)
          // Use applyText since label may be just the suffix (e.g., "city" instead of "user.address.city")
          const currentInputPaths = get(inputPathsStore);
          const isInputPath = currentInputPaths.some((p) => p.path === applyText);

          if (isInputPath && lang === 'transformer') {
            // Debounce preview evaluation (150ms) - allows quick arrow navigation
            // without triggering expensive eval on every keystroke
            if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
            previewDebounceTimer = setTimeout(() => {
              previewExpression.set(applyText);
            }, 150);
          } else {
            if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
            previewExpression.set(null);
          }
        } else {
          // No completion selected, clear ghost text and preview
          pendingGhostUpdate = requestAnimationFrame(() => {
            if (editorView) {
              editorView.dispatch({ effects: setGhostText.of(null) });
            }
          });
          if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
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
    // Clear preview expression when editor unmounts
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
