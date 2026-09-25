/* Registers one real EMORA template without changing the 50-template catalog count. */
(() => {
  if (typeof templates === 'undefined' || typeof openPreview !== 'function') return;
  const id = 'love-confession-cinema-01';
  const prior = templates.find(x => x.id === 'love-1');
  if (!prior) return;
  Object.assign(prior, {
    id, category: 'love', name: 'Aytolmagan gaplar',
    mode: 'cinema', tag: 'LIVE STORY',
    a: '#e7ad99', b: '#f4d4c8', bg: 'linear-gradient(150deg,#29181d,#130d13)',
    desc: '6 sahnali kino: savol, jonli vaqt, foto, video, xat va final'
  });
  const nativePreview = openPreview;
  openPreview = function(idToOpen, fromBuilder = false) {
    if (idToOpen !== id) return nativePreview(idToOpen, fromBuilder);
    try {
      sessionStorage.setItem('emora:love:seed', JSON.stringify({
        recipient: state.recipient, sender: state.sender,
        intro: state.message || undefined, accent: state.accent,
        finalLine: state.secret || undefined
      }));
    } catch { /* session storage is optional */ }
    location.assign('/templates/love-confession/editor.html');
  };
  renderTemplates();
})();
