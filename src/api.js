
let aborted = false;

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
\
 * @param {string} systemPrompt - The system/context prompt
 * @param {string} userMessage  - The user message
 * @param {number} maxTokens    - Max tokens to generate
 * @returns {Promise<string>}   - The text response
 */
async function call(systemPrompt, userMessage, maxTokens = 1024) {
  const apiKey = document.getElementById('api-key').value.trim();
  if (!apiKey) throw new Error('No API key provided. Please enter your Gemini API key from aistudio.google.com/apikey');

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7
    }
  };

  // Gemini supports system instructions via systemInstruction field
  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${errMsg}`);
  }

  // Extract text from Gemini response structure
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error('No response from Gemini. Try again.');

  // Handle safety blocks
  if (candidate.finishReason === 'SAFETY') {
    return '[Response blocked by Gemini safety filters]';
  }

  return candidate.content?.parts?.map(p => p.text || '').join('') || '';
}

/**
 * Parse JSON from model response, stripping markdown fences if present.
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
