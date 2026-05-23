
let allResults = [];
let currentFilter = 'all';


function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catClass(cat) {
  const map = {
    'jailbreak':    'cat-jailbreak',
    'override':     'cat-override',
    'persona':      'cat-persona',
    'manipulation': 'cat-manipulation',
    'off-topic':    'cat-off-topic',
    'ambiguous':    'cat-ambiguous',
    'edge-case':    'cat-edge-case',
    'roleplay':     'cat-roleplay',
  };
  return map[(cat || '').toLowerCase()] || 'cat-default';
}

function scoreColor(score) {
  if (score >= 7) return 'var(--ok)';
  if (score >= 4) return 'var(--warn)';
  return 'var(--danger)';
}

// ── Summary cards ─────────────────────────────────────────────────

function updateSummary(results) {
  const total = results.length;
  const pass  = results.filter(r => r.evaluation?.verdict === 'pass').length;
  const warn  = results.filter(r => r.evaluation?.verdict === 'warn').length;
  const fail  = results.filter(r => r.evaluation?.verdict === 'fail').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pass').textContent  = pass;
  document.getElementById('stat-warn').textContent  = warn;
  document.getElementById('stat-fail').textContent  = fail;

  if (total > 0) {
    const avg = Math.round(results.reduce((a, r) => a + (r.evaluation?.score || 5), 0) / total * 10);
    const scoreEl = document.getElementById('stat-score');
    scoreEl.textContent = avg + '%';
    scoreEl.style.color = scoreColor(avg / 10);
  } else {
    document.getElementById('stat-score').textContent = '—';
  }
}

function buildTestCard(result) {
  const v   = result.evaluation?.verdict || 'warn';
  const ev  = result.evaluation || {};
  const isExpanded = document.getElementById('auto-expand')?.checked && v !== 'pass';

  const failureTypeHtml = ev.failure_type
    ? `<div class="failure-type ${v}">${esc(ev.failure_type)}</div>`
    : '';

  return `
    <div class="test-card ${isExpanded ? 'expanded' : ''}" id="tc-${result.id}" onclick="toggleCard(${result.id})">
      <div class="test-header">
        <div class="test-num">${String(result.id).padStart(2,'0')}</div>
        <div class="test-info">
          <div class="test-input-preview">${esc(result.input)}</div>
          <div class="test-meta">
            <span class="cat-badge ${catClass(result.category)}">${esc(result.category)}</span>
            ${ev.score != null ? `<span style="font-family:var(--mono);font-size:10px;color:${scoreColor(ev.score)};">${ev.score}/10</span>` : ''}
          </div>
        </div>
        <div class="verdict-badge ${v}">
          <div class="verdict-dot"></div>
          ${v.toUpperCase()}
        </div>
      </div>
      <div class="test-body">
        <div class="detail-block">
          <div class="detail-label">Test Intent</div>
          <div class="detail-content">${esc(result.intent)}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">Model Response</div>
          <div class="detail-content">${esc(result.response || '…')}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">Evaluation</div>
          ${failureTypeHtml}
          <div class="eval-box ${v}">${esc(ev.reason || 'No evaluation available.')}</div>
        </div>
      </div>
    </div>
  `;
}


function buildLoadingCard(id, category, input) {
  return `
    <div class="test-card" id="tc-loading-${id}">
      <div class="test-header">
        <div class="test-num">${String(id).padStart(2,'0')}</div>
        <div class="test-info">
          <div class="test-input-preview" style="color:var(--text2);">${esc(input)}</div>
          <div class="test-meta">
            <span class="cat-badge ${catClass(category)}">${esc(category)}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-left:auto;padding-left:12px;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;
}



function renderTestList() {
  const container = document.getElementById('test-list');
  container.innerHTML = allResults.map(r => buildTestCard(r)).join('');
  applyFilter(currentFilter);
}

function applyFilter(filter) {
  document.querySelectorAll('.test-card[id^="tc-"]').forEach(card => {
    const id = parseInt(card.id.replace('tc-', ''));
    const result = allResults.find(r => r.id === id);
    if (!result) return;
    const v = result.evaluation?.verdict || 'warn';
    if (filter === 'all' || filter === v) {
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilter(filter);
}


function toggleCard(id) {
  const el = document.getElementById('tc-' + id);
  if (el) el.classList.toggle('expanded');
}

// ── Progress bar ──────

function setProgress(pct, label) {
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-label').textContent = label;
}

// ── Hardened prompt section ─────
function showImprovedPrompt(text) {
  document.getElementById('improved-content').textContent = text;
  document.getElementById('improved-section').style.display = 'flex';
  document.getElementById('improved-section').style.flexDirection = 'column';
  document.getElementById('improved-section').style.gap = '12px';
}

function copyImproved() {
  const text = document.getElementById('improved-content').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Improved prompt copied!'));
}

// ── Export / Copy report ──────────────────────────────────────────

function exportReport() {
  if (!allResults.length) return showToast('No results to export.');
  const data = {
    generated_at: new Date().toISOString(),
    system_prompt: document.getElementById('prompt-input').value.trim(),
    settings: {
      test_count: parseInt(document.getElementById('test-count').value),
      intensity: document.getElementById('hardness').value
    },
    summary: {
      total: allResults.length,
      pass: allResults.filter(r => r.evaluation?.verdict === 'pass').length,
      warn: allResults.filter(r => r.evaluation?.verdict === 'warn').length,
      fail: allResults.filter(r => r.evaluation?.verdict === 'fail').length
    },
    results: allResults
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stress-test-report-${Date.now()}.json`;
  a.click();
  showToast('Report downloaded!');
}

function copyReport() {
  if (!allResults.length) return showToast('No results to copy.');
  const lines = [
    '# PromptBreaker Stress Test Report',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '## Summary',
    `- Total: ${allResults.length}`,
    `- Passed: ${allResults.filter(r => r.evaluation?.verdict === 'pass').length}`,
    `- Warnings: ${allResults.filter(r => r.evaluation?.verdict === 'warn').length}`,
    `- Failed: ${allResults.filter(r => r.evaluation?.verdict === 'fail').length}`,
    '',
    '## Results',
    ...allResults.map(r => [
      `### Test ${r.id} [${r.category}] — ${(r.evaluation?.verdict || '?').toUpperCase()}`,
      `**Input:** ${r.input}`,
      `**Intent:** ${r.intent}`,
      `**Response:** ${r.response || '—'}`,
      `**Evaluation:** ${r.evaluation?.reason || '—'}`,
      r.evaluation?.failure_type ? `**Failure Type:** ${r.evaluation.failure_type}` : '',
      ''
    ].filter(Boolean).join('\n'))
  ];
  navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Report copied to clipboard!'));
}

// ── Toast notification ────────────────────────────────────────────

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
