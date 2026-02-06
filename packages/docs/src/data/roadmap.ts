// Roadmap data for JSON Transformer
// Edit this file to update the roadmap page

export interface RoadmapItem {
  title: string;
  description: string;
}

export interface RoadmapColumn {
  title: string;
  items: RoadmapItem[];
}

export const roadmap: RoadmapColumn[] = [
  {
    title: 'Recently Shipped',
    items: [
      {
        title: 'Arrow Function Implicit Access',
        description: 'Use .property inside arrow bodies for cleaner syntax',
      },
      {
        title: 'Pipe Property Access',
        description: 'jq-style property access after pipe operator',
      },
      {
        title: 'Auto Property Projection',
        description: 'Automatic mapping after filter/slice operations',
      },
      {
        title: 'Context Variables',
        description: '$item, $index, $first, $last for iterations',
      },
      {
        title: 'Theme-Aware Highlighting',
        description: 'Syntax colors adapt to dark/light/midnight themes',
      },
    ],
  },
  {
    title: 'In Progress',
    items: [
      {
        title: 'TypeScript Type Generation',
        description: 'Generate TypeScript types from expressions',
      },
      {
        title: 'VS Code Extension',
        description: 'Syntax highlighting and autocomplete for VS Code',
      },
      {
        title: 'Performance Benchmarks',
        description: 'Compare against jq, JSONPath, and native JS',
      },
    ],
  },
  {
    title: 'Planning',
    items: [
      {
        title: 'Recursive Descent',
        description: 'Support for recursive data structures with ..',
      },
      {
        title: 'Schema Validation',
        description: 'Validate expressions against JSON Schema',
      },
      {
        title: 'REPL Mode',
        description: 'Interactive command-line REPL for testing',
      },
      {
        title: 'Streaming Support',
        description: 'Process large JSON files with streaming parser',
      },
      {
        title: 'Custom Functions',
        description: 'Define and register custom helper functions',
      },
      {
        title: 'Import/Export',
        description: 'Import expressions from files, export to modules',
      },
    ],
  },
];
