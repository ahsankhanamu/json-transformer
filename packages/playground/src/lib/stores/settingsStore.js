import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme definitions - matching adeo-data-mapper
 */
export const themes = {
  light: {
    name: 'Light',
    colors: {
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
    },
  },
  dark: {
    name: 'Dark',
    colors: {
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
    },
  },
  midnight: {
    name: 'Midnight Blue',
    colors: {
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
    },
  },
};

/**
 * Layout definitions
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
};

// Direction for horizontal layouts (LTR/RTL)
function getInitialDirection() {
  if (!browser) return 'ltr';
  const saved = localStorage.getItem('mapql-direction');
  return saved === 'rtl' ? 'rtl' : 'ltr';
}

function createDirectionStore() {
  const initialDirection = browser ? getInitialDirection() : 'ltr';
  const { subscribe, set, update } = writable(initialDirection);

  return {
    subscribe,
    set: (dir) => {
      set(dir);
      if (browser) {
        localStorage.setItem('mapql-direction', dir);
      }
    },
    toggle: () => {
      update((current) => {
        const newDir = current === 'ltr' ? 'rtl' : 'ltr';
        if (browser) {
          localStorage.setItem('mapql-direction', newDir);
        }
        return newDir;
      });
    },
  };
}

export const layoutDirection = createDirectionStore();

// Get initial theme
function getInitialTheme() {
  if (!browser) return 'dark';
  const saved = localStorage.getItem('mapql-theme');
  if (saved && themes[saved]) return saved;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

// Get initial layout
function getInitialLayout() {
  if (!browser) return 'standard';
  const saved = localStorage.getItem('mapql-layout');
  if (saved && layouts[saved]) return saved;
  return 'standard';
}

// Apply theme to document
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

// Create theme store
function createThemeStore() {
  const initialTheme = browser ? getInitialTheme() : 'dark';
  const { subscribe, set } = writable(initialTheme);

  return {
    subscribe,
    set: (themeName) => {
      if (themes[themeName]) {
        set(themeName);
        if (browser) {
          localStorage.setItem('mapql-theme', themeName);
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

// Create layout store
function createLayoutStore() {
  const initialLayout = browser ? getInitialLayout() : 'standard';
  const { subscribe, set } = writable(initialLayout);

  return {
    subscribe,
    set: (layoutName) => {
      if (layouts[layoutName]) {
        set(layoutName);
        if (browser) {
          localStorage.setItem('mapql-layout', layoutName);
        }
      }
    },
  };
}

export const currentTheme = createThemeStore();
export const currentLayout = createLayoutStore();

// Derived stores for convenience
export const themeInfo = derived(currentTheme, ($theme) => ({
  id: $theme,
  ...themes[$theme],
}));

export const layoutInfo = derived(currentLayout, ($layout) => ({
  id: $layout,
  ...layouts[$layout],
}));

export function getAvailableThemes() {
  return Object.entries(themes).map(([id, theme]) => ({ id, name: theme.name }));
}

export function getAvailableLayouts() {
  return Object.entries(layouts).map(([id, layout]) => ({ id, ...layout }));
}
