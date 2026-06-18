// Universal canvas sport game — cartoon players, analog joystick, SHOOT/SPRINT
// Parameterized per sport via SportConfig

type V2 = { x: number; y: number };
const v2 = (x: number, y: number): V2 => ({ x, y });
const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });
const vlen = (a: V2) => Math.sqrt(a.x * a.x + a.y * a.y);
const vnorm = (a: V2): V2 => { const l = vlen(a); return l > 0.001 ? mul(a, 1 / l) : v2(0, 0); };
const vdist = (a: V2, b: V2) => vlen(sub(a, b));
const vdot  = (a: V2, b: V2) => a.x * b.x + a.y * b.y;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Body { pos: V2; vel: V2; r: number }

// ── Sport configuration ──────────────────────────────────────
export interface SportConfig {
  id: number;
  sport: string;
  icon: string;
  fieldColor1: string;   // primary field color
  fieldColor2: string;   // alternating stripe
  fieldLine: string;     // line color
  goalColor: string;     // goalpost color
  ballColor: string;     // main ball color
  ballAccent: string;    // ball patch/stripe color
  ballShape: 'soccer' | 'basketball' | 'football' | 'puck' | 'volleyball' | 'baseball' | 'disc';
  playerJersey: string;  // player team color (blue-ish)
  cpuJersey: string;     // cpu team color (red-ish)
  shootLabel: string;    // SHOOT button label
  sprintLabel: string;   // SPRINT button label
  shootColor: string;
  sprintColor: string;
  goalLabel: string;     // "GOAL!" text on score
  fieldType: 'grass' | 'court' | 'ice' | 'sand' | 'track' | 'ring';
  goalShape: 'rect' | 'hoop' | 'crease' | 'endzone' | 'lane' | 'net';
  gameSecs: number;
}

export const SPORT_CONFIGS: Record<number, SportConfig> = {
  0: { // Soccer
    id: 0, sport: 'Soccer', icon: '⚽',
    fieldColor1: '#2a7535', fieldColor2: '#31883f', fieldLine: 'rgba(255,255,255,0.7)',
    goalColor: 'rgba(255,255,255,0.9)', ballColor: '#f8fafc', ballAccent: '#1e293b',
    ballShape: 'soccer', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SHOOT', sprintLabel: 'SPRINT', shootColor: '#dc2626', sprintColor: '#16a34a',
    goalLabel: '⚽  GOAL!', fieldType: 'grass', goalShape: 'rect', gameSecs: 120,
  },
  1: { // Tennis
    id: 1, sport: 'Tennis', icon: '🎾',
    fieldColor1: '#3a7d44', fieldColor2: '#3a7d44', fieldLine: 'rgba(255,255,255,0.85)',
    goalColor: 'rgba(255,255,255,0.9)', ballColor: '#c8e642', ballAccent: '#a0b830',
    ballShape: 'volleyball', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SERVE', sprintLabel: 'SPRINT', shootColor: '#c8e642', sprintColor: '#16a34a',
    goalLabel: '🎾  POINT!', fieldType: 'court', goalShape: 'net', gameSecs: 90,
  },
  2: { // Hockey
    id: 2, sport: 'Hockey', icon: '🏒',
    fieldColor1: '#cce8f8', fieldColor2: '#d8eef8', fieldLine: 'rgba(0,80,180,0.7)',
    goalColor: '#ff3300', ballColor: '#1a1a1a', ballAccent: '#333',
    ballShape: 'puck', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SHOOT', sprintLabel: 'SPRINT', shootColor: '#dc2626', sprintColor: '#1d4ed8',
    goalLabel: '🏒  GOAL!', fieldType: 'ice', goalShape: 'crease', gameSecs: 120,
  },
  3: { // Baseball
    id: 3, sport: 'Baseball', icon: '⚾',
    fieldColor1: '#3a7d44', fieldColor2: '#31883f', fieldLine: 'rgba(255,255,255,0.7)',
    goalColor: 'rgba(255,255,255,0.8)', ballColor: '#f8fafc', ballAccent: '#cc3333',
    ballShape: 'baseball', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SWING', sprintLabel: 'RUN', shootColor: '#c41e3a', sprintColor: '#16a34a',
    goalLabel: '⚾  HOME RUN!', fieldType: 'grass', goalShape: 'endzone', gameSecs: 90,
  },
  4: { // Volleyball
    id: 4, sport: 'Volleyball', icon: '🏐',
    fieldColor1: '#d4a855', fieldColor2: '#c99d4f', fieldLine: 'rgba(255,255,255,0.85)',
    goalColor: 'rgba(255,255,255,0.9)', ballColor: '#f5e0a0', ballAccent: '#1d4ed8',
    ballShape: 'volleyball', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SPIKE', sprintLabel: 'DIVE', shootColor: '#1d4ed8', sprintColor: '#d4a855',
    goalLabel: '🏐  POINT!', fieldType: 'sand', goalShape: 'net', gameSecs: 90,
  },
  5: { // Golf
    id: 5, sport: 'Golf', icon: '⛳',
    fieldColor1: '#2a7535', fieldColor2: '#1e5c28', fieldLine: 'rgba(255,255,255,0.5)',
    goalColor: '#fff', ballColor: '#fff', ballAccent: '#ccc',
    ballShape: 'baseball', playerJersey: '#16a34a', cpuJersey: '#854d0e',
    shootLabel: 'SWING', sprintLabel: 'AIM', shootColor: '#16a34a', sprintColor: '#854d0e',
    goalLabel: '⛳  BIRDIE!', fieldType: 'grass', goalShape: 'lane', gameSecs: 90,
  },
  6: { // Dodgeball
    id: 6, sport: 'Dodgeball', icon: '🔴',
    fieldColor1: '#6b21a8', fieldColor2: '#581c87', fieldLine: 'rgba(255,255,255,0.5)',
    goalColor: '#ff3300', ballColor: '#dc2626', ballAccent: '#991b1b',
    ballShape: 'disc', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'THROW', sprintLabel: 'DODGE', shootColor: '#dc2626', sprintColor: '#9333ea',
    goalLabel: '🔴  HIT!', fieldType: 'court', goalShape: 'endzone', gameSecs: 90,
  },
  7: { // Football
    id: 7, sport: 'Football', icon: '🏈',
    fieldColor1: '#2a7535', fieldColor2: '#31883f', fieldLine: 'rgba(255,255,255,0.7)',
    goalColor: 'rgba(255,255,255,0.9)', ballColor: '#8B4513', ballAccent: '#f8fafc',
    ballShape: 'football', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'PASS', sprintLabel: 'SPRINT', shootColor: '#c4832a', sprintColor: '#16a34a',
    goalLabel: '🏈  TOUCHDOWN!', fieldType: 'grass', goalShape: 'endzone', gameSecs: 120,
  },
  8: { // Swimming
    id: 8, sport: 'Swimming', icon: '🏊',
    fieldColor1: '#0369a1', fieldColor2: '#0284c7', fieldLine: 'rgba(255,255,255,0.5)',
    goalColor: '#f59e0b', ballColor: '#f8fafc', ballAccent: '#0369a1',
    ballShape: 'disc', playerJersey: '#0c4a6e', cpuJersey: '#7f1d1d',
    shootLabel: 'STROKE', sprintLabel: 'KICK', shootColor: '#0284c7', sprintColor: '#0369a1',
    goalLabel: '🏊  FINISH!', fieldType: 'court', goalShape: 'lane', gameSecs: 90,
  },
  9: { // Boxing
    id: 9, sport: 'Boxing', icon: '🥊',
    fieldColor1: '#374151', fieldColor2: '#1f2937', fieldLine: 'rgba(255,255,255,0.6)',
    goalColor: '#f59e0b', ballColor: '#dc2626', ballAccent: '#991b1b',
    ballShape: 'disc', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'PUNCH', sprintLabel: 'BLOCK', shootColor: '#dc2626', sprintColor: '#6b7280',
    goalLabel: '🥊  KO!', fieldType: 'ring', goalShape: 'rect', gameSecs: 90,
  },
  10: { // Track & Field
    id: 10, sport: 'Track & Field', icon: '🏃',
    fieldColor1: '#dc4e12', fieldColor2: '#c94410', fieldLine: 'rgba(255,255,255,0.7)',
    goalColor: '#f59e0b', ballColor: '#f59e0b', ballAccent: '#333',
    ballShape: 'disc', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SPRINT', sprintLabel: 'BOOST', shootColor: '#f59e0b', sprintColor: '#d06000',
    goalLabel: '🏃  FINISH!', fieldType: 'track', goalShape: 'lane', gameSecs: 60,
  },
  11: { // Basketball
    id: 11, sport: 'Basketball', icon: '🏀',
    fieldColor1: '#92400e', fieldColor2: '#78350f', fieldLine: 'rgba(255,255,255,0.65)',
    goalColor: '#f97316', ballColor: '#e05c00', ballAccent: '#1e293b',
    ballShape: 'basketball', playerJersey: '#1d4ed8', cpuJersey: '#cc2222',
    shootLabel: 'SHOOT', sprintLabel: 'DRIVE', shootColor: '#f97316', sprintColor: '#16a34a',
    goalLabel: '🏀  BASKET!', fieldType: 'court', goalShape: 'hoop', gameSecs: 120,
  },
};

// ── Joystick / button state ──────────────────────────────────
interface Joystick { active: boolean; pid: number; base: V2; stick: V2; dx: number; dy: number; OR: number; NR: number }
interface ActionBtn { cx: number; cy: number; r: number; label: string; color: string; glow: string; held: boolean; pid: number }

interface GState {
  player: Body; cpuA: Body; cpuB: Body; ball: Body;
  pScore: number; aiScore: number; timeLeft: number;
  phase: 'play' | 'goal' | 'end'; goalTimer: number;
  lastDir: V2; joy: Joystick;
  shootBtn: ActionBtn; sprintBtn: ActionBtn;
  aiCooldownA: number; aiCooldownB: number; pKickCD: number;
  fc: number;
}

// ── Main export ──────────────────────────────────────────────
export function renderSportGame(
  container: HTMLElement,
  cfg: SportConfig,
  onBack: () => void,
): () => void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#0c0c0c;font-family:Inter,system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.42rem 0.85rem;background:rgba(0,0,0,0.65);flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <button id="sg-exit" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);color:#94a3b8;border-radius:20px;padding:0.28rem 0.72rem;font-size:0.76rem;cursor:pointer;font-family:inherit;">← Back</button>
        <div style="text-align:center;">
          <div style="font-size:0.8rem;">${cfg.icon}</div>
          <div id="sg-score" style="font-size:1.45rem;font-weight:900;color:#fff;letter-spacing:0.06em;line-height:1.1;">0 – 0</div>
          <div style="font-size:0.56rem;color:#374151;letter-spacing:0.1em;text-transform:uppercase;">you vs cpu</div>
        </div>
        <div id="sg-timer" style="font-size:0.95rem;font-weight:700;color:#22c55e;font-variant-numeric:tabular-nums;min-width:40px;text-align:right;">${Math.floor(cfg.gameSecs / 60)}:00</div>
      </div>
      <div id="sg-fw" style="flex:1;position:relative;overflow:hidden;min-height:0;">
        <canvas id="sg-cv" style="display:block;touch-action:none;"></canvas>
        <div id="sg-ov" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.55);flex-direction:column;align-items:center;justify-content:center;gap:0.65rem;">
          <div id="sg-ov-msg" style="font-size:2.4rem;font-weight:900;color:#fff;text-align:center;"></div>
          <div id="sg-ov-sub" style="font-size:0.9rem;color:rgba(255,255,255,0.6);text-align:center;"></div>
          <div id="sg-ov-btns" style="display:flex;gap:0.7rem;margin-top:0.4rem;"></div>
        </div>
      </div>
    </div>
    <style>#sg-ov.show{display:flex!important}@keyframes sg-pop{from{transform:scale(0.4);opacity:0}to{transform:scale(1);opacity:1}}</style>
  `;

  const canvas  = document.getElementById('sg-cv') as HTMLCanvasElement;
  const fw      = document.getElementById('sg-fw') as HTMLElement;
  const ctx     = canvas.getContext('2d')!;
  const scoreEl = document.getElementById('sg-score')!;
  const timerEl = document.getElementById('sg-timer')!;
  const ov      = document.getElementById('sg-ov')!;
  const ovMsg   = document.getElementById('sg-ov-msg')!;
  const ovSub   = document.getElementById('sg-ov-sub')!;
  const ovBtns  = document.getElementById('sg-ov-btns')!;

  let W = 0, H = 0;

  function goalBounds() {
    const gw = W * (cfg.goalShape === 'hoop' ? 0.12 : cfg.goalShape === 'endzone' ? 0.6 : 0.34);
    return { gl: (W - gw) / 2, gr: (W + gw) / 2, gw };
  }

  function mkJoy(): Joystick {
    return { active: false, pid: -1, base: v2(0,0), stick: v2(0,0), dx: 0, dy: 0, OR: 52, NR: 23 };
  }
  function mkBtn(label: string, color: string, glow: string): ActionBtn {
    return { cx: 0, cy: 0, r: 0, label, color, glow, held: false, pid: -1 };
  }

  function mkState(): GState {
    return {
      player: { pos: v2(0,0), vel: v2(0,0), r: 16 },
      cpuA:   { pos: v2(0,0), vel: v2(0,0), r: 16 },
      cpuB:   { pos: v2(0,0), vel: v2(0,0), r: 16 },
      ball:   { pos: v2(0,0), vel: v2(0,0), r: cfg.ballShape === 'puck' ? 8 : 9 },
      pScore: 0, aiScore: 0, timeLeft: cfg.gameSecs,
      phase: 'play', goalTimer: 0,
      lastDir: v2(0, -1),
      joy: mkJoy(),
      shootBtn:  mkBtn(cfg.shootLabel,  cfg.shootColor,  hexGlow(cfg.shootColor)),
      sprintBtn: mkBtn(cfg.sprintLabel, cfg.sprintColor, hexGlow(cfg.sprintColor)),
      aiCooldownA: 45, aiCooldownB: 30, pKickCD: 0,
      fc: 0,
    };
  }

  function hexGlow(c: string): string {
    return c.startsWith('#') ? c + '88' : c;
  }

  function resetBodies(s: GState) {
    s.player.pos = v2(W / 2, H * 0.66);
    s.cpuA.pos   = v2(W * 0.42, H * 0.3);
    s.cpuB.pos   = v2(W * 0.58, H * 0.22);
    s.ball.pos   = v2(W / 2, H / 2);
    [s.player, s.cpuA, s.cpuB, s.ball].forEach(b => { b.vel = v2(0,0); });
    s.aiCooldownA = 45; s.aiCooldownB = 30;
    layoutControls(s);
  }

  function layoutControls(s: GState) {
    const cy = H * 0.84;
    s.joy.base = v2(W * 0.15, cy); s.joy.stick = { ...s.joy.base };
    s.joy.OR = Math.min(52, W * 0.13); s.joy.NR = s.joy.OR * 0.44;
    s.shootBtn.cx  = W * 0.87; s.shootBtn.cy  = H * 0.82; s.shootBtn.r = Math.min(44, W * 0.12);
    s.sprintBtn.cx = W * 0.65; s.sprintBtn.cy = H * 0.88; s.sprintBtn.r = Math.min(36, W * 0.095);
  }

  let S = mkState();

  // Resize
  function resize() {
    const r = fw.getBoundingClientRect();
    W = Math.floor(r.width); H = Math.floor(r.height);
    canvas.width = W; canvas.height = H;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(fw);

  // Keyboard
  const keys = { u:false, d:false, l:false, r:false, space:false };
  const kd = (e: KeyboardEvent) => {
    if (e.key==='ArrowUp'   ||e.key==='w'){keys.u=true;e.preventDefault();}
    if (e.key==='ArrowDown' ||e.key==='s'){keys.d=true;e.preventDefault();}
    if (e.key==='ArrowLeft' ||e.key==='a'){keys.l=true;e.preventDefault();}
    if (e.key==='ArrowRight'||e.key==='d'){keys.r=true;e.preventDefault();}
    if (e.key===' '||e.key==='Enter'){keys.space=true;e.preventDefault();}
  };
  const ku = (e: KeyboardEvent) => {
    if (e.key==='ArrowUp'   ||e.key==='w') keys.u=false;
    if (e.key==='ArrowDown' ||e.key==='s') keys.d=false;
    if (e.key==='ArrowLeft' ||e.key==='a') keys.l=false;
    if (e.key==='ArrowRight'||e.key==='d') keys.r=false;
    if (e.key===' '||e.key==='Enter') keys.space=false;
  };
  document.addEventListener('keydown', kd);
  document.addEventListener('keyup',   ku);

  // Canvas pointer events
  function cxy(e: PointerEvent): V2 {
    const r = canvas.getBoundingClientRect();
    return v2((e.clientX-r.left)*(W/r.width), (e.clientY-r.top)*(H/r.height));
  }
  function hitBtn(b: ActionBtn, p: V2) { return vdist(p, v2(b.cx, b.cy)) < b.r * 1.25; }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const p = cxy(e);
    if (p.x < W * 0.42 && p.y > H * 0.6) {
      const j = S.joy; j.active=true; j.pid=e.pointerId; j.base=p; j.stick=p; j.dx=0; j.dy=0; return;
    }
    if (hitBtn(S.shootBtn,  p)) { S.shootBtn.held=true;  S.shootBtn.pid=e.pointerId;  return; }
    if (hitBtn(S.sprintBtn, p)) { S.sprintBtn.held=true; S.sprintBtn.pid=e.pointerId; }
  });
  canvas.addEventListener('pointermove', e => {
    const j = S.joy;
    if (!j.active || e.pointerId !== j.pid) return;
    const p = cxy(e), d = sub(p, j.base), dl = vlen(d);
    const cl = dl > j.OR ? mul(vnorm(d), j.OR) : d;
    j.stick = add(j.base, cl); j.dx = cl.x/j.OR; j.dy = cl.y/j.OR;
  });
  const pu = (e: PointerEvent) => {
    if (e.pointerId===S.joy.pid)       { S.joy.active=false; S.joy.dx=0; S.joy.dy=0; }
    if (e.pointerId===S.shootBtn.pid)  S.shootBtn.held=false;
    if (e.pointerId===S.sprintBtn.pid) S.sprintBtn.held=false;
  };
  canvas.addEventListener('pointerup',     pu);
  canvas.addEventListener('pointercancel', pu);

  document.getElementById('sg-exit')!.addEventListener('click', ()=>{ cleanup(); onBack(); });

  // Physics
  const M = 12; // field margin
  function step(b: Body){ b.pos=add(b.pos,b.vel); }
  function damp(b: Body, f: number){ b.vel=mul(b.vel,f); }
  function cap(b: Body, max: number){ const s=vlen(b.vel); if(s>max)b.vel=mul(b.vel,max/s); }
  function bounce(b: Body,x0:number,x1:number,y0:number,y1:number){
    if(b.pos.x-b.r<x0){b.pos.x=x0+b.r;b.vel.x= Math.abs(b.vel.x)*0.5;}
    if(b.pos.x+b.r>x1){b.pos.x=x1-b.r;b.vel.x=-Math.abs(b.vel.x)*0.5;}
    if(b.pos.y-b.r<y0){b.pos.y=y0+b.r;b.vel.y= Math.abs(b.vel.y)*0.5;}
    if(b.pos.y+b.r>y1){b.pos.y=y1-b.r;b.vel.y=-Math.abs(b.vel.y)*0.5;}
  }
  function sep(a: Body,b: Body){
    const d=vdist(a.pos,b.pos),md=a.r+b.r;
    if(d>=md||d<0.001)return;
    const dir=vnorm(sub(b.pos,a.pos)),push=(md-d)*0.55;
    a.pos=sub(a.pos,mul(dir,push*0.5));b.pos=add(b.pos,mul(dir,push*0.5));
    const rv=vdot(sub(a.vel,b.vel),dir);
    if(rv>0){a.vel=sub(a.vel,mul(dir,rv*0.35));b.vel=add(b.vel,mul(dir,rv*0.65));}
  }
  function dribble(body: Body,ball: Body){
    const d=vdist(body.pos,ball.pos),touch=body.r+ball.r+1;
    if(d>touch+6||d<0.001)return;
    const dir=vnorm(sub(ball.pos,body.pos));
    ball.pos=add(body.pos,mul(dir,touch+1));
    ball.vel=add(ball.vel,add(mul(body.vel,0.8),mul(dir,2.0)));
  }

  // Goal / end
  function triggerGoal(forPlayer: boolean){
    if(forPlayer)S.pScore++;else S.aiScore++;
    ovMsg.textContent = forPlayer ? cfg.goalLabel : '🔴  CPU SCORES!';
    ovMsg.style.color = forPlayer ? '#22c55e' : '#ef4444';
    ovSub.textContent = forPlayer ? 'Great play!' : 'CPU scored…';
    ovBtns.innerHTML='';
    ovMsg.style.animation='none'; void (ovMsg as HTMLElement).offsetWidth;
    ovMsg.style.animation='sg-pop 0.35s ease';
    S.phase='goal'; S.goalTimer=100; ov.classList.add('show'); updateHUD();
  }
  function showEnd(){
    const won=S.pScore>S.aiScore,draw=S.pScore===S.aiScore;
    ovMsg.textContent=won?'🏆  YOU WIN!':draw?'🤝  DRAW':'💪  KEEP TRYING';
    ovMsg.style.color=won?'#f59e0b':draw?'#94a3b8':'#ef4444';
    ovSub.textContent=`Final: ${S.pScore} – ${S.aiScore}`;
    ovMsg.style.animation='none'; void (ovMsg as HTMLElement).offsetWidth;
    ovMsg.style.animation='sg-pop 0.4s ease';
    ovBtns.innerHTML=`
      <button id="sg-retry" style="padding:0.55rem 1.3rem;border-radius:20px;background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.22);color:#fff;font-size:0.88rem;cursor:pointer;font-family:inherit;">▶ Replay</button>
      <button id="sg-bk2"   style="padding:0.55rem 1.3rem;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#64748b;font-size:0.88rem;cursor:pointer;font-family:inherit;">← Exit</button>
    `;
    ov.classList.add('show');
    document.getElementById('sg-retry')?.addEventListener('click',()=>{
      S=mkState(); resetBodies(S); prevTs=performance.now(); ov.classList.remove('show');
    });
    document.getElementById('sg-bk2')?.addEventListener('click',()=>{ cleanup(); onBack(); });
  }
  function updateHUD(){
    scoreEl.textContent=`${S.pScore} – ${S.aiScore}`;
    const t=Math.max(0,Math.ceil(S.timeLeft));
    timerEl.textContent=`${Math.floor(t/60)}:${(t%60).toString().padStart(2,'0')}`;
    timerEl.style.color=S.timeLeft<30?'#ef4444':'#22c55e';
  }

  // Update loop
  let prevTs=0;
  const PSPEED=3.6, SSPEED=5.2, AISPEED=2.4, KPOW=11, BFRIC=0.93, PFRIC=0.7;

  function update(ts: number){
    const dt=Math.min((ts-prevTs)/1000,0.05); prevTs=ts; S.fc++;
    if(S.phase==='goal'){if(--S.goalTimer<=0){S.phase='play';ov.classList.remove('show');resetBodies(S);}return;}
    if(S.phase==='end')return;
    S.timeLeft-=dt;
    if(S.timeLeft<=0){S.timeLeft=0;S.phase='end';updateHUD();showEnd();return;}

    // Player
    const j=S.joy;
    let jx=j.dx,jy=j.dy;
    if(keys.l)jx-=1;if(keys.r)jx+=1;if(keys.u)jy-=1;if(keys.d)jy+=1;
    const kl=Math.sqrt(jx*jx+jy*jy); if(kl>1){jx/=kl;jy/=kl;}
    const sprint=S.sprintBtn.held||keys.space;
    const topSpd=sprint?SSPEED:PSPEED;
    const nd=vnorm(v2(jx,jy));
    if(nd.x!==0||nd.y!==0)S.lastDir=nd;
    S.player.vel=add(mul(S.player.vel,0.72),mul(nd,topSpd));
    cap(S.player,topSpd); step(S.player); damp(S.player,PFRIC);
    bounce(S.player,M+16,W-M-16,M+16,H-M-16);

    // Shoot
    if(S.shootBtn.held&&S.pKickCD<=0){
      if(vdist(S.player.pos,S.ball.pos)<S.player.r+S.ball.r+32){
        const{gl,gr}=goalBounds();
        const gcx=clamp(S.ball.pos.x,(gl+gr)/2-20,(gl+gr)/2+20);
        S.ball.vel=mul(vnorm(sub(v2(gcx,0),S.ball.pos)),KPOW*1.1);
        S.pKickCD=20;
      }
    }
    if(S.pKickCD>0)S.pKickCD--;

    // CPU
    updateCPU(S.cpuA, true);  if(S.aiCooldownA>0)S.aiCooldownA--;
    updateCPU(S.cpuB, false); if(S.aiCooldownB>0)S.aiCooldownB--;

    // Ball physics
    dribble(S.player,S.ball); dribble(S.cpuA,S.ball); dribble(S.cpuB,S.ball);
    sep(S.player,S.cpuA); sep(S.player,S.cpuB); sep(S.cpuA,S.cpuB);
    step(S.ball); damp(S.ball,BFRIC);

    // Ball walls + goal
    const{gl,gr}=goalBounds();
    if(S.ball.pos.x-9<M){S.ball.pos.x=M+9;S.ball.vel.x= Math.abs(S.ball.vel.x)*0.65;}
    if(S.ball.pos.x+9>W-M){S.ball.pos.x=W-M-9;S.ball.vel.x=-Math.abs(S.ball.vel.x)*0.65;}
    const bx=S.ball.pos.x,inG=bx>gl&&bx<gr;
    if(S.ball.pos.y-9<M){if(inG){triggerGoal(true);return;}S.ball.pos.y=M+9;S.ball.vel.y= Math.abs(S.ball.vel.y)*0.65;}
    if(S.ball.pos.y+9>H-M){if(inG){triggerGoal(false);return;}S.ball.pos.y=H-M-9;S.ball.vel.y=-Math.abs(S.ball.vel.y)*0.65;}
    updateHUD();
  }

  function updateCPU(cpu: Body, isA: boolean){
    const toB=sub(S.ball.pos,cpu.pos);
    const offset = isA ? v2(0,0) : v2(W*0.05*(Math.random()>0.5?1:-1), H*0.08);
    const target = add(S.ball.pos, offset);
    cpu.vel=add(mul(cpu.vel,0.62),mul(vnorm(sub(target,cpu.pos)),AISPEED));
    cap(cpu,AISPEED);
    const cd=isA?S.aiCooldownA:S.aiCooldownB;
    if(vlen(toB)<cpu.r+9+8&&cd<=0){
      const{gl,gr}=goalBounds();
      const gcx=(gl+gr)/2+(Math.random()-0.5)*40;
      S.ball.vel=mul(vnorm(sub(v2(gcx,H-M),S.ball.pos)),KPOW*0.85);
      if(isA)S.aiCooldownA=55+Math.floor(Math.random()*20);
      else   S.aiCooldownB=70+Math.floor(Math.random()*30);
    }
    step(cpu); damp(cpu,PFRIC); bounce(cpu,M+16,W-M-16,M+16,H-M-16);
  }

  // ── Rendering ────────────────────────────────────────────────
  function render(){
    if(!ctx||W<=0||H<=0)return;
    ctx.clearRect(0,0,W,H);
    drawField();
    drawBall(S.ball);
    drawCartoon(S.cpuA, cfg.cpuJersey,    '#1a1a1a', false, S.fc);
    drawCartoon(S.cpuB, cfg.cpuJersey,    '#8b4513', false, S.fc);
    drawCartoon(S.player, cfg.playerJersey, '#f59e0b', true,  S.fc);
    drawControls();
  }

  // ── Field ───────────────────────────────────────────────────
  function drawField(){
    if(cfg.fieldType==='grass'||cfg.fieldType==='sand'||cfg.fieldType==='track'){
      for(let i=0;i<7;i++){
        ctx.fillStyle=i%2===0?cfg.fieldColor1:cfg.fieldColor2;
        ctx.fillRect(0,(i/7)*H,W,H/7);
      }
    } else if(cfg.fieldType==='ice'){
      const iceGrad=ctx.createLinearGradient(0,0,W,H);
      iceGrad.addColorStop(0,cfg.fieldColor1); iceGrad.addColorStop(1,cfg.fieldColor2);
      ctx.fillStyle=iceGrad; ctx.fillRect(0,0,W,H);
    } else if(cfg.fieldType==='ring'){
      ctx.fillStyle=cfg.fieldColor1; ctx.fillRect(0,0,W,H);
      ctx.fillStyle=cfg.fieldColor2;
      const rw=W*0.8,rh=H*0.75;
      ctx.beginPath(); ctx.roundRect((W-rw)/2,(H-rh)/2,rw,rh,16); ctx.fill();
    } else {
      // court / pool
      ctx.fillStyle=cfg.fieldColor1; ctx.fillRect(0,0,W,H);
      if(cfg.fieldType==='court'){
        ctx.fillStyle=cfg.fieldColor2;
        for(let i=0;i<6;i++){
          if(i%2===0){ ctx.fillStyle='rgba(0,0,0,0.06)'; ctx.fillRect(0,(i/6)*H,W,H/6); }
        }
      }
    }

    // Lane lines for pool/track
    if(cfg.fieldType==='court'&&cfg.goalShape==='lane'){
      ctx.save(); ctx.strokeStyle=cfg.fieldLine; ctx.lineWidth=2;
      const lanes=4;
      for(let i=1;i<lanes;i++){
        ctx.beginPath(); ctx.moveTo(i*(W/lanes),0); ctx.lineTo(i*(W/lanes),H); ctx.stroke();
      }
      ctx.restore();
    }

    const{gl,gr,gw}=goalBounds();
    ctx.fillStyle='rgba(255,200,0,0.07)';
    ctx.fillRect(gl,0,gw,28+M); ctx.fillRect(gl,H-28-M,gw,28+M);

    // Field lines
    ctx.save(); ctx.strokeStyle=cfg.fieldLine; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(M,M); ctx.lineTo(gl,M);
    ctx.moveTo(gr,M); ctx.lineTo(W-M,M);
    ctx.moveTo(M,H-M); ctx.lineTo(gl,H-M);
    ctx.moveTo(gr,H-M); ctx.lineTo(W-M,H-M);
    ctx.moveTo(M,M); ctx.lineTo(M,H-M);
    ctx.moveTo(W-M,M); ctx.lineTo(W-M,H-M);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M,H/2); ctx.lineTo(W-M,H/2); ctx.stroke();
    if(cfg.fieldType!=='ring'){
      ctx.beginPath(); ctx.arc(W/2,H/2,Math.min(W,H)*0.1,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle=cfg.fieldLine; ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2); ctx.fill();
    }
    const pw=W*0.58,ph=H*0.15,px=(W-pw)/2;
    ctx.strokeRect(px,M,pw,ph); ctx.strokeRect(px,H-M-ph,pw,ph);
    ctx.restore();

    // Goalposts
    ctx.save(); ctx.strokeStyle=cfg.goalColor; ctx.lineWidth=4;
    if(cfg.goalShape==='hoop'){
      // Basketball hoops (circles)
      ctx.beginPath(); ctx.arc(W/2,M+8,18,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W/2,H-M-8,18,0,Math.PI*2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(gl,M); ctx.lineTo(gl,0); ctx.lineTo(gr,0); ctx.lineTo(gr,M); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gl,H-M); ctx.lineTo(gl,H); ctx.lineTo(gr,H); ctx.lineTo(gr,H-M); ctx.stroke();
    }
    // Net
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1;
    for(let x=gl+12;x<gr;x+=12){
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x,H); ctx.lineTo(x,H-28); ctx.stroke();
    }
    for(let y=4;y<28;y+=7){
      ctx.beginPath(); ctx.moveTo(gl,y); ctx.lineTo(gr,y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gl,H-y); ctx.lineTo(gr,H-y); ctx.stroke();
    }
    ctx.restore();
    ctx.font='bold 9px Inter,sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,200,0.4)';
    ctx.fillText('CPU',W/2,14); ctx.fillText('YOU',W/2,H-5);
  }

  // ── Ball rendering ───────────────────────────────────────────
  function drawBall(ball: Body){
    const{x,y}=ball.pos,r=ball.r;
    ctx.save(); ctx.globalAlpha=0.22; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(x+2,y+r*0.55,r*0.85,r*0.28,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle=cfg.ballColor;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();

    if(cfg.ballShape==='soccer'){
      ctx.fillStyle=cfg.ballAccent;
      for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2-Math.PI/2;ctx.beginPath();ctx.arc(x+Math.cos(a)*r*0.52,y+Math.sin(a)*r*0.52,r*0.27,0,Math.PI*2);ctx.fill();}
      ctx.beginPath();ctx.arc(x,y,r*0.27,0,Math.PI*2);ctx.fill();
    } else if(cfg.ballShape==='basketball'){
      ctx.strokeStyle=cfg.ballAccent; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-r,y); ctx.lineTo(x+r,y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x,y-r); ctx.lineTo(x,y+r); ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI,false); ctx.stroke();
    } else if(cfg.ballShape==='football'){
      ctx.save(); ctx.strokeStyle=cfg.ballAccent; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x,y,r*1.3,r*0.8,Math.PI/4,0,Math.PI*2); ctx.fillStyle=cfg.ballColor; ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*4-5,y+i*4-5);ctx.lineTo(x+i*4+5,y+i*4+5);ctx.stroke();}
      ctx.restore();
    } else if(cfg.ballShape==='puck'){
      ctx.fillStyle='#333';
      ctx.beginPath(); ctx.ellipse(x,y,r*1.2,r*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.stroke();
    } else if(cfg.ballShape==='baseball'){
      ctx.strokeStyle=cfg.ballAccent; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x-2,y,r*0.6,Math.PI*0.7,Math.PI*1.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(x+2,y,r*0.6,-Math.PI*0.3,Math.PI*0.3); ctx.stroke();
    } else if(cfg.ballShape==='volleyball'){
      ctx.strokeStyle=cfg.ballAccent; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-r,y); ctx.lineTo(x+r,y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,r,Math.PI*0.3,Math.PI*0.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,r,-Math.PI*0.7,-Math.PI*0.3); ctx.stroke();
    } else { // disc
      ctx.strokeStyle=cfg.ballAccent; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(x,y,r*0.55,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(x-r*0.3,y-r*0.3,r*0.2,0,Math.PI*2); ctx.fill();
  }

  // ── Cartoon player ───────────────────────────────────────────
  function lighten(hex: string,amt: number):string{
    const n=parseInt(hex.replace('#',''),16);
    const r=clamp(((n>>16)&0xff)+amt,0,255);
    const g=clamp(((n>>8)&0xff)+amt,0,255);
    const b=clamp((n&0xff)+amt,0,255);
    return `rgb(${r},${g},${b})`;
  }

  function drawCartoon(b: Body,jersey: string,hair: string,isUser: boolean,fc: number){
    const{x,y}=b.pos,spd=vlen(b.vel),moving=spd>0.4,anim=moving?Math.sin(fc*(0.2+spd*0.04)):0;
    ctx.save(); ctx.globalAlpha=0.26; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(x+3,y+22,14,5,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    // Shorts
    ctx.fillStyle='#1a2a5a';
    ctx.beginPath(); ctx.roundRect(x-9,y+6,18,9,3); ctx.fill();
    // Legs
    const la=anim*6,ra=-anim*6;
    ctx.fillStyle='#e8e8e8';
    ctx.beginPath(); ctx.roundRect(x-8+la-3.5,y+14,7,10,2); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.ellipse(x-8+la*1.1,y+25,7,3.5,anim*0.22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e8e8e8';
    ctx.beginPath(); ctx.roundRect(x+1+ra-3.5,y+14,7,10,2); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.ellipse(x+1+ra*1.1,y+25,7,3.5,-anim*0.22,0,Math.PI*2); ctx.fill();
    // Body
    const jg=ctx.createLinearGradient(x-13,y,x+13,y+18);
    jg.addColorStop(0,lighten(jersey,40)); jg.addColorStop(1,jersey);
    ctx.fillStyle=jg; ctx.beginPath(); ctx.roundRect(x-11,y,22,17,[7,7,3,3]); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.roundRect(x-3,y+2,6,13,2); ctx.fill();
    // Arms
    const arm=moving?anim*0.35:0;
    ctx.fillStyle=jersey;
    ctx.save();ctx.translate(x-11,y+5);ctx.rotate(-0.25+arm);ctx.beginPath();ctx.roundRect(-3.5,0,7,12,3.5);ctx.fill();ctx.restore();
    ctx.save();ctx.translate(x+11,y+5);ctx.rotate(0.25-arm);ctx.beginPath();ctx.roundRect(-3.5,0,7,12,3.5);ctx.fill();ctx.restore();
    // Neck + Head
    ctx.fillStyle='#e8b887';
    ctx.beginPath(); ctx.roundRect(x-3.5,y-4,7,6,2); ctx.fill();
    ctx.beginPath(); ctx.arc(x,y-12,13,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=1; ctx.stroke();
    // Hair
    ctx.fillStyle=hair;
    ctx.beginPath(); ctx.arc(x,y-16,13,Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.arc(x,y-23,8,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(x-4.5,y-12,3.5,2.8,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+4.5,y-12,3.5,2.8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a2e';
    ctx.beginPath(); ctx.arc(x-4,y-12,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-12,2,0,Math.PI*2); ctx.fill();
    // Arrow for player
    if(isUser){
      ctx.fillStyle='#22c55e'; ctx.shadowColor='#22c55e'; ctx.shadowBlur=8;
      const ay=y-32;
      ctx.beginPath();ctx.moveTo(x,ay-8);ctx.lineTo(x-7,ay+1);ctx.lineTo(x+7,ay+1);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;
    }
  }

  // ── Controls overlay ─────────────────────────────────────────
  function drawControls(){
    ctx.save(); ctx.globalAlpha=0.16; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.roundRect(0,H*0.68,W,H*0.32,0); ctx.fill(); ctx.restore();
    // Joystick
    const j=S.joy;
    ctx.save(); ctx.globalAlpha=0.32; ctx.strokeStyle='#fff'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(j.base.x,j.base.y,j.OR,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=0.12;
    ctx.beginPath();ctx.moveTo(j.base.x-j.OR,j.base.y);ctx.lineTo(j.base.x+j.OR,j.base.y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(j.base.x,j.base.y-j.OR);ctx.lineTo(j.base.x,j.base.y+j.OR);ctx.stroke();
    ctx.restore();
    const ng=ctx.createRadialGradient(j.stick.x-5,j.stick.y-5,2,j.stick.x,j.stick.y,j.NR);
    ng.addColorStop(0,'rgba(150,180,255,0.88)'); ng.addColorStop(1,'rgba(59,130,246,0.65)');
    ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(j.stick.x,j.stick.y,j.NR,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font=`bold ${Math.floor(j.NR*0.55)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✦',j.stick.x,j.stick.y);
    // Buttons
    drawBtn(S.shootBtn); drawBtn(S.sprintBtn);
    ctx.font='bold 10px Inter,sans-serif'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillText(cfg.sprintLabel,S.sprintBtn.cx,S.sprintBtn.cy+S.sprintBtn.r+14);
    ctx.fillText(cfg.shootLabel, S.shootBtn.cx, S.shootBtn.cy +S.shootBtn.r+14);
  }

  function drawBtn(btn: ActionBtn){
    ctx.save();
    const gAlpha=btn.held?0.85:0.35;
    ctx.globalAlpha=gAlpha*0.38; ctx.fillStyle=btn.glow;
    ctx.beginPath(); ctx.arc(btn.cx,btn.cy,btn.r*1.35,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    const bg=ctx.createRadialGradient(btn.cx-btn.r*0.3,btn.cy-btn.r*0.3,btn.r*0.1,btn.cx,btn.cy,btn.r);
    bg.addColorStop(0,btn.held?btn.color:lighten(btn.color,50)); bg.addColorStop(1,btn.held?'#000':btn.color);
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(btn.cx,btn.cy,btn.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=btn.held?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.7)'; ctx.lineWidth=btn.held?1.5:2.5; ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(btn.r*0.38)}px Inter,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=4;
    ctx.fillText(btn.label,btn.cx,btn.cy); ctx.shadowBlur=0; ctx.restore();
  }

  // Loop
  let rafId=0;
  function loop(ts: number){ update(ts); render(); rafId=requestAnimationFrame(loop); }
  setTimeout(()=>{ resize(); resetBodies(S); prevTs=performance.now(); rafId=requestAnimationFrame(loop); },60);

  function cleanup(){
    cancelAnimationFrame(rafId); ro.disconnect();
    document.removeEventListener('keydown',kd); document.removeEventListener('keyup',ku);
  }
  return cleanup;
}
