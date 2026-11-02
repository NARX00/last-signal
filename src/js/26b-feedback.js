// ================= feedback =================
// Players send a bug report or an idea from Settings, the pause screen or the end of a run. It is written to the
// Firebase database under the player's own id and can't be read back by anyone but the owner (Firebase console),
// see firebase/database.rules.json. Off in the Claude artifact and when no database is configured.
const FBK = { kind: 'bug', from: '' };
const feedbackOn = () => !!FB.base && !window.claude;
document.querySelectorAll('.fb-only').forEach(el => { el.hidden = !feedbackOn(); });
function fbSetKind(k) { FBK.kind = k; document.querySelectorAll('#fbKinds .btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); }
function openFeedback(from) {
  if (!feedbackOn()) return;
  FBK.from = from; FBK.state = state;
  $('fbName').value = SET.fbName || cleanName(SET.lbName) || '';
  $('fbNote').textContent = ''; $('fbSend').disabled = false; fbSetKind(from === 'over' ? 'idea' : FBK.kind);
  $('feedback').hidden = false; setTimeout(() => $('fbText').focus({ preventScroll: true }), 60);
}
function closeFeedback() { $('feedback').hidden = true; }
function fbContext() {
  const c = { v: BUILD.version, lang: LANG, tg: !!TG, scr: `${innerWidth}x${innerHeight}`, from: FBK.from,
    ua: /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop' };
  if (G && FBK.state && FBK.state !== 'title') c.run = `${G.mode} P${G.proto} lv${G.level} ${fmt(Math.floor(G.t))} k${G.kills}${G.won ? ' won' : ''}`;
  return JSON.stringify(c).slice(0, 600);
}
async function sendFeedback() {
  const text = $('fbText').value.trim(), note = $('fbNote');
  if (text.length < 3) { note.textContent = 'Write a few words first.'; return; }
  const name = cleanName($('fbName').value); SET.fbName = name; save('last-signal-settings', SET);
  $('fbSend').disabled = true; note.textContent = 'Sending…';
  await FB.ready;
  const uid = FB.uid() || TELE.id, id = String(Date.now());
  const r = await FB.fetch('PUT', `feedback/${uid}/${id}`, { kind: FBK.kind, text: text.slice(0, 1000), name: name || undefined, ctx: fbContext(), t: { '.sv': 'timestamp' } });
  if (r && r.ok) {
    FB.fetch('PATCH', `stats/${new Date().toISOString().slice(0, 10)}`, { feedback: { '.sv': { increment: 1 } } });
    note.textContent = 'Thank you! Your feedback was sent.'; $('fbText').value = ''; haptic('notification', 'success', 0);
    setTimeout(closeFeedback, 1600);
  } else { $('fbSend').disabled = false; note.textContent = "Couldn't send it right now. Your text is still here; try again in a moment."; }
}
document.querySelectorAll('#fbKinds .btn').forEach(b => b.addEventListener('click', () => fbSetKind(b.dataset.k)));
$('fbSend').addEventListener('click', sendFeedback);
$('fbClose').addEventListener('click', closeFeedback);
for (const id of ['fbText', 'fbName']) $(id).addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') closeFeedback(); });
$('fbSetBtn').addEventListener('click', () => openFeedback('settings'));
$('fbPauseBtn').addEventListener('click', () => openFeedback('pause'));
$('fbOverBtn').addEventListener('click', () => openFeedback('over'));
