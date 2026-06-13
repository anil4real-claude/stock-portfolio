// Canvas-based soccer mini-game with on-screen D-pad controls

type V2 = { x: number; y: number };
const v2 = (x: number, y: number): V2 => ({ x, y });
const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });
const len = (a: V2): number => Math.sqrt(a.x * a.x + a.y * a.y);
const norm = (a: V2): V2 => { const l = len(a); return l > 0.001 ? mul(a, 1 / l) : v2(0, 0); };
const vdist = (a: V2, b: V2): number => len(sub(a, b));
const vdot = (a: V2, b: V2): number => a.x * b.x + a.y * b.y;

interface Body { pos: V2; vel: V2; r: number }

const P_R = 18, AI_R = 18, B_R = 10;
const P_SPEED = 3.8, AI_SPEED = 2.6, KICK_POWER = 10;
const BALL_FRIC = 0.93, BODY_FRIC = 0.72;
const GOAL_FRAC = 0.32;
const MARGIN = 10;
const GOAL_H = 26;
const GAME_SECS = 120;

interface SocState {
  player: Body;
  ai: Body;
  ball: Body;
  pScore: number;
  aiScore: number;
  timeLeft: number;
  phase: 'play' | 'goal' | 'end';
  goalTimer: number;
  lastDir: V2;
  aiCooldown: number;
  pKickCooldown: number;
  keys: { u: boolean; d: boolean; l: boolean; r: boolean };
  kickNow: boolean;
}

export function renderSoccerGame(container: HTMLElement, onBack: () => void): () => void {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#0f1a0f;font-family:Inter,system-ui,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none;">
      <!-- HUD -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.45rem 0.9rem;background:rgba(0,0,0,0.55);flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <button id="sc-exit" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);color:#94a3b8;border-radius:20px;padding:0.28rem 0.7rem;font-size:0.76rem;cursor:pointer;font-family:inherit;">← Back</button>
        <div style="text-align:center;">
          <div id="sc-score" style="font-size:1.5rem;font-weight:900;color:#fff;letter-spacing:0.06em;line-height:1.1;">0 – 0</div>
          <div style="font-size:0.6rem;color:#374151;letter-spacing:0.12em;text-transform:uppercase;">you vs cpu</div>
        </div>
        <div id="sc-timer" style="font-size:0.95rem;font-weight:700;color:#22c55e;font-variant-numeric:tabular-nums;min-width:42px;text-align:right;">2:00</div>
      </div>
      <!-- Canvas -->
      <div id="sc-fw" style="flex:1;position:relative;overflow:hidden;min-height:0;">
        <canvas id="sc-cv" style="display:block;"></canvas>
        <div id="sc-ov" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.58);flex-direction:column;align-items:center;justify-content:center;gap:0.7rem;">
          <div id="sc-ov-msg" style="font-size:2.6rem;font-weight:900;color:#fff;text-align:center;"></div>
          <div id="sc-ov-sub" style="font-size:0.9rem;color:rgba(255,255,255,0.6);text-align:center;"></div>
          <div id="sc-ov-btns" style="display:flex;gap:0.7rem;margin-top:0.3rem;"></div>
        </div>
      </div>
      <!-- Controls -->
      <div style="flex-shrink:0;background:rgba(0,0,0,0.62);padding:0.45rem 1.1rem 0.65rem;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:3px;">
          <div></div>
          <button id="dp-u" class="dp-b">▲</button>
          <div></div>
          <button id="dp-l" class="dp-b">◀</button>
          <div style="background:rgba(255,255,255,0.03);border-radius:50%;"></div>
          <button id="dp-r" class="dp-b">▶</button>
          <div></div>
          <button id="dp-d" class="dp-b">▼</button>
          <div></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.28rem;">
          <button id="sc-kick" style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#166534,#15803d);border:3px solid #22c55e;color:#fff;font-size:0.88rem;font-weight:800;letter-spacing:0.05em;cursor:pointer;font-family:inherit;box-shadow:0 0 18px rgba(34,197,94,0.25);transition:box-shadow 0.1s;">KICK</button>
          <span id="sc-kh" style="font-size:0.62rem;color:#374151;">near ball</span>
        </div>
      </div>
    </div>
    <style>
      .dp-b { border-radius:8px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.18);color:#e2e8f0;font-size:1.05rem;cursor:pointer;transition:background 0.08s; }
      .dp-b.on, .dp-b:active { background:rgba(255,255,255,0.28) !important; }
      #sc-ov.show { display:flex !important; }
      @keyframes sc-pop { from { transform:scale(0.4);opacity:0 } to { transform:scale(1);opacity:1 } }
    </style>
  `;

  const canvas  = document.getElementById('sc-cv') as HTMLCanvasElement;
  const fw      = document.getElementById('sc-fw') as HTMLElement;
  const ctx     = canvas.getContext('2d')!;
  const scoreEl = document.getElementById('sc-score')!;
  const timerEl = document.getElementById('sc-timer')!;
  const ov      = document.getElementById('sc-ov')!;
  const ovMsg   = document.getElementById('sc-ov-msg')!;
  const ovSub   = document.getElementById('sc-ov-sub')!;
  const ovBtns  = document.getElementById('sc-ov-btns')!;
  const kickBtn = document.getElementById('sc-kick')!;
  const kickHint = document.getElementById('sc-kh')!;

  let W = 0, H = 0;

  function goalBounds() {
    const gw = W * GOAL_FRAC;
    const gl = (W - gw) / 2;
    return { gl, gr: gl + gw };
  }

  function resetBodies(s: SocState) {
    s.player.pos = v2(W / 2, H * 0.68);
    s.ai.pos     = v2(W / 2, H * 0.32);
    s.ball.pos   = v2(W / 2, H / 2);
    s.player.vel = v2(0, 0);
    s.ai.vel     = v2(0, 0);
    s.ball.vel   = v2(0, 0);
    s.aiCooldown = 45;
  }

  function mkState(): SocState {
    const s: SocState = {
      player: { pos: v2(0,0), vel: v2(0,0), r: P_R },
      ai:     { pos: v2(0,0), vel: v2(0,0), r: AI_R },
      ball:   { pos: v2(0,0), vel: v2(0,0), r: B_R },
      pScore: 0, aiScore: 0,
      timeLeft: GAME_SECS,
      phase: 'play', goalTimer: 0,
      lastDir: v2(0, -1),
      aiCooldown: 45, pKickCooldown: 0,
      keys: { u: false, d: false, l: false, r: false },
      kickNow: false,
    };
    return s;
  }

  let S = mkState();

  // ── resize ──────────────────────────────────────────────────
  function resize() {
    const r = fw.getBoundingClientRect();
    W = Math.floor(r.width);
    H = Math.floor(r.height);
    canvas.width  = W;
    canvas.height = H;
  }

  const ro = new ResizeObserver(resize);
  ro.observe(fw);

  // ── keyboard ────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp'    || e.key === 'w') { S.keys.u = true;  e.preventDefault(); }
    if (e.key === 'ArrowDown'  || e.key === 's') { S.keys.d = true;  e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'a') { S.keys.l = true;  e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd') { S.keys.r = true;  e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter')      { S.kickNow = true; e.preventDefault(); }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp'    || e.key === 'w') S.keys.u = false;
    if (e.key === 'ArrowDown'  || e.key === 's') S.keys.d = false;
    if (e.key === 'ArrowLeft'  || e.key === 'a') S.keys.l = false;
    if (e.key === 'ArrowRight' || e.key === 'd') S.keys.r = false;
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);

  // ── D-pad ────────────────────────────────────────────────────
  const DMAP: Record<string, keyof SocState['keys']> = {
    'dp-u': 'u', 'dp-d': 'd', 'dp-l': 'l', 'dp-r': 'r',
  };
  for (const [id, key] of Object.entries(DMAP)) {
    const btn = document.getElementById(id) as HTMLElement;
    if (!btn) continue;
    const setKey = (on: boolean) => { S.keys[key] = on; btn.classList.toggle('on', on); };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture((e as PointerEvent).pointerId);
      setKey(true);
    });
    btn.addEventListener('pointerup',     () => setKey(false));
    btn.addEventListener('pointercancel', () => setKey(false));
    btn.addEventListener('lostpointercapture', () => setKey(false));
  }

  // ── Kick button ──────────────────────────────────────────────
  kickBtn.addEventListener('pointerdown', e => { e.preventDefault(); S.kickNow = true; });

  // ── Exit ────────────────────────────────────────────────────
  document.getElementById('sc-exit')!.addEventListener('click', () => { cleanup(); onBack(); });

  // ── Physics helpers ─────────────────────────────────────────
  function stepBody(b: Body) { b.pos = add(b.pos, b.vel); }
  function dampBody(b: Body, f: number) { b.vel = mul(b.vel, f); }
  function capSpeed(b: Body, max: number) {
    const s = len(b.vel);
    if (s > max) b.vel = mul(b.vel, max / s);
  }

  function wallBounce(b: Body, x0: number, x1: number, y0: number, y1: number) {
    if (b.pos.x - b.r < x0) { b.pos.x = x0 + b.r; b.vel.x =  Math.abs(b.vel.x) * 0.55; }
    if (b.pos.x + b.r > x1) { b.pos.x = x1 - b.r; b.vel.x = -Math.abs(b.vel.x) * 0.55; }
    if (b.pos.y - b.r < y0) { b.pos.y = y0 + b.r; b.vel.y =  Math.abs(b.vel.y) * 0.55; }
    if (b.pos.y + b.r > y1) { b.pos.y = y1 - b.r; b.vel.y = -Math.abs(b.vel.y) * 0.55; }
  }

  function pushBodiesApart(a: Body, b: Body) {
    const d = vdist(a.pos, b.pos);
    const minD = a.r + b.r;
    if (d >= minD || d < 0.001) return;
    const dir = norm(sub(b.pos, a.pos));
    const push = (minD - d) * 0.55;
    a.pos = sub(a.pos, mul(dir, push));
    b.pos = add(b.pos, mul(dir, push));
    const rv = vdot(sub(a.vel, b.vel), dir);
    if (rv > 0) {
      a.vel = sub(a.vel, mul(dir, rv * 0.35));
      b.vel = add(b.vel, mul(dir, rv * 0.65));
    }
  }

  function dribbleBall(player: Body, ball: Body) {
    const d = vdist(player.pos, ball.pos);
    const touch = player.r + ball.r + 1;
    if (d > touch + 5 || d < 0.001) return;
    const dir = norm(sub(ball.pos, player.pos));
    ball.pos = add(player.pos, mul(dir, touch + 1));
    ball.vel = add(ball.vel, add(mul(player.vel, 0.7), mul(dir, 1.8)));
  }

  // ── Goal / end screens ──────────────────────────────────────
  function showGoal(forPlayer: boolean) {
    if (forPlayer) {
      S.pScore++;
      ovMsg.textContent = '⚽  GOAL!';
      ovMsg.style.color = '#22c55e';
      ovSub.textContent = 'You scored — nice!';
    } else {
      S.aiScore++;
      ovMsg.textContent = '🔴  CONCEDED';
      ovMsg.style.color = '#ef4444';
      ovSub.textContent = 'CPU scored…';
    }
    ovBtns.innerHTML = '';
    ovMsg.style.animation = 'none';
    // force reflow for animation restart
    void (ovMsg as HTMLElement).offsetWidth;
    ovMsg.style.animation = 'sc-pop 0.35s ease';
    S.phase = 'goal';
    S.goalTimer = 90;
    ov.classList.add('show');
    updateHUD();
  }

  function showEnd() {
    const won  = S.pScore > S.aiScore;
    const draw = S.pScore === S.aiScore;
    ovMsg.textContent = won ? '🏆  YOU WIN!' : draw ? '🤝  DRAW' : '💪  KEEP TRYING';
    ovMsg.style.color = won ? '#f59e0b' : draw ? '#94a3b8' : '#ef4444';
    ovSub.textContent = `Final: ${S.pScore} – ${S.aiScore}`;
    ovMsg.style.animation = 'none';
    void (ovMsg as HTMLElement).offsetWidth;
    ovMsg.style.animation = 'sc-pop 0.4s ease';
    ovBtns.innerHTML = `
      <button id="sc-retry" style="padding:0.55rem 1.3rem;border-radius:20px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);color:#fff;font-size:0.88rem;cursor:pointer;font-family:inherit;">▶ Replay</button>
      <button id="sc-back2" style="padding:0.55rem 1.3rem;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#64748b;font-size:0.88rem;cursor:pointer;font-family:inherit;">← Exit</button>
    `;
    ov.classList.add('show');
    document.getElementById('sc-retry')?.addEventListener('click', () => {
      S = mkState();
      resetBodies(S);
      prevTs = performance.now();
      ov.classList.remove('show');
    });
    document.getElementById('sc-back2')?.addEventListener('click', () => { cleanup(); onBack(); });
  }

  // ── HUD ─────────────────────────────────────────────────────
  function updateHUD() {
    scoreEl.textContent = `${S.pScore} – ${S.aiScore}`;
    const t = Math.max(0, Math.ceil(S.timeLeft));
    timerEl.textContent = `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
    timerEl.style.color = S.timeLeft < 30 ? '#ef4444' : '#22c55e';
    const near = vdist(S.player.pos, S.ball.pos) < P_R + B_R + 28;
    kickBtn.style.boxShadow = near
      ? '0 0 28px rgba(34,197,94,0.85), 0 0 56px rgba(34,197,94,0.3)'
      : '0 0 18px rgba(34,197,94,0.22)';
    kickHint.textContent  = near ? '🟢 READY' : 'near ball';
    kickHint.style.color  = near ? '#22c55e'  : '#374151';
  }

  // ── Update ──────────────────────────────────────────────────
  let prevTs = 0;

  function update(ts: number) {
    const dt = Math.min((ts - prevTs) / 1000, 0.05);
    prevTs = ts;

    if (S.phase === 'goal') {
      if (--S.goalTimer <= 0) {
        S.phase = 'play';
        ov.classList.remove('show');
        resetBodies(S);
      }
      return;
    }
    if (S.phase === 'end') return;

    // Timer
    S.timeLeft -= dt;
    if (S.timeLeft <= 0) {
      S.timeLeft = 0;
      S.phase = 'end';
      updateHUD();
      showEnd();
      return;
    }

    // ── Player movement ──
    const inputDir = v2(
      (S.keys.r ? 1 : 0) - (S.keys.l ? 1 : 0),
      (S.keys.d ? 1 : 0) - (S.keys.u ? 1 : 0),
    );
    const nd = norm(inputDir);
    if (nd.x !== 0 || nd.y !== 0) S.lastDir = nd;
    S.player.vel = add(mul(S.player.vel, 0.72), mul(nd, P_SPEED));
    capSpeed(S.player, P_SPEED);
    stepBody(S.player);
    dampBody(S.player, BODY_FRIC);
    wallBounce(S.player, MARGIN + P_R, W - MARGIN - P_R, MARGIN + P_R, H - MARGIN - P_R);

    // ── Kick ──
    if (S.kickNow && S.pKickCooldown <= 0) {
      if (vdist(S.player.pos, S.ball.pos) < P_R + B_R + 28) {
        S.ball.vel = mul(S.lastDir, KICK_POWER);
        S.pKickCooldown = 18;
        // Flash kick button
        kickBtn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
        setTimeout(() => { kickBtn.style.background = 'linear-gradient(135deg,#166534,#15803d)'; }, 180);
      }
    }
    S.kickNow = false;
    if (S.pKickCooldown > 0) S.pKickCooldown--;

    // ── AI ──
    const toB = sub(S.ball.pos, S.ai.pos);
    const toBLen = len(toB);
    const aiDir = norm(toB);
    S.ai.vel = add(mul(S.ai.vel, 0.65), mul(aiDir, AI_SPEED));
    capSpeed(S.ai, AI_SPEED);

    if (toBLen < AI_R + B_R + 8 && S.aiCooldown <= 0) {
      const { gl, gr } = goalBounds();
      const gcx = (gl + gr) / 2;
      const goalCenter = v2(gcx, H - MARGIN);
      const kdir = norm(sub(goalCenter, S.ball.pos));
      const spread = (Math.random() - 0.5) * 0.55;
      const cos = Math.cos(spread), sin = Math.sin(spread);
      S.ball.vel = mul(
        v2(kdir.x * cos - kdir.y * sin, kdir.x * sin + kdir.y * cos),
        KICK_POWER * 0.82,
      );
      S.aiCooldown = 50 + Math.floor(Math.random() * 22);
    }
    if (S.aiCooldown > 0) S.aiCooldown--;
    stepBody(S.ai);
    dampBody(S.ai, BODY_FRIC);
    wallBounce(S.ai, MARGIN + AI_R, W - MARGIN - AI_R, MARGIN + AI_R, H - MARGIN - AI_R);

    // ── Ball ──
    dribbleBall(S.player, S.ball);
    dribbleBall(S.ai, S.ball);
    pushBodiesApart(S.player, S.ai);
    stepBody(S.ball);
    dampBody(S.ball, BALL_FRIC);

    // Ball wall + goal detection
    const { gl, gr } = goalBounds();
    const bx = S.ball.pos.x, by = S.ball.pos.y;
    const inGoalX = bx > gl && bx < gr;

    // Left / right walls
    if (bx - B_R < MARGIN)     { S.ball.pos.x = MARGIN + B_R;        S.ball.vel.x =  Math.abs(S.ball.vel.x) * 0.65; }
    if (bx + B_R > W - MARGIN) { S.ball.pos.x = W - MARGIN - B_R;    S.ball.vel.x = -Math.abs(S.ball.vel.x) * 0.65; }

    // Top wall / CPU goal
    if (by - B_R < MARGIN) {
      if (inGoalX) {
        showGoal(true);
        return;
      }
      S.ball.pos.y = MARGIN + B_R;
      S.ball.vel.y = Math.abs(S.ball.vel.y) * 0.65;
    }
    // Bottom wall / player goal
    if (by + B_R > H - MARGIN) {
      if (inGoalX) {
        showGoal(false);
        return;
      }
      S.ball.pos.y = H - MARGIN - B_R;
      S.ball.vel.y = -Math.abs(S.ball.vel.y) * 0.65;
    }

    updateHUD();
  }

  // ── Render ──────────────────────────────────────────────────
  function render() {
    if (!ctx || W <= 0 || H <= 0) return;
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawBall();
    drawPlayer(S.ai, false);
    drawPlayer(S.player, true);
  }

  function drawField() {
    const { gl, gr } = goalBounds();
    const gw = gr - gl;
    const m = MARGIN;

    // Green base
    ctx.fillStyle = '#2d7a3a';
    ctx.fillRect(0, 0, W, H);

    // Alternating stripe shading
    for (let i = 0; i < 6; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.055)';
        ctx.fillRect(0, (i / 6) * H, W, H / 6);
      }
    }

    // Goal net fill (subtle amber tint)
    ctx.fillStyle = 'rgba(251,191,36,0.07)';
    ctx.fillRect(gl, 0, gw, GOAL_H + m);
    ctx.fillRect(gl, H - GOAL_H - m, gw, GOAL_H + m);

    // ── White field lines ──
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.62)';
    ctx.lineWidth = 2;

    // Top boundary with goal gap
    ctx.beginPath();
    ctx.moveTo(m, m); ctx.lineTo(gl, m);
    ctx.moveTo(gr, m); ctx.lineTo(W - m, m);
    // Bottom boundary with goal gap
    ctx.moveTo(m, H - m); ctx.lineTo(gl, H - m);
    ctx.moveTo(gr, H - m); ctx.lineTo(W - m, H - m);
    // Side walls (full)
    ctx.moveTo(m, m);     ctx.lineTo(m, H - m);
    ctx.moveTo(W - m, m); ctx.lineTo(W - m, H - m);
    ctx.stroke();

    // Center line
    ctx.beginPath(); ctx.moveTo(m, H / 2); ctx.lineTo(W - m, H / 2); ctx.stroke();

    // Center circle
    ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.1, 0, Math.PI * 2); ctx.stroke();

    // Center dot
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fill();

    // Penalty areas
    const pw = W * 0.58, ph = H * 0.15;
    const px = (W - pw) / 2;
    ctx.strokeRect(px, m, pw, ph);
    ctx.strokeRect(px, H - m - ph, pw, ph);
    ctx.restore();

    // ── Goal posts (amber) ──
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.strokeRect(gl, 0, gw, GOAL_H);
    ctx.strokeRect(gl, H - GOAL_H, gw, GOAL_H);

    // Net grid lines
    ctx.strokeStyle = 'rgba(251,191,36,0.22)';
    ctx.lineWidth = 1;
    const netStep = 12;
    for (let x = gl + netStep; x < gr; x += netStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GOAL_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, H - GOAL_H); ctx.stroke();
    }
    for (let y = 6; y < GOAL_H; y += 8) {
      ctx.beginPath(); ctx.moveTo(gl, y); ctx.lineTo(gr, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gl, H - y); ctx.lineTo(gr, H - y); ctx.stroke();
    }

    // Goal labels
    ctx.fillStyle = 'rgba(251,191,36,0.5)';
    ctx.font = 'bold 9px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CPU GOAL', W / 2, GOAL_H / 2 + 1);
    ctx.fillText('YOUR GOAL', W / 2, H - GOAL_H / 2 - 1);
    ctx.restore();
  }

  function drawBall() {
    const b = S.ball;
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(b.pos.x + 2, b.pos.y + b.r * 0.55, b.r * 0.82, b.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // White body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.r, 0, Math.PI * 2); ctx.fill();

    // Pentagon patches
    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(b.pos.x + Math.cos(a) * b.r * 0.52, b.pos.y + Math.sin(a) * b.r * 0.52, b.r * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.r * 0.26, 0, Math.PI * 2); ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(b.pos.x - b.r * 0.28, b.pos.y - b.r * 0.3, b.r * 0.22, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayer(b: Body, isPlayer: boolean) {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(b.pos.x + 2, b.pos.y + b.r * 0.55, b.r * 0.8, b.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Radial gradient body
    const g = ctx.createRadialGradient(
      b.pos.x - b.r * 0.25, b.pos.y - b.r * 0.25, b.r * 0.05,
      b.pos.x, b.pos.y, b.r,
    );
    if (isPlayer) { g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#1d4ed8'); }
    else          { g.addColorStop(0, '#fca5a5'); g.addColorStop(1, '#991b1b'); }

    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(b.r * 0.65)}px Inter,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPlayer ? 'YOU' : 'CPU', b.pos.x, b.pos.y);

    // Green triangle above player
    if (isPlayer) {
      ctx.fillStyle = '#22c55e';
      const ay = b.pos.y - b.r - 10;
      ctx.beginPath();
      ctx.moveTo(b.pos.x, ay - 7);
      ctx.lineTo(b.pos.x - 6, ay + 1);
      ctx.lineTo(b.pos.x + 6, ay + 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Game loop ────────────────────────────────────────────────
  let rafId = 0;

  function loop(ts: number) {
    update(ts);
    render();
    rafId = requestAnimationFrame(loop);
  }

  setTimeout(() => {
    resize();
    resetBodies(S);
    prevTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }, 60);

  // ── Cleanup ──────────────────────────────────────────────────
  function cleanup() {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup',   onKeyUp);
  }

  return cleanup;
}
