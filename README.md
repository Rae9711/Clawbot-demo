# Clawbot Demo

**A safe AI agent demo that plans actions but never executes tools autonomously**

This project demonstrates a **controlled AI agent system** where:

* A user types instructions in plain English
* An AI **proposes a step-by-step plan**
* A human **reviews and approves** the plan
* Only **pre-approved tools** are executed
* All outputs are visible and auditable

This is **not a chatbot** and **not an autonomous agent**.
It is designed to show **how AI can assist decision-making safely**.

---

## What You Will See When It Runs

* A web page where you:

  * Choose a personality (tone only)
  * Type instructions (plain English)
  * Generate a plan
  * Approve execution
* A live execution log
* A final AI-generated response
* A JSON file written to a local “outbox” folder (simulating sending to a team)

---

## What You Need Before Starting

### 1. A computer with macOS, Windows, or Linux

(No programming background required)

### 2. Install **Node.js**

Node.js lets the app run locally.

👉 Download from:
[https://nodejs.org](https://nodejs.org)

Choose **LTS version**.

After installing, open a terminal and type:

```bash
node -v
```

You should see a version number (for example `v18.x.x`).

---

### 3. Install **Ollama** (local AI engine)

👉 Download from:
[https://ollama.com](https://ollama.com)

After installing, open a terminal and run:

```bash
ollama serve
```

Leave this running in the background.

---

### 4. Download the AI model (one-time step)

In a new terminal window, run:

```bash
ollama pull qwen2.5:7b
```

This downloads the AI model used by the demo.
It may take several minutes.

---

## How to Start the Demo (Step-by-Step)

### Step 1 — Download the project

If using GitHub Desktop:

* Click **Code → Open with GitHub Desktop**

Or download as ZIP:

* Click **Code → Download ZIP**
* Unzip it on your computer

---

### Step 2 — Open a terminal in the project folder

You should see a folder named:

```
Clawbot-demo
```

Inside it are two folders:

```
server
web
```

---

## Start the Backend (Required)

The backend runs the AI logic.

### 1. Go into the server folder

```bash
cd Clawbot-demo/server
```

### 2. Install required files (one-time step)

```bash
npm install
```

### 3. Start the server

```bash
npm run dev
```

You should see messages like:

```
Server on http://localhost:8080
Ollama endpoint: http://127.0.0.1:11434
```

⚠️ **Leave this terminal window open**

---

## Start the Web App (Required)

Open a **new terminal window**.

### 1. Go into the web folder

```bash
cd Clawbot-demo/web
```

### 2. Install required files (one-time step)

```bash
npm install
```

### 3. Start the web interface

```bash
npm run dev
```

You will see something like:

```
Local: http://localhost:5173
```

---

## Open the Demo in Your Browser

Open your browser and go to:

```
http://localhost:5173
```

You should now see the Clawbot demo interface.

---

## How to Use the Demo (Non-Technical)

### 1. Choose a Personality

This only changes **tone**, not behavior.

Examples:

* Professional
* Friendly Coach
* No-BS
* Playful Nerd

---

### 2. Type Instructions

Example:

```
We want to build a lightweight agent framework where AI proposes plans
but humans must approve before any tool runs.
Explain the key components and risks.
```

---

### 3. Click **Generate Plan**

* The AI proposes a step-by-step plan
* Nothing executes yet

---

### 4. Review the Plan

You will see:

* Intent
* Steps
* Which tools would be used

This is the **safety checkpoint**.

---

### 5. Click **Approve**

* The plan is executed
* Logs appear in real time
* A final response is generated

---

### 6. View Results

* **Execution Log** shows what happened
* **Final Response** shows AI output
* A JSON file is written to:

```
server/src/outbox/
```

This simulates “sending to a team”.

---

## Important Notes (Please Read)

### This is NOT ChatGPT

* One prompt = one plan = one execution
* No free-form chatting

### AI cannot run tools by itself

* All tools are defined in code
* AI can only suggest plans
* Humans must approve

### Slow responses are normal

* AI runs locally on your machine
* Some steps may take 30–90 seconds

---

## If Something Seems Stuck

### If execution takes a long time

* Wait at least **1–2 minutes**
* Check the **Execution Log** panel

### If nothing happens at all

* Make sure **both terminals** are running
* Make sure Ollama is running:

  ```bash
  ollama serve
  ```

### Test Ollama manually

```bash
curl http://127.0.0.1:11434/api/tags
```

You should see `qwen2.5:7b` listed.

---

## What This Demo Is For

* Explaining **safe AI agent design**
* Showing **human-in-the-loop control**
* Demonstrating **AI planning without autonomy**
* Teaching **why guardrails matter**

---

## What This Demo Is NOT

* Not production software
* Not autonomous AI
* Not connected to real messaging systems
* Not a chatbot

---
