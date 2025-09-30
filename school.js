/* School builder JS */
(function(){
  const container = document.getElementById('classes-container');
  const addClassBtn = document.getElementById('add-class');
  const generateBtn = document.getElementById('generate-school');
  const resultsEl = document.getElementById('school-results');

  function makeEl(tag, attrs={}, children=[]) {
    const el = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k === 'class') el.className = v; else if(k === 'text') el.textContent = v; else el.setAttribute(k, v);
    }
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function addSubjectRow(tableBody){
    const tr = makeEl('tr');
    const tdName = makeEl('td');
    const tdTeacher = makeEl('td');
    const tdRoom = makeEl('td');
    const tdActions = makeEl('td');
    const inputName = makeEl('input', { class: 'chat__input', placeholder: 'Subject' });
    const inputTeacher = makeEl('input', { class: 'chat__input', placeholder: 'Teacher code or name' });
    const inputRoom = makeEl('input', { class: 'chat__input', placeholder: 'Room (optional)' });
    const removeBtn = makeEl('button', { class: 'btn btn-secondary', type: 'button', text: 'Remove' });
    removeBtn.addEventListener('click', () => tr.remove());
    tdName.appendChild(inputName); tdTeacher.appendChild(inputTeacher); tdRoom.appendChild(inputRoom); tdActions.appendChild(removeBtn);
    tr.appendChild(tdName); tr.appendChild(tdTeacher); tr.appendChild(tdRoom); tr.appendChild(tdActions);
    tableBody.appendChild(tr);
  }

  function addClassCard(prefill){
    const card = makeEl('div', { class: 'card pad', style: 'margin:12px 0;' });
    const header = makeEl('div', { style: 'display:flex; gap:8px; align-items:center; justify-content:space-between;' });
    const left = makeEl('div');
    const label = makeEl('label', { text: 'Class name' });
    const nameInput = makeEl('input', { class: 'chat__input', value: (prefill && prefill.name) || '' });
    left.appendChild(label); left.appendChild(nameInput);
    const removeCardBtn = makeEl('button', { class: 'btn btn-secondary', type: 'button', text: 'Remove Class' });
    removeCardBtn.addEventListener('click', () => card.remove());
    header.appendChild(left); header.appendChild(removeCardBtn);

    const table = makeEl('table', { style: 'width:100%; border-collapse: collapse; margin-top:10px;' });
    const thead = makeEl('thead');
    thead.appendChild(makeEl('tr', {}, [
      makeEl('th', { text: 'Subject' }),
      makeEl('th', { text: 'Teacher (code or name)' }),
      makeEl('th', { text: 'Room' }),
      makeEl('th', { text: 'Actions' }),
    ]));
    const tbody = makeEl('tbody');
    table.appendChild(thead); table.appendChild(tbody);

    const addRowBtn = makeEl('button', { class: 'btn btn-secondary', type: 'button', text: 'Add Subject' });
    addRowBtn.addEventListener('click', () => addSubjectRow(tbody));

    card.appendChild(header);
    card.appendChild(table);
    card.appendChild(makeEl('div', { style: 'height:8px' }));
    card.appendChild(addRowBtn);

    container.appendChild(card);

    // Prefill
    if(prefill && Array.isArray(prefill.subjects)){
      prefill.subjects.forEach(s => {
        addSubjectRow(tbody);
        const lastRow = tbody.lastElementChild;
        lastRow.querySelector('input[placeholder="Subject"]').value = s.name;
        lastRow.querySelector('input[placeholder="Teacher (optional)"]').value = s.teacher || '';
        const roomEl = lastRow.querySelector('input[placeholder="Room (optional)"]');
        if(roomEl) roomEl.value = s.room || '';
      });
    } else {
      for(let i=0;i<3;i++) addSubjectRow(tbody);
    }
  }

  function parseDays(text){
    const t = text.trim();
    if(/^default$/i.test(t)) return ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    return t.split(',').map(s => s.trim()).filter(Boolean);
  }

  function collect(){
    const days = parseDays(document.getElementById('school-days').value || 'default');
    const periods = parseInt(document.getElementById('school-periods').value || '6', 10);
    const maxTxt = (document.getElementById('school-max').value || 'auto').trim();
    const max = /^auto$/i.test(maxTxt) ? 'auto' : Math.max(1, parseInt(maxTxt,10));

    const classes = [];
    let teachers = undefined;

    // Prefer grid-defined teachers if any exist
    const gridContainer = document.getElementById('teacher-grid-container');
    if(gridContainer && gridContainer.children.length > 0){
      teachers = [];
      for(const card of gridContainer.children){
        const name = (card.querySelector('input[data-teacher-name]')?.value || '').trim();
        const code = (card.querySelector('input[data-teacher-code]')?.value || '').trim();
        if(!name && !code) continue;
        const availability = {};
        for(const day of days){
          availability[day] = [];
          const cells = card.querySelectorAll(`input[data-day="${day}"]`);
          cells.forEach((chk) => { if(chk.checked){ availability[day].push(parseInt(chk.getAttribute('data-period'),10)); } });
        }
        teachers.push({ name, code: code || undefined, availability });
      }
    } else {
      const ta = document.getElementById('teacher-availability');
      if(ta && ta.value.trim()){
        const txt = ta.value.trim();
        // Try JSON first
        try{ teachers = JSON.parse(txt); }
        catch(e){
          // Parse simple lines: CODE, Name, Mon=1-6; Tue=1-3; Fri=2,4,5
          const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          const dayMap = new Map();
          const ds = days;
          for(const d of ds){ dayMap.set(d.toLowerCase(), d); dayMap.set(d.slice(0,3).toLowerCase(), d); }
          const out = [];
          for(const line of lines){
            const m = line.split(',');
            const code = (m[0] || '').trim();
            const name = (m[1] || '').trim();
            const rest = (m.slice(2).join(',') || '').trim();
            const availability = {};
            if(rest){
              const parts = rest.split(/;|\s{2,}/).map(s => s.trim()).filter(Boolean);
              for(const part of parts){
                const [dRaw, periodsRaw] = part.split(/[:=]/).map(s => s.trim());
                if(!dRaw || !periodsRaw) continue;
                const key = (dayMap.get(dRaw.toLowerCase()) || dRaw);
                const ps = [];
                for(const chunk of periodsRaw.split(',').map(s => s.trim()).filter(Boolean)){
                  const mr = chunk.match(/^(\d+)-(\d+)$/);
                  if(mr){
                    const a = parseInt(mr[1],10), b = parseInt(mr[2],10);
                    for(let p=Math.min(a,b); p<=Math.max(a,b); p++) ps.push(p);
                  } else {
                    const n = parseInt(chunk,10); if(Number.isFinite(n)) ps.push(n);
                  }
                }
                availability[key] = ps;
              }
            }
            out.push({ code: code || undefined, name, availability });
          }
          teachers = out;
        }
      }
    }

    // Rooms parsing
    let rooms = undefined;
    const roomsEl = document.getElementById('rooms-list');
    if(roomsEl && roomsEl.value.trim()){
      rooms = roomsEl.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if(rooms.length === 0) rooms = undefined;
    }
    container.querySelectorAll('.card.pad').forEach(card => {
      const name = card.querySelector('input.chat__input').value.trim() || 'Class';
      const subjects = [];
      card.querySelectorAll('tbody tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input.chat__input');
        const n = (inputs[0].value || '').trim();
        const t = (inputs[1].value || '').trim();
        const r = (inputs[2].value || '').trim();
        if(n) subjects.push({ name: n, teacher: t, room: r });
      });
      if(subjects.length) classes.push({ name, subjects, max_per_day: max });
    });
    const payload = { days, periods_per_day: periods, classes };
    if(teachers) payload.teachers = teachers;
    if(rooms) payload.rooms = rooms;
    return payload;
  }

  function renderSchoolTables(days, periodsPerDay, schedules){
    resultsEl.innerHTML = '';
    for(const [className, schedule] of Object.entries(schedules)){
      const wrapper = makeEl('div', { class: 'card pad', style: 'margin-bottom:12px;' });
      wrapper.appendChild(makeEl('h3', { text: className }));

      const table = makeEl('table');
      const thead = makeEl('thead');
      const trh = makeEl('tr');
      trh.appendChild(makeEl('th'));
      for(let p=1;p<=periodsPerDay;p++) trh.appendChild(makeEl('th', { text: `Period ${p}` }));
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = makeEl('tbody');
      for(const day of days){
        const tr = makeEl('tr');
        tr.appendChild(makeEl('th', { text: day }));
        for(let p=0;p<periodsPerDay;p++){
          const td = makeEl('td');
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
      wrapper.appendChild(table);
      resultsEl.appendChild(wrapper);
    }
  }

  let lastSchedules = null, lastDays = null, lastP = null;

  async function generate(){
    const payload = collect();
    try{
      console.log('POST /api/generate', payload);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Server error');
      const data = await res.json();
      renderSchoolTables(payload.days, payload.periods_per_day, data.schedules);
      lastSchedules = data.schedules; lastDays = payload.days; lastP = payload.periods_per_day;
    }catch(err){
      resultsEl.innerHTML = '<p style="color:#b91c1c">Failed to generate via server. Make sure the backend is running.</p>';
    }
  }

  function exportCsv(){
    if(!lastSchedules){ alert('Please generate a timetable first.'); return; }
    const lines = [ 'Class,Day,Period,Subject,Teacher,Room' ];
    for(const [className, schedule] of Object.entries(lastSchedules)){
      for(const day of lastDays){
        for(let p=0;p<lastP;p++){
          const slot = schedule[day][p] || {name:'',teacher:'',room:''};
          const row = [className, day, String(p+1), slot.name||'', slot.teacher||slot.teacher_code||'', slot.room||''];
          lines.push(row.map(x => '"'+String(x).replace('"','""')+'"').join(','));
        }
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'timetables.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function printResults(){
    const html = resultsEl.innerHTML;
    const win = window.open('', '_blank');
    if(!win){ return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title><link rel="stylesheet" href="styles.css"></head><body><div class="container">${html}</div><script>window.onload=()=>{window.print();}</script></body></html>`);
    win.document.close();
  }

  // Teacher grid builder
  function addTeacherCard(prefill){
    const gridContainer = document.getElementById('teacher-grid-container');
    const days = parseDays(document.getElementById('school-days').value || 'default');
    const periods = parseInt(document.getElementById('school-periods').value || '6', 10);

    const card = makeEl('div', { class: 'card pad', style: 'margin:12px 0;' });
    const header = makeEl('div', { style: 'display:flex; gap:8px; align-items:center; justify-content:space-between;' });
    const left = makeEl('div');
    const row = makeEl('div', { style: 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;' });
    const nameLbl = makeEl('label', { text: 'Name' });
    const nameInput = makeEl('input', { class: 'chat__input', 'data-teacher-name': '1', value: prefill?.name || '' });
    const codeLbl = makeEl('label', { text: 'Code' });
    const codeInput = makeEl('input', { class: 'chat__input', 'data-teacher-code': '1', value: prefill?.code || '' });
    row.appendChild(nameLbl); row.appendChild(nameInput); row.appendChild(codeLbl); row.appendChild(codeInput);
    left.appendChild(row);
    const removeBtn = makeEl('button', { class: 'btn btn-secondary', type: 'button', text: 'Remove' });
    removeBtn.addEventListener('click', () => card.remove());
    header.appendChild(left); header.appendChild(removeBtn);

    const table = makeEl('table', { style: 'width:100%; border-collapse: collapse; margin-top:10px;' });
    const thead = makeEl('thead');
    const trh = makeEl('tr');
    trh.appendChild(makeEl('th', { text: '' }));
    for(let p=1;p<=periods;p++) trh.appendChild(makeEl('th', { text: `P${p}` }));
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = makeEl('tbody');
    for(const day of days){
      const tr = makeEl('tr');
      tr.appendChild(makeEl('th', { text: day }));
      for(let p=1;p<=periods;p++){
        const td = makeEl('td');
        const checked = prefill?.availability && Array.isArray(prefill.availability[day]) ? prefill.availability[day].includes(p) : true;
        const chk = makeEl('input', { type: 'checkbox', 'data-day': day, 'data-period': String(p) });
        if (checked) chk.checked = true; else chk.checked = false;
        td.appendChild(chk);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    card.appendChild(table);

    gridContainer.appendChild(card);
  }

  // Init
  addClassBtn.addEventListener('click', () => addClassCard());
  generateBtn.addEventListener('click', generate);
  const exportBtn = document.getElementById('export-csv');
  if(exportBtn){ exportBtn.addEventListener('click', exportCsv); }
  const printBtn = document.getElementById('print-results');
  if(printBtn){ printBtn.addEventListener('click', printResults); }

  const addTeacherGridBtn = document.getElementById('add-teacher-grid');
  if(addTeacherGridBtn){ addTeacherGridBtn.addEventListener('click', () => addTeacherCard()); }

  const exampleBtn = document.getElementById('insert-availability-example');
  if(exampleBtn){
    exampleBtn.addEventListener('click', () => {
      const lines = [
        'TSMITH, Mr. Smith, Mon=1-6; Tue=1-3; Wed=1-6',
        'MJONES, Ms. Jones, Thu=1-6',
        'DRLEE, Dr. Lee, Tue=1-6; Fri=1-6',
        'MKUMAR, Mr. Kumar, Mon=1-6; Wed=1-3; Fri=1-4'
      ];
      const ta = document.getElementById('teacher-availability');
      ta.value = lines.join('\n');
    });
  }

  // Prefill with two example classes
  addClassCard({ name: 'Class A', subjects: [ {name:'Math', teacher:'TSMITH', room:'R101'}, {name:'English', teacher:'MJONES', room:'R102'} ] });
  addClassCard({ name: 'Class B', subjects: [ {name:'Science', teacher:'DRLEE', room:'Lab-1'}, {name:'History', teacher:'MKUMAR', room:'R103'} ] });

  // Sync teacher grid when days/periods change (preserve selections)
  function syncGrids(){
    const gridContainer = document.getElementById('teacher-grid-container');
    if(!gridContainer) return;
    const days = parseDays(document.getElementById('school-days').value || 'default');
    const collectors = [];
    for(const card of gridContainer.children){
      const name = (card.querySelector('input[data-teacher-name]')?.value || '').trim();
      const code = (card.querySelector('input[data-teacher-code]')?.value || '').trim();
      const availability = {};
      for(const d of days){
        availability[d] = [];
        const cells = card.querySelectorAll(`input[data-day="${d}"]`);
        cells.forEach(chk => { if(chk.checked){ availability[d].push(parseInt(chk.getAttribute('data-period'),10)); } });
      }
      collectors.push({ name, code, availability });
    }
    gridContainer.innerHTML = '';
    collectors.forEach(t => addTeacherCard(t));
  }
  document.getElementById('school-days').addEventListener('change', syncGrids);
  document.getElementById('school-periods').addEventListener('change', syncGrids);
})();
