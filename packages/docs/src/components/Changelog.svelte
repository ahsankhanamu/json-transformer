<script lang="ts">
  import { changelog, type ChangeCategory, type ReleaseType } from '../data/changelog';

  function getCategoryIcon(category: ChangeCategory): string {
    switch (category) {
      case 'feature':
        // Gift icon for new features
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`;
      case 'bugfix':
        // Gear/cog icon for bug fixes (maintenance)
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
      case 'improvement':
        // Sparkles icon for improvements
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`;
      case 'breaking':
        // Warning triangle for breaking changes
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
    }
  }

  function getReleaseTypeIcon(type: ReleaseType): string {
    switch (type) {
      case 'feature':
        // Gift icon for feature releases
        return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`;
      case 'bugfix':
        // Gear icon for bugfix releases
        return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
      case 'milestone':
        // Flag icon for milestone releases
        return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;
      default:
        // Tag icon as fallback
        return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`;
    }
  }
</script>

<div class="changelog-page">
  <header class="changelog-header">
    <h1>Changelog</h1>
    <p class="tagline">
      JSON Transformer is a query and transformation language that compiles to JavaScript. Track all
      releases and updates here.
    </p>
  </header>

  <div class="timeline">
    {#each changelog as entry, entryIndex}
      <div class="timeline-entry">
        <div class="timeline-left">
          <span class="version">v{entry.version}</span>
          {#if entry.badge}
            <span class="badge">{entry.badge}</span>
          {/if}
          <span class="date">{entry.date}</span>
        </div>

        <div class="timeline-center">
          <div class="timeline-node" data-type={entry.type}>
            <!-- History/timer icon with circular arrow -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
          </div>
          {#if entryIndex < changelog.length - 1}
            <div class="timeline-line"></div>
          {/if}
        </div>

        <div class="timeline-right">
          {#each entry.sections as section}
            <div class="change-section">
              <h3 class="section-title">
                <span class="section-icon">{@html getCategoryIcon(section.category)}</span>
                {section.title}
              </h3>
              <ul class="change-list">
                {#each section.items as item}
                  <li>{item}</li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .changelog-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .changelog-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .changelog-header h1 {
    font-size: 3.5rem;
    font-weight: 700;
    font-style: italic;
    margin: 0 0 1rem 0;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    font-size: 1.1rem;
    color: #64748b;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  :global([data-theme='dark']) .tagline {
    color: #94a3b8;
  }

  .timeline {
    position: relative;
  }

  .timeline-entry {
    display: grid;
    grid-template-columns: 200px 60px 1fr;
    gap: 0;
    margin-bottom: 0;
  }

  .timeline-left {
    text-align: right;
    padding-right: 1.5rem;
    padding-top: 0.5rem;
  }

  .version {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #6366f1;
    margin-bottom: 0.25rem;
  }

  :global([data-theme='dark']) .version {
    color: #818cf8;
  }

  .badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    background: #6366f1;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.25rem;
  }

  .date {
    display: block;
    font-size: 0.9rem;
    color: #64748b;
  }

  :global([data-theme='dark']) .date {
    color: #94a3b8;
  }

  .timeline-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .timeline-node {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #6366f1;
  }

  :global([data-theme='dark']) .timeline-node {
    color: #818cf8;
  }

  /* Type-specific colors */
  .timeline-node[data-type='feature'] {
    color: #10b981;
  }
  :global([data-theme='dark']) .timeline-node[data-type='feature'] {
    color: #34d399;
  }

  .timeline-node[data-type='bugfix'] {
    color: #f59e0b;
  }
  :global([data-theme='dark']) .timeline-node[data-type='bugfix'] {
    color: #fbbf24;
  }

  .timeline-node[data-type='milestone'] {
    color: #6366f1;
  }
  :global([data-theme='dark']) .timeline-node[data-type='milestone'] {
    color: #818cf8;
  }

  .timeline-line {
    width: 2px;
    flex: 1;
    min-height: 40px;
    background: linear-gradient(to bottom, #6366f1, #c7d2fe);
  }

  :global([data-theme='dark']) .timeline-line {
    background: linear-gradient(to bottom, #818cf8, #312e81);
  }

  .timeline-right {
    padding-left: 1.5rem;
    padding-bottom: 3rem;
  }

  .change-section {
    margin-bottom: 1.5rem;
  }

  .change-section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.75rem 0;
  }

  :global([data-theme='dark']) .section-title {
    color: #f1f5f9;
  }

  .section-icon {
    display: flex;
    align-items: center;
    color: #6366f1;
  }

  :global([data-theme='dark']) .section-icon {
    color: #818cf8;
  }

  .change-list {
    margin: 0;
    padding-left: 1.5rem;
    list-style-type: disc;
  }

  .change-list li {
    color: #475569;
    line-height: 1.7;
    margin-bottom: 0.25rem;
  }

  :global([data-theme='dark']) .change-list li {
    color: #cbd5e1;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .timeline-entry {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .timeline-left {
      text-align: left;
      padding-right: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .version {
      font-size: 1.25rem;
      margin-bottom: 0;
    }

    .date {
      display: inline;
    }

    .timeline-center {
      display: none;
    }

    .timeline-right {
      padding-left: 0;
      padding-bottom: 2rem;
      border-left: 3px solid #6366f1;
      padding-left: 1.5rem;
    }

    :global([data-theme='dark']) .timeline-right {
      border-left-color: #818cf8;
    }

    .changelog-header h1 {
      font-size: 2.5rem;
    }
  }
</style>
