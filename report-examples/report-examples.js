// ============================================================
// EVALUATION REPORT DATABASE — reports-database.js
// Filter engine, card renderer, modal, stats
// ============================================================

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const state = {
    search: '',
    filters: {
      evalType: new Set(),
      causal: new Set(),
      data: new Set(),
      org: new Set(),
      timeframe: new Set(),
      topics: new Set()
    },
    sort: 'year-desc'
  };

  // ── Boot ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.REPORTS_DATA) {
      console.error('reports-data.js not loaded');
      return;
    }

    buildFilters();
    bindControls();
    render();
    renderStats();
  });

  // ── Collect unique values ──────────────────────────────────
  function unique(field) {
    const s = new Set();
    window.REPORTS_DATA.forEach(r => {
      const val = r[field];
      if (Array.isArray(val)) val.forEach(v => s.add(v));
      else if (val) s.add(val);
    });
    return [...s].sort();
  }

  // ── Build filter pill groups ───────────────────────────────
  function buildFilters() {
    buildPillGroup('filter-eval-type', unique('evaluation_type'), 'evalType');
    buildPillGroup('filter-causal', unique('causal_methods'), 'causal');
    buildPillGroup('filter-data', unique('data_collection'), 'data');
    buildPillGroup('filter-org', unique('org_type'), 'org');
    buildPillGroup('filter-timeframe', unique('timeframe'), 'timeframe');
    buildPillGroup('filter-topics', collectTopics(), 'topics');
  }

  function collectTopics() {
    const s = new Set();
    window.REPORTS_DATA.forEach(r => r.topics.forEach(t => s.add(t)));
    return [...s].sort();
  }

  function buildPillGroup(containerId, values, filterKey) {
    const el = document.getElementById(containerId);
    if (!el) return;
    values.forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'rdb-pill';
      btn.textContent = val;
      btn.dataset.key = filterKey;
      btn.dataset.val = val;
      btn.addEventListener('click', () => toggleFilter(filterKey, val, btn));
      el.appendChild(btn);
    });
  }

  // ── Controls ───────────────────────────────────────────────
  function bindControls() {
    const searchEl = document.getElementById('rdb-search');
    const clearSearchBtn = document.getElementById('rdb-clear-search');
    const sortEl = document.getElementById('rdb-sort');

    searchEl.addEventListener('input', e => {
      state.search = e.target.value.toLowerCase();
      clearSearchBtn.style.display = state.search ? 'flex' : 'none';
      render();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchEl.value = '';
      state.search = '';
      clearSearchBtn.style.display = 'none';
      render();
    });

    sortEl.addEventListener('change', e => {
      state.sort = e.target.value;
      render();
    });

    document.getElementById('rdb-clear-all').addEventListener('click', clearAllFilters);
  }

  function toggleFilter(key, val, btn) {
    const set = state.filters[key];
    if (set.has(val)) {
      set.delete(val);
      btn.classList.remove('active');
    } else {
      set.add(val);
      btn.classList.add('active');
    }
    updateActiveFiltersBar();
    render();
  }

  window.clearAllFilters = function () {
    Object.values(state.filters).forEach(s => s.clear());
    document.querySelectorAll('.rdb-pill.active').forEach(b => b.classList.remove('active'));
    updateActiveFiltersBar();
    render();
  };

  function updateActiveFiltersBar() {
    const bar = document.getElementById('rdb-active-filters');
    const chips = document.getElementById('rdb-active-chips');
    const all = [];
    Object.entries(state.filters).forEach(([key, set]) => set.forEach(v => all.push({ key, v })));

    if (all.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    chips.innerHTML = '';
    all.forEach(({ key, v }) => {
      const chip = document.createElement('button');
      chip.className = 'rdb-chip';
      chip.innerHTML = `${v} <span>✕</span>`;
      chip.addEventListener('click', () => {
        state.filters[key].delete(v);
        const pill = document.querySelector(`.rdb-pill[data-key="${key}"][data-val="${v}"]`);
        if (pill) pill.classList.remove('active');
        updateActiveFiltersBar();
        render();
      });
      chips.appendChild(chip);
    });
  }

  // ── Filter & Sort ──────────────────────────────────────────
  function matchesFilters(report) {
    const f = state.filters;

    const checkSet = (set, reportArr) => {
      if (set.size === 0) return true;
      return [...set].some(v =>
        Array.isArray(reportArr) ? reportArr.includes(v) : reportArr === v
      );
    };

    if (!checkSet(f.evalType, report.evaluation_type)) return false;
    if (!checkSet(f.causal, report.causal_methods)) return false;
    if (!checkSet(f.data, report.data_collection)) return false;
    if (f.org.size > 0 && !f.org.has(report.org_type)) return false;
    if (f.timeframe.size > 0 && !f.timeframe.has(report.timeframe)) return false;
    if (!checkSet(f.topics, report.topics)) return false;

    if (state.search) {
      const q = state.search;
      const hay = [
        report.title, report.organization, report.summary,
        ...report.evaluation_type, ...report.causal_methods,
        ...report.data_collection, ...report.topics,
        report.org_type, report.country, String(report.year)
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  }

  function sortReports(reports) {
    return [...reports].sort((a, b) => {
      if (state.sort === 'year-desc') return b.year - a.year;
      if (state.sort === 'year-asc') return a.year - b.year;
      if (state.sort === 'title-asc') return a.title.localeCompare(b.title);
      return 0;
    });
  }

  // ── Render grid ────────────────────────────────────────────
  function render() {
    const grid = document.getElementById('rdb-grid');
    const empty = document.getElementById('rdb-empty');
    const countEl = document.getElementById('rdb-count');

    const filtered = sortReports(window.REPORTS_DATA.filter(matchesFilters));
    countEl.textContent = `${filtered.length} report${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = filtered.map(r => cardHTML(r)).join('');

    // Stagger animation
    grid.querySelectorAll('.rdb-card').forEach((card, i) => {
      card.style.animationDelay = `${i * 40}ms`;
    });
  }

  function renderStats() {
    const total = window.REPORTS_DATA.length;
    const countries = new Set(window.REPORTS_DATA.map(r => r.country)).size;
    const rcts = window.REPORTS_DATA.filter(r => r.causal_methods.includes('Randomized Controlled Trial')).length;
    const open = window.REPORTS_DATA.filter(r => r.open_access).length;

    document.getElementById('rdb-stats').innerHTML = `
      <div class="rdb-stat"><span class="rdb-stat-num">${total}</span><span class="rdb-stat-label">Reports</span></div>
      <div class="rdb-stat"><span class="rdb-stat-num">${countries}</span><span class="rdb-stat-label">Countries</span></div>
      <div class="rdb-stat"><span class="rdb-stat-num">${rcts}</span><span class="rdb-stat-label">RCTs</span></div>
      <div class="rdb-stat"><span class="rdb-stat-num">${open}</span><span class="rdb-stat-label">Open Access</span></div>
    `;
  }

  // ── Card HTML ──────────────────────────────────────────────
  function cardHTML(r) {
    const mainMethod = r.causal_methods[0] || '';
    const methodBadge = methodColor(mainMethod);
    const typeBadge = r.evaluation_type[0] || '';

    const topTags = r.topics.slice(0, 4).map(t =>
      `<span class="rdb-tag">${t}</span>`
    ).join('');

    const moreTopics = r.topics.length > 4
      ? `<span class="rdb-tag rdb-tag--more">+${r.topics.length - 4}</span>` : '';

    const accessBadge = r.open_access
      ? `<span class="rdb-access rdb-access--open">Open Access</span>`
      : `<span class="rdb-access rdb-access--closed">Access Required</span>`;

    return `
      <article class="rdb-card" onclick="openModal(${r.id})" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' ')openModal(${r.id})">
        <div class="rdb-card-header">
          <div class="rdb-card-badges">
            <span class="rdb-badge rdb-badge--type">${typeBadge}</span>
            <span class="rdb-badge rdb-badge--method" style="${methodBadge}">${mainMethod}</span>
          </div>
          <div class="rdb-card-meta">
            <span class="rdb-card-year">${r.year}</span>
            ${accessBadge}
          </div>
        </div>

        <h3 class="rdb-card-title">${r.title}</h3>
        <p class="rdb-card-org">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 2h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z"/>
          </svg>
          ${r.organization}
        </p>
        <p class="rdb-card-summary">${r.summary}</p>

        <div class="rdb-card-tags">${topTags}${moreTopics}</div>

        <div class="rdb-card-footer">
          <span class="rdb-card-country">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12">
              <circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c-2 2-2 8 0 12M8 2c2 2 2 8 0 12"/>
            </svg>
            ${r.country} · ${r.timeframe}
          </span>
          <span class="rdb-card-cta">View details →</span>
        </div>
      </article>
    `;
  }

  function methodColor(method) {
    const map = {
      'Randomized Controlled Trial': '--bg:#1a4f6e;--c:#e8f4fc',
      'Difference-in-Differences': '--bg:#2d5a27;--c:#e8f5e3',
      'Regression Discontinuity': '--bg:#5a3e6b;--c:#f3eaff',
      'Instrumental Variables': '--bg:#6b4226;--c:#fff0e6',
      'Propensity Score Matching': '--bg:#1a5a5a;--c:#e3f5f5',
      'Synthetic Control': '--bg:#5a4a1a;--c:#fff8e3',
      'Descriptive Analysis': '--bg:#4a4a4a;--c:#f0f0f0',
      'Developmental Evaluation': '--bg:#3a4a6b;--c:#e8eeff',
      'Pre-Post Comparison': '--bg:#5a2d2d;--c:#ffecec',
    };
    return map[method] || '--bg:#3a3a3a;--c:#f0f0f0';
  }

  // ── Modal ──────────────────────────────────────────────────
  window.openModal = function (id) {
    const r = window.REPORTS_DATA.find(x => x.id === id);
    if (!r) return;

    const backdrop = document.getElementById('rdb-modal-backdrop');
    const content = document.getElementById('rdb-modal-content');

    const methodsList = r.causal_methods.map(m => `<span class="rdb-modal-tag rdb-modal-tag--method">${m}</span>`).join('');
    const dataList = r.data_collection.map(d => `<span class="rdb-modal-tag rdb-modal-tag--data">${d}</span>`).join('');
    const evalList = r.evaluation_type.map(e => `<span class="rdb-modal-tag rdb-modal-tag--eval">${e}</span>`).join('');
    const topicList = r.topics.map(t => `<span class="rdb-modal-tag">${t}</span>`).join('');
    const accessHTML = r.open_access
      ? `<span class="rdb-access rdb-access--open">✓ Open Access</span>`
      : `<span class="rdb-access rdb-access--closed">⚠ Access Required</span>`;

    content.innerHTML = `
      <div class="rdb-modal-header">
        <div class="rdb-modal-header-top">
          <span class="rdb-card-year rdb-card-year--lg">${r.year}</span>
          ${accessHTML}
        </div>
        <h2 class="rdb-modal-title">${r.title}</h2>
        <p class="rdb-modal-org">${r.organization}</p>
      </div>

      <p class="rdb-modal-summary">${r.summary}</p>

      <div class="rdb-modal-sections">
        <div class="rdb-modal-section">
          <h4>Evaluation Type</h4>
          <div class="rdb-modal-tags">${evalList}</div>
        </div>
        <div class="rdb-modal-section">
          <h4>Causal / Analytic Methods</h4>
          <div class="rdb-modal-tags">${methodsList}</div>
        </div>
        <div class="rdb-modal-section">
          <h4>Data Collection</h4>
          <div class="rdb-modal-tags">${dataList}</div>
        </div>
        <div class="rdb-modal-section rdb-modal-section--row">
          <div>
            <h4>Organization Type</h4>
            <p>${r.org_type}</p>
          </div>
          <div>
            <h4>Timeframe</h4>
            <p>${r.timeframe}</p>
          </div>
          <div>
            <h4>Country</h4>
            <p>${r.country}</p>
          </div>
        </div>
        <div class="rdb-modal-section">
          <h4>Topics & Tags</h4>
          <div class="rdb-modal-tags">${topicList}</div>
        </div>
      </div>

      <div class="rdb-modal-download">
        <a href="${r.download_url}" target="_blank" rel="noopener" class="rdb-download-btn">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M10 3v10M5 8l5 5 5-5"/><path d="M3 17h14"/>
          </svg>
          Access Report / Source
        </a>
        <p class="rdb-download-note">Opens the report's official page or download link in a new tab.</p>
      </div>
    `;

    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('rdb-modal').scrollTop = 0;
  };

  window.closeModal = function (e) {
    if (e && e.target !== document.getElementById('rdb-modal-backdrop')) return;
    document.getElementById('rdb-modal-backdrop').style.display = 'none';
    document.body.style.overflow = '';
  };

  // Escape key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('rdb-modal-backdrop').style.display = 'none';
      document.body.style.overflow = '';
    }
  });

})();
