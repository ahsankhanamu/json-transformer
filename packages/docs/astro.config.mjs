import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
            document.querySelectorAll('.social-icons a, a[href*="github.com"]').forEach(a => {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener');
            });
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
          label: 'API',
          items: [
            { label: 'JavaScript API', slug: 'api/javascript' },
            { label: 'Code Generation', slug: 'api/codegen' },
          ],
        },
      ],
    }),
  ],
});
