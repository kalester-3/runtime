'use strict';
(function(){
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('user-input');
  const formEl = document.getElementById('chat-form');
  const restartBtn = document.getElementById('restart-btn');
  const summaryEl = document.getElementById('summary');
  const timetableEl = document.getElementById('timetable');
  const getStartedBtn = document.getElementById('get-started-btn');

  const state = {
    step: 'welcome',
    days: null,
    periodsPerDay: null,
    subjects: [], // [{name, teacher}]
    maxPerDay: null, // number or 'auto'
    schedule: null,
  };

  function appendMessage(text, who = 'bot'){
    const div = document.createElement('div');
    div.className = `message ${who}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function botSay(text){ appendMessage(text, 'bot'); }
  function userSay(text){ appendMessage(text, 'user'); }

  function start(){
    messagesEl.innerHTML = '';
    summaryEl.innerHTML = '';
    timetableEl.innerHTML = '';
    state.step = 'askDays';
    state.days = null;
    state.periodsPerDay = null;
    state.subjects = [];
    state.maxPerDay = null;
    state.schedule = null;

    botSay('Hello! I\'ll help you create a timetable.');
    botSay('First, which days do you operate? Example: Monday, Tuesday, Wednesday, Thursday, Friday');
    botSay("Tip: type 'default' for Monday–Friday.");
  }

  function parseDays(text){
    const t = text.trim();
    if(!t) return null;
    if(/^default$/i.test(t)) return ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const parts = t.split(',').map(s => s.trim()).filter(Boolean);
    if(parts.length === 0) return null;
    return parts;
  }

  function parsePositiveInt(text){
    const n = parseInt(text, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function parseSubjects(text){
    // Format: "Math@Mr.Smith, English@Ms.Jones, PE"
    const items = text.split(',').map(s => s.trim()).filter(Boolean);
    if(items.length === 0) return [];
    return items.map(item => {
      const [name, teacher] = item.split('@').map(s => s.trim());
      return { name, teacher: teacher || '' };
    });
  }

  function autoMaxPerDay(periodsPerDay, subjectCount){
    // default cap: ceil(P / subjects)
    const cap = Math.ceil(periodsPerDay / Math.max(1, subjectCount));
    return Math.max(1, cap);
  }

  function summarize(){
    const subj = state.subjects.map(s => s.teacher ? `${s.name} (${s.teacher})` : s.name).join(', ');
    const maxTxt = state.maxPerDay === 'auto' ? `auto (≈ ${autoMaxPerDay(state.periodsPerDay, state.subjects.length)})` : state.maxPerDay;
    summaryEl.innerHTML = `
      <div>Days: <strong>${state.days.join(', ')}</strong></div>
      <div>Periods/day: <strong>${state.periodsPerDay}</strong></div>
      <div>Subjects: <strong>${subj}</strong></div>
      <div>Max per subject per day: <strong>${maxTxt}</strong></div>
    `;
  }

  function renderTable(schedule){
    const days = state.days;
    const P = state.periodsPerDay;

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const blank = document.createElement('th');
    trh.appendChild(blank);
    for(let p=1;p<=P;p++){
      const th = document.createElement('th');
      th.textContent = `Period ${p}`;
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for(const day of days){
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = day;
      tr.appendChild(th);
      for(let p=0;p<P;p++){
        const td = document.createElement('td');
        const slot = schedule[day][p];
        let html = `<strong>${slot.name}</strong>`;
        if(slot.teacher){ html += `<br/><small>${slot.teacher}</small>`; }
        if(slot.room){ html += `<br/><small>${slot.room}</small>`; }
        td.innerHTML = html;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    timetableEl.innerHTML = '';
    timetableEl.appendChild(table);
  }

  function generateTimetable(days, periodsPerDay, subjects, maxPerDay){
    const sched = {};
    const globalCounts = new Map(subjects.map(s => [s.name, 0]));

    const cap = maxPerDay === 'auto' ? autoMaxPerDay(periodsPerDay, subjects.length) : maxPerDay;

    for(const day of days){
      const perDayCount = new Map(subjects.map(s => [s.name, 0]));
      const daySlots = [];
      let last = null;

      for(let p=0; p<periodsPerDay; p++){
        const candidates = subjects.filter(s => (perDayCount.get(s.name) < cap) && s.name !== last);
        const fallback1 = subjects.filter(s => (perDayCount.get(s.name) < cap));
        const fallback2 = subjects.slice();

        const pickFrom = candidates.length ? candidates : (fallback1.length ? fallback1 : fallback2);

        // Pick subject with the lowest global count to balance, tie-break random
        let best = [];
        let minCount = Infinity;
        for(const s of pickFrom){
          const c = globalCounts.get(s.name) || 0;
          if(c < minCount){ minCount = c; best = [s]; }
          else if(c === minCount){ best.push(s); }
        }
        const chosen = best[Math.floor(Math.random() * best.length)];

        daySlots.push({ name: chosen.name, teacher: chosen.teacher || '' });
        perDayCount.set(chosen.name, (perDayCount.get(chosen.name) || 0) + 1);
        globalCounts.set(chosen.name, (globalCounts.get(chosen.name) || 0) + 1);
        last = chosen.name;
      }
      sched[day] = daySlots;
    }

    return sched;
  }

  async function handle(text){
    const t = text.trim();
    if(!t){ botSay('Please type something.'); return; }

    switch(state.step){
      case 'askDays':{
        const days = parseDays(t);
        if(!days){ botSay('Please provide days separated by commas, or type \"default\".'); return; }
        state.days = days;
        state.step = 'askPeriods';
        botSay('How many periods per day? (e.g., 6 or 7)');
        break;
      }
      case 'askPeriods':{
        const n = parsePositiveInt(t);
        if(!n){ botSay('Please enter a positive whole number for periods per day.'); return; }
        state.periodsPerDay = n;
        state.step = 'askSubjects';
        botSay('List subjects (use subject@teacher optionally). Example: Math@Mr.Smith, English@Ms.Jones, PE');
        break;
      }
      case 'askSubjects':{
        const subs = parseSubjects(t);
        if(subs.length === 0){ botSay('Please provide at least one subject.'); return; }
        state.subjects = subs;
        state.step = 'askMaxPerDay';
        botSay("Max periods for a single subject per day? Enter a number, or type 'auto'.");
        break;
      }
      case 'askMaxPerDay':{
        let cap = t.toLowerCase() === 'auto' ? 'auto' : parsePositiveInt(t);
        if(cap === null){ botSay("Please provide a positive number or type 'auto'."); return; }
        state.maxPerDay = cap;
        summarize();
        state.step = 'confirm';
        botSay("Type 'generate' to create the timetable or 'restart' to start over.");
        break;
      }
      case 'confirm':{
        if(/^restart$/i.test(t)){
          start();
          return;
        }
        if(!/^generate$/i.test(t)){
          botSay("Please type 'generate' or 'restart'.");
          return;
        }
        // Prefer backend generation; fallback to in-browser if not available
        try{
          const payload = {
            days: state.days,
            periods_per_day: state.periodsPerDay,
            classes: [
              { name: 'Class A', subjects: state.subjects, max_per_day: state.maxPerDay }
            ]
          };
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if(res.ok){
            const data = await res.json();
            const className = Object.keys(data.schedules)[0];
            const schedule = data.schedules[className];
            state.schedule = schedule;
            renderTable(schedule);
            state.step = 'done';
            botSay('Your timetable is ready (generated by server). You can restart anytime.');
            break;
          }
          // else fallthrough to local
        }catch(err){ /* ignore and fallback */ }
        const schedule = generateTimetable(state.days, state.periodsPerDay, state.subjects, state.maxPerDay);
        state.schedule = schedule;
        renderTable(schedule);
        state.step = 'done';
        botSay('Your timetable is ready. You can restart anytime.');
        break;
      }
      case 'done':{
        if(/^restart$/i.test(t)){
          start();
          return;
        }
        botSay("Type 'restart' to build another timetable.");
        break;
      }
    }
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value;
    inputEl.value = '';
    userSay(text);
    await handle(text);
  });

  restartBtn.addEventListener('click', () => { start(); });

  if(getStartedBtn){
    getStartedBtn.addEventListener('click', () => {
      const el = document.getElementById('chat-section');
      if(el){ el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  // Kick off
  start();
})();
