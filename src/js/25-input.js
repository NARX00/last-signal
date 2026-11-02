// ================= input =================
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if(state==='discovery') {const i=['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].findIndex(k=>k===e.code);if(i>=0 && !e.repeat) chooseDiscovery(i%3);else if((e.code==='Digit4'||e.code==='Numpad4') && !e.repeat && G.discovery==='mutation')chooseDiscovery(3);e.preventDefault();return;}
  if (state === 'sector') { const i=['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].findIndex(k=>k===e.code); if(i>=0 && !e.repeat) chooseSector(Object.keys(SECTORS)[i%3]); e.preventDefault(); return; }
  if (state === 'intro') { skipIntro(); e.preventDefault(); return; }
  if (state === 'trade') { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (i >= 0) { const b = $('tradeCards').children[i]; if (b && !b.disabled) b.click(); e.preventDefault(); } return; }
  if (state === 'opcall') { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (i >= 0) { opChoose(Object.keys(OPCALL)[i]); e.preventDefault(); } return; }
  if (state === 'play' && e.code === 'KeyG' && !e.repeat) { overloadSignal(); e.preventDefault(); return; }
  if (state === 'play' && e.code === 'KeyF') { callOperator(); e.preventDefault(); return; }
  if (state === 'play' && e.code === 'KeyV') { triggerReflex(); e.preventDefault(); return; }
  if (state === 'play' && e.code === 'KeyT') { placeTurret(); e.preventDefault(); return; }
  if (state === 'editor') { if (e.code === 'Escape') { closeEditor(); e.preventDefault(); } return; }
  if (state === 'level') {
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(e.code)) { choose(+e.code.slice(-1) - 1); e.preventDefault(); return; }
    if (e.code === 'KeyR') { reroll(); e.preventDefault(); return; }
    if (e.code === 'KeyB') { toggleBanish(); e.preventDefault(); return; }
    if (e.code === 'KeyX') { skipLevel(); e.preventDefault(); return; }
  }
  if (state === 'play' && (e.code === 'KeyQ' || e.code === 'Space')) { usePower(0); e.preventDefault(); return; }
  if (state === 'play' && e.code === 'KeyE') { usePower(1); e.preventDefault(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') pauseGame(); else if (state === 'pause') resume(); e.preventDefault(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    if (state === 'play') e.preventDefault();
    if (state === 'level' && e.code.startsWith('Arrow')) {
      const cards = [...$('cards').children], i = cards.indexOf(document.activeElement);
      const n = (i + (e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1) + cards.length) % cards.length; if (cards[n]) cards[n].focus(); e.preventDefault(); return;
    }
    keys.add(e.code);
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); stick.on = false; mouseHold.on = false; if (state === 'play') pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pauseGame(); });
cv.addEventListener('pointerdown', e => {
  if (state === 'intro') { skipIntro(); return; }
  if (state !== 'play') return;
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  if (e.pointerType === 'mouse') { mouseHold.on = true; mouseHold.x = e.clientX; mouseHold.y = e.clientY; }
  else { stick.on = true; stick.id = e.pointerId; stick.x = e.clientX; stick.y = e.clientY; if (SET.stick === 'fixed') { stick.bx = SET.side === 'left' ? W - 100 : 100; stick.by = H - 130; } else { stick.bx = e.clientX; stick.by = e.clientY; } }
});
cv.addEventListener('pointermove', e => {
  if (mouseHold.on && e.pointerType === 'mouse') { mouseHold.x = e.clientX; mouseHold.y = e.clientY; }
  if (stick.on && e.pointerId === stick.id) { stick.x = e.clientX; stick.y = e.clientY; }
});
const release = e => { if (e.pointerType === 'mouse') mouseHold.on = false; if (stick.on && e.pointerId === stick.id) stick.on = false; };
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
cv.addEventListener('contextmenu', e => e.preventDefault());






const setTxt=(el,t)=>{if(el&&el.textContent!==t)el.textContent=t;};
const setHidden=(el,h)=>{if(el&&el.hidden!==h)el.hidden=h;};
const setW=(el,w)=>{if(el&&el.style.width!==w)el.style.width=w;};
const SPECIALIZATIONS=BUILD.data["run-extras"].specializations;
const QUESTS=BUILD.data["run-extras"].quests;
function assignQuest(){
 if((G.questsDone||0)>=3){G.quest=null;return;}
 const order={gunslinger:['kills','shards','clean'],codebreaker:['shards','kills','clean'],phantom:['clean','shards','kills']}[G.specialization];
 if(!order)return;
 const id=order[G.questsDone||0];G.quest={id,t0:G.t,startKills:G.kills,startShards:G.shardsGathered||0,lastHit:P.lastHit,cleanSince:G.t,progress:0};
}
function updateRPG(){
 if(!['full','short'].includes(G.mode))return;
 if(G.level>=5 && !G.specOffered && G.gate>=2){G.specOffered=true;G.discoveryQueue.unshift('specialization');}
 const q=G.quest;
 if(q && !q.complete){
  if(q.id==='kills')q.progress=G.kills-q.startKills;
  else if(q.id==='shards')q.progress=(G.shardsGathered||0)-q.startShards;
  else {if(P.lastHit!==q.lastHit){q.lastHit=P.lastHit;q.cleanSince=G.t;}q.progress=G.t-q.cleanSince;}
  q.progress=Math.max(0,Math.min(QUESTS[q.id].target,q.progress));
  if(q.progress>=QUESTS[q.id].target && G.t-(q.t0||0)>=30){q.complete=true;G.discoveryQueue.push('quest');toast('Optional quest complete. Choose your reward when the area is clear.');}
 }
 const spec=SPECIALIZATIONS[G.specialization];
 if(G.gate<2){setTxt($('questReadout'),'');return;}
 setTxt($('questReadout'),spec ? spec.name+' · '+(q ? 'Optional: '+QUESTS[q.id].desc+' · '+Math.floor(q.progress)+'/'+QUESTS[q.id].target+(q.complete?' · reward ready':'') : 'All 3 quests complete') : 'Specialization unlocks at level 5');
}
function renderRPGChoice(){
 const spec=G.discovery==='specialization';
 $('discoveryHead').textContent=spec?'Choose your specialization':'Quest complete — choose a reward';
 $('discoveryNote').textContent=spec?'One path for this run. Bonuses and tradeoffs replace no weapons or systems.':'Three optional quests per run. No deadline, no permanent stat growth. Choose one reward.';
 const wrap=$('discoveryCards');wrap.textContent='';
 const choices=spec?Object.values(SPECIALIZATIONS):[{name:'Field repair',icon:'✚',desc:'Repair 30% of maximum integrity immediately. Cannot exceed your maximum.'},{name:'Supply cache',icon:'▣',desc:'Receive one cache: an upgrade or eligible evolution under the existing limits.'},{name:'Code kit',icon:'{}',desc:'Receive one unlocked trigger and one unlocked effect. Install them from Pause → editor.'}];
 choices.forEach((D,i)=>wrap.appendChild(cardEl({icon:D.icon,kind:spec?'Specialization':'Quest reward',tag:'Choose one',name:D.name,desc:D.desc,key:'Press '+(i+1)},()=>chooseRPG(i))));
 $('discoveryChoice').hidden=false;wrap.querySelector('button')?.focus({preventScroll:true});return true;
}
function chooseRPG(i){
 if(state!=='discovery' || !['specialization','quest'].includes(G.discovery) || !Number.isInteger(i) || i<0 || i>2)return false;
 if(G.discovery==='specialization'){
  if(G.specialization)return false;
  const fraction=P.hp/STAT.maxHp;G.specialization=Object.keys(SPECIALIZATIONS)[i];recalc();P.hp=Math.min(STAT.maxHp,STAT.maxHp*fraction);
  if(G.specialization==='codebreaker'){addPiece('t',rndKey(TRIG,'t'));addPiece('f',rndKey(FX,'f'));}
  assignQuest();
 }else{
  if(!G.quest?.complete || (G.questsDone||0)>=3)return false;
  G.questsDone=(G.questsDone||0)+1;
  if(i===0)P.hp=Math.min(STAT.maxHp,P.hp+STAT.maxHp*.3);
  if(i===1)pickups.push({x:P.x,y:P.y,kind:'cache',t:0});
  if(i===2){addPiece('t',rndKey(TRIG,'t'));addPiece('f',rndKey(FX,'f'));}
  assignQuest();
 }
 $('discoveryChoice').hidden=true;state='play';last=performance.now();sfx.hum(true);updateRPG();return true;
}

const AURAS=BUILD.data["run-extras"].halos;
const MUTATIONS=BUILD.data["run-extras"].mutations;
function renderAftermarket(){
 const wrap=$('aftermarket');wrap.textContent='';
 const note=document.createElement('p');note.className='note';note.textContent='Archive rank '+(META.archiveRank||0)+' · Contract seals '+(META.contractSeals||0)+' · ◆ '+META.frag;wrap.appendChild(note);
 const buy=(label,cost,action,disabled=false)=>{const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.style.margin='6px 6px 6px 0';b.disabled=disabled || META.frag<cost;b.addEventListener('click',()=>{if(META.frag<cost || disabled)return;META.frag-=cost;action();saveMeta();renderTitle();});wrap.appendChild(b);};
 for(const [id,D] of Object.entries(AURAS)){const own=!!META.auras?.[id];buy(own ? (META.aura===id?'✓ ':'Wear ')+D.name : D.name+' · ◆ '+D.cost,own?0:D.cost,()=>{META.auras=META.auras||{};META.auras[id]=true;META.aura=id;},META.aura===id);}
 buy('Archive 1,000 fragments → +1 vanity rank',1000,()=>META.archiveRank=(META.archiveRank||0)+1);
 buy(META.contractTicket?'Contract queued':'Queue challenge contract · ◆ 200',200,()=>META.contractTicket=true,!!META.contractTicket);
 const info=document.createElement('p');info.className='note';info.textContent='Contract: next Full/Short run gets +15% regular spawns and +10% regular enemy speed. Defeat Root or extract after 3 bosses for +1 vanity seal. Ticket consumed at start; failure earns no seal. Daily and other modes keep the ticket.';wrap.appendChild(info);
}
function initRunExtras(){
 $('questReadout').hidden=!['full','short'].includes(G.mode);$('questReadout').textContent='Specialization unlocks at level 5';
 G.discoveryQueue=[];G.clones=[];G.mineCD=[0,0,0];
 if(['full','short'].includes(G.mode)){G.rival={stage:0,next:110,won:false};if(META.contractTicket){G.contract=true;META.contractTicket=false;saveMeta();}}
}
function settleContract(){if(G.contract && !G.contractSettled && (G.rootDeleted || (G.extracted && G.bossKills>=3))){G.contractSettled=true;META.contractSeals=(META.contractSeals||0)+1;}}
function retreatRival(e){e.dead=true;G.rival.next=G.t+100;G.rival.warned=false;G.rival.active=null;toast('Nemesis escaped. It is studying your strongest weapon.');}
function updateRunExtras(dt){
 if(!['full','short'].includes(G.mode) || G.ending)return;
 updateRPG();
 if(!G.mutationOffered && G.t>=95 && !G.boss && G.gate>=3){G.mutationOffered=true;G.discoveryQueue.push('mutation');}
 const r=G.rival;
 if(r && !r.won && G.gate>=3){
  if(G.boss && r.active){r.active.dead=true;r.active=null;r.stage--;r.warned=false;r.next=G.t+8;toast('Nemesis withdrew from the boss sector. It will return.');}
  if(!r.active && r.stage<2 && !G.boss && G.t>=r.next){
   if(!r.warned){r.warned=true;r.next=G.t+3;sfx.warning();banner('Incoming rival','Nemesis is tracing you','hot');}
   else {r.stage++;const [x,y]=spawnPos();const e=spawn('warden',x,y);e.rival=true;e.hp=e.max=(r.stage===1?180:420)*G.PM.hp*(1+G.t/400);e.xp=15;e.dmg*=.8;
    if(r.stage===2){e.counter=Object.entries(G.dmg).filter(([id])=>WDEF[id]).sort((a,b)=>b[1]-a[1])[0]?.[0];toast('Nemesis resists '+(WDEF[e.counter]?.name||'no weapon')+' by 35%. Other damage stays effective.');}
    r.active=e;r.until=G.t+22;
   }
  }
  if(r.active && r.stage===1 && (r.active.hp<r.active.max*.4 || G.t>=r.until))retreatRival(r.active);
 }
 for(let i=0;i<3;i++){
  G.mineCD[i]=Math.max(0,G.mineCD[i]-dt);
  if(G.mutation==='mines' && G.mineCD[i]===0){const a=G.t*1.6+i*TAU/3,x=P.x+Math.cos(a)*65,y=P.y+Math.sin(a)*65;const target=enemies.find(e=>!e.dead && !(e.ally>G.t) && Math.hypot(e.x-x,e.y-y)<e.r+15);if(target){G.mineCD[i]=6;extraBlast(x,y,75,32);}}
 }
 for(const c of G.clones){c.t+=dt;if(c.t>=1 && !c.done){c.done=true;extraBlast(c.x,c.y,120,70);}}
 G.clones=G.clones.filter(c=>!c.done);
 if(r?.reward==='steal'){r.pulse=(r.pulse||0)-dt;if(r.pulse<=0){r.pulse=12;extraBlast(P.x,P.y,110,35);}}
}
function extraBlast(x,y,R,dmg){rings.push({x,y,r:0,max:R,w:24,dmg,hit:new Set(),t:0,col:CYAN,kb:140,src:'mutation'});}
function openDiscoveryChoice(){
 if(state!=='play' || G.boss || G.ending || !G.discoveryQueue?.length || G.t<(G.nextChoiceT||0))return false;
 G.nextChoiceT=G.t+25;
 G.discovery=G.discoveryQueue.shift();state='discovery';G.choiceN=(G.choiceN||0)+1;sfx.level();keys.clear();stick.on=false;mouseHold.on=false;relayStop();sfx.hum(false);
 if(['specialization','quest'].includes(G.discovery))return renderRPGChoice();
 $('discoveryHead').textContent=G.discovery==='mutation'?'Choose one mutation':'Claim the rival signature';
 $('discoveryNote').textContent=G.discovery==='mutation'?'One mutation per run. Read the tradeoff; you may also keep your current build.':'Choose one reward. This encounter cannot be farmed within the run.';
 const wrap=$('discoveryCards');wrap.textContent='';
 const choices=G.discovery==='mutation'?Object.values(MUTATIONS):[{name:'Steal signature',icon:'◈',desc:'Automatically emit a 110m pulse for 35 base damage every 12 seconds. Lasts this run.'},{name:'Salvage',icon:'◆',desc:'Receive 120 fragments now. No combat bonus.'},{name:'Restore',icon:'✧',desc:'Repair 75% of maximum integrity and receive one cache.'}];
 choices.forEach((D,i)=>wrap.appendChild(cardEl({icon:D.icon,kind:'Recovered experiment',tag:'Choose one',name:D.name,desc:D.desc,key:'Press '+(i+1)},()=>chooseDiscovery(i))));
 if(G.discovery==='mutation'){const skip=document.createElement('button');skip.className='btn';skip.textContent='4 · Keep current build';skip.addEventListener('click',()=>chooseDiscovery(3));wrap.appendChild(skip);}
 $('discoveryChoice').hidden=false;wrap.querySelector('button')?.focus({preventScroll:true});return true;
}
function chooseDiscovery(i){
 if(state==='discovery' && ['specialization','quest'].includes(G.discovery))return chooseRPG(i);
 if(state!=='discovery' || !Number.isInteger(i) || i<0 || i>(G.discovery==='mutation'?3:2))return false;
 if(G.discovery==='mutation'){G.mutation=Object.keys(MUTATIONS)[i]||null;recalc();}
 else {G.rival.reward=['steal','salvage','restore'][i];if(i===1){META.frag+=120;saveMeta();}if(i===2){P.hp=Math.min(STAT.maxHp,P.hp+STAT.maxHp*.75);pickups.push({x:P.x,y:P.y,kind:'cache',t:0});}}
 $('discoveryChoice').hidden=true;state='play';last=performance.now();sfx.hum(true);return true;
}
function returnMutationShot(s){s.returning=true;s.pierce=s.mutPierce;s.hit.clear();s.life=.9;s.homing=false;}
function updateMutationShot(s,dt){
 if(!s.mutReturn && G.mutation==='return' && ['bolt','spread'].includes(s.src) && Number.isFinite(s.vx) && s.kind!=='boom'){s.mutReturn=true;s.mutPierce=s.pierce;s.mutAge=0;s.dmg*=.7;}
 if(!s.mutReturn)return;s.mutAge+=dt;
 if(!s.returning && (s.mutAge>.45 || s.life<=dt))returnMutationShot(s);
 if(s.returning){const dx=P.x-s.x,dy=P.y-s.y,d=Math.hypot(dx,dy)||1;s.vx=dx/d*520;s.vy=dy/d*520;if(d<18)s.life=0;}
}
function drawRunExtras(){
 if(!G)return;ctx.save();ctx.strokeStyle=CYAN;ctx.lineWidth=2;
 if(G.mutation==='mines')for(let i=0;i<3;i++)if(G.mineCD[i]<=0){const a=G.t*1.6+i*TAU/3;ctx.beginPath();ctx.arc(P.x+Math.cos(a)*65,P.y+Math.sin(a)*65,6,0,TAU);ctx.stroke();}
 for(const c of G.clones||[]){ctx.globalAlpha=1-c.t;ctx.strokeRect(c.x-9,c.y-9,18,18);ctx.beginPath();ctx.arc(c.x,c.y,20+c.t*70,0,TAU);ctx.stroke();}ctx.restore();
}

// Boss rewards and route transitions are queued, never opened inside a damage loop.
const SECTORS = BUILD.data["run-extras"].sectors;
const BOSS_RELICS = BUILD.data["run-extras"].boss_abilities;
function renderRouteStatus() {
  const wrap=$('pauseRelics'); wrap.textContent=''; wrap.hidden=!(G.specialization || G.sector || G.mutation || G.rival?.reward || G.contract);
  if(wrap.hidden) return;
  if(G.specialization){const r=document.createElement('p');r.textContent='Specialization: '+SPECIALIZATIONS[G.specialization].name+' — '+SPECIALIZATIONS[G.specialization].desc;wrap.appendChild(r);}
  const extras=document.createElement('p');extras.textContent=(G.mutation ? MUTATIONS[G.mutation].name+': '+MUTATIONS[G.mutation].desc : 'No mutation installed.')+(G.rival?.reward==='steal' ? ' Stolen signature: pulse every 12s.' : '')+(G.contract ? ' Contract: +15% regular spawns, +10% regular enemy speed.' : '');wrap.appendChild(extras);
  const h=document.createElement('h3'); h.textContent=G.sector ? SECTORS[G.sector].name : 'Run experiments';wrap.appendChild(h);
  const route=document.createElement('p');route.textContent=G.sector ? SECTORS[G.sector].desc : 'Experiments last for this run only.';wrap.appendChild(route);
  for(const id of Object.keys(G.relics||{})){const p=document.createElement('p');p.textContent=BOSS_RELICS[id].name+' — '+BOSS_RELICS[id].desc;wrap.appendChild(p);}
}
function sectorRules() { return G && SECTORS[G.sector] || {spawn:1,xp:1}; }
function queueSectorReward(type) {
  if (!['full','short'].includes(G.mode) || !BOSS_RELICS[type] || G.gate < 1) return;
  G.relics=G.relics||{};
  if (G.relics[type]) return;
  G.relics[type]={cd:BOSS_RELICS[type].cd};
  G.sectorQueue=G.sectorQueue||[]; G.sectorQueue.push(type);
}
function openSectorChoice() {
  if(state!=='play' || G.ending || G.boss || !G.sectorQueue?.length) return false;
  G.nextChoiceT=Math.max(G.nextChoiceT||0,G.t+20);
  G.sectorBoss=G.sectorQueue.shift(); state='sector';
  keys.clear(); mouseHold.on=false; stick.on=false; relayStop(); sfx.hum(false);
  sfx.pickup();
  const reward=BOSS_RELICS[G.sectorBoss];
  $('sectorReward').textContent='Ability acquired: '+reward.name+' — '+reward.desc;
  const wrap=$('sectorCards'); wrap.textContent='';
  Object.entries(SECTORS).forEach(([id,D],i)=>{
    const card=cardEl({icon:D.icon,tag:G.sector===id?'Current route':'Route',kind:'Sector '+(i+1),name:D.name,desc:D.desc,key:'Press '+(i+1)},()=>chooseSector(id));
    wrap.appendChild(card);
  });
  $('sectorChoice').hidden=false;
  wrap.querySelector('button')?.focus({preventScroll:true});
  return true;
}
function chooseSector(id) {
  if(state!=='sector' || !SECTORS[id]) return false;
  G.sector=id; G.routeHistory=G.routeHistory||[]; G.routeHistory.push(id);
  if(id==='blackout') {addPiece('t',rndKey(TRIG,'t')); addPiece('f',rndKey(FX,'f')); toast('Code kit recovered. Open the editor from Pause to install it.');}
  $('sectorChoice').hidden=true; state='play'; last=performance.now(); sfx.hum(true);
  banner('Route selected',SECTORS[id].name); updateHud(true); return true;
}
function updateBossRelics(dt) {
  if(G.sector==='sanctuary') P.hp=Math.min(STAT.maxHp,P.hp+dt*.75);
  for(const [id,r] of Object.entries(G.relics||{})) {
    r.cd-=dt; if(r.cd>0 || G.ending) continue;
    if(id==='phantom' && !P.moving) {r.cd=0;continue;}
    r.cd=BOSS_RELICS[id].cd;
    if(id==='auditor') {
      let n=0; for(const e of enemies) if(!e.dead && !(e.ally>G.t) && Math.hypot(e.x-P.x,e.y-P.y)<360 && n++<3) e.markT=G.t+4;
    } else if(id==='boss') rings.push({x:P.x,y:P.y,r:0,max:160,w:26,dmg:28,hit:new Set(),t:0,col:CYAN,kb:180,src:'relic'});
    else if(id==='collector') {for(const gem of gems) if(Math.hypot(gem.x-P.x,gem.y-P.y)<500) gem.mag=true;}
    else if(id==='mirror') {
      const e=nearest(P.x,P.y,420); if(e){const prior=DSRC;DSRC='relic';strike(e,45);DSRC=prior;}
    } else if(id==='phantom') {P.phaseT=Math.max(P.phaseT,G.t+1);burst(P.x,P.y,8,CYAN,80);}
  }
}

function wardenGuard(e) { return e.type === 'warden' && ((G.t + e.ph) % 4.5) < 3; }
function overloadSignal() {
  const h=G && G.hunt;
  if (state !== 'play' || !h || !h.node || h.overloaded || G.boss || Math.hypot(P.x-h.node.x,P.y-h.node.y)>110) return false;
  h.overloaded=true; h.charge=0; h.until=Math.min(h.until,G.t+35); h.ambushAt=G.t+2;
  $('overloadBtn').hidden=true;
  toast('Overload committed: 3-second holds, shorter timers, an elite pursuer. Complete all 3 for double caches.');
  return true;
}
$('overloadBtn').addEventListener('click',overloadSignal);
function updateOpening() {
  if (!['full','short'].includes(G.mode) || G.ending) return;
  if (!G.opening) G.opening={};
  const o=G.opening;
  if (!o.shards && G.t>=6) {
    o.shards=true;
    for(let i=0;i<8;i++) { const a=i/8*TAU; dropGem(P.x+Math.cos(a)*70,P.y+Math.sin(a)*70,1); }
    toast('Collect the glowing shards to choose your first upgrade.');
  }
  if(!o.lancer && G.t>=24) {
    o.lancer=true; const [x,y]=spawnPos(); spawn('lancer',x,y);
    toast('Lancer incoming: when its aim line appears, move sideways.');
  }
  if(!o.champion && G.t>=45 && !G.boss) {
    o.champion=true; const [x,y]=spawnPos(); const e=spawn('daemon',x,y,true);
    e.champion=true; e.cache=true; e.hp=e.max=110*G.PM.hp; e.dmg*=.7;
    banner('Opening encounter','The Gatekeeper','hot');
    toast('Defeat the gold-ringed Gatekeeper for a cache. Keep an escape route.');
  }
  if(!o.split && G.t>=75 && !G.boss) {
    o.split=true; const [x,y]=spawnPos(); spawn('split',x,y);
    toast('Splitters break into smaller enemies. Leave space before the kill.');
  }
  if(!o.warden && G.t>=90 && !G.boss && G.gate >= 2) {
    o.warden=true; const [x,y]=spawnPos(); spawn('warden',x,y);
    toast('Warden: blue armor reduces damage. Strike when it turns amber and rushes.');
  }
}
function upgradeInsight(o) {
  if(o.kind==='w') {
    const evo=EVO[o.id], partner=!!P.Pv[evo.need];
    const old=o.l ? WDEF[o.id].desc[o.l-1] : 'Adds a new auto-firing weapon.';
    return (o.l ? 'Current: '+old+' ' : 'Weapon slots: '+Object.keys(P.W).length+'/4. ') +
      (P.evo[o.id] ? 'Already evolved.' : 'Evolution: '+(partner?'partner installed':'needs '+PDEF[evo.need].name)+'; weapon level '+(o.l||0)+'/'+WMAX+'.');
  }
  if(o.kind==='p') {
    const partners=Object.keys(EVO).filter(id=>EVO[id].need===o.id && P.W[id]);
    return partners.length ? 'Supports your '+partners.map(id=>WDEF[id].name).join(', ')+' evolution. Max its weapon, then collect a cache.' : 'System slots: '+Object.keys(P.Pv).length+'/4. Each rank adds this bonus.';
  }
  return '';
}
function debriefLines(won) {
  const top=Object.entries(G.dmg||{}).sort((a,b)=>b[1]-a[1])[0];
  const label=id=> WDEF[id] ? (P.evo[id]?EVO[id].name:WDEF[id].name) : ({code:'Code lines',power:'Powers',other:'Other damage',operator:'Operator support',relic:'Boss abilities',mutation:'Mutations',ally:'Allies',thorns:'Backtrace'}[id]||id);
  const total=Object.values(G.dmg||{}).reduce((a,b)=>a+b,0);
  const cause=G.hitBy || 'unknown source';
  const advice={lancer:'Sidestep the white aim line; keep moving across its charge.',watcher:'Move sideways during the red aim line, or break line of sight behind a firewall.',warden:'Keep space for its rush. Its amber phase takes full damage.',split:'Leave room for three smaller enemies when a Splitter falls.',brute:'Circle Brutes and avoid getting pinned against cover.','shot or hazard':'Most hits were enemy shots and corrupted pools. Keep moving sideways to incoming fire, never stand in red pools, and put firewall blocks between you and Drones or Watchers.',daemon:'Daemons are faster than bugs; keep moving in wide circles instead of short dashes.',bug:'Bugs only hurt in a swarm. Keep a lane open and clear the edge of the crowd first.',eel:'Eels weave; cross their path at right angles instead of running alongside.',patcher:'Kill Patchers with your weapons: they resist your strongest code line.',scrubber:'Scrubbers eat pools and shards. Kill them before relying on code fields.',boss:'Watch for the white aim line and step sideways before the lunge.',root:'Keep moving in wide circles; the Root punishes standing still.'};
  return ['Specialization: '+(SPECIALIZATIONS[G.specialization]?.name||'unselected')+' · Quests completed: '+(G.questsDone||0)+'/3.', 'Mutation: '+(G.mutation ? MUTATIONS[G.mutation].name : 'none')+'. Rival: '+(G.rival?.won ? 'defeated' : 'unresolved')+'.'+(G.contract ? ' Contract '+(G.contractSettled ? 'sealed.' : 'not completed.') : ''), 'Route: '+(G.routeHistory?.map(id=>SECTORS[id].name).join(' → ') || 'Outer network')+'. Boss abilities: '+Object.keys(G.relics||{}).map(id=>BOSS_RELICS[id].name).join(', ')+'.', G.training ? 'Training session — rewards disabled.' : G.extracted ? 'Extracted safely with your run rewards.' : won ? 'The system is yours.' : 'Final hit: '+(CODEX[cause]?.[0] || cause)+'.',
    top && total ? 'Build MVP: '+label(top[0])+' · '+Math.round(top[1]/total*100)+'% of recorded damage.' : 'Collect shards early to start building your weapon combinations.',
    'Signals secured: '+(G.hunt?.completed||0)+' · Overloads completed: '+(G.hunt?.overloadWins||0)+'.',
    !won && !G.extracted && !G.training ? 'Next run: '+(advice[cause] || (Object.keys(P.evo).length ? 'Keep an escape route and use your power before you get surrounded.' : 'Pair a weapon with its evolution system, max the weapon, then find a cache.')) : 'Try another operator or weapon pairing for a different build.'];
}
function renderDebrief(won) {
  const wrap=$('runDebrief'); wrap.textContent='';
  const head=document.createElement('h3'); head.textContent='Run debrief'; wrap.appendChild(head);
  for(const line of debriefLines(won)) { const el=document.createElement('p'); el.textContent=line; wrap.appendChild(el); }
}

// Optional three-node exploration loop. Uses simulation time, so pauses freeze it.
function updateSignalHunt(dt) {
  setHidden($('overloadBtn'), true);
  if (!['full','short'].includes(G.mode) || G.ending || G.gate < 1) { setHidden($('signalStatus'), true); return; }
  setHidden($('signalStatus'), false);
  if (!G.hunt) G.hunt = { next: 18, node: null, n: 0, charge: 0, completed: 0, overloaded: false, overloadWins: 0 };
  const h = G.hunt;
  if (h.ambushAt && G.t >= h.ambushAt && !G.boss) {
    h.ambushAt=0;
    const [x,y]=spawnPos(); spawn('warden',x,y,true);
    toast('Trace complete. An elite Warden is hunting you.');
  }
  if (!h.node && G.t >= h.next && !G.boss) {
    const a = rand(0, TAU); h.node = { x: P.x + Math.cos(a)*370, y: P.y + Math.sin(a)*370, r: 20 };
    pushOut(h.node, 28); h.until = G.t + (h.overloaded ? 35 : 50); h.charge = 0;
    toast('Signal detected. Follow the cyan marker — or keep fighting.');
  }
  if (!h.node) {
    $('signalStatus').classList.toggle('idle', true);
    setTxt($('huntTitle'), h.completed ? 'Transmission secured' : 'Stay alive. Get stronger.');
    setTxt($('huntDesc'), G.t < 18 ? 'Move with WASD. Auto-fire is on. Collect glowing shards to upgrade.' : 'Next signal in ' + Math.ceil(Math.max(0,h.next-G.t)) + 's · reward: cache + repair');
    setW($('huntFill'), '0%'); return;
  }
  if (G.boss) h.until += dt;
  const d = Math.hypot(P.x-h.node.x,P.y-h.node.y);
  const hold = h.overloaded ? 3 : 2;
  $('signalStatus').classList.toggle('idle', false);
  setHidden($('overloadBtn'), h.overloaded || d > 110 || !!G.boss);
  h.charge = d < 65 ? Math.min(hold,h.charge+dt) : Math.max(0,h.charge-dt*.5);
  setTxt($('huntTitle'), (h.overloaded ? 'OVERLOADED · ' : '') + 'Recover signal ' + (h.n+1) + ' / 3');
  setTxt($('huntDesc'), Math.round(d) + 'm · ' + (G.boss ? 'timer held during boss' : Math.ceil(Math.max(0,h.until-G.t))+'s left') + ' · Hold '+hold+'s' + (h.overloaded ? ' · 2 caches at 3/3' : ' · 1 cache at 3/3'));
  setW($('huntFill'), (h.charge/hold*100).toFixed(1)+'%');
  if (h.charge >= hold) {
    burst(h.node.x,h.node.y,24,CYAN); sfx.pickup(); h.n++; h.node=null; h.next=G.t+7;
    if (h.n === 3) {
      h.n=0; h.completed++; h.next=G.t+65;
      const rewards = h.overloaded ? 2 : 1;
      for(let i=0;i<rewards;i++) pickups.push({x:P.x+(i?28:0),y:P.y,kind:'cache',t:0});
      if(h.overloaded) h.overloadWins++;
      h.overloaded=false; $('overloadBtn').hidden=true;
      P.hp=Math.min(STAT.maxHp,P.hp+STAT.maxHp*.15);
      banner('Transmission secured',rewards+' cache'+(rewards>1?'s':'')+' + 15% repair','gold');
    } else toast('Signal recovered · '+h.n+'/3. Next relay incoming.');
  } else if (G.t >= h.until) { h.node=null; h.n=0; h.overloaded=false; h.next=G.t+25; toast('Signal lost. A new transmission will arrive.'); }
}
function drawSignalHunt() {
  const h=G.hunt; if (!h || !h.node) return;
  const n=h.node, t=G.t;
  ctx.save(); ctx.translate(n.x,n.y);
  ctx.fillStyle='rgba(127,247,255,.06)'; ctx.strokeStyle=h.overloaded ? AMBER : CYAN; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,65,0,TAU); ctx.fill(); ctx.setLineDash([5,9]); ctx.stroke(); ctx.setLineDash([]);
  ctx.rotate(t*.7); ctx.strokeRect(-16,-16,32,32); ctx.rotate(-t*.7);
  ctx.fillStyle=CYAN; ctx.font='11px '+FONT; ctx.textAlign='center'; ctx.fillText('RELAY '+(h.n+1)+'/3',0,-80);
  ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,70,-Math.PI/2,-Math.PI/2+TAU*h.charge/(h.overloaded?3:2)); ctx.stroke(); ctx.restore();
  const dx=n.x-P.x,dy=n.y-P.y,d=Math.hypot(dx,dy);
  if (d>150) {
    const r=Math.min(180,Math.min(VW,VH)*.32), x=P.x+dx/d*r,y=P.y+dy/d*r;
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.atan2(dy,dx)); ctx.fillStyle=CYAN;
    ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(-5,-6); ctx.lineTo(-2,0); ctx.lineTo(-5,6); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

