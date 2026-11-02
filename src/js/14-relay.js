// ================= relay =================
let relayQ = [], relayBusy = false, relayTimer = 0, relayType = 0;
function relay(text, urgent) {
  if (!text || !G) return;
  text = tr(text);
  if (urgent) { relayQ = [{ text, urgent }]; nextRelay(); }
  else { if (relayQ.length < 3) relayQ.push({ text }); if (!relayBusy) nextRelay(); }
}
function nextRelay() {
  clearTimeout(relayTimer); clearInterval(relayType);
  const m = relayQ.shift(), box = $('relay'), el = $('relayText');
  if (!m) { relayBusy = false; box.classList.remove('show'); placeToast(); return; }
  relayBusy = true; fitPowers(); box.classList.toggle('urgent', !!m.urgent); box.classList.add('show');
  if (reduced) { el.textContent = m.text; placeToast(); relayTimer = setTimeout(nextRelay, 5200); return; }
  let i = 0; el.textContent = '';
  relayType = setInterval(() => { i += 2; el.textContent = m.text.slice(0, i); placeToast(); if (i >= m.text.length) { clearInterval(relayType); relayTimer = setTimeout(nextRelay, 4200); } }, 28);
}
function relayStop() { relayQ = []; clearTimeout(relayTimer); clearInterval(relayType); relayBusy = false; $('relay').classList.remove('show'); placeToast(); }

