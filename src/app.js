// ── Main application logic ────────────────────────────────────────

let isRunning = false;
aborted = false;

async function runTests() {
  const prompt    = document.getElementById('prompt-input').value.trim();
  const apiKey    = document.getElementById('api-key').value.trim();
  const count     = parseInt(document.getElementById('test-count').value);
  const hardness  = document.getElementById('hardness').value;
  const doFix     = document.getElementById('suggest-fix').checked;

  // ── Validation ────────────────────────────────────────────────
  if (!apiKey) {
    showToast('⚠ Please enter your Gemini API key.');
    document.getElementById('api-key').focus();
    return;
  }
  if (!prompt) {
    showToast('⚠ Please enter a system prompt to test.');
    document.getElementById('prompt-input').focus();
    return;
  }
  if (isRunning) return;

  // ── Setup ─────────────────────────────────────────────────────
  isRunning = true;
  aborted   = false;
  allResults = [];
  currentFilter = 'all';

  document.getElementById('empty-state').style.display    = 'none';
  document.getElementById('results-area').style.display   = 'flex';
  document.getElementById('results-area').style.flexDirection = 'column';
  document.getElementById('results-area').style.gap       = '16px';
  document.getElementById('improved-section').style.display = 'none';
  document.getElementById('test-list').innerHTML           = '';
  document.getElementById('run-btn').disabled              = true;
  document.getElementById('run-btn-text').textContent      = '⏳ Running…';
  document.getElementById('progress-wrap').style.display  = 'block';
  document.getElementById('abort-btn').style.display      = 'block';

  // Reset summary
  updateSummary([]);
  setFilter('all', document.querySelector('.filter-btn[data-filter="all"]'));

  try {
    // ── Phase 1: Generate test cases ──────────────────────────
    setProgress(5, 'Generating adversarial test cases…');

    let testCases;
    try {
      testCases = await generateTestCases(prompt, count, hardness);
    } catch (e) {
      showError('Failed to generate test cases: ' + e.message);
      return;
    }

    if (aborted) return;

    // Show all cards as loading placeholders
    const listEl = document.getElementById('test-list');
    listEl.innerHTML = testCases.map(tc =>
      buildLoadingCard(tc.id, tc.category, tc.input)
    ).join('');

    setProgress(15, `Running ${testCases.length} tests against your prompt…`);

    // ── Phase 2: Test each input + evaluate ───────────────────
    for (let i = 0; i < testCases.length; i++) {
      if (aborted) break;

      const tc = testCases[i];
      const pct = 15 + Math.round(70 * ((i + 1) / testCases.length));
      setProgress(pct, `Testing case ${i + 1}/${testCases.length}: [${tc.category}]…`);

      // Run test
      let response = '';
      try {
        response = await runSingleTest(prompt, tc.input);
      } catch (e) {
        response = `[ERROR: ${e.message}]`;
      }

      if (aborted) break;

      // Evaluate
      let evaluation = { verdict: 'warn', score: 5, reason: 'Evaluation skipped.', failure_type: null };
      try {
        evaluation = await evaluateResponse(prompt, tc, response);
      } catch (e) {
        evaluation.reason = 'Evaluation failed: ' + e.message;
      }

      const result = { ...tc, response, evaluation };
      allResults.push(result);

      // Replace loading card with real card
      const loadingCard = document.getElementById('tc-loading-' + tc.id);
      if (loadingCard) {
        loadingCard.outerHTML = buildTestCard(result);
      }

      updateSummary(allResults);
    }

    if (aborted) {
      setProgress(100, 'Stopped by user.');
      showToast('Test run stopped.');
      return;
    }

    // ── Phase 3: Generate hardened prompt ─────────────────────
    if (doFix) {
      setProgress(88, 'Generating hardened prompt suggestion…');
      const failures = allResults.filter(r => r.evaluation?.verdict !== 'pass');
      if (failures.length > 0) {
        try {
          const improved = await generateHardenedPrompt(prompt, failures);
          if (improved) showImprovedPrompt(improved);
        } catch (e) {
          console.warn('Hardened prompt generation failed:', e.message);
        }
      } else {
        showToast('✓ All tests passed — no hardening needed!');
      }
    }

    setProgress(100, 'Complete!');
    showToast(`✓ Done! ${allResults.length} tests completed.`);

    setTimeout(() => {
      document.getElementById('progress-wrap').style.display = 'none';
    }, 1500);

  } catch (err) {
    showError(err.message);
  } finally {
    isRunning = false;
    aborted   = false;
    document.getElementById('run-btn').disabled = false;
    document.getElementById('run-btn-text').textContent = '▶ Run Stress Test';
    document.getElementById('abort-btn').style.display  = 'none';
  }
}

function abortTests() {
  aborted = true;
  isRunning = false;
  document.getElementById('run-btn').disabled = false;
  document.getElementById('run-btn-text').textContent = '▶ Run Stress Test';
  document.getElementById('abort-btn').style.display = 'none';
}

function showError(msg) {
  document.getElementById('test-list').innerHTML = `
    <div style="background:var(--bg2);border:1px solid #5a1a1a;border-radius:var(--radius);padding:20px;color:#fca5a5;font-family:var(--mono);font-size:13px;line-height:1.6;">
      <strong style="color:var(--danger);">Error</strong><br>${esc(msg)}
      <br><br>
      <span style="color:var(--text3);">Check your API key and try again. Get a free key at aistudio.google.com/apikey</span>
    </div>
  `;
  document.getElementById('progress-wrap').style.display = 'none';
  isRunning = false;
  document.getElementById('run-btn').disabled = false;
  document.getElementById('run-btn-text').textContent = '▶ Run Stress Test';
  document.getElementById('abort-btn').style.display = 'none';
}

// ── Range slider live update ──────────────────────────────────────
document.getElementById('test-count').addEventListener('input', function () {
  document.getElementById('test-count-val').textContent = this.value;
});
