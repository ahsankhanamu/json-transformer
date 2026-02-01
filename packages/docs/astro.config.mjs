import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  integrations: [
    starlight({
      title: 'JSON Transformer',
      description: 'JSON Query and Transformation Language that compiles to JavaScript',
      social: {
        github: 'https://github.com/ahsankhanamu/json-transformer',
      },
      head: [
        {
          tag: 'script',
          content: `document.addEventListener('DOMContentLoaded', () => {
            // Open GitHub links in new tab
            document.querySelectorAll('.social-icons a, a[href*="github.com"]').forEach(a => {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener');
            });
            // Add Playground link next to GitHub icon
            const socialIcons = document.querySelector('.social-icons');
            if (socialIcons && !document.querySelector('.playground-header-link')) {
              const link = document.createElement('a');
              link.href = '/playground';
              link.className = 'playground-header-link';
              link.textContent = 'Playground';
              socialIcons.prepend(link);
            }
          });`,
        },
      ],
      customCss: ['./src/styles/custom.css'],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'guides/introduction' },
            { label: 'Quick Start', slug: 'guides/quickstart' },
          ],
        },
        {
          label: 'Language Reference',
          items: [
            { label: 'Expressions', slug: 'reference/expressions' },
            { label: 'Functions', slug: 'reference/functions' },
            { label: 'Operators', slug: 'reference/operators' },
          ],
        },
        {
          label: 'Concepts',
          items: [{ label: 'Design Principles', slug: 'concepts/design-principles' }],
        },
        {
          label: 'API',
          items: [
            { label: 'JavaScript API', slug: 'api/javascript' },
            { label: 'Code Generation', slug: 'api/codegen' },
          ],
        },
      ],
    }),
    svelte(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        $lib: path.resolve(__dirname, '../playground/src/lib'),
        '$app/environment': path.resolve(__dirname, './src/shims/app-environment.js'),
      },
    },
  },
});
