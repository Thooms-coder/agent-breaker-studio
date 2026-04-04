# BREAK IT — AI Agent Red Teaming Game

## Design System

- **Dark background**: Near-black (#0a0a0a) with subtle noise texture
- **Neon accent colors**: Pink (#FF2D6B), Green (#39FF14), Yellow (#FFE500)
- **Fonts**: Mono/distressed style using Space Mono + a display font for headers
- **UI style**: Thick neon borders, glitch CSS animations, scanline overlays, zine-style asymmetric layouts, punk stickers/badges for status indicators

## Pages & Flow

### 1. Landing Page

- Full-screen dark hero with glitch-animated "BREAK IT" title
- Tagline: "Your agent isn't as safe as you think."
- Animated neon CTA button: "Upload Your Agent"
- Subtle punk elements: safety pins, tape strips, spray-paint texture accents

### 2. Upload Step

- Two input modes: paste raw text OR drag-and-drop file upload (.zip, .py, .js, .txt)
- Smart parser that extracts: system prompts, tool definitions, model config from various code formats (looks for common patterns like `system_message`, `tools = [`, `functions`, prompt strings, etc.)
- Preview panel showing what was detected (system prompt, tools, config)
- User can edit/confirm extracted info before proceeding
- API key input field for OpenRouter (stored in localStorage)

### 3. Analysis Step (Loading)

- Sends extracted agent info to OpenRouter (qwen/qwen3-235b-a22b:free)
- Punk loading animation: glitching skull, flickering neon, scanline effect
- Snarky loading messages rotating: "Scanning for cracks...", "Finding the weak spots...", "Your agent is sweating..."
- Model returns structured vulnerability analysis — filtered to only high-confidence, high-teaching-value issues (typically 3-5 levels max)

### 4. Game Screen (per level)

- **Left panel**: Chat interface styled as a terminal/punk chat. User chats with a simulated version of their own agent (using their uploaded system prompt via OpenRouter). Goal: exploit the vulnerability
- **Right panel**: "Intel Panel" — shows the vulnerability name, category, hint text, and exploitation guidance. Styled like a classified dossier with redacted text effects
- Level indicator at top with punk-styled progress bar
- Success detection: the AI model judges whether the agent was successfully broken based on the vulnerability criteria
- We should go for a classic Mario style level select where we see like a snake of levels and can move indicator around level to level.

### 5. Success State

- Glitch explosion animation when a guardrail breaks
- "LEVEL CLEARED" with distorted text effect
- Breakdown: what went wrong, why it's dangerous, how to fix it
- "Next Level" button or "Skip" option

### 6. Summary / Report Card

- Grid of all vulnerabilities: broken vs. survived
- Each card shows: vulnerability name, status (broken/held), exploit used, remediation tip
- Overall "security score" with punk-styled grade (e.g., skull ratings instead of stars)
- Option to retry or upload a new agent

## Technical Approach

- All OpenRouter API calls made client-side with user-provided API key
- Agent code parsing: regex-based extraction for system prompts, tool schemas, and config from multiple formats
- State management via React context for game flow (upload → analysis → levels → summary)
- Chat history maintained per level, reset between levels
- Vulnerability detection prompt engineered to return structured JSON with confidence scores and teaching value ratings