# BREAK IT — AI Agent Red Teaming Studio

## Executive Summary

**BREAK IT** is a specialized interactive platform for adversarial evaluation of AI agents. It operationalizes red teaming by combining automated vulnerability discovery with a guided exploitation environment, enabling developers to empirically test how their agents behave under adversarial pressure.

Unlike traditional evaluation pipelines that rely on static inspection or hypothetical threat modeling, BREAK IT introduces a **closed-loop validation system**:
1. Extract agent behavior
2. Identify concrete vulnerabilities
3. Simulate the agent in a controlled environment
4. Actively attempt exploitation
5. Validate outcomes using model-based adjudication
6. Deliver actionable remediation insights

This approach shifts AI security from passive analysis to **behavioral verification**.

---

## Problem Statement

AI agents built on large language models frequently exhibit latent vulnerabilities due to:

- Over-trusting user inputs
- Poor instruction hierarchy enforcement
- Weak separation between system and user contexts
- Overexposed tools or unsafe function execution pathways
- Lack of adversarial testing prior to deployment

These vulnerabilities are often **non-obvious**, emergent, and highly dependent on phrasing, making them difficult to detect through conventional QA processes.

BREAK IT addresses this gap by enabling **direct, interactive adversarial testing** against a simulated version of the agent.

---

## Platform Overview

BREAK IT is structured as a multi-stage pipeline with a gamified execution layer:

### 1. Agent Ingestion

Users provide their agent via:
- Raw prompt text
- Source code snippets
- Configuration files

Supported formats include `.py`, `.js`, `.ts`, `.txt`, `.json`, and `.yaml`.

A parsing engine extracts:
- System prompts
- Tool/function definitions
- Behavioral constraints
- Model configuration patterns

A preview interface allows validation and manual correction before analysis.

---

### 2. Automated Vulnerability Detection

The system performs structured analysis using large language models via OpenRouter.

Key characteristics:
- Focus on **high-confidence, high-impact vulnerabilities**
- Filters noise by prioritizing **teaching value and exploitability**
- Produces **structured JSON outputs** for downstream gameplay

Common vulnerability classes:
- Prompt Injection
- Role Impersonation
- Data Exfiltration
- Tool Misuse / Over-permissioning
- Instruction Override / Hierarchy Collapse

Each vulnerability is converted into a **discrete testable unit (level)**.

---

### 3. Interactive Red Teaming (Core System)

Each vulnerability becomes an isolated environment where:

- The user interacts with a **simulated version of their own agent**
- The simulation is driven by the extracted system prompt and configuration
- The user’s objective is to **induce failure consistent with the vulnerability definition**

This transforms abstract weaknesses into **observable, reproducible behaviors**.

---

### 4. Intel Panel (Guided Adversarial Context)

Each level includes a structured intelligence panel providing:

- **Target**: Vulnerability name and classification
- **Severity**: Relative impact indicator
- **Contextual Explanation**: Description of the failure mode
- **Attack Strategy**: Suggested approach to exploitation
- **Hint System**: Optional guidance to reduce friction

The design balances accessibility with challenge, enabling both beginners and advanced users to engage effectively.

---

### 5. Exploit Validation Engine

Exploit success is determined through a secondary model-based adjudication process:

Inputs:
- Full conversation transcript
- Original system prompt
- Vulnerability definition

Outputs:
- Boolean success/failure classification
- Explanation of decision rationale

This ensures:
- Consistency across evaluations
- Objective scoring
- Reproducibility of results

---

### 6. Summary and Reporting

Upon completion, the system generates a structured report:

- List of detected vulnerabilities
- Exploitation status (broken vs. held)
- Attack transcripts
- Failure explanations
- Remediation guidance

A synthesized **security score** provides a high-level assessment of agent robustness.

---

## User Experience Flow

### Landing Interface
- High-contrast, neon-styled hero interface
- Clear entry points:
  - Upload custom agent
  - Launch practice agent

### Upload & Parsing
- Drag-and-drop or paste-based ingestion
- Real-time parsing feedback
- Editable extracted components

### Analysis Phase
- LLM-driven vulnerability detection
- Dynamic loading interface with feedback messaging

### Level Selection
- Sequential vulnerability progression
- Visual pathing (node-based progression system)
- Explicit vulnerability labeling

### Gameplay Interface
- Left: Chat-based adversarial interaction
- Right: Intel Panel with structured guidance
- Bottom: Persistent input system with multi-line support

### Completion
- Immediate feedback on exploit success
- Transition to next level or summary report

---

## System Architecture

### Frontend
- **Framework**: React (Vite)
- **State Management**: Context API
- **Routing**: React Router
- **UI Layer**: Custom component system with neon-themed styling

### Core Modules

- `GameContext.tsx`  
  Manages global state, level progression, and chat persistence

- `agent-parser.ts`  
  Performs heuristic extraction of agent structure

- `openrouter.ts`  
  Handles:
  - Agent simulation
  - Vulnerability detection
  - Exploit adjudication

- `Game.tsx`  
  Implements the primary interaction loop

---

## Technical Design Principles

### 1. Behavioral Fidelity
The system prioritizes replicating **actual agent behavior**, not abstract approximations.

### 2. High Signal-to-Noise Ratio
Only vulnerabilities with:
- High exploitability
- Clear educational value  
are surfaced.

### 3. Deterministic Interaction Loop
Although LLM-based, the system enforces:
- Structured prompts
- Controlled evaluation criteria  
to minimize variance.

### 4. Client-Side Execution
- All API calls are executed client-side
- Users provide their own OpenRouter API key
- No sensitive agent data is stored server-side

---

## Security Philosophy

BREAK IT is grounded in the principle that:

> Security is not defined by design intentions, but by adversarial outcomes.

The platform emphasizes:
- Empirical validation over assumptions
- Adversarial interaction over passive review
- Failure reproduction over theoretical risk

---

## Use Cases

- Pre-deployment validation of AI agents
- Security training for prompt engineering teams
- Academic exploration of LLM vulnerabilities
- Hackathons and competitive red teaming environments
- Rapid prototyping with built-in adversarial testing

---

## Limitations

- Parsing relies on heuristics and may require manual correction
- Simulation accuracy depends on completeness of extracted prompts
- LLM-based evaluation introduces probabilistic variability
- Does not replace formal sandboxing or infrastructure-level security controls

---

## Future Roadmap

- Static + dynamic hybrid analysis
- Multi-agent adversarial simulations
- Expanded vulnerability taxonomy
- Persistent reporting and export features
- Collaborative/team-based red teaming environments

---

## Setup Instructions

```bash
git clone <repository-url>
cd agent-breaker-studio
npm install
npm run dev
```
---

## Getting Started

Open the application in your browser
Provide your OpenRouter API key when prompted
Upload or paste your agent code, prompt, or configuration
Confirm the parsed components (system prompt, tools, config)
Run analysis to detect vulnerabilities
Begin adversarial testing through interactive levels

---

## Conclusion

BREAK IT introduces a practical, interactive methodology for AI agent security evaluation. By integrating automated detection with hands-on exploitation, it enables developers to move beyond theoretical vulnerabilities and directly observe how—and why—their systems fail under adversarial conditions.

---