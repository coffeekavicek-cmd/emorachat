/* EMORA reusable story runtime. No customer-specific text is hardcoded into the engine. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sceneIds = ['intro', 'time', 'photos', 'film', 'letter', 'final'];
  const defaults = window.EMORA_TEMPLATE_DATA || {};
  let config = structuredClone(defaults);
  let chapter = 'intro';
  let beforeExit = 'intro';
  let transitionLock = false;
  let soundWanted = false;
  let counterFrame = null;
  let openTimer = null;
  let toastTimer = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const music = $('backgroundMusic');
  const video = $('video');
  const $text = (id, value) => { if ($(id)) $(id).textContent = value ?? ''; };

  function permittedMedia(value, kind) {
    if (typeof value !== 'string' || value.length > 3000000) return '';
    if (/^(?:https?:\/\/|\/(?!\/)|assets\/|blob:)/i.test(value)) return value;
    if (kind === 'image' && value.startsWith('data:image/')) return value;
    if (kind === 'audio' && value.startsWith('data:audio/')) return value;
    if (kind === 'video' && value.startsWith('data:video/')) return value;
    return '';
  }
  function addSource(media, src, kind) {
    const valid = permittedMedia(src, kind);
    media.querySelector('source')?.setAttribute('src', valid);
    if (kind !== 'image') media.load();
    else media.src = valid || 'assets/photo-1.webp';
  }
  function firstLineBreak(value) { return String(value || '').replace(/<br\s*\/?\s*>/gi, '\n'); }
  function configure(data = defaults) {
    config = { ...structuredClone(defaults), ...data };
    document.documentElement.style.setProperty('--peach', /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : '#e7ad99');
    document.documentElement.style.setProperty('--peach2', /^#[0-9a-f]{6}$/i.test(config.accentSoft) ? config.accentSoft : '#f4d4c8');
    const fields = {
      introCopy: firstLineBreak(config.intro), introQuestion: config.question, counterLead: config.counterLead,
      bridge: config.bridge, galleryHeading: firstLineBreak(config.galleryHeading),
      complimentOne: config.compliments?.[0], complimentTwo: config.compliments?.[1], complimentThree: config.compliments?.[2],
      videoHeading: config.videoHeading, videoCaption: config.videoCaption,
      letterHeading: firstLineBreak(config.letterHeading), letterText: config.letter,
      envelopeTo: String(config.recipient || 'SEN').toUpperCase(), signature: `Doim, ${config.sender || 'seni sevuvchi inson'} ♡`,
      finalHeading: config.finalHeading, finalLine: config.finalLine, finalName: `— ${config.sender || 'Seni sevuvchi inson'}`
    };
    Object.entries(fields).forEach(([id, value]) => value != null && $text(id, value));
    (config.photos || []).slice(0, 3).forEach((src, index) => {
      const img = $([null, 'photoOne', 'photoTwo', 'photoThree'][index + 1]);
      const valid = permittedMedia(src, 'image');
      if (img && valid) img.src = valid;
    });
    addSource(music, config.music || '', 'audio');
    addSource(video, config.video || '', 'video');
    video.hidden = !permittedMedia(config.video, 'video');
    $('filmPlaceholder').hidden = !video.hidden;
    const poster = permittedMedia(config.photos?.[1], 'image');
    if (poster) { video.poster = poster; $('filmPlaceholder').style.backgroundImage = `linear-gradient(#1b1112bb,#1b1112e4),url(${JSON.stringify(poster)})`; }
    $('sound').disabled = !permittedMedia(config.music, 'audio');
    updateCounter(false);
  }
  async function loadShared() {
    const s = new URLSearchParams(location.search).get('s');
    if (!s || !/^[a-z0-9_-]{3,30}$/i.test(s)) return;
    try {
      const res = await fetch('/api/sites/' + encodeURIComponent(s), { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('not found');
      const body = await res.json();
      if (body.site?.template !== 'love-confession-cinema-01') throw new Error('not a love template');
      configure(body.site);
      fetch('/api/sites/' + encodeURIComponent(s) + '/view', { method: 'POST' }).catch(() => {});
    } catch (e) { toast('Shaxsiy hikoyani ochib bo‘lmadi. Namuna ko‘rsatilmoqda.'); }
  }
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
  }
  function updateProgress(id) {
    const idx = sceneIds.indexOf(id);
    if (idx === -1) return;
    $('chapterNumber').textContent = String(idx + 1).padStart(2, '0');
    $('progressBar').style.width = ((idx + 1) / sceneIds.length * 100) + '%';
  }
  function show(id, immediate = false) {
    if (!$(id) || transitionLock || (chapter === id && !immediate)) return;
    transitionLock = !immediate;
    const leaving = $(chapter);
    if (leaving && leaving !== $(id) && !immediate) leaving.classList.add('is-leaving');
    const finish = () => {
      if (leaving && leaving !== $(id)) { leaving.hidden = true; leaving.classList.remove('active', 'is-leaving'); }
      const incoming = $(id);
      incoming.hidden = false;
      incoming.classList.remove('is-leaving');
      incoming.classList.add('active');
      chapter = id;
      updateProgress(id);
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (id === 'time') animateCounter();
      if (id !== 'film') { video.pause(); if (soundWanted && id !== 'intro' && id !== 'exit' && music.paused) playMusic(); }
      transitionLock = false;
    };
    if (immediate || reducedMotion || chapter === id) finish();
    else setTimeout(finish, 450);
  }
  function soundStatus() {
    const playing = soundWanted && !music.paused;
    $('sound').classList.toggle('playing', playing);
    $text('soundLabel', playing ? 'O‘chirish' : 'Musiqa');
    $('sound').setAttribute('aria-pressed', String(playing));
  }
  async function playMusic() {
    if (!music.querySelector('source')?.getAttribute('src')) return;
    soundWanted = true;
    music.volume = .62;
    try { await music.play(); }
    catch { soundWanted = false; toast('Musiqa uchun yuqoridagi tugmani bosing.'); }
    soundStatus();
  }
  function toggleSound() {
    if (!music.paused) { soundWanted = false; music.pause(); }
    else playMusic();
    soundStatus();
  }
  function moveNo() {
    const btn = $('no'); const arena = $('choiceArena');
    const area = arena.getBoundingClientRect();
    const rect = btn.getBoundingClientRect();
    const w = Math.max(0, area.width - rect.width - 8); const h = Math.max(0, area.height - rect.height - 8);
    let nextX = 4 + Math.random() * w; let nextY = 4 + Math.random() * h;
    const curX = parseFloat(btn.style.left) || 0;
    if (Math.abs(nextX - curX) < 38) nextX = (nextX + area.width / 2) % Math.max(1, w);
    btn.style.left = nextX + 'px'; btn.style.top = nextY + 'px';
    btn.style.transform = `rotate(${(Math.random() - .5) * 8}deg)`;
    $('no').dataset.tries = String(Number($('no').dataset.tries || 0) + 1);
    if (Number(btn.dataset.tries) > 2) btn.innerHTML = 'Baribir yo‘qmi? ♡';
  }
  function elapsedParts(when, now = new Date()) {
    const since = new Date(when || '');
    if (Number.isNaN(since.valueOf()) || since > now) return { years: 0, months: 0, days: 0, hours: 0 };
    const cursor = new Date(since);
    function advanceYears() {
      const test = new Date(cursor); test.setFullYear(cursor.getFullYear() + 1);
      if (test <= now) { cursor.setTime(test.getTime()); return true; }
      return false;
    }
    function advanceMonths() {
      const test = new Date(cursor); const d = test.getDate(); test.setDate(1);
      test.setMonth(test.getMonth() + 1); const last = new Date(test.getFullYear(), test.getMonth() + 1, 0).getDate();
      test.setDate(Math.min(d, last));
      if (test <= now) { cursor.setTime(test.getTime()); return true; }
      return false;
    }
    let years = 0; let months = 0;
    while (years < 200 && advanceYears()) years++;
    while (months < 12 && advanceMonths()) months++;
    const hoursTotal = Math.floor((now - cursor) / 3600000);
    return { years, months, days: Math.floor(hoursTotal / 24), hours: hoursTotal % 24 };
  }
  function updateCounter(animate) {
    if (counterFrame) { cancelAnimationFrame(counterFrame); counterFrame = null; }
    const values = elapsedParts(config.metAt);
    const duration = animate && !reducedMotion ? 1800 : 0;
    const start = performance.now();
    const ease = p => 1 - Math.pow(1 - p, 4);
    const draw = now => {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      for (const [k, value] of Object.entries(values)) {
        const el = document.querySelector(`[data-count="${k}"]`);
        if (el) el.textContent = String(Math.round(value * ease(progress))).padStart(2, '0');
      }
      if (progress < 1) counterFrame = requestAnimationFrame(draw);
    };
    counterFrame = requestAnimationFrame(draw);
  }
  function animateCounter() { updateCounter(true); }
  function resetLetter() {
    clearTimeout(openTimer);
    $('openLetter').classList.remove('open'); $('openLetter').setAttribute('aria-expanded', 'false');
    $('letterSheet').hidden = true; $('letterPrompt').hidden = false;
  }
  function openLetter() {
    if ($('openLetter').classList.contains('open')) return;
    $('openLetter').classList.add('open'); $('openLetter').setAttribute('aria-expanded', 'true');
    openTimer = setTimeout(() => { $('letterSheet').hidden = false; $('letterPrompt').hidden = true; $('letterSheet').scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' }); }, reducedMotion ? 0 : 950);
  }
  function reset() { resetLetter(); video.currentTime = 0; show('intro'); }
  function bind() {
    $('yes').addEventListener('click', () => { playMusic(); show('time'); });
    const no = $('no');
    no.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') moveNo(); });
    no.addEventListener('pointerdown', e => { e.preventDefault(); moveNo(); });
    no.addEventListener('click', e => { e.preventDefault(); moveNo(); });
    document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => show(b.dataset.next)));
    $('sound').addEventListener('click', toggleSound);
    $('openLetter').addEventListener('click', openLetter);
    $('leave').addEventListener('click', () => { beforeExit = chapter; video.pause(); music.pause(); soundStatus(); show('exit'); });
    $('resume').addEventListener('click', () => { show(beforeExit); if (soundWanted) playMusic(); });
    $('replay').addEventListener('click', reset);
    $('copyLink').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); toast('Link nusxalandi ♡'); }
      catch { toast('Linkni brauzer manzil satridan nusxalang.'); }
    });
    video.addEventListener('play', () => { if (!music.paused) music.pause(); soundStatus(); });
    video.addEventListener('pause', () => { if (soundWanted && chapter === 'film') playMusic(); });
    video.addEventListener('ended', () => { if (soundWanted && chapter === 'film') playMusic(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && chapter !== 'exit') $('leave').click(); });
    window.addEventListener('message', event => {
      if (event.source !== parent || event.data?.type !== 'emora:preview' || !event.data.config) return;
      music.pause(); soundWanted = false; soundStatus(); configure(event.data.config); resetLetter(); show('intro', true);
    });
    window.addEventListener('pagehide', () => { music.pause(); video.pause(); });
    setInterval(() => { if (chapter === 'time') updateCounter(false); }, 60000);
  }
  if (new URLSearchParams(location.search).has('s') || new URLSearchParams(location.search).has('editor')) $('createMine').hidden = true;
  configure(config); bind(); loadShared();
  window.EMORA_STORY = Object.freeze({ configure, next: show, getConfig: () => structuredClone(config) });
})();
