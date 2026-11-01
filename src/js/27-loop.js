// ================= loop =================
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (TG) tgTick();
  const raw = Math.max(0, Math.min(0.1, (now - last) / 1000)); let dt = Math.min(0.033, raw); last = now;
  if (hitStop > 0) { hitStop -= raw; dt *= 0.08; }
  if (state === 'intro') { G.introT += raw; renderIntro(); if (G.introT >= 2.1) beginPlay(); return; }
  if (state === 'exiting') { G.exitAnim += raw; render(0); renderExitFx(); if (G.exitAnim >= 1.7) { state = 'play'; endRun(G.won || false); } return; }
  if (state === 'play') {
    if (openSectorChoice() || openDiscoveryChoice()) { render(0); return; }
    update(dt); if (G) { updateHud(); updatePowers(); updateOpBtn(); sfx.music(G.boss ? 2 : (enemies.length > 160 || G.t - (G.waveT || -99) < 12) ? 1 : 0); }
    if (SET.quality === 'auto' && raw > 0) {
      fpsMon.acc += raw; fpsMon.n++;
      if (fpsMon.acc >= 2) {
        const fps = fpsMon.n / fpsMon.acc; fpsMon.acc = 0; fpsMon.n = 0;
        if (fps < 42 && QL < 2) { QL++; fpsMon.good = 0; }
        else if (fps > 57) { if (++fpsMon.good >= 3 && QL > QBASE()) { QL--; fpsMon.good = 0; } }
        else fpsMon.good = 0;
      }
    }
  }
  render(state === 'play' || state === 'title' ? dt : 0);
}
addEventListener('resize', resize);
resize();
applyStyle();
setTimeout(metaAch, 1500);
renderTitle();
requestAnimationFrame(frame);
setTimeout(() => $('startBtn').focus({ preventScroll: true }), 50);
})();
