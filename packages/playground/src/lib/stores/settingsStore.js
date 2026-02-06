import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/** @typedef {'light' | 'dark' | 'midnight'} ThemeName */
/** @typedef {'standard' | 'stacked' | 'sidepanel' | 'focus'} LayoutName */
/** @typedef {'ltr' | 'rtl'} Direction */

/**
 * Theme definitions - matching adeo-data-mapper
 * @type {Record<ThemeName, { name: string; colors: Record<string, string> }>}
 */
export const themes = {
  light: {
    name: 'Light',
    colors: {
      // UI colors
      bg: '#f5f6fa',
      'bg-secondary': '#ffffff',
      'bg-tertiary': '#f3f4f6',
      text: '#1f2937',
      'text-secondary': '#4b5563',
      'text-muted': '#9ca3af',
      border: '#e5e7eb',
      accent: '#3b82f6',
      'accent-hover': '#2563eb',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      'active-line': 'rgba(59, 130, 246, 0.08)',
      selection: 'rgba(59, 130, 246, 0.15)',
      // Syntax highlighting (GitHub Light / One Light inspired)
      'syntax-keyword': '#d73a49',
      'syntax-control': '#a626a4',
      'syntax-function': '#6f42c1',
      'syntax-variable': '#24292e',
      'syntax-property': '#005cc5',
      'syntax-string': '#22863a',
      'syntax-number': '#005cc5',
      'syntax-bool': '#d73a49',
      'syntax-operator': '#d73a49',
      'syntax-bracket': '#24292e',
      'syntax-comment': '#6a737d',
      'syntax-type': '#6f42c1',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      // UI colors
      bg: '#121218',
      'bg-secondary': '#1c1c24',
      'bg-tertiary': '#2e2e3a',
      text: '#f0f0f5',
      'text-secondary': '#b8b8c5',
      'text-muted': '#606078',
      border: '#363645',
      accent: '#5b9fff',
      'accent-hover': '#7bb3ff',
      success: '#50e080',
      error: '#ff7b7b',
      warning: '#ffb938',
      'active-line': 'rgba(91, 159, 255, 0.15)',
      selection: 'rgba(91, 159, 255, 0.3)',
      // Syntax highlighting (One Dark Pro inspired)
      'syntax-keyword': '#c678dd',
      'syntax-control': '#c678dd',
      'syntax-function': '#e5c07b',
      'syntax-variable': '#e06c75',
      'syntax-property': '#61afef',
      'syntax-string': '#98c379',
      'syntax-number': '#d19a66',
      'syntax-bool': '#d19a66',
      'syntax-operator': '#56b6c2',
      'syntax-bracket': '#abb2bf',
      'syntax-comment': '#5c6370',
      'syntax-type': '#e5c07b',
    },
  },
  midnight: {
    name: 'Midnight Blue',
    colors: {
      // UI colors
      bg: '#0a1628',
      'bg-secondary': '#132039',
      'bg-tertiary': '#243b5c',
      text: '#e2e8f0',
      'text-secondary': '#a8c0e0',
      'text-muted': '#5a7aa0',
      border: '#1e3a5f',
      accent: '#22d3ee',
      'accent-hover': '#67e8f9',
      success: '#4ade80',
      error: '#fb7185',
      warning: '#fb923c',
      'active-line': 'rgba(34, 211, 238, 0.15)',
      selection: 'rgba(34, 211, 238, 0.3)',
      // Syntax highlighting
      'syntax-keyword': '#22d3ee',
      'syntax-control': '#e879f9',
      'syntax-function': '#fcd34d',
      'syntax-variable': '#a5f3fc',
      'syntax-property': '#a5f3fc',
      'syntax-string': '#fda4af',
      'syntax-number': '#86efac',
      'syntax-bool': '#22d3ee',
      'syntax-operator': '#e2e8f0',
      'syntax-bracket': '#fcd34d',
      'syntax-comment': '#4ade80',
      'syntax-type': '#5eead4',
    },
  },
};

/**
 * Layout definitions
 * @type {Record<LayoutName, { name: string; description: string; icon: string }>}
 */
export const layouts = {
  standard: {
    name: 'Standard',
    description: 'Input & Preview side by side, Expression below',
    icon: 'standard',
  },
  stacked: {
    name: 'Stacked',
    description: 'All panels vertical',
    icon: 'stacked',
  },
  sidepanel: {
    name: 'Side Panel',
    description: 'Input & Expression left, Preview right',
    icon: 'sidepanel',
  },
  focus: {
    name: 'Focus',
    description: 'Expression & Input left, Preview right',
    icon: 'focus',
  },
};

/**
 * Direction for horizontal layouts (LTR/RTL)
 * @returns {Direction}
 */
function getInitialDirection() {
  if (!browser) return 'ltr';
  const saved = localStorage.getItem('jt-direction');
  return saved === 'rtl' ? 'rtl' : 'ltr';
}

function createDirectionStore() {
  const initialDirection = browser ? getInitialDirection() : 'ltr';
  const { subscribe, set, update } = writable(initialDirection);

  return {
    subscribe,
    /** @param {Direction} dir */
    set: (dir) => {
      set(dir);
      if (browser) {
        localStorage.setItem('jt-direction', dir);
      }
    },
    toggle: () => {
      update((current) => {
        /** @type {Direction} */
        const newDir = current === 'ltr' ? 'rtl' : 'ltr';
        if (browser) {
          localStorage.setItem('jt-direction', newDir);
        }
        return newDir;
      });
    },
  };
}

export const layoutDirection = createDirectionStore();

/**
 * Get initial theme
 * @returns {ThemeName}
 */
function getInitialTheme() {
  if (!browser) return 'dark';
  const saved = /** @type {ThemeName | null} */ (localStorage.getItem('jt-theme'));
  if (saved && saved in themes) return saved;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

/**
 * Get initial layout
 * @returns {LayoutName}
 */
function getInitialLayout() {
  if (!browser) return 'standard';
  const saved = /** @type {LayoutName | null} */ (localStorage.getItem('jt-layout'));
  if (saved && saved in layouts) return saved;
  return 'standard';
}

/**
 * Apply theme to document
 * @param {ThemeName} themeName
 */
function applyTheme(themeName) {
  if (!browser) return;
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'midnight');
  root.classList.add(themeName);

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

/** Create theme store */
function createThemeStore() {
  const initialTheme = browser ? getInitialTheme() : 'dark';
  const { subscribe, set } = writable(initialTheme);

  return {
    subscribe,
    /** @param {ThemeName} themeName */
    set: (themeName) => {
      if (themeName in themes) {
        set(themeName);
        if (browser) {
          localStorage.setItem('jt-theme', themeName);
          applyTheme(themeName);
        }
      }
    },
    init: () => {
      if (browser) {
        const theme = getInitialTheme();
        set(theme);
        applyTheme(theme);
      }
    },
  };
}

/** Create layout store */
function createLayoutStore() {
  const initialLayout = browser ? getInitialLayout() : 'standard';
  const { subscribe, set } = writable(initialLayout);

  return {
    subscribe,
    /** @param {LayoutName} layoutName */
    set: (layoutName) => {
      if (layoutName in layouts) {
        set(layoutName);
        if (browser) {
          localStorage.setItem('jt-layout', layoutName);
        }
      }
    },
  };
}

export const currentTheme = createThemeStore();
export const currentLayout = createLayoutStore();

// Derived stores for convenience
export const themeInfo = derived(currentTheme, (/** @type {ThemeName} */ $theme) => ({
  id: $theme,
  ...themes[$theme],
}));

export const layoutInfo = derived(currentLayout, (/** @type {LayoutName} */ $layout) => ({
  id: $layout,
  ...layouts[$layout],
}));

export function getAvailableThemes() {
  return Object.entries(themes).map(([id, theme]) => ({ id, name: theme.name }));
}

export function getAvailableLayouts() {
  return Object.entries(layouts).map(([id, layout]) => ({ id, ...layout }));
}
