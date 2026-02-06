<script lang="ts">
  import { roadmap } from '../data/roadmap';
</script>

<div class="roadmap-page">
  <header class="roadmap-header">
    <h1>Rolling Roadmap</h1>
    <p class="tagline">
      We highlight important and upcoming features on this roadmap. For a complete list of released
      features and updates, check out our
      <a href="/changelog">changelog</a>.
    </p>
  </header>

  <div class="roadmap-columns">
    {#each roadmap as column}
      <div class="roadmap-column">
        <div class="column-header">
          <span class="column-title">{column.title}</span>
          <span class="column-count">{column.items.length}</span>
        </div>
        <div class="column-items">
          {#each column.items as item}
            <div class="roadmap-card">
              <h3 class="card-title">{item.title}</h3>
              <p class="card-description">{item.description}</p>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .roadmap-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .roadmap-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .roadmap-header h1 {
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
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  :global([data-theme='dark']) .tagline {
    color: #94a3b8;
  }

  .tagline a {
    color: #6366f1;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .tagline a:hover {
    color: #4f46e5;
  }

  :global([data-theme='dark']) .tagline a {
    color: #818cf8;
  }

  :global([data-theme='dark']) .tagline a:hover {
    color: #a5b4fc;
  }

  .roadmap-columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    align-items: start;
  }

  .roadmap-column {
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
  }

  :global([data-theme='dark']) .roadmap-column {
    background: #1e293b;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e2e8f0;
  }

  :global([data-theme='dark']) .column-header {
    border-bottom-color: #334155;
  }

  .column-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  :global([data-theme='dark']) .column-title {
    color: #f1f5f9;
  }

  .column-count {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    background: #e2e8f0;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
  }

  :global([data-theme='dark']) .column-count {
    color: #94a3b8;
    background: #334155;
  }

  .column-items {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .roadmap-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;
    cursor: default;
  }

  :global([data-theme='dark']) .roadmap-card {
    background: #0f172a;
    border-color: #334155;
  }

  .roadmap-card:hover {
    border-color: #6366f1;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  }

  :global([data-theme='dark']) .roadmap-card:hover {
    border-color: #818cf8;
    box-shadow: 0 4px 12px rgba(129, 140, 248, 0.1);
  }

  .card-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }

  :global([data-theme='dark']) .card-title {
    color: #f1f5f9;
  }

  .card-description {
    font-size: 0.85rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }

  :global([data-theme='dark']) .card-description {
    color: #94a3b8;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .roadmap-columns {
      grid-template-columns: 1fr;
      max-width: 500px;
      margin: 0 auto;
    }
  }

  @media (max-width: 768px) {
    .roadmap-header h1 {
      font-size: 2.5rem;
    }
  }
</style>
