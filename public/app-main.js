function populateBuilder(){const cat=$('#builderCategory');const prev=cat.value||state.category;cat.innerHTML=Object.entries(categoryMeta).map(([id,c])=>`<option value="${id}">${c.name[lang]}</option>`).join('');cat.value=prev;populateTemplateSelect();}
function populateTemplateSelect(){const sel=$('#builderTemplate');const list=templates.filter(x=>x.category===$('#builderCategory').value);sel.innerHTML=list.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');sel.value=list.some(x=>x.id===state.template)?state.template:list[0].id;state.template=sel.value;state.category=$('#builderCategory').value;}
function openBuilder(plan='template',templateId=null){builderPlan=plan;builderStep=0;if(templateId){const tmp=templates.find(x=>x.id===templateId);if(tmp){state.category=tmp.category;state.template=tmp.id}}populateBuilder();$('#builderCategory').value=state.category;populateTemplateSelect();$('#builderTemplate').value=state.template;setPlan(plan);syncInputs();renderBuilderStep();$('#builderModal').classList.add('open');$('#builderModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeBuilder(){$('#builderModal').classList.remove('open');$('#builderModal').setAttribute('aria-hidden','true');document.body.style.overflow=''}
function setPlan(plan){builderPlan=plan;$$('.planMini').forEach(x=>x.classList.toggle('active',x.dataset.miniPlan===plan));$('#aiBox').classList.toggle('hidden',plan!=='ai');$('#templateSelectWrap').classList.remove('hidden')}
function syncInputs(){$('#recipient').value=state.recipient;$('#sender').value=state.sender;$('#message').value=state.message;$('#photoUrl').value=state.photo;$('#accent').value=state.accent;$('#secretLine').value=state.secret;$('#messageCounter').textContent=`${state.message.length}/280`}
function saveInputs(){state.category=$('#builderCategory').value;state.template=$('#builderTemplate').value;state.recipient=$('#recipient').value.trim()||'Sen';state.sender=$('#sender').value.trim();state.message=$('#message').value.trim()||state.message;state.photo=$('#photoUrl').value.trim();state.accent=$('#accent').value;state.secret=$('#secretLine').value.trim()||state.secret;const tmp=templates.find(x=>x.id===state.template);if(tmp){tmp.a=state.accent}updateBuilderPreview()}
function renderBuilderStep(){$$('.builderStep').forEach((s,i)=>s.classList.toggle('active',i===builderStep));$$('.builderProgress i').forEach((x,i)=>x.classList.toggle('active',i<=builderStep));$('#builderBack').style.visibility=builderStep===0?'hidden':'visible';$('#builderNext').style.display=builderStep===3?'none':'inline-flex';if(builderStep===2){saveInputs();updateBuilderPreview()}if(builderStep===3){saveInputs()}}
function updateBuilderPreview(){const tmp=templates.find(x=>x.id===state.template)||templates[0];$('#builderPreviewCard').style.setProperty('--bp-accent',state.accent||tmp.a);$('#bpTitle').textContent=`${state.recipient} ${lang==='ru'?'— для тебя':lang==='en'?'— for you':'uchun'}`;$('#bpText').textContent=state.message}
function aiSuggestion(){const p=$('#aiPrompt').value.toLowerCase();let mood='cinematic + warm';let pick=templates.filter(x=>x.category===$('#builderCategory').value)[0];if(/kul|fun|play|hazil|смеш|весел/.test(p)){mood='playful + interactive';pick=templates.filter(x=>x.category===$('#builderCategory').value)[8]||pick}else if(/rom|sev|love|неж|soft|samim/.test(p)){mood='soft + romantic';pick=templates.filter(x=>x.category===$('#builderCategory').value)[5]||pick}else if(/dark|midnight|тун|ноч|sir|secret/.test(p)){mood='midnight + mysterious';pick=templates.filter(x=>x.category===$('#builderCategory').value)[3]||pick}state.template=pick.id;$('#builderTemplate').value=pick.id;$('#aiResult').textContent=`✦ ${mood} → ${pick.name}`;toast(lang==='ru'?'Подобрал mood':lang==='en'?'Mood suggested':'Mood tavsiya qilindi')}
async function publishDemo(){
  saveInputs();
  const payload={...state,lang,created:Date.now()};
  try{
    const r=await fetch('/api/sites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok)throw new Error('publish failed');
    const data=await r.json();shareSlug=data.slug;
    const url=`${location.origin}${location.pathname}?s=${encodeURIComponent(data.slug)}`;
    const analytics=`${location.origin}${location.pathname}?analytics=${encodeURIComponent(data.slug)}`;
    $('#shareUrl').value=url;$('#analyticsUrl').value=analytics;
    $('#shareResult').classList.remove('hidden');$('#analyticsResult').classList.remove('hidden');
    toast(lang==='ru'?'Demo-ссылка готова':lang==='en'?'Demo link ready':'Demo link tayyor');
  }catch{
    const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    $('#shareUrl').value=`${location.origin}${location.pathname}?share=${encoded}`;$('#shareResult').classList.remove('hidden');$('#analyticsResult').classList.add('hidden');
    toast(lang==='ru'?'Локальная demo-ссылка готова':lang==='en'?'Local demo link ready':'Lokal demo link tayyor');
  }
}
async function loadShared(){
  const params=new URLSearchParams(location.search);
  const slug=params.get('s');
  if(slug){
    try{const r=await fetch(`/api/sites/${encodeURIComponent(slug)}`);if(!r.ok)throw 0;const data=await r.json();Object.assign(state,data.site);lang=state.lang||lang;shareSlug=slug;await fetch(`/api/sites/${encodeURIComponent(slug)}/view`,{method:'POST'}).catch(()=>{});currentTemplate=templates.find(x=>x.id===state.template)||templates[0];applyLanguage();setTimeout(()=>openPreview(currentTemplate.id,true),180);return true}catch{toast('Link topilmadi');return false}
  }
  const q=params.get('share');if(!q)return false;
  try{const norm=q.replace(/-/g,'+').replace(/_/g,'/');const json=decodeURIComponent(escape(atob(norm.padEnd(Math.ceil(norm.length/4)*4,'='))));Object.assign(state,JSON.parse(json));lang=state.lang||lang;currentTemplate=templates.find(x=>x.id===state.template)||templates[0];applyLanguage();setTimeout(()=>openPreview(currentTemplate.id,true),180);return true}catch(e){console.warn('Invalid share payload');return false}
}
async function loadAnalytics(){
  const slug=new URLSearchParams(location.search).get('analytics');if(!slug)return false;
  try{const r=await fetch(`/api/sites/${encodeURIComponent(slug)}/analytics`);if(!r.ok)throw 0;const d=await r.json();$('#analyticsTitle').textContent=d.title||'EMORA analytics';$('#analyticsViews').textContent=d.views||0;$('#analyticsTotal').textContent=d.totalReactions||0;const order=['🥹','❤️','😍','😭','✨'];$('#reactionStats').innerHTML=order.map(x=>`<div class="reactionStat"><b>${x}</b><span>${d.reactions?.[x]||0}</span></div>`).join('');$('#analyticsModal').classList.add('open');$('#analyticsModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';return true}catch{toast('Analytics topilmadi');return false}
}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function escapeAttr(v=''){return escapeHtml(v).replace(/`/g,'')}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1900)}

function bindGlobal(){
  $$('[data-lang]').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;localStorage.setItem('emoraLang',lang);applyLanguage()});
  $$('[data-scroll]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'}));
  $('#heroExplore').onclick=()=>$('#templates').scrollIntoView({behavior:'smooth'});$('#heroCreate').onclick=()=>openBuilder();$('#openBuilderTop').onclick=()=>openBuilder();$('#finalCreate').onclick=()=>openBuilder();
  $$('.planChoose').forEach(b=>b.onclick=()=>openBuilder(b.dataset.plan));$('#showMoreTemplates').onclick=()=>{showAll=true;renderTemplates()};
  $$('[data-close="preview"]').forEach(b=>b.onclick=closePreview);$$('[data-close="builder"]').forEach(b=>b.onclick=closeBuilder);$$('[data-close="analytics"]').forEach(b=>b.onclick=()=>{$('#analyticsModal').classList.remove('open');document.body.style.overflow=''});
  $('#useTemplate').onclick=()=>{const id=currentTemplate.id;closePreview();openBuilder('template',id)};
  $('#builderCategory').onchange=()=>{state.category=$('#builderCategory').value;populateTemplateSelect()};$('#builderTemplate').onchange=()=>state.template=$('#builderTemplate').value;
  $$('.planMini').forEach(b=>b.onclick=()=>setPlan(b.dataset.miniPlan));$('#aiSuggest').onclick=aiSuggestion;
  $('#message').oninput=e=>$('#messageCounter').textContent=`${e.target.value.length}/280`;
  $('#builderNext').onclick=()=>{if(builderStep===0){state.category=$('#builderCategory').value;state.template=$('#builderTemplate').value}if(builderStep===1)saveInputs();builderStep=Math.min(3,builderStep+1);renderBuilderStep()};$('#builderBack').onclick=()=>{builderStep=Math.max(0,builderStep-1);renderBuilderStep()};
  $('#openFullPreview').onclick=()=>{saveInputs();openPreview(state.template,true)};$('#publishDemo').onclick=publishDemo;$('#openAnalytics').onclick=()=>{const u=$('#analyticsUrl').value;if(u)location.href=u};$('#copyShare').onclick=async()=>{try{await navigator.clipboard.writeText($('#shareUrl').value);toast(lang==='ru'?'Скопировано':lang==='en'?'Copied':'Nusxalandi')}catch{$('#shareUrl').select();document.execCommand('copy');toast('Copied')}};
  $$('.payBtn').forEach(b=>b.onclick=()=>toast(lang==='ru'?'Нужны merchant-ключи':lang==='en'?'Merchant credentials required':'Merchant kalitlari kerak'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#previewModal').classList.contains('open'))closePreview();else if($('#builderModal').classList.contains('open'))closeBuilder()}});
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('visible',e.isIntersecting)),{threshold:.12});$$('.reveal').forEach(el=>observer.observe(el));
  window.addEventListener('pointermove',e=>{const g=$('#cursorGlow');g.style.left=e.clientX+'px';g.style.top=e.clientY+'px';const phone=$('#phoneTilt .phone');if(phone&&innerWidth>800){const r=$('#phoneTilt').getBoundingClientRect();const x=(e.clientX-(r.left+r.width/2))/r.width;const y=(e.clientY-(r.top+r.height/2))/r.height;phone.style.transform=`rotateY(${x*10-6}deg) rotateX(${-y*8+3}deg) rotateZ(1deg)`}});
}

applyLanguage();bindGlobal();loadShared();loadAnalytics();