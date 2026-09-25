(() => {
  const $ = id => document.getElementById(id);
  const demo = structuredClone(window.EMORA_TEMPLATE_DATA);
  let config = structuredClone(demo);
  try {
    const seed = JSON.parse(sessionStorage.getItem('emora:love:seed') || 'null');
    if (seed && typeof seed === 'object') {
      if (seed.recipient) config.recipient = String(seed.recipient).slice(0,42);
      if (seed.sender) config.sender = String(seed.sender).slice(0,42);
      if (seed.intro) config.intro = String(seed.intro).slice(0,180);
      if (seed.finalLine) config.finalLine = String(seed.finalLine).slice(0,250);
      if (/^#[0-9a-f]{6}$/i.test(seed.accent || '')) config.accent = seed.accent;
      sessionStorage.removeItem('emora:love:seed');
    }
  } catch { /* optional local draft */ }
  let debounce;
  const mediaOverrides = {};
  const dataKeys = ['recipient','sender','intro','question','counterLead','bridge','galleryHeading','videoHeading','videoCaption','letterHeading','letter','finalHeading','finalLine','accent','accentSoft'];
  function dateToInput(iso) {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
  function fill() {
    dataKeys.forEach(k => { const el = $(k); if (el) el.value = config[k] || ''; });
    $('metAt').value = dateToInput(config.metAt);
    $('videoUrl').value = config.video || '';
    $('musicUrl').value = config.music || '';
    const panel = $('photosEditor');
    panel.innerHTML = [0,1,2].map(i => `<fieldset class="photo-config"><legend>Foto ${i+1}</legend><div class="photo-row"><img id="thumb${i}" src="${demo.photos[i]}" alt="Foto ${i+1}"><label>Rasm URL <input id="photoUrl${i}" type="text" placeholder="https://… yoki assets/…"></label></div><label>Rasm faylini tanlash <input id="photoFile${i}" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Kompliment <textarea id="compliment${i}" maxlength="280" rows="2"></textarea></label></fieldset>`).join('');
    for (let i=0;i<3;i++) {
      $('photoUrl'+i).value = config.photos?.[i] || '';
      $('compliment'+i).value = config.compliments?.[i] || '';
      $('photoFile'+i).addEventListener('change', async e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 12*1024*1024) { status('Rasm 12 MB dan kichik bo‘lishi kerak.'); return; }
        if (mediaOverrides['photo'+i]) URL.revokeObjectURL(mediaOverrides['photo'+i]);
        mediaOverrides['photo'+i] = URL.createObjectURL(file);
        $('thumb'+i).src = mediaOverrides['photo'+i];
        status(`Foto ${i+1} faqat jonli previewga qo‘shildi.`); sendPreview();
      });
    }
    document.querySelectorAll('#editorForm input:not([type=file]), #editorForm textarea').forEach(el => {
      el.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { read(); sendPreview(); }, 160); });
    });
    [['videoFile','video'],['musicFile','music']].forEach(([field,key]) => $(field).addEventListener('change', e => {
      const file=e.target.files?.[0];if(!file)return;
      if(file.size>60*1024*1024){ status('Media 60 MB dan kichik bo‘lishi kerak.');return; }
      if(mediaOverrides[key])URL.revokeObjectURL(mediaOverrides[key]);
      mediaOverrides[key]=URL.createObjectURL(file);sendPreview();status(`${key==='video'?'Video':'Musiqa'} faqat preview uchun yuklandi.`);
    }));
    sendPreview();
  }
  function read() {
    dataKeys.forEach(k => config[k] = $(k)?.value ?? config[k]);
    config.metAt = $('metAt').value ? new Date($('metAt').value).toISOString() : config.metAt;
    config.photos = [0,1,2].map(i => $('photoUrl'+i).value.trim());
    config.compliments = [0,1,2].map(i => $('compliment'+i).value.trim());
    config.video = $('videoUrl').value.trim(); config.music = $('musicUrl').value.trim();
  }
  function previewData() {
    const out = structuredClone(config);
    out.photos = out.photos.map((url,i) => mediaOverrides['photo'+i] || url);
    if (mediaOverrides.video) out.video=mediaOverrides.video;
    if (mediaOverrides.music) out.music=mediaOverrides.music;
    return out;
  }
  function sendPreview() {
    read(); const frame=$('preview');
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({ type:'emora:preview', config:previewData() }, '*');
    status('Jonli preview yangilandi.');
  }
  function status(msg) { $('editorStatus').textContent=msg; }
  function exportConfig() {
    read();
    const out=structuredClone(config);
    // Blob URLs are intentionally excluded; use production media upload before publishing.
    const json=JSON.stringify(out,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='emora-love-config.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status('JSON saqlandi. Agar fayl tanlagan bo‘lsangiz, productionga media fayllar alohida yuklanishi kerak.');
  }
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    const target=button.dataset.tab;
    document.querySelectorAll('[data-tab]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
    document.querySelectorAll('[data-panel]').forEach(panel=>{panel.hidden=panel.dataset.panel!==target;panel.classList.toggle('active',panel.dataset.panel===target);});
  }));
  $('preview').addEventListener('load',()=>setTimeout(sendPreview,120));
  $('refreshPreview').addEventListener('click',()=>{sendPreview();$('preview').contentWindow.postMessage({type:'emora:preview',config:previewData()},'*');});
  $('reset').addEventListener('click',()=>{
    config=structuredClone(demo);
    Object.values(mediaOverrides).forEach(url=>URL.revokeObjectURL(url));
    for(const key of Object.keys(mediaOverrides))delete mediaOverrides[key];
    fill(); status('Namuna kontenti tiklandi.');
  });
  $('export').addEventListener('click',exportConfig);
  $('publish').addEventListener('click', async () => {
    read();
    if (!/^https?:$/.test(location.protocol)) { status('Lokal previewdasiz. Link yaratish uchun editorni EMORA serverida oching.'); return; }
    if (!config.recipient?.trim() || !config.letter?.trim()) { status('Ism va xat matni kerak.'); return; }
    if (Object.keys(mediaOverrides).length) { status('Preview uchun tanlangan fayllarni avval serverga yuklash kerak. Hozir faqat URL asosidagi kontent nashr qilinadi.'); return; }
    const button = $('publish'); button.disabled = true; button.textContent = 'Yaratilmoqda…';
    try {
      const response = await fetch('/api/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(config) });
      if (!response.ok) throw new Error('Server xatoligi');
      const data = await response.json();
      if (!data.slug) throw new Error('Havola yaratilmadi');
      const url = new URL('./index.html?s='+encodeURIComponent(data.slug), location.href).href;
      $('publishedLink').value = url; $('published').hidden=false;
      status('Shaxsiy link tayyor! Uni yuborishdan oldin tekshirib ko‘ring.');
    } catch(e) { status('Nashr qilishda xatolik: '+e.message); }
    finally { button.disabled = false; button.textContent = 'Shaxsiy link yaratish ↗'; }
  });
  $('copyPublished').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('publishedLink').value); status('Link nusxalandi.'); }
    catch { $('publishedLink').select(); document.execCommand('copy'); status('Link nusxalandi.'); }
  });
  $('download').addEventListener('click',exportConfig);
  fill();
})();
