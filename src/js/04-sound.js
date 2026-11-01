// ================= sound =================
const sfx = (() => {
  let ac, master, fxBus, musicBus, musicGain, noiseBuffer, delay, timer=null, playing=false, level=0, step=0, next=0, voices=0;
  const last={}, STEP=60/116/4, MAX_VOICES=80;
  const vol=(key,fallback)=>clamp(Number.isFinite(Number(SET[key]))?Number(SET[key]):fallback,0,100)/100;
  function mix(){if(!ac)return;const t=ac.currentTime;master.gain.setTargetAtTime(vol('masterVol',80)*.72,t,.025);fxBus.gain.setTargetAtTime(SET.sound?vol('effectsVol',85):0,t,.025);musicGain.gain.setTargetAtTime(playing&&SET.music?vol('musicVol',65)*.65:0,t,.06);}
  function init(){
    if(ac)return;
    try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(_){return;}
    master=ac.createGain();fxBus=ac.createGain();musicBus=ac.createGain();musicGain=ac.createGain();musicGain.gain.value=0;
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=16;comp.ratio.value=5;comp.attack.value=.004;comp.release.value=.16;
    const low=ac.createBiquadFilter();low.type='lowpass';low.frequency.value=10500;
    fxBus.connect(master);musicBus.connect(low);low.connect(musicGain);musicGain.connect(master);master.connect(comp);comp.connect(ac.destination);
    delay=ac.createDelay(.5);delay.delayTime.value=STEP*3;const feedback=ac.createGain(),wet=ac.createGain();feedback.gain.value=.2;wet.gain.value=.14;
    musicBus.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(musicGain);
    noiseBuffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    mix();
  }
  const ok=()=>ac&&SET.sound&&ac.state==='running';
  const thr=(k,ms)=>{const now=performance.now();if(last[k]!==undefined&&now-last[k]<ms)return false;last[k]=now;return true;};
  function sourceDone(src,nodes){voices++;src.onended=()=>{voices=Math.max(0,voices-1);src.disconnect();nodes.forEach(n=>n.disconnect());};}
  function tone(type,f0,f1,dur,peak,wait=0,bus=fxBus,at=null){
    if(!ac||voices>=MAX_VOICES)return;const t=at===null?ac.currentTime+wait:at;
    const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,f0),t);if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(bus);sourceDone(o,[g]);o.start(t);o.stop(t+dur+.025);
  }
  function noise(dur,peak,freq,type='bandpass',wait=0,bus=fxBus,at=null){
    if(!ac||voices>=MAX_VOICES)return;const t=at===null?ac.currentTime+wait:at;
    const n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=noiseBuffer;f.type=type;f.frequency.value=freq;f.Q.value=.7;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    n.connect(f);f.connect(g);g.connect(bus);sourceDone(n,[f,g]);n.start(t,0,dur+.02);n.stop(t+dur+.025);
  }
  function chord(notes,base,dur=.35,peak=.065){notes.forEach((n,i)=>{tone('triangle',base*2**(n/12),0,dur,peak,i*.065);tone('sine',base*2**(n/12)*2,0,dur*.7,peak*.25,i*.065);});}
  function duck(){if(!ac||!playing)return;musicGain.gain.cancelScheduledValues(ac.currentTime);musicGain.gain.setTargetAtTime(vol('musicVol',65)*.3,ac.currentTime,.015);musicGain.gain.setTargetAtTime(vol('musicVol',65)*.65,ac.currentTime+.22,.15);}
  // Music files from assets/music (calm / action / boss, or one "theme") replace the generated soundtrack when present.
  // They play through the same music volume and ducking; missing levels fall back to the nearest track.
  const TRACKS={},hasFiles=()=>Object.keys(ASSETS.music).length>0;
  const FALLBACK=[['calm','theme','action','boss'],['action','calm','theme','boss'],['boss','action','calm','theme']];
  function trackFor(l){const m=ASSETS.music;return FALLBACK[l].find(n=>m[n])||Object.keys(m)[0];}
  function track(name){
    if(name in TRACKS)return TRACKS[name];
    const a=new Audio(ASSETS.music[name]);a.loop=true;a.preload='auto';let g=null;
    try{const src=ac.createMediaElementSource(a);g=ac.createGain();g.gain.value=0;src.connect(g);g.connect(musicGain);}catch(_){}
    return TRACKS[name]={a,g};
  }
  function updateTracks(){
    if(!ac||!hasFiles())return;
    const want=playing&&SET.music?trackFor(level):null;
    for(const name of Object.keys(ASSETS.music)){
      const on=name===want;if(!on&&!(name in TRACKS))continue;
      const T=track(name);
      if(T.g)T.g.gain.setTargetAtTime(on?1:0,ac.currentTime,.5);else T.a.volume=on?vol('musicVol',65):0;
      if(on&&T.a.paused)T.a.play().catch(()=>{});
      if(!on&&!T.a.paused)setTimeout(()=>{if(trackFor(level)!==name||!playing||!SET.music)T.a.pause();},1800);
    }
  }
  function schedule(){
    if(hasFiles())return;
    if(!ac||!playing||!SET.music||ac.state!=='running')return;
    // Never replay a backlog after a suspended tab or audio device interruption.
    if(next<ac.currentTime-.1)next=ac.currentTime+.025;
    let scheduled=0;
    while(next<ac.currentTime+.14&&scheduled++<8){
      const t=next,k=step%16,bar=Math.floor(step/16)%8,roots=[0,-4,-7,-2,0,-4,-7,-2],root=110*2**(roots[bar]/12),minor=bar%4===0||bar%4===2;
      // Four-on-the-floor kick, syncopated bass, snare backbeat and swung hats.
      if(k%4===0 || level===2&&k===14){tone('sine',150,42,.2,.4,0,musicBus,t);noise(.022,.1,1700,'lowpass',0,musicBus,t);}
      if(k===4||k===12){noise(.14,.22,1900,'bandpass',0,musicBus,t);tone('triangle',185,90,.12,.12,0,musicBus,t);noise(.045,.09,6000,'highpass',0,musicBus,t+.018);}
      if(k%2===0||level>=1){const swing=k%2?.012:0;noise(k===10?.12:.035,k%2?.035:.065,7500,'highpass',0,musicBus,t+swing);}
      if([0,3,6,8,11,14].includes(k)){const n=k===14?7:0;tone('sawtooth',root/2*2**(n/12),root/2*2**(n/12)*.99,STEP*1.35,.075,0,musicBus,t);tone('sine',root/2,0,STEP*1.1,.11,0,musicBus,t);}
      if(k===0){for(const n of [0,minor?3:4,7])tone('triangle',root*2**(n/12),0,STEP*15,.027,0,musicBus,t);}
      const motif=[0,7,12,minor?15:16,14,7,minor?3:4,10];
      if(k%2===0||level===2){const n=motif[(Math.floor(k/2)+bar)%8];tone('triangle',root*2*2**(n/12),0,STEP*(level===2?.7:1.2),level===2?.058:.038,0,musicBus,t);}
      if(level>=1&&(k===7||k===15))tone('square',root*4,root*8,.09,.025,0,musicBus,t);
      if(level===2&&bar%2===1&&k>=13)noise(.06,.08+(k-13)*.015,3500,'bandpass',0,musicBus,t);
      next+=STEP;step++;
    }
  }
  return {
    init(){init();if(ac&&ac.state!=='running')return ac.resume().catch(()=>{});return Promise.resolve();},
    mix,
    hum(v){if(!ac)return;playing=!!v;mix();updateTracks();if(playing&&SET.music&&!timer){next=ac.currentTime+.035;timer=setInterval(schedule,25);schedule();}if((!playing||!SET.music)&&timer){clearInterval(timer);timer=null;}},
    music(l){const p=level;level=clamp(l,0,2);if(p!==level)updateTracks();},
    warning(){if(ok()&&thr('warning',600)){tone('square',660,660,.13,.07);tone('square',880,660,.18,.075,.2);}},
    heart(){if(ok()&&thr('heart',350)){tone('sine',72,38,.16,.23);tone('sine',64,35,.12,.14,.18);}},
    hit(crit=false){if(ok()&&thr('hit',crit?65:55)){tone('triangle',crit?900:380,crit?200:140,.065,crit?.13:.07);noise(.035,crit?.12:.055,2200,'bandpass');}},
    kill(heavy=false){if(ok()&&thr('kill',heavy?100:65)){tone('sine',heavy?130:210,45,heavy?.3:.12,heavy?.24:.12);noise(heavy?.2:.07,heavy?.19:.07,heavy?650:1700,'lowpass');}},
    gem(n){if(ok()&&thr('gem',65)){const notes=[0,3,7,10,12,15,19,22];tone('sine',660*2**(notes[Math.min(7,Math.floor(n/3))]/12),0,.1,.065);}},
    shot(kind){if(ok()&&thr('shot'+(kind||''),95)){tone(kind==='spread'?'sawtooth':'square',kind==='spread'?280:760,kind==='spread'?90:230,.065,.045);noise(.025,.025,3200,'highpass');}},
    pulse(){if(ok()&&thr('pulse',220)){tone('sine',180,38,.38,.28);tone('triangle',360,70,.21,.075);noise(.16,.12,600,'lowpass');}},
    zap(){if(ok()&&thr('zap',130)){noise(.12,.19,2800,'bandpass');tone('sawtooth',950,110,.14,.08);tone('sine',110,45,.16,.14);}},
    hurt(){if(ok()&&thr('hurt',160)){duck();noise(.18,.25,1000,'bandpass');tone('sawtooth',140,45,.24,.17);tone('sine',62,35,.28,.25);}},
    level(){if(ok()){duck();chord([0,3,7,12],440,.3,.075);}},
    pickup(){if(ok()&&thr('pickup',100)){tone('triangle',660,1320,.13,.085);tone('sine',1320,1760,.16,.06,.09);}},
    evolve(){if(ok()&&thr('evolve',400)){duck();chord([0,7,12,15,19,24],330,.6,.085);noise(.38,.12,4200,'highpass');tone('sine',70,35,.5,.2);}},
    boss(){if(ok()&&thr('boss',800)){duck();for(let i=0;i<3;i++){tone('sawtooth',110,73,.28,.1,i*.3);tone('sine',55,36,.4,.22,i*.3);}noise(.55,.15,900,'lowpass');}},
    boom(){if(ok()&&thr('boom',180)){duck();tone('sine',130,26,.7,.4);tone('triangle',240,40,.24,.14);noise(.5,.32,750,'lowpass');noise(.055,.17,2600,'bandpass');}},
    buy(){if(ok())chord([0,7,12],660,.2,.065);},
    win(){if(ok()){duck();chord([0,4,7,12,16,19],330,.65,.09);tone('sine',82,55,.5,.18);}},
    lose(){if(ok()){duck();chord([0,-3,-7,-12],220,.5,.08);noise(.35,.1,650,'lowpass');}},
    async preview(){await this.init();if(!ok()){toast('Enable Sound and check Master / Effects volume.');return;}this.shot('bolt');tone('sine',120,35,.3,.25,.16);noise(.12,.18,1200,'bandpass',.16);},
    async previewMusic(){await this.init();if(!ac)return;if(!SET.music){toast('Enable Music first to preview the soundtrack.');return;}this.music(1);this.hum(!playing);},
    status(){return !ac?'Audio not started — use a test button':ac.state!=='running'?'Audio '+ac.state+' — click a test button':playing&&SET.music?'Audio running · soundtrack on':'Audio running · soundtrack stopped';},
  };
})();

