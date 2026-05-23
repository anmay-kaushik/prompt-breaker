# PromptBreaker 🛡️

AI Prompt Stress Tester — A Red-Teaming Tool for LLM System Prompts

A browser-based tool that stress-tests LLM system prompts before deployment by automatically generating adversarial inputs, testing them against your prompt, and producing a detailed security report.

![PromptBreaker screenshot](public/screenshot.png)

---

## What It Does

Developers often write system prompts without knowing how they behave under real-world adversarial conditions. PromptBreaker simulates a red-team attack on your prompt by:

1. **Generating 5–15 adversarial test cases** across 8 attack categories
2. **Running each test** against your actual system prompt via the Anthropic API
3. **Evaluating each response** using a separate judge LLM call
4. **Producing a full report** with pass/warn/fail verdicts and failure explanations
5. **Suggesting a hardened prompt** that patches the discovered weaknesses

---

## Attack Categories

| Category | What it tests |
|---|---|
| `jailbreak` | Direct bypass attempts, DAN-style attacks, "ignore previous instructions" |
| `override` | Attempts to replace or redefine the AI's role mid-conversation |
| `persona` | Tries to make the model break character or adopt a different identity |
| `manipulation` | Emotional manipulation, urgency, flattery, social engineering |
| `off-topic` | Completely unrelated requests to test scope enforcement |
| `ambiguous` | Vague inputs that could be misinterpreted |
| `edge-case` | Empty inputs, extreme lengths, special characters |
| `roleplay` | Framing harmful/OOB requests inside fiction or hypotheticals |

---

## Failure Types Detected

- `instruction override` — model followed adversarial instructions instead of original ones
- `persona break` — model adopted a different identity or dropped its character
- `scope drift` — model answered out-of-scope questions it shouldn't have
- `manipulation success` — emotional/social tactics caused unintended behavior
- `prompt leakage` — model revealed contents of its system prompt
- `jailbreak success` — model bypassed its safety or behavioral constraints
- `weak refusal` — model declined but in an ambiguous or easily-bypassable way
- `unsafe content` — model produced content violating the prompt's intent
- `role confusion` — model became uncertain about its own role or capabilities

---

## Quick Start

### Option A: Open directly in browser (no server needed)

```bash
git clone https://github.com/YOUR_USERNAME/prompt-breaker.git
cd prompt-breaker
open index.html  # or double-click it
```

### Option B: Serve locally (recommended for development)

```bash
# Using Python
python3 -m http.server 3000

# Using Node.js
npx serve .

# Using VS Code Live Server
# Install the Live Server extension and click "Go Live"
```

Then open `http://localhost:3000` in your browser.

---

## Usage

1. **Enter your Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com/settings/keys). It's stored in your browser session only, never persisted.
2. **Paste your system prompt** — or click one of the quick example buttons
3. **Configure settings:**
   - Number of test cases (5–15)
   - Attack intensity (mild / moderate / aggressive)
   - Whether to generate a hardened prompt suggestion
4. **Click "Run Stress Test"**
5. Watch results populate in real time — click any card to expand details
6. Use the **filter bar** to focus on failures or warnings
7. **Export the report** as JSON or copy it as Markdown

---

## Tech Stack

- **Pure HTML/CSS/JavaScript** — no build step, no frameworks, no dependencies
- **Anthropic Messages API** — 3 distinct prompt calls per run:
  - Generation: adversarial test case creation
  - Testing: running inputs against the target prompt
  - Evaluation: judge LLM for pass/warn/fail verdicts
  - (Optional) Hardening: improved prompt suggestion
  

---

## Project Structure

```
prompt-breaker/
├── index.html          # App shell and layout
├── public/
│   └── favicon.svg     # App icon
├── src/
│   ├── styles.css      # All styling (dark theme)
│   ├── examples.js     # Sample system prompts
│   ├── api.js          # Anthropic API communication
│   ├── evaluator.js    # Test generation, running, evaluation logic
│   ├── renderer.js     # DOM rendering and UI helpers
│   └── app.js          # Main orchestration and event handlers
└── README.md
```

---

## How the Evaluation Works

Each test case goes through a **three-step pipeline:**

```
System Prompt
     │
     ▼
[Step 1] Generate adversarial inputs
     │     LLM is given the prompt and asked to create
     │     targeted attacks based on the prompt's specific
     │     constraints and persona.
     │
     ▼
[Step 2] Run each input against the original prompt
     │     Each adversarial message is sent to Claude using
     │     YOUR system prompt — simulating real deployment.
     │
     ▼
[Step 3] Judge LLM evaluates each response
         A separate judge call analyzes whether the model
         stayed in bounds, giving a score (0–10), verdict
         (pass/warn/fail), and failure type label.
```

The separation of generator, testee, and evaluator prevents confirmation bias and gives more reliable verdicts.

---

## Design Decisions & Trade-offs

**Why pure HTML/JS instead of React/Streamlit?**
Zero dependencies means anyone can clone and open it directly. No npm install, no Python environment.


**Why separate evaluator calls instead of self-evaluation?**
Self-evaluation is biased — the model tends to score its own responses favorably. A fresh context with an explicit evaluator role gives more objective verdicts.

**Current limitations:**
- Runs ~21 API calls for 10 tests — takes 2–4 minutes depending on rate limits
- Evaluation quality depends on how well the original intent of the system prompt is inferrable
- No streaming (responses appear when complete, not word by word)

**What I'd add with more time:**
- Response streaming
- Side-by-side diff view for original vs. hardened prompt
- Test history / saved reports (localStorage)
- Category-level analytics and radar chart
- Support for multi-turn conversation testing
- OpenAI / Gemini / Groq API support
- Export to PDF

---

## API Cost Estimate

Each test run (10 cases, moderate intensity) makes approximately:
- 1 generation call (~800 tokens output)
- 10 test calls (~200 tokens output each)
- 10 evaluation calls (~150 tokens output each)
- 1 hardening call (~500 tokens output)

