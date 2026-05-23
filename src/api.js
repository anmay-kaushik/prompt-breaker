// ── Anthropic API communication ───────────────────────────────────

let aborted = false;

/**
 * Send a message to Claude via the Anthropic Messages API.
 * @param {string} systemPrompt - The system prompt
 * @param {string} userMessage  - The user message
 * @param {number} maxTokens    - Max tokens to generate
 * @returns {Promise<string>}   - The text response
 */
async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  const apiKey = document.getElementById('api-key').value.trim();
  if (!apiKey) throw new Error('No API key provided. Please enter your Anthropic API key.');

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userMessage }]
  };

  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Anthropic API error: ${errMsg}`);
  }

  return data.content.map(b => b.text || '').join('');
}

/**
 * Parse JSON from Claude response, stripping markdown fences if present.
 */
function parseJSON(raw) {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

function toggleKeyVisibility() {
  const el = document.getElementById('api-key');
  el.type = el.type === 'password' ? 'text' : 'password';
}
