// EQL spell tooltips. Hover over any <a href="/spell/<id>"> to fetch the
// spell's JSON record and show a styled tooltip. Cached client-side so the
// second hover is instant.

(function () {
  'use strict';

  const HOVER_DELAY_MS = 250;
  const cache = new Map();           // spell_id -> Promise<json>
  let tooltipEl = null;
  let hoverTimer = null;
  let activeLink = null;
  let currentSpellId = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'spell-tooltip';
    tooltipEl.style.display = 'none';
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function fetchSpell(id) {
    if (cache.has(id)) return cache.get(id);
    const p = fetch('/api/spell/' + id, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status));
    cache.set(id, p);
    return p;
  }

  function fmtFloat(n) {
    if (n == null) return '—';
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(2).replace(/\.?0+$/, '');
  }

  function modeTag(good, isDisc) {
    if (isDisc) return '<span class="tt-tag tt-disc">disc</span>';
    if (good === 1) return '<span class="tt-tag tt-buff">buff</span>';
    if (good === 2) return '<span class="tt-tag tt-grp">group buff</span>';
    return '<span class="tt-tag tt-det">det</span>';
  }

  function renderTooltip(d) {
    const iconHtml = d.icon
      ? `<img src="${d.icon}" class="tt-icon" alt="">`
      : '';
    const cost = d.is_discipline
      ? `<dt>Endurance</dt><dd>${d.endurance_cost ?? 0}</dd>`
      : `<dt>Mana</dt><dd>${d.mana ?? 0}</dd>`;
    const effects = d.effects && d.effects.length
      ? `<table class="tt-effects">
           <thead><tr><th>#</th><th>Effect</th><th>Base</th><th>Lim</th><th>Form</th><th>Max</th></tr></thead>
           <tbody>${d.effects.map(e =>
             `<tr><td>${e.slot}</td>
                  <td>${e.name} <span class="muted">#${e.id}</span></td>
                  <td>${e.base}</td><td>${e.limit}</td>
                  <td>${e.formula}</td><td>${e.max}</td></tr>`).join('')}
           </tbody></table>`
      : '<p class="muted">No effects.</p>';
    const classes = d.classes && d.classes.length
      ? `<div class="tt-classes">${d.classes.map(c =>
           `<span class="tt-class">${c.name} <b>L${c.level}</b></span>`).join('')}</div>`
      : '<p class="muted">No player classes ≤ L50.</p>';
    const desc = d.description
      ? `<div class="tt-desc">${d.description}</div>`
      : '';
    const category = d.category
      ? `<span class="muted">${d.category}</span>` : '';

    return `
      <div class="tt-header">
        ${iconHtml}
        <div class="tt-title">
          <div class="tt-name">${d.name} ${modeTag(d.good_effect, d.is_discipline)}</div>
          <div class="tt-meta"><span class="muted">#${d.id}</span> ${category}</div>
        </div>
      </div>
      ${desc}
      <dl class="tt-stats">
        ${cost}
        <dt>Cast</dt><dd>${fmtFloat(d.cast_time_s)}s</dd>
        <dt>Recast</dt><dd>${fmtFloat(d.recast_s)}s</dd>
        <dt>Recov</dt><dd>${fmtFloat(d.recovery_s)}s</dd>
        <dt>Range</dt><dd>${fmtFloat(d.range)}</dd>
        ${d.aoe_range ? `<dt>AoE</dt><dd>${fmtFloat(d.aoe_range)}</dd>` : ''}
        <dt>Duration</dt><dd>${d.duration}</dd>
        <dt>Target</dt><dd>${d.target}</dd>
        <dt>Resist</dt><dd>${d.resist} (${d.resist_difficulty})</dd>
      </dl>
      <div class="tt-section-label">Effects</div>
      ${effects}
      <div class="tt-section-label">Classes</div>
      ${classes}
    `;
  }

  function positionTooltip(evt) {
    if (!tooltipEl || tooltipEl.style.display === 'none') return;
    const margin = 12;
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = evt.clientX + margin;
    let y = evt.clientY + margin;
    if (x + tw + margin > vw) x = evt.clientX - tw - margin;
    if (y + th + margin > vh) y = vh - th - margin;
    if (y < margin) y = margin;
    tooltipEl.style.left = (x + window.scrollX) + 'px';
    tooltipEl.style.top = (y + window.scrollY) + 'px';
  }

  function showFor(link, evt) {
    const m = link.getAttribute('href').match(/\/spell\/(\d+)/);
    if (!m) return;
    const id = parseInt(m[1], 10);
    currentSpellId = id;
    const tt = ensureTooltip();
    tt.style.display = 'block';
    tt.innerHTML = '<div class="muted">Loading…</div>';
    positionTooltip(evt);

    fetchSpell(id).then(data => {
      if (currentSpellId !== id) return;  // user moved on already
      tt.innerHTML = renderTooltip(data);
      positionTooltip(evt);
    }).catch(err => {
      if (currentSpellId !== id) return;
      tt.innerHTML = '<div class="muted">Error loading spell ' + id + '</div>';
    });
  }

  function hide() {
    currentSpellId = null;
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  function onEnter(evt) {
    const link = evt.target.closest('a[href^="/spell/"]');
    if (!link) return;
    activeLink = link;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (activeLink === link) showFor(link, evt);
    }, HOVER_DELAY_MS);
  }

  function onLeave(evt) {
    const link = evt.target.closest('a[href^="/spell/"]');
    if (!link) return;
    activeLink = null;
    clearTimeout(hoverTimer);
    hide();
  }

  function onMove(evt) {
    if (tooltipEl && tooltipEl.style.display === 'block') {
      positionTooltip(evt);
    }
  }

  document.addEventListener('mouseover', onEnter);
  document.addEventListener('mouseout', onLeave);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  document.addEventListener('scroll', hide, { passive: true });
})();
