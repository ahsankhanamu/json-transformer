// Shim for SvelteKit's $app/environment
export const browser = typeof window !== 'undefined';
export const dev = import.meta.env.DEV;
export const building = false;
export const version = '1.0.0';
