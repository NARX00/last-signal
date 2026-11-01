// ================= canvas =================
let W = innerWidth, H = innerHeight, dpr = 1, ZOOM = 1, VW = W, VH = H, CL = false;
const coarse = matchMedia('(pointer: coarse)').matches;
// quality level: 0 high, 1 medium, 2 low. Auto adjusts from the measured frame rate during play.
let QL = SET.quality === 'low' ? 2 : SET.quality === 'high' ? 0 : coarse ? 1 : 0;
const QBASE = () => SET.quality === 'low' ? 2 : SET.quality === 'high' ? 0 : 0;
const fpsMon = { acc: 0, n: 0, good: 0 };
function computeView() {
  const m = Math.min(W, H);
  ZOOM = m < 500 ? 0.7 : m < 760 ? 0.85 : 1;
  VW = W / ZOOM; VH = H / ZOOM;
  CL = SET.clarity === 'on' || (SET.clarity === 'auto' && (coarse || W < 760));
}
const bloomCv = document.createElement('canvas'), bctx = bloomCv.getContext('2d');
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  bloomCv.width = Math.ceil(W / 5); bloomCv.height = Math.ceil(H / 5);
  computeView();
  buildRain();
}

