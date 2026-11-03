// Kids Learning — app logic. Data lives in localStorage under KEY.
const KEY = 'kids-learning-v1', WINDOW = 10, NEED = 8;
const AVATARS = ['🦄', '🦖', '🐱', '🐶', '🦊', '🐼', '🐸', '🚀', '🌟', '🐙'];
const PRAISE = ['Awesome! 🎉', 'Great job! ⭐', 'You got it! 🙌', 'Super! 🚀', 'Brilliant! 💡', 'Way to go! 🏆'];
const ENCOURAGE = ['Nice try! Keep going 💪', 'Almost! You can do it 🌈', 'Good effort! Let\'s try another 😊'];
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DEFAULTS = [['Leah', '🦄', '#fd79a8'], ['Isaac', '🦖', '#74b9ff'], ['Alexander', '🦁', '#55efc4']];
function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d || !Array.isArray(d.profiles)) d = { pin: '1234', profiles: [] };
  d.addedDefaults = d.addedDefaults || d.profiles.map(p => p.name);
  // Merge in any default learners this browser hasn't seen yet (never touches existing progress).
  for (const [n, a, c] of DEFAULTS) if (!d.addedDefaults.includes(n)) { if (!d.profiles.some(p => p.name === n)) d.profiles.push(newProfile(n, a, c)); d.addedDefaults.push(n); }
  return d;
}
function newProfile(name, avatar, color) { return { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, avatar, color: color || '#ffeaa7', level: null, stars: 0, progress: {} }; }
let DB = load(); const save = () => localStorage.setItem(KEY, JSON.stringify(DB));
let S = { profile: null, subject: 'math', skill: null, q: null, answered: false, parent: false };

const prof = () => DB.profiles.find(p => p.id === S.profile);
const sp = (p, id) => p.progress[id] || (p.progress[id] = { history: [], mastered: false, unlocked: false, total: 0, correct: 0 });
const skillsOf = sub => SUBJECTS[sub].skills;
function isUnlocked(p, sub, i) { const sk = skillsOf(sub); if (i === 0) return true; const s = p.progress[sk[i].id]; return !!(s && (s.unlocked || s.mastered)) || !!(p.progress[sk[i - 1].id] || {}).mastered; }
function recent(s) { const h = s.history.slice(-WINDOW); return { n: h.length, c: h.filter(Boolean).length }; }
function status(p, sub, i) { const s = p.progress[skillsOf(sub)[i].id]; if (s && s.mastered) return 'mastered'; return isUnlocked(p, sub, i) ? 'unlocked' : 'locked'; }
function currentIndex(p, sub) { const sk = skillsOf(sub); for (let i = 0; i < sk.length; i++) if (status(p, sub, i) === 'unlocked') return i; return -1; }
function setLevel(p, grade) {
  p.level = grade; const gi = GRADES.indexOf(grade);
  for (const sub in SUBJECTS) { const sk = skillsOf(sub); let firstDone = false;
    sk.forEach(k => { const s = sp(p, k.id), kg = GRADES.indexOf(k.grade); if (kg < gi) s.unlocked = true; else if (kg >= gi && !firstDone) { s.unlocked = true; firstDone = true; } }); }
  save();
}
const badgeCount = p => Object.values(p.progress).filter(s => s.mastered).length;

// ---------- Views ----------
function setTitle(t) { $('#title').textContent = t; }
function go(view, ...a) { S.view = view; window.scrollTo(0, 0); VIEWS[view](...a); }
const VIEWS = {
  picker() {
    S.profile = null; setTitle('Who is learning today?');
    app.innerHTML = `<h2>👋 Hi! Who's learning?</h2><div class="grid">${DB.profiles.map(p => `
      <button class="profile" data-testid="profile-${esc(p.name)}" data-id="${p.id}"><div class="av" style="background:${p.color}">${p.avatar}</div>
      <b style="font-size:1.4rem">${esc(p.name)}</b><small>⭐ ${p.stars} · 🏅 ${badgeCount(p)}</small></button>`).join('')}
      <button class="profile secondary" id="addP" data-testid="add-profile"><div class="av">➕</div><b>Add learner</b></button></div>`;
    app.querySelectorAll('.profile[data-id]').forEach(b => b.onclick = () => { S.profile = b.dataset.id; prof().level ? go('map') : go('level'); });
    $('#addP').onclick = () => go('addProfile');
  },
  addProfile() {
    setTitle('New learner'); let av = AVATARS[2];
    app.innerHTML = `<div class="card"><h2>Add a learner</h2><label>Name<input id="nm" maxlength="20" placeholder="Name"></label>
      <p><b>Pick a buddy</b></p><div class="avpick">${AVATARS.map(a => `<button data-a="${a}" class="${a === av ? 'on' : ''}">${a}</button>`).join('')}</div>
      <div class="row"><button class="secondary" id="cancel">Cancel</button><button class="ok" id="create">Create</button></div></div>`;
    app.querySelectorAll('.avpick button').forEach(b => b.onclick = () => { av = b.dataset.a; app.querySelectorAll('.avpick button').forEach(x => x.classList.toggle('on', x === b)); });
    $('#cancel').onclick = () => go('picker');
    $('#create').onclick = () => { const n = $('#nm').value.trim(); if (!n) return $('#nm').focus(); const p = newProfile(n, av, ['#ffeaa7', '#55efc4', '#a29bfe', '#fab1a0'][DB.profiles.length % 4]); DB.profiles.push(p); save(); S.profile = p.id; go('level'); };
  },
  level() {
    const p = prof(); setTitle(p.name);
    app.innerHTML = `<h2>Where should ${esc(p.name)} start?</h2><div class="card"><p style="text-align:center">Pick a grade, or take a quick check and we'll suggest one. You can always change this in the Parent area.</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${GRADES.map(g => `<button data-g="${g}" data-testid="grade-${g}">${g === 'K' ? 'Kinder' : 'Grade ' + g}</button>`).join('')}</div>
      <div class="row"><button class="ok" id="place" data-testid="placement">✨ Quick check</button></div></div>`;
    app.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { setLevel(p, b.dataset.g); go('map'); });
    $('#place').onclick = () => go('placement');
  },
  placement() {
    // One math + one reading question per grade, from K upward; stop after 2 misses in a grade or 3 total.
    const p = prof(); setTitle('Quick check'); let gi = 0, step = 0, miss = 0, gradeMiss = 0, reached = 0;
    const next = () => {
      if (gi >= GRADES.length || miss >= 3) { const g = GRADES[Math.max(0, Math.min(reached, GRADES.length - 1))]; setLevel(p, g);
        return overlay(`<div class="big">🎯</div><h2>Let's start at ${g === 'K' ? 'Kindergarten' : 'Grade ' + g}!</h2><button class="ok" id="ov">Let's go!</button>`, () => go('map')); }
      const sub = step % 2 ? 'reading' : 'math', cand = skillsOf(sub).filter(k => k.grade === GRADES[gi]); const k = cand[0] || skillsOf(sub)[0];
      const q = k.gen(); renderQ(q, `Quick check · ${GRADES[gi] === 'K' ? 'Kinder' : 'Grade ' + GRADES[gi]}`, ok => {
        if (!ok) { miss++; gradeMiss++; }
        step++; if (step % 2 === 0) { if (gradeMiss === 0) reached = gi + 1; else if (gradeMiss === 1) reached = gi; if (gradeMiss >= 2) miss = 3; gi++; gradeMiss = 0; }
        setTimeout(next, 700);
      }, true);
    }; next();
  },
  map() {
    const p = prof(); setTitle(`${p.avatar} ${p.name}`); const sub = S.subject, sk = skillsOf(sub), cur = currentIndex(p, sub); let lastG = null;
    app.innerHTML = `<div class="stars">⭐ ${p.stars} stars · 🏅 ${badgeCount(p)} badges</div>
      <div class="tabs" style="margin-top:12px">${Object.entries(SUBJECTS).map(([k, v]) => `<button data-s="${k}" data-testid="tab-${k}" class="${k === sub ? 'on' : ''}">${v.icon} ${v.name}</button>`).join('')}</div>
      <div class="path" data-testid="skill-map">${sk.map((k, i) => { const st = status(p, sub, i), s = p.progress[k.id], r = s ? recent(s) : { n: 0, c: 0 };
        const g = k.grade !== lastG ? `<div class="grade-label">${k.grade === 'K' ? 'Kindergarten' : 'Grade ' + k.grade}</div>` : ''; lastG = k.grade;
        const sub2 = st === 'locked' ? '🔒 Locked' : st === 'mastered' ? '🏅 Mastered!' : `${r.c}/${WINDOW} recent right · need ${NEED}`;
        return g + `<button class="skill ${st} ${i === cur ? 'current' : ''}" data-i="${i}" data-testid="skill-${k.id}" data-status="${st}" ${st === 'locked' ? 'aria-disabled="true"' : ''}>
          <span class="ic">${st === 'locked' ? '🔒' : k.icon}</span><span class="nm">${k.name}<small>${sub2}</small>${st !== 'locked' ? `<div class="bar"><i style="width:${st === 'mastered' ? 100 : r.c / WINDOW * 100}%"></i></div>` : ''}</span>
          <span style="font-size:1.6rem">${st === 'mastered' ? '⭐' : st === 'locked' ? '' : '▶️'}</span></button>`; }).join('')}</div>`;
    app.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { S.subject = b.dataset.s; go('map'); });
    app.querySelectorAll('.skill').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (status(p, sub, i) === 'locked') return toast('Master the skill before it to unlock this one! 🔒'); openSkill(sk[i]); });
  },
  practice() {
    const p = prof(), k = S.skill, s = sp(p, k.id); S.q = k.gen();
    renderQ(S.q, `${k.icon} ${k.name}`, ok => {
      s.total++; if (ok) { s.correct++; p.stars++; } s.history.push(ok); s.history = s.history.slice(-50);
      const r = recent(s), wasM = s.mastered;
      if (!wasM && r.n >= WINDOW && r.c >= NEED) { s.mastered = true; }
      save(); updateDots(s);
      if (!ok && s.history.length >= 3 && s.history.slice(-3).every(x => !x)) { const n = document.createElement('div'); n.className = 'nudge'; n.dataset.testid = 'nudge';
        n.innerHTML = `Tricky one! 🤗 Want to look at the lesson again? <button class="secondary" style="min-height:44px;margin-left:8px">📖 Review lesson</button>`; n.querySelector('button').onclick = () => go('lesson'); $('#fb').after(n); }
      if (s.mastered && !wasM) { const sk = skillsOf(S.subject), i = sk.indexOf(k), nx = sk[i + 1];
        if (nx) sp(p, nx.id).unlocked = true; save();
        setTimeout(() => overlay(`<div class="big">🏆</div><h2>You mastered ${k.name}!</h2><p>New badge earned! ${nx ? `Next up: <b>${nx.icon} ${nx.name}</b> is unlocked!` : 'You finished the whole path! 🎓'}</p>
          <div class="row"><button class="secondary" id="ov2" data-testid="back-map">Skill map</button>${nx ? `<button class="ok" id="ov" data-testid="next-skill">Next skill ▶️</button>` : ''}</div>`,
          () => openSkill(nx), () => go('map')), 600);
      }
    }, false, s);
  },
  lesson() {
    const p = prof(), k = S.skill, L = LESSONS[k.id], s = sp(p, k.id); s.lessonViewed = true; s.lessonViews = (s.lessonViews || 0) + 1; save(); setTitle(`${p.avatar} ${p.name}`);
    const text = [L.say, ...L.ex.flat()].join('. ').replace(/[^\w\s.,'"?!%¢+−×÷=/-]/gu, ' ');
    app.innerHTML = `<div class="lesson" data-testid="lesson" data-skill="${k.id}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <button class="secondary" id="back" style="min-height:48px">⬅</button><b>📖 Lesson</b><span style="width:48px"></span></div>
      <h2>${k.icon} ${k.name}</h2><div class="card"><p class="say">${esc(L.say)}</p><div class="vis">${L.vis}</div>
      <button class="secondary" id="read" data-testid="read-to-me">🔊 Read to me</button></div>
      ${L.ex.map(([t, ...st], j) => `<div class="card example"><b>Example ${j + 1}: ${esc(t)}</b><ol>${st.map((x, i) => `<li style="animation-delay:${0.4 + j * 0.6 + i * 0.5}s">${esc(x)}</li>`).join('')}</ol></div>`).join('')}
      <div class="row"><button class="ok" id="go" data-testid="start-practice" style="font-size:1.4rem">Let's practice! 🚀</button></div></div>`;
    $('#back').onclick = () => go('map'); $('#read').onclick = () => say(text); $('#go').onclick = () => { speechSynthesis && speechSynthesis.cancel(); go('practice'); };
  },
  pin() {
    setTitle('Parents'); let v = '';
    app.innerHTML = `<div class="card" style="max-width:380px;margin:auto"><h2>🔐 Parent PIN</h2><input id="pin" class="pin" type="password" inputmode="numeric" maxlength="8" readonly data-testid="pin-input">
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✔'].map(x => `<button class="${x === '✔' ? 'ok' : 'secondary'}" data-k="${x}">${x}</button>`).join('')}</div><p id="perr" style="color:var(--bad);text-align:center"></p></div>`;
    app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k;
      if (k === '⌫') v = v.slice(0, -1); else if (k === '✔') { if (v === DB.pin) { S.parent = true; return go('dashboard'); } $('#perr').textContent = 'Wrong PIN'; v = ''; } else if (v.length < 8) v += k; $('#pin').value = v; });
  },
  dashboard() {
    setTitle('Parent dashboard');
    app.innerHTML = `<h2>👪 Parent dashboard</h2>${DB.profiles.map(p => `<div class="card" style="margin-bottom:16px" data-testid="dash-${esc(p.name)}">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="font-size:2.4rem">${p.avatar}</span><h3 style="margin:0;flex:1">${esc(p.name)}</h3>
      <span>⭐ ${p.stars} · 🏅 ${badgeCount(p)}</span>
      <select data-lvl="${p.id}" style="width:auto"><option value="">Start level…</option>${GRADES.map(g => `<option ${p.level === g ? 'selected' : ''} value="${g}">${g === 'K' ? 'Kinder' : 'Grade ' + g}</option>`).join('')}</select></div>
      ${Object.entries(SUBJECTS).map(([sub, S2]) => `<h4>${S2.icon} ${S2.name}</h4><div style="overflow-x:auto"><table><tr><th>Skill</th><th>Gr</th><th>Status</th><th>Recent</th><th>All-time</th><th>Lesson</th><th></th></tr>
        ${S2.skills.map((k, i) => { const st = status(p, sub, i), s = p.progress[k.id], r = s ? recent(s) : { n: 0, c: 0 };
          return `<tr><td>${k.icon} ${k.name}</td><td>${k.grade}</td><td>${st === 'mastered' ? '🏅 mastered' : st === 'locked' ? '🔒 locked' : '🟢 open'}</td><td>${r.c}/${r.n}</td><td>${s && s.total ? Math.round(s.correct / s.total * 100) + '% of ' + s.total : '—'}</td><td>${s && s.lessonViewed ? '📖 ✓' : '—'}</td>
          <td>${st === 'locked' ? `<button data-act="unlock" data-p="${p.id}" data-k="${k.id}" data-testid="unlock-${p.name}-${k.id}">Unlock</button>` : ''}${st !== 'mastered' && st !== 'locked' ? ` <button class="ok" data-act="master" data-p="${p.id}" data-k="${k.id}">Mark mastered</button>` : ''}${s ? ` <button class="danger" data-act="reset" data-p="${p.id}" data-k="${k.id}">Reset</button>` : ''}</td></tr>`; }).join('')}</table></div>`).join('')}
      <div class="row"><button class="danger" data-act="resetall" data-p="${p.id}">Reset all progress</button>${DB.profiles.length > 1 ? `<button class="secondary" data-act="delete" data-p="${p.id}">Remove learner</button>` : ''}</div></div>`).join('')}
      <div class="card"><h3>Settings</h3><label>Change PIN <input id="newpin" inputmode="numeric" maxlength="8" placeholder="New PIN"></label><div class="row"><button id="savepin">Save PIN</button><button class="secondary" id="lock">Lock & exit</button></div></div>`;
    app.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { const p = DB.profiles.find(x => x.id === b.dataset.p), a = b.dataset.act;
      if (a === 'unlock') sp(p, b.dataset.k).unlocked = true;
      if (a === 'master') { const s = sp(p, b.dataset.k); s.mastered = true; s.unlocked = true; }
      if (a === 'reset') delete p.progress[b.dataset.k];
      if (a === 'resetall') { if (!confirm(`Reset all of ${p.name}'s progress?`)) return; p.progress = {}; p.stars = 0; p.level = null; }
      if (a === 'delete') { if (!confirm(`Remove ${p.name}?`)) return; DB.profiles = DB.profiles.filter(x => x !== p); }
      save(); go('dashboard'); });
    app.querySelectorAll('[data-lvl]').forEach(s => s.onchange = () => { if (s.value) { setLevel(DB.profiles.find(x => x.id === s.dataset.lvl), s.value); go('dashboard'); } });
    $('#savepin').onclick = () => { const v = $('#newpin').value.trim(); if (/^\d{4,8}$/.test(v)) { DB.pin = v; save(); toast('PIN saved'); } else toast('PIN must be 4–8 digits'); };
    $('#lock').onclick = () => { S.parent = false; go('picker'); };
  },
};

function openSkill(k) { S.skill = k; const s = prof().progress[k.id]; go(s && s.lessonViewed ? 'practice' : 'lesson'); }
function renderQ(q, label, onAnswer, placement, s) {
  S.answered = false;
  app.innerHTML = `<div class="q" data-testid="question" data-answer="${esc(q.answer)}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <button class="secondary" id="back" style="min-height:48px">⬅</button><b>${esc(label)}</b>${placement ? '' : `<button class="secondary" id="help" data-testid="help" style="min-height:48px">📖 Help</button>`}${q.speak ? `<button class="secondary" id="say" aria-label="Hear it" style="min-height:48px">🔊</button>` : '<span style="width:48px"></span>'}</div>
    ${s ? `<div class="dots" id="dots"></div>` : ''}
    ${q.passage ? `<div class="card passage" data-testid="passage"><b>${esc(q.passage.title)}</b><p>${esc(q.passage.text)}</p></div>` : ''}
    ${q.visual ? `<div class="visual">${q.visual}</div>` : ''}<div class="prompt">${esc(q.prompt)}</div>
    <div class="choices">${q.choices.map(c => `<button data-c="${esc(c)}" data-testid="choice">${esc(c)}</button>`).join('')}</div>
    <div class="feedback" id="fb"></div><div class="row" id="nextRow"></div></div>`;
  if (s) updateDots(s);
  $('#back').onclick = () => go(placement ? 'level' : 'map'); if (!placement) $('#help').onclick = () => go('lesson');
  if (q.speak) { $('#say').onclick = () => say(q.speak); if (!placement) setTimeout(() => say(q.speak), 300); }
  app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    if (S.answered) return; S.answered = true; const ok = b.dataset.c === q.answer;
    b.classList.add(ok ? 'right' : 'wrong'); if (!ok) app.querySelector(`[data-c="${CSS.escape(q.answer)}"]`).classList.add('right');
    $('#fb').textContent = placement ? (ok ? '👍' : '👌') : ok ? pick(PRAISE) : `${pick(ENCOURAGE)} — the answer is ${q.answer}`;
    $('#fb').style.color = ok ? 'var(--ok)' : 'var(--bad)';
    onAnswer(ok);
    if (!placement && $('#overlay').hidden) { $('#nextRow').innerHTML = `<button class="ok" id="nextQ" data-testid="next-q">Next ▶️</button>`; $('#nextQ').onclick = () => go('practice'); }
  });
}
function updateDots(s) { const d = $('#dots'); if (!d) return; const h = s.history.slice(-WINDOW); d.innerHTML = Array.from({ length: WINDOW }, (_, i) => `<span class="${h[i] === undefined ? '' : h[i] ? 'y' : 'n'}"></span>`).join('') + (s.mastered ? ' 🏅' : ''); }
function say(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = .85; speechSynthesis.speak(u); } catch (e) {} }
function overlay(html, onOk, onAlt) { const o = $('#overlay'); o.innerHTML = `<div class="card">${html}</div>`; o.hidden = false;
  const close = f => () => { o.hidden = true; o.innerHTML = ''; f && f(); }; const a = $('#ov'), b = $('#ov2'); if (a) a.onclick = close(onOk); if (b) b.onclick = close(onAlt); }
function toast(m) { overlay(`<p style="font-size:1.3rem">${esc(m)}</p><button id="ov">OK</button>`); }

$('#homeBtn').onclick = () => go(S.profile && S.view !== 'map' ? 'map' : 'picker');
$('#parentBtn').onclick = () => go(S.parent ? 'dashboard' : 'pin');
save(); go('picker');
