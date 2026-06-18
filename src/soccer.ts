// Full-canvas soccer game: cartoon sprites, analog joystick, SHOOT/SPRINT controls

type V2 = { x: number; y: number };
const v2 = (x: number, y: number): V2 => ({ x, y });
const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });
const len = (a: V2) => Math.sqrt(a.x * a.x + a.y * a.y);
const norm = (a: V2): V2 => { const l = len(a); return l > 0.001 ? mul(a, 1 / l) : v2(0, 0); };
const vdist = (a: V2, b: V2) => len(sub(a, b));
const vdot = (a: V2, b: V2) => a.x * b.x + a.y * b.y;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Body { pos: V2; vel: V2; r: number }

// ── Tuning ──────────────────────────────────────────────────
const P_SPEED   = 3.6;
const SP_SPEED  = 5.2;   // sprint speed
const AI_SPEED  = 2.4;
const KICK_POW  = 11;
const BALL_FRIC = 0.925;
const BODY_FRIC = 0.7;
const GOAL_FRAC = 0.34;
const GH        = 28;    // goal depth (px into field from edge)
const FIELD_M   = 12;    // field margin
const GAME_SECS = 120;

// ── Joystick state ───────────────────────────────────────────
interface Joystick {
  active: boolean; pid: number;
  base: V2; stick: V2;
  dx: number; dy: number;
  OR: number; NR: number;  // outer / nub radius
}

// ── Button state ─────────────────────────────────────────────
interface Btn {
  cx: number; cy: number; r: number;
  label: string; color: string; glow: string;
  held: boolean; pid: number;
}

interface SocState {
  player: Body; cpuA: Body; cpuB: Body; ball: Body;
  pScore: number; aiScore: number;
  timeLeft: number;
  phase: 'play' | 'goal' | 'end';
  goalTimer: number;
  lastDir: V2; facing: number;   // facing angle (radians)
  cpuAcd: number; cpuBcd: number;
  pKickCD: number;
  joy: Joystick;
  shootBtn: Btn; sprintBtn: Btn;
  fc: number;   // frame counter for animation
}

export function renderSoccerGame(container: HTMLElement, onBack: () => void): () => void {
  // ── DOM ─────────────────────────────────────────────────────
  container.innerHTML = `
    <div id="sc-root" style="display:flex;flex-direction:column;height:100%;background:#0c180c;font-family:Inter,system-ui,sans-serif;">
      <div id="sc-hdr" style="display:flex;align-items:center;justify-content:space-between;padding:0.42rem 0.85rem;background:rgba(0,0,0,0.6);flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <button id="sc-exit" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);color:#94a3b8;border-radius:20px;padding:0.28rem 0.72rem;font-size:0.76rem;cursor:pointer;font-family:inherit;">← Back</button>
        <div style="text-align:center;">
          <div id="sc-score" style="font-size:1.55rem;font-weight:900;color:#fff;letter-spacing:0.06em;line-height:1.1;">0 – 0</div>
          <div style="font-size:0.58rem;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">you vs cpu</div>
        </div>
        <div id="sc-timer" style="font-size:0.95rem;font-weight:700;color:#22c55e;font-variant-numeric:tabular-nums;min-width:40px;text-align:right;">2:00</div>
      </div>
      <div id="sc-fw" style="flex:1;position:relative;overflow:hidden;min-height:0;">
        <canvas id="sc-cv" style="display:block;touch-action:none;"></canvas>
        <div id="sc-ov" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.55);flex-direction:column;align-items:center;justify-content:center;gap:0.65rem;">
          <div id="sc-ov-msg" style="font-size:2.5rem;font-weight:900;color:#fff;text-align:center;"></div>
          <div id="sc-ov-sub" style="font-size:0.9rem;color:rgba(255,255,255,0.6);text-align:center;"></div>
          <div id="sc-ov-btns" style="display:flex;gap:0.7rem;margin-top:0.4rem;"></div>
        </div>
      </div>
    </div>
    <style>
      #sc-ov.show { display:flex !important; }
      @keyframes sc-pop { from{transform:scale(0.4);opacity:0} to{transform:scale(1);opacity:1} }
    </style>
  `;

  const canvas   = document.getElementById('sc-cv') as HTMLCanvasElement;
  const fw       = document.getElementById('sc-fw') as HTMLElement;
  const ctx      = canvas.getContext('2d')!;
  const scoreEl  = document.getElementById('sc-score')!;
  const timerEl  = document.getElementById('sc-timer')!;
  const ov       = document.getElementById('sc-ov')!;
  const ovMsg    = document.getElementById('sc-ov-msg')!;
  const ovSub    = document.getElementById('sc-ov-sub')!;
  const ovBtns   = document.getElementById('sc-ov-btns')!;

  let W = 0, H = 0;

  // ── Goal bounds ──────────────────────────────────────────────
  function goalBounds() {
    const gw = W * GOAL_FRAC;
    const gl = (W - gw) / 2;
    return { gl, gr: gl + gw };
  }

  // ── Joystick factory ─────────────────────────────────────────
  function mkJoy(): Joystick {
    return {
      active: false, pid: -1,
      base: v2(0, 0), stick: v2(0, 0),
      dx: 0, dy: 0,
      OR: 52, NR: 24,
    };
  }

  function mkBtn(label: string, color: string, glow: string): Btn {
    return { cx: 0, cy: 0, r: 0, label, color, glow, held: false, pid: -1 };
  }

  // ── State factory ────────────────────────────────────────────
  function mkState(): SocState {
    const joy = mkJoy();
    const shootBtn  = mkBtn('SHOOT',  '#dc2626', 'rgba(220,38,38,0.55)');
    const sprintBtn = mkBtn('SPRINT', '#16a34a', 'rgba(22,163,74,0.55)');
    return {
      player: { pos: v2(0, 0), vel: v2(0, 0), r: 16 },
      cpuA:   { pos: v2(0, 0), vel: v2(0, 0), r: 16 },
      cpuB:   { pos: v2(0, 0), vel: v2(0, 0), r: 16 },
      ball:   { pos: v2(0, 0), vel: v2(0, 0), r: 9 },
      pScore: 0, aiScore: 0,
      timeLeft: GAME_SECS,
      phase: 'play', goalTimer: 0,
      lastDir: v2(0, -1), facing: -Math.PI / 2,
      cpuAcd: 45, cpuBcd: 30,
      pKickCD: 0,
      joy, shootBtn, sprintBtn,
      fc: 0,
    };
  }

  function resetBodies(s: SocState) {
    s.player.pos = v2(W / 2, H * 0.66);
    s.cpuA.pos   = v2(W * 0.4, H * 0.3);
    s.cpuB.pos   = v2(W * 0.6, H * 0.22);
    s.ball.pos   = v2(W / 2, H / 2);
    [s.player, s.cpuA, s.cpuB, s.ball].forEach(b => { b.vel = v2(0, 0); });
    s.cpuAcd = 45; s.cpuBcd = 30;
    // Control positions
    layoutControls(s);
  }

  function layoutControls(s: SocState) {
    const CTRLH = H * 0.3;
    const ctrlY = H - CTRLH;
    s.joy.base   = v2(W * 0.15, ctrlY + CTRLH * 0.5);
    s.joy.stick  = { ...s.joy.base };
    s.joy.OR     = Math.min(52, W * 0.13);
    s.joy.NR     = s.joy.OR * 0.44;

    s.shootBtn.cx  = W * 0.87; s.shootBtn.cy  = ctrlY + CTRLH * 0.38; s.shootBtn.r = Math.min(44, W * 0.12);
    s.sprintBtn.cx = W * 0.65; s.sprintBtn.cy = ctrlY + CTRLH * 0.6;  s.sprintBtn.r = Math.min(36, W * 0.095);
  }

  let S = mkState();

  // ── Resize ──────────────────────────────────────────────────
  function resize() {
    const r = fw.getBoundingClientRect();
    W = Math.floor(r.width);
    H = Math.floor(r.height);
    canvas.width  = W;
    canvas.height = H;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(fw);

  // ── Input: keyboard ─────────────────────────────────────────
  const keys = { u: false, d: false, l: false, r: false, space: false };
  const kd = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp'    || e.key === 'w') { keys.u = true; e.preventDefault(); }
    if (e.key === 'ArrowDown'  || e.key === 's') { keys.d = true; e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'a') { keys.l = true; e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd') { keys.r = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter') { keys.space = true; e.preventDefault(); }
  };
  const ku = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp'    || e.key === 'w') keys.u = false;
    if (e.key === 'ArrowDown'  || e.key === 's') keys.d = false;
    if (e.key === 'ArrowLeft'  || e.key === 'a') keys.l = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.r = false;
    if (e.key === ' ' || e.key === 'Enter') keys.space = false;
  };
  document.addEventListener('keydown', kd);
  document.addEventListener('keyup', ku);

  // ── Input: canvas touch/pointer ──────────────────────────────
  function canvasXY(e: PointerEvent): V2 {
    const r = canvas.getBoundingClientRect();
    return v2(
      (e.clientX - r.left) * (W / r.width),
      (e.clientY - r.top)  * (H / r.height),
    );
  }

  function hitBtn(btn: Btn, p: V2) { return vdist(p, v2(btn.cx, btn.cy)) < btn.r * 1.2; }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = canvasXY(e);
    const joy = S.joy;

    // Left half = joystick zone
    if (p.x < W * 0.42 && p.y > H * 0.55) {
      joy.active = true; joy.pid = e.pointerId;
      joy.base  = p;   // dynamic base spawns where finger lands
      joy.stick = p;
      joy.dx = 0; joy.dy = 0;
      return;
    }
    if (hitBtn(S.shootBtn, p))  { S.shootBtn.held  = true; S.shootBtn.pid  = e.pointerId; return; }
    if (hitBtn(S.sprintBtn, p)) { S.sprintBtn.held  = true; S.sprintBtn.pid = e.pointerId; }
  });

  canvas.addEventListener('pointermove', e => {
    const p = canvasXY(e);
    const joy = S.joy;
    if (joy.active && e.pointerId === joy.pid) {
      const d = sub(p, joy.base);
      const dl = len(d);
      const clamped = dl > joy.OR ? mul(norm(d), joy.OR) : d;
      joy.stick = add(joy.base, clamped);
      joy.dx = clamped.x / joy.OR;
      joy.dy = clamped.y / joy.OR;
    }
  });

  function pointerUp(e: PointerEvent) {
    if (S.joy.active && e.pointerId === S.joy.pid) {
      S.joy.active = false; S.joy.dx = 0; S.joy.dy = 0;
    }
    if (e.pointerId === S.shootBtn.pid)  S.shootBtn.held  = false;
    if (e.pointerId === S.sprintBtn.pid) S.sprintBtn.held = false;
  }
  canvas.addEventListener('pointerup',     pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);

  // ── Exit ────────────────────────────────────────────────────
  document.getElementById('sc-exit')!.addEventListener('click', () => { cleanup(); onBack(); });

  // ── Physics helpers ──────────────────────────────────────────
  function stepBody(b: Body) { b.pos = add(b.pos, b.vel); }
  function dampBody(b: Body, f: number) { b.vel = mul(b.vel, f); }
  function capSpeed(b: Body, max: number) {
    const s = len(b.vel); if (s > max) b.vel = mul(b.vel, max / s);
  }
  function wallBounce(b: Body, x0: number, x1: number, y0: number, y1: number) {
    if (b.pos.x - b.r < x0) { b.pos.x = x0 + b.r; b.vel.x =  Math.abs(b.vel.x) * 0.5; }
    if (b.pos.x + b.r > x1) { b.pos.x = x1 - b.r; b.vel.x = -Math.abs(b.vel.x) * 0.5; }
    if (b.pos.y - b.r < y0) { b.pos.y = y0 + b.r; b.vel.y =  Math.abs(b.vel.y) * 0.5; }
    if (b.pos.y + b.r > y1) { b.pos.y = y1 - b.r; b.vel.y = -Math.abs(b.vel.y) * 0.5; }
  }
  function separate(a: Body, b: Body) {
    const d = vdist(a.pos, b.pos), md = a.r + b.r;
    if (d >= md || d < 0.001) return;
    const dir = norm(sub(b.pos, a.pos));
    const push = (md - d) * 0.55;
    a.pos = sub(a.pos, mul(dir, push * 0.5));
    b.pos = add(b.pos, mul(dir, push * 0.5));
    const rv = vdot(sub(a.vel, b.vel), dir);
    if (rv > 0) { a.vel = sub(a.vel, mul(dir, rv * 0.35)); b.vel = add(b.vel, mul(dir, rv * 0.65)); }
  }
  function dribble(body: Body, ball: Body) {
    const d = vdist(body.pos, ball.pos), touch = body.r + ball.r + 1;
    if (d > touch + 6 || d < 0.001) return;
    const dir = norm(sub(ball.pos, body.pos));
    ball.pos = add(body.pos, mul(dir, touch + 1));
    ball.vel = add(ball.vel, add(mul(body.vel, 0.8), mul(dir, 2.0)));
  }

  // ── Goal / end ───────────────────────────────────────────────
  function triggerGoal(forPlayer: boolean) {
    if (forPlayer) { S.pScore++; ovMsg.textContent = '⚽  GOAL!';      ovMsg.style.color = '#22c55e'; ovSub.textContent = 'Great shot!'; }
    else           { S.aiScore++; ovMsg.textContent = '🔴  CONCEDED'; ovMsg.style.color = '#ef4444'; ovSub.textContent = 'CPU scored…'; }
    ovBtns.innerHTML = '';
    ovMsg.style.animation = 'none'; void (ovMsg as HTMLElement).offsetWidth;
    ovMsg.style.animation = 'sc-pop 0.35s ease';
    S.phase = 'goal'; S.goalTimer = 100;
    ov.classList.add('show'); updateHUD();
  }

  function showEnd() {
    const won = S.pScore > S.aiScore, draw = S.pScore === S.aiScore;
    ovMsg.textContent = won ? '🏆  YOU WIN!' : draw ? '🤝  DRAW' : '💪  KEEP TRYING';
    ovMsg.style.color = won ? '#f59e0b' : draw ? '#94a3b8' : '#ef4444';
    ovSub.textContent = `Final: ${S.pScore} – ${S.aiScore}`;
    ovMsg.style.animation = 'none'; void (ovMsg as HTMLElement).offsetWidth;
    ovMsg.style.animation = 'sc-pop 0.4s ease';
    ovBtns.innerHTML = `
      <button id="sc-retry" style="padding:0.55rem 1.3rem;border-radius:20px;background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.22);color:#fff;font-size:0.88rem;cursor:pointer;font-family:inherit;">▶ Replay</button>
      <button id="sc-bk2"   style="padding:0.55rem 1.3rem;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#64748b;font-size:0.88rem;cursor:pointer;font-family:inherit;">← Exit</button>
    `;
    ov.classList.add('show');
    document.getElementById('sc-retry')?.addEventListener('click', () => {
      S = mkState(); resetBodies(S); prevTs = performance.now(); ov.classList.remove('show');
    });
    document.getElementById('sc-bk2')?.addEventListener('click', () => { cleanup(); onBack(); });
  }

  // ── HUD ─────────────────────────────────────────────────────
  function updateHUD() {
    scoreEl.textContent = `${S.pScore} – ${S.aiScore}`;
    const t = Math.max(0, Math.ceil(S.timeLeft));
    timerEl.textContent = `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
    timerEl.style.color = S.timeLeft < 30 ? '#ef4444' : '#22c55e';
  }

  // ── Update ──────────────────────────────────────────────────
  let prevTs = 0;

  function update(ts: number) {
    const dt = Math.min((ts - prevTs) / 1000, 0.05); prevTs = ts;
    S.fc++;

    if (S.phase === 'goal') {
      if (--S.goalTimer <= 0) { S.phase = 'play'; ov.classList.remove('show'); resetBodies(S); } return;
    }
    if (S.phase === 'end') return;

    S.timeLeft -= dt;
    if (S.timeLeft <= 0) { S.timeLeft = 0; S.phase = 'end'; updateHUD(); showEnd(); return; }

    // ── Player input ──
    const joy = S.joy;
    let jdx = joy.dx, jdy = joy.dy;
    // Keyboard fallback
    if (keys.l) jdx -= 1; if (keys.r) jdx += 1;
    if (keys.u) jdy -= 1; if (keys.d) jdy += 1;
    const klen = Math.sqrt(jdx * jdx + jdy * jdy);
    if (klen > 1) { jdx /= klen; jdy /= klen; }

    const sprinting = S.sprintBtn.held || keys.space;
    const topSpeed  = sprinting ? SP_SPEED : P_SPEED;
    const nd = norm(v2(jdx, jdy));
    if (nd.x !== 0 || nd.y !== 0) { S.lastDir = nd; S.facing = Math.atan2(nd.y, nd.x); }
    S.player.vel = add(mul(S.player.vel, 0.72), mul(nd, topSpeed));
    capSpeed(S.player, topSpeed);
    stepBody(S.player);
    dampBody(S.player, BODY_FRIC);
    wallBounce(S.player, FIELD_M + 16, W - FIELD_M - 16, FIELD_M + 16, H - FIELD_M - 16);

    // SHOOT: kick toward CPU goal (top)
    if (S.shootBtn.held && S.pKickCD <= 0) {
      const bd = vdist(S.player.pos, S.ball.pos);
      if (bd < S.player.r + S.ball.r + 30) {
        const { gl, gr } = goalBounds();
        const gcx = clamp(S.ball.pos.x, gl + 10, gr - 10);
        const shootDir = norm(sub(v2(gcx, 0), S.ball.pos));
        S.ball.vel = mul(shootDir, KICK_POW * 1.1);
        S.pKickCD = 20;
      }
    }
    if (S.pKickCD > 0) S.pKickCD--;

    // ── CPU A (main attacker) ──
    updateCPU(S.cpuA, S.cpuAcd, true);
    S.cpuAcd = Math.max(0, S.cpuAcd - 1);

    // ── CPU B (support) ──
    updateCPU(S.cpuB, S.cpuBcd, false);
    S.cpuBcd = Math.max(0, S.cpuBcd - 1);

    // ── Ball ──
    dribble(S.player, S.ball);
    dribble(S.cpuA,   S.ball);
    dribble(S.cpuB,   S.ball);
    separate(S.player, S.cpuA);
    separate(S.player, S.cpuB);
    separate(S.cpuA,   S.cpuB);
    stepBody(S.ball);
    dampBody(S.ball, BALL_FRIC);

    // Ball walls + goal
    const { gl, gr } = goalBounds();
    if (S.ball.pos.x - 9 < FIELD_M)     { S.ball.pos.x = FIELD_M + 9;        S.ball.vel.x =  Math.abs(S.ball.vel.x) * 0.65; }
    if (S.ball.pos.x + 9 > W - FIELD_M) { S.ball.pos.x = W - FIELD_M - 9;    S.ball.vel.x = -Math.abs(S.ball.vel.x) * 0.65; }
    const bx = S.ball.pos.x, inG = bx > gl && bx < gr;
    if (S.ball.pos.y - 9 < FIELD_M) {
      if (inG) { triggerGoal(true); return; }
      S.ball.pos.y = FIELD_M + 9; S.ball.vel.y = Math.abs(S.ball.vel.y) * 0.65;
    }
    if (S.ball.pos.y + 9 > H - FIELD_M) {
      if (inG) { triggerGoal(false); return; }
      S.ball.pos.y = H - FIELD_M - 9; S.ball.vel.y = -Math.abs(S.ball.vel.y) * 0.65;
    }

    updateHUD();
  }

  function updateCPU(cpu: Body, _cd: number, isAttacker: boolean) {
    const toB = sub(S.ball.pos, cpu.pos);
    const toBL = len(toB);
    const target = isAttacker ? S.ball.pos : add(S.ball.pos, v2(0, H * 0.1));
    const moveDir = norm(sub(target, cpu.pos));
    cpu.vel = add(mul(cpu.vel, 0.6), mul(moveDir, AI_SPEED));
    capSpeed(cpu, AI_SPEED);

    // Kick toward player goal when close
    const cdRef = isAttacker ? S.cpuAcd : S.cpuBcd;
    if (toBL < cpu.r + 9 + 8 && cdRef <= 0) {
      const { gl, gr } = goalBounds();
      const gcx = (gl + gr) / 2;
      const kd = norm(sub(v2(gcx + (Math.random() - 0.5) * 40, H - FIELD_M), S.ball.pos));
      S.ball.vel = mul(kd, KICK_POW * 0.85);
      if (isAttacker) S.cpuAcd = 55 + Math.floor(Math.random() * 20);
      else            S.cpuBcd = 70 + Math.floor(Math.random() * 30);
    }

    stepBody(cpu);
    dampBody(cpu, BODY_FRIC);
    wallBounce(cpu, FIELD_M + 16, W - FIELD_M - 16, FIELD_M + 16, H - FIELD_M - 16);
  }

  // ── Rendering ────────────────────────────────────────────────
  function render() {
    if (!ctx || W <= 0 || H <= 0) return;
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawSoccerBall(S.ball);
    drawCartoon(S.cpuA,   '#cc2222', '#1a1a1a', false, S.fc, true);
    drawCartoon(S.cpuB,   '#cc2222', '#8b4513', false, S.fc, false);
    drawCartoon(S.player, '#1d4ed8', '#f59e0b', true,  S.fc, false);
    drawControls();
  }

  // ── Field ───────────────────────────────────────────────────
  function drawField() {
    const STRIPE = 7;
    for (let i = 0; i < STRIPE; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2a7535' : '#31883f';
      ctx.fillRect(0, (i / STRIPE) * H, W, H / STRIPE);
    }
    const { gl, gr } = goalBounds();
    const gw = gr - gl;
    // Goal net tint
    ctx.fillStyle = 'rgba(255,200,0,0.08)';
    ctx.fillRect(gl, 0, gw, GH + FIELD_M);
    ctx.fillRect(gl, H - GH - FIELD_M, gw, GH + FIELD_M);

    // White lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 2;
    // Boundary with goal gaps
    ctx.beginPath();
    ctx.moveTo(FIELD_M, FIELD_M); ctx.lineTo(gl, FIELD_M);
    ctx.moveTo(gr, FIELD_M); ctx.lineTo(W - FIELD_M, FIELD_M);
    ctx.moveTo(FIELD_M, H - FIELD_M); ctx.lineTo(gl, H - FIELD_M);
    ctx.moveTo(gr, H - FIELD_M); ctx.lineTo(W - FIELD_M, H - FIELD_M);
    ctx.moveTo(FIELD_M, FIELD_M); ctx.lineTo(FIELD_M, H - FIELD_M);
    ctx.moveTo(W - FIELD_M, FIELD_M); ctx.lineTo(W - FIELD_M, H - FIELD_M);
    ctx.stroke();
    // Center line + circle
    ctx.beginPath(); ctx.moveTo(FIELD_M, H / 2); ctx.lineTo(W - FIELD_M, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.1, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fill();
    // Penalty areas
    const pw = W * 0.6, ph = H * 0.15, px = (W - pw) / 2;
    ctx.strokeRect(px, FIELD_M, pw, ph);
    ctx.strokeRect(px, H - FIELD_M - ph, pw, ph);
    ctx.restore();

    // Goal posts
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
    // Top goal (CPU)
    ctx.beginPath(); ctx.moveTo(gl, FIELD_M); ctx.lineTo(gl, 0); ctx.lineTo(gr, 0); ctx.lineTo(gr, FIELD_M); ctx.stroke();
    // Bottom goal (Player)
    ctx.beginPath(); ctx.moveTo(gl, H - FIELD_M); ctx.lineTo(gl, H); ctx.lineTo(gr, H); ctx.lineTo(gr, H - FIELD_M); ctx.stroke();
    // Net
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let x = gl + 12; x < gr; x += 12) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, H - GH); ctx.stroke();
    }
    for (let y = 5; y < GH; y += 8) {
      ctx.beginPath(); ctx.moveTo(gl, y); ctx.lineTo(gr, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gl, H - y); ctx.lineTo(gr, H - y); ctx.stroke();
    }
    ctx.restore();
    // Goal labels
    ctx.font = 'bold 9px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,200,0.45)';
    ctx.fillText('CPU GOAL',  W / 2, GH / 2 + 2);
    ctx.fillText('YOUR GOAL', W / 2, H - GH / 2 - 2);
  }

  // ── Cartoon player ───────────────────────────────────────────
  function drawCartoon(b: Body, jersey: string, hair: string, isUser: boolean, fc: number, isCPU: boolean) {
    const { x, y } = b.pos;
    const spd = len(b.vel);
    const moving = spd > 0.4;
    const anim = moving ? Math.sin(fc * (0.2 + spd * 0.04)) : 0;
    void isCPU;

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x + 3, y + 22, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Shorts
    ctx.fillStyle = '#1a2a5a';
    ctx.beginPath(); ctx.roundRect(x - 9, y + 6, 18, 9, 3); ctx.fill();

    // Left lower-leg + shoe
    const la = anim * 6, ra = -anim * 6;
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath(); ctx.roundRect(x - 8 + la - 3.5, y + 14, 7, 10, 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(x - 8 + la * 1.1, y + 25, 7, 3.5, anim * 0.22, 0, Math.PI * 2); ctx.fill();

    // Right lower-leg + shoe
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath(); ctx.roundRect(x + 1 + ra - 3.5, y + 14, 7, 10, 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(x + 1 + ra * 1.1, y + 25, 7, 3.5, -anim * 0.22, 0, Math.PI * 2); ctx.fill();

    // Body (jersey)
    const jg = ctx.createLinearGradient(x - 13, y, x + 13, y + 18);
    jg.addColorStop(0, lighten(jersey, 40)); jg.addColorStop(1, jersey);
    ctx.fillStyle = jg;
    ctx.beginPath(); ctx.roundRect(x - 11, y, 22, 17, [7, 7, 3, 3]); ctx.fill();
    // Jersey center stripe
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.roundRect(x - 3, y + 2, 6, 13, 2); ctx.fill();

    // Arms
    const arm = moving ? anim * 0.35 : 0;
    ctx.fillStyle = jersey;
    ctx.save(); ctx.translate(x - 11, y + 5); ctx.rotate(-0.25 + arm);
    ctx.beginPath(); ctx.roundRect(-3.5, 0, 7, 12, 3.5); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(x + 11, y + 5); ctx.rotate(0.25 - arm);
    ctx.beginPath(); ctx.roundRect(-3.5, 0, 7, 12, 3.5); ctx.fill(); ctx.restore();

    // Neck
    ctx.fillStyle = '#e8b887';
    ctx.beginPath(); ctx.roundRect(x - 3.5, y - 4, 7, 6, 2); ctx.fill();

    // Head
    ctx.fillStyle = '#e8b887';
    ctx.beginPath(); ctx.arc(x, y - 12, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke();

    // Hair (top half)
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(x, y - 16, 13, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 23, 8, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x - 4.5, y - 12, 3.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 4.5, y - 12, 3.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(x - 4, y - 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 12, 2, 0, Math.PI * 2); ctx.fill();

    // Green arrow indicator for player character
    if (isUser) {
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 8;
      const ay = y - 32;
      ctx.beginPath(); ctx.moveTo(x, ay - 8); ctx.lineTo(x - 7, ay + 1); ctx.lineTo(x + 7, ay + 1); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function lighten(hex: string, amt: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = clamp(((n >> 16) & 0xff) + amt, 0, 255);
    const g = clamp(((n >> 8)  & 0xff) + amt, 0, 255);
    const b = clamp((n & 0xff) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  // ── Soccer ball ──────────────────────────────────────────────
  function drawSoccerBall(ball: Body) {
    const { x, y } = ball.pos, r = ball.r;
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.55, r * 0.85, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52, r * 0.27, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, r * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
    // Ball direction indicator (faint line)
    const bspd = len(S.ball.vel);
    if (bspd > 2) {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
      const dn = norm(S.ball.vel);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dn.x * 22, y + dn.y * 22); ctx.stroke();
      ctx.restore();
    }
  }

  // ── Controls overlay ─────────────────────────────────────────
  function drawControls() {
    const joy = S.joy;

    // Semi-transparent control zone backdrop
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.roundRect(0, H * 0.68, W, H * 0.32, 0); ctx.fill();
    ctx.restore();

    // Joystick outer ring
    ctx.save(); ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.base.x, joy.base.y, joy.OR, 0, Math.PI * 2); ctx.stroke();
    // Crosshair lines inside ring
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.moveTo(joy.base.x - joy.OR, joy.base.y); ctx.lineTo(joy.base.x + joy.OR, joy.base.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(joy.base.x, joy.base.y - joy.OR); ctx.lineTo(joy.base.x, joy.base.y + joy.OR); ctx.stroke();
    ctx.restore();

    // Joystick nub
    ctx.save();
    const nubGrad = ctx.createRadialGradient(joy.stick.x - 5, joy.stick.y - 5, 2, joy.stick.x, joy.stick.y, joy.NR);
    nubGrad.addColorStop(0, 'rgba(150,180,255,0.85)');
    nubGrad.addColorStop(1, 'rgba(59,130,246,0.65)');
    ctx.fillStyle = nubGrad;
    ctx.beginPath(); ctx.arc(joy.stick.x, joy.stick.y, joy.NR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.stroke();
    // Arrow indicators on nub
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `bold ${joy.NR * 0.55}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦', joy.stick.x, joy.stick.y);
    ctx.restore();

    // Action buttons
    drawActionBtn(S.shootBtn);
    drawActionBtn(S.sprintBtn);

    // "SPRINT" label below sprint button
    ctx.font = 'bold 10px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SPRINT', S.sprintBtn.cx, S.sprintBtn.cy + S.sprintBtn.r + 14);
    ctx.fillText('SHOOT',  S.shootBtn.cx,  S.shootBtn.cy  + S.shootBtn.r + 14);
  }

  function drawActionBtn(btn: Btn) {
    ctx.save();
    const nearBall = btn === S.shootBtn && vdist(S.player.pos, S.ball.pos) < 30 + 16 + 9;
    const glowAlpha = btn.held ? 0.85 : nearBall ? 0.6 : 0.32;

    // Outer glow
    ctx.globalAlpha = glowAlpha * 0.4;
    ctx.fillStyle = btn.glow;
    ctx.beginPath(); ctx.arc(btn.cx, btn.cy, btn.r * 1.35, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    // Button gradient
    const pressed = btn.held;
    const bg = ctx.createRadialGradient(btn.cx - btn.r * 0.3, btn.cy - btn.r * 0.3, btn.r * 0.1, btn.cx, btn.cy, btn.r);
    bg.addColorStop(0, pressed ? btn.color : lighten(btn.color, 55));
    bg.addColorStop(1, pressed ? '#000' : btn.color);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(btn.cx, btn.cy, btn.r, 0, Math.PI * 2); ctx.fill();

    // Ring
    ctx.strokeStyle = pressed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = pressed ? 1.5 : 2.5;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(btn.r * 0.42)}px Inter,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
    ctx.fillText(btn.label, btn.cx, btn.cy);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Game loop ────────────────────────────────────────────────
  let rafId = 0;
  function loop(ts: number) { update(ts); render(); rafId = requestAnimationFrame(loop); }

  setTimeout(() => {
    resize();
    resetBodies(S);
    prevTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }, 60);

  function cleanup() {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    document.removeEventListener('keydown', kd);
    document.removeEventListener('keyup', ku);
  }

  return cleanup;
}
