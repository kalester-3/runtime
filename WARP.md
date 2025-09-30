# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Static, single‑page web app (pure HTML/CSS/JS). No build step, package manager, or backend. Runs entirely in the browser.
- Core files: index.html (markup), styles.css (UI), script.js (chat flow + timetable generation).

Commands
- Run locally (no build):
  - Windows (PowerShell): start .\index.html
  - macOS: open ./index.html
  - Linux: xdg-open ./index.html
- Optional local static server (if you prefer http://localhost):
  - Python 3: python -m http.server 5173
  - Node (npx): npx serve -l 5173 .
  - Then visit: http://localhost:5173
- Build: none (static site).
- Lint: not configured.
- Tests: not configured.

High-level architecture
- UI structure (index.html):
  - Chat panel: #messages (stream), #chat-form with #user-input and #send-btn.
  - Results panel: #summary (parameters recap) and #timetable (rendered table).
  - A Restart button (#restart-btn) resets the flow.
- Control flow (script.js):
  - Encapsulated IIFE sets up DOM refs and a central state object with the conversation and output:
    ```js path=C:\Users\vasanth\projects\chat-timetable-generator\script.js start=10
    const state = {
      step: 'welcome',
      days: null,
      periodsPerDay: null,
      subjects: [], // [{name, teacher}]
      maxPerDay: null, // number or 'auto'
      schedule: null,
    };
    ```
  - start() initializes the conversation and posts the initial prompts (these are the strings to tweak if you want to change the UX):
    ```js path=C:\Users\vasanth\projects\chat-timetable-generator\script.js start=41
    botSay('Hello! I\'ll help you create a timetable.');
    botSay('First, which days do you operate? Example: Monday, Tuesday, Wednesday, Thursday, Friday');
    botSay("Tip: type 'default' for Monday–Friday.");
    ```
  - Conversation state machine: handle() switches over step to collect inputs in order: askDays → askPeriods → askSubjects → askMaxPerDay → confirm → done. Each step validates input and advances or re-prompts.
  - Parsing helpers: parseDays, parsePositiveInt, parseSubjects normalize user inputs; autoMaxPerDay derives a reasonable per‑day cap from periods/subject count when the user types "auto".
- Timetable generation (script.js):
  - generateTimetable builds a schedule per day using:
    - Per‑day subject caps (explicit or auto calculated).
    - No immediate repeats (avoid scheduling same subject in consecutive periods).
    - Global balancing: prefers subjects with lower total counts to spread load fairly; ties are broken randomly among the least‑used candidates.
  - renderTable constructs an HTML table from the schedule keyed by day.

When to change what
- Update conversation text/prompts: edit the botSay(...) lines in start() and the messages in each case within handle().
- Add constraints (e.g., teacher availability, fixed periods): extend generateTimetable to filter candidates before selection; keep the per‑day/global counters consistent.
- Persist sessions (e.g., reload after refresh): serialize/restore the state object (days, periodsPerDay, subjects, maxPerDay, schedule) to localStorage on transitions.

Notes from README
- Quick start is simply: open index.html, answer prompts, then type "generate" when asked to create the timetable (type "default" for Monday–Friday). The app is local‑first; no server is required.
