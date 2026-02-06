// Changelog data for JSON Transformer
// Edit this file to update the changelog page

export type ChangeCategory = 'feature' | 'bugfix' | 'improvement' | 'breaking';
export type ReleaseType = 'feature' | 'bugfix' | 'milestone';

export interface ChangeSection {
  title: string;
  category: ChangeCategory;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: ReleaseType; // Determines the timeline node icon
  badge?: string; // Optional badge like "CLI Only", "Beta", etc.
  sections: ChangeSection[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.1',
    date: '31 Jan 2026',
    type: 'bugfix',
    sections: [
      {
        title: "What's New",
        category: 'feature',
        items: [
          'Context variables for iterations ($item, $index, $first, $last, etc.)',
          '$identifier syntax support for special variables',
          'Relaxed sort/group syntax with dot-prefix, bare identifier, or quoted strings',
        ],
      },
      {
        title: 'Bug Fixes',
        category: 'bugfix',
        items: [
          'Arrow function parameters now properly scoped in codegen',
          'Empty brackets [] now supported as shorthand for [*]',
          '[*].method() now correctly calls array methods',
          'Pipe expression helper resolution fixed',
          'Nested paths now work in sort/groupBy/keyBy',
        ],
      },
      {
        title: 'Playground',
        category: 'improvement',
        items: [
          'Tab completion in CodeMirror autocomplete',
          'Improved syntax highlighting contrast',
          'Sidepanel layout resizer added',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '31 Jan 2026',
    type: 'milestone',
    sections: [
      {
        title: "What's New",
        category: 'feature',
        items: [
          'Arrow function implicit property access (.property inside arrow bodies)',
          'Automatic property projection for array operations',
          'Pipe property access (jq-style) with | .field syntax',
          'Theme-aware syntax highlighting in playground',
        ],
      },
      {
        title: 'Monorepo Restructuring',
        category: 'improvement',
        items: [
          'Restructured to npm workspaces monorepo',
          '@ahsankhanamu/json-transformer core library package',
          'Separate playground and docs packages',
          'Tree-shaking support with subpath exports',
        ],
      },
    ],
  },
];

// Helper to get icon for category
export function getCategoryIcon(category: ChangeCategory): string {
  switch (category) {
    case 'feature':
      return 'gift'; // New features
    case 'bugfix':
      return 'bug'; // Bug fixes
    case 'improvement':
      return 'sparkles'; // Improvements
    case 'breaking':
      return 'warning'; // Breaking changes
    default:
      return 'info';
  }
}
