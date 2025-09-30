# Chat Timetable Generator

A simple, chat-driven website that collects scheduling preferences from a user and generates a school/institution timetable.

Features:
- Chat-style input flow (no forms to fill out)
- Generates a balanced timetable avoiding consecutive duplicate subjects
- Clean, responsive UI (pure HTML/CSS/JS — no build tools required)

Quick start:
1. Open `index.html` in your web browser (double-click or right-click > Open with).
2. Answer the chat prompts (days, periods per day, subjects, etc.).
3. When prompted, type `generate` to see your timetable.

Project structure:
- `index.html` — App markup and layout
- `styles.css` — Basic UI styles
- `script.js` — Chat flow and timetable generation logic

Notes:
- This is a static site that runs entirely in the browser. No server setup is required.
- You can customize styles or the conversation prompts to match your institution’s needs.

Roadmap ideas:
- Export timetable as CSV/Excel
- Save/load user sessions to localStorage
- Advanced constraints (teacher availability, room capacity, fixed periods)
