import { renderSportGame, SPORT_CONFIGS } from './sportGame';

// ==================== TYPES ====================

interface Opponent {
  name: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface SportLevel {
  id: number;
  sport: string;
  icon: string;
  color: string;
  action: string;
  prompt: string;
  opponents: Opponent[];
}

// ==================== LEVELS ====================

const LEVELS: SportLevel[] = [
  {
    id: 0, sport: 'Soccer', icon: '⚽', color: '#2d8a4e',
    action: 'Kick', prompt: 'Time your shot on goal!',
    opponents: [
      { name: 'Pelé', title: 'The King', difficulty: 1 },
      { name: 'Diego Maradona', title: 'El Pibe de Oro', difficulty: 2 },
      { name: 'Ronaldo R9', title: 'The Phenomenon', difficulty: 3 },
      { name: 'Zinedine Zidane', title: 'Zizou', difficulty: 4 },
      { name: 'Lionel Messi', title: 'La Pulga', difficulty: 5 },
    ],
  },
  {
    id: 1, sport: 'Tennis', icon: '🎾', color: '#8ab440',
    action: 'Serve', prompt: 'Time your serve!',
    opponents: [
      { name: 'Rod Laver', title: 'The Rocket', difficulty: 1 },
      { name: 'Bjorn Borg', title: 'The Iceman', difficulty: 2 },
      { name: 'John McEnroe', title: 'Mac', difficulty: 3 },
      { name: 'Pete Sampras', title: 'Pistol Pete', difficulty: 4 },
      { name: 'Roger Federer', title: 'The GOAT', difficulty: 5 },
    ],
  },
  {
    id: 2, sport: 'Hockey', icon: '🏒', color: '#0880d0',
    action: 'Shoot', prompt: 'Time your slap shot!',
    opponents: [
      { name: 'Gordie Howe', title: 'Mr. Hockey', difficulty: 1 },
      { name: 'Bobby Orr', title: 'Number 4', difficulty: 2 },
      { name: 'Mario Lemieux', title: 'Le Magnifique', difficulty: 3 },
      { name: 'Mark Messier', title: 'The Messiah', difficulty: 4 },
      { name: 'Wayne Gretzky', title: 'The Great One', difficulty: 5 },
    ],
  },
  {
    id: 3, sport: 'Baseball', icon: '⚾', color: '#c41e3a',
    action: 'Swing', prompt: 'Time your swing!',
    opponents: [
      { name: 'Babe Ruth', title: 'The Sultan of Swat', difficulty: 1 },
      { name: 'Willie Mays', title: 'The Say Hey Kid', difficulty: 2 },
      { name: 'Ted Williams', title: 'The Splendid Splinter', difficulty: 3 },
      { name: 'Hank Aaron', title: "Hammerin' Hank", difficulty: 4 },
      { name: 'Barry Bonds', title: 'The Record Holder', difficulty: 5 },
    ],
  },
  {
    id: 4, sport: 'Volleyball', icon: '🏐', color: '#e0a800',
    action: 'Spike', prompt: 'Time your spike!',
    opponents: [
      { name: 'Karch Kiraly', title: 'The Legend', difficulty: 1 },
      { name: 'Giba', title: 'The Brazilian King', difficulty: 2 },
      { name: 'Lang Ping', title: 'The Iron Hammer', difficulty: 3 },
      { name: 'Misty May-Treanor', title: 'Beach GOAT', difficulty: 4 },
      { name: 'Kerri Walsh Jennings', title: '3× Gold Medalist', difficulty: 5 },
    ],
  },
  {
    id: 5, sport: 'Golf', icon: '⛳', color: '#3a8a3a',
    action: 'Swing', prompt: 'Time your swing!',
    opponents: [
      { name: 'Arnold Palmer', title: 'The King', difficulty: 1 },
      { name: 'Jack Nicklaus', title: 'The Golden Bear', difficulty: 2 },
      { name: 'Gary Player', title: 'The Black Knight', difficulty: 3 },
      { name: 'Seve Ballesteros', title: 'El Maestro', difficulty: 4 },
      { name: 'Tiger Woods', title: 'The Tiger', difficulty: 5 },
    ],
  },
  {
    id: 6, sport: 'Dodgeball', icon: '🔴', color: '#d13030',
    action: 'Throw', prompt: 'Time your throw!',
    opponents: [
      { name: 'The Rookie', title: 'Just Getting Started', difficulty: 1 },
      { name: 'The Speedster', title: 'Quick & Dangerous', difficulty: 2 },
      { name: 'The Crusher', title: 'Power Thrower', difficulty: 3 },
      { name: 'The Ace', title: 'Pinpoint Accuracy', difficulty: 4 },
      { name: 'White Goodman', title: 'The Champion', difficulty: 5 },
    ],
  },
  {
    id: 7, sport: 'Football', icon: '🏈', color: '#c4832a',
    action: 'Throw', prompt: 'Time your pass perfectly!',
    opponents: [
      { name: 'Joe Montana', title: 'The Golden Arm', difficulty: 1 },
      { name: 'Walter Payton', title: 'Sweetness', difficulty: 2 },
      { name: 'Jerry Rice', title: 'The GOAT Receiver', difficulty: 3 },
      { name: 'Lawrence Taylor', title: 'LT', difficulty: 4 },
      { name: 'Tom Brady', title: 'The GOAT', difficulty: 5 },
    ],
  },
  {
    id: 8, sport: 'Swimming', icon: '🏊', color: '#0090d4',
    action: 'Stroke', prompt: 'Time your stroke!',
    opponents: [
      { name: 'Johnny Weissmuller', title: 'The Original', difficulty: 1 },
      { name: 'Mark Spitz', title: '7 Gold Medals', difficulty: 2 },
      { name: 'Ian Thorpe', title: 'The Thorpedo', difficulty: 3 },
      { name: 'Ryan Lochte', title: 'The Medalist', difficulty: 4 },
      { name: 'Michael Phelps', title: 'The GOAT', difficulty: 5 },
    ],
  },
  {
    id: 9, sport: 'Boxing', icon: '🥊', color: '#c04040',
    action: 'Punch', prompt: 'Time your punch!',
    opponents: [
      { name: 'Jack Dempsey', title: 'The Manassa Mauler', difficulty: 1 },
      { name: 'Sugar Ray Robinson', title: 'Pound for Pound', difficulty: 2 },
      { name: 'Joe Frazier', title: "Smokin' Joe", difficulty: 3 },
      { name: 'Muhammad Ali', title: 'The Greatest', difficulty: 4 },
      { name: 'Mike Tyson', title: 'Iron Mike', difficulty: 5 },
    ],
  },
  {
    id: 10, sport: 'Track & Field', icon: '🏃', color: '#d06000',
    action: 'Sprint', prompt: 'Time your burst!',
    opponents: [
      { name: 'Jesse Owens', title: 'The Buckeye Bullet', difficulty: 1 },
      { name: 'Carl Lewis', title: 'The King', difficulty: 2 },
      { name: 'Michael Johnson', title: 'The Gold Shoes', difficulty: 3 },
      { name: 'Maurice Greene', title: "The World's Fastest", difficulty: 4 },
      { name: 'Usain Bolt', title: 'Lightning Bolt', difficulty: 5 },
    ],
  },
  {
    id: 11, sport: 'Basketball', icon: '🏀', color: '#e05c00',
    action: 'Shoot', prompt: 'Time your shot!',
    opponents: [
      { name: 'Wilt Chamberlain', title: 'The Big Dipper', difficulty: 1 },
      { name: 'Magic Johnson', title: 'Showtime', difficulty: 2 },
      { name: 'Larry Bird', title: 'The Legend', difficulty: 3 },
      { name: 'Michael Jordan', title: 'Air Jordan', difficulty: 4 },
      { name: 'LeBron James', title: 'The King', difficulty: 5 },
    ],
  },
];

// ==================== STATE ====================

interface GameState {
  screen: 'home' | 'levels' | 'game' | 'levelDone' | 'allDone';
  levelId: number;
  opponentIdx: number;
  meterPos: number;
  meterDir: 1 | -1;
  meterRunning: boolean;
  sweetSpot: number;
  zoneSize: number;
  speed: number;
  animFrame: number | null;
  result: 'hit' | 'miss' | null;
  completedLevels: number[];
}

let S: GameState;
let ROOT: HTMLElement;
let EXIT_CB: () => void;
let soccerCleanup: (() => void) | null = null;

const SAVE_KEY = 'mrwagners-progress';

// ==================== ENTRY ====================

export function renderGame(el: HTMLElement, onExit: () => void): void {
  ROOT = el;
  EXIT_CB = onExit;
  const saved = localStorage.getItem(SAVE_KEY);
  S = {
    screen: 'home',
    levelId: 0,
    opponentIdx: 0,
    meterPos: 0,
    meterDir: 1,
    meterRunning: false,
    sweetSpot: 50,
    zoneSize: 30,
    speed: 1,
    animFrame: null,
    result: null,
    completedLevels: saved ? JSON.parse(saved) : [],
  };
  draw();
}

export function destroyGame(): void {
  stopMeter();
  soccerCleanup?.();
  soccerCleanup = null;
}

// ==================== DRAW ROUTER ====================

function draw(): void {
  stopMeter();
  switch (S.screen) {
    case 'home': drawHome(); break;
    case 'levels': drawLevels(); break;
    case 'game': drawGame(); break;
    case 'levelDone': drawLevelDone(); break;
    case 'allDone': drawAllDone(); break;
  }
}

// ==================== HOME ====================

function drawHome(): void {
  const done = S.completedLevels.length;
  const pct = Math.round((done / 12) * 100);
  ROOT.innerHTML = `
    <div class="gm-screen gm-home">
      <button class="gm-exit-btn" id="gm-exit">✕ Exit</button>
      <div class="gm-home-inner">
        <div class="gm-home-trophy">🏆</div>
        <h1 class="gm-home-title">Mr Wagner's<br>Sports Station</h1>
        <p class="gm-home-sub">Beat the greatest athletes of all time</p>
        <div class="gm-home-progress">
          <div class="gm-home-prog-label">${done} / 12 sports mastered</div>
          <div class="gm-home-prog-bar"><div class="gm-home-prog-fill" style="width:${pct}%"></div></div>
        </div>
        <button class="gm-btn gm-btn-primary" id="gm-play">
          ${done === 0 ? '🎮 Play' : '🏅 Continue'}
        </button>
      </div>
    </div>
  `;
  document.getElementById('gm-exit')?.addEventListener('click', () => EXIT_CB());
  document.getElementById('gm-play')?.addEventListener('click', () => { S.screen = 'levels'; draw(); });
}

// ==================== LEVEL SELECT ====================

function drawLevels(): void {
  const cards = LEVELS.map(lvl => {
    const done = S.completedLevels.includes(lvl.id);
    return `
      <button class="gm-lvl-card ${done ? 'gm-lvl-done' : ''}" data-lvl="${lvl.id}" style="--lc:${lvl.color}">
        <span class="gm-lvl-icon">${lvl.icon}</span>
        <span class="gm-lvl-name">${lvl.sport}</span>
        ${done ? '<span class="gm-lvl-check">✓</span>' : ''}
      </button>
    `;
  }).join('');

  ROOT.innerHTML = `
    <div class="gm-screen gm-levels">
      <div class="gm-levels-hdr">
        <button class="gm-back-btn" id="gm-back">← Back</button>
        <span class="gm-levels-hdr-title">Choose Your Sport</span>
        <span class="gm-levels-hdr-count">${S.completedLevels.length}/12</span>
      </div>
      <div class="gm-lvl-grid">${cards}</div>
    </div>
  `;

  document.getElementById('gm-back')?.addEventListener('click', () => { S.screen = 'home'; draw(); });
  document.querySelectorAll('[data-lvl]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.levelId = parseInt((btn as HTMLElement).dataset.lvl!);
      S.opponentIdx = 0;
      S.result = null;
      S.screen = 'game';
      draw();
    });
  });
}

// ==================== GAME SCREEN ====================

function drawGame(): void {
  stopMeter();

  const lvl = LEVELS[S.levelId];

  // All levels use the canvas sport game
  const cfg = SPORT_CONFIGS[lvl.id];
  if (cfg) {
    soccerCleanup = renderSportGame(ROOT, cfg, () => {
      soccerCleanup = null;
      S.screen = 'levels';
      draw();
    });
    return;
  }
}

function stopMeter(): void {
  S.meterRunning = false;
  if (S.animFrame !== null) { cancelAnimationFrame(S.animFrame); S.animFrame = null; }
}

// ==================== LEVEL DONE ====================

function drawLevelDone(): void {
  const lvl = LEVELS[S.levelId];
  const nextId = (S.levelId + 1) % 12;
  ROOT.innerHTML = `
    <div class="gm-screen gm-win">
      <div class="gm-win-icon">${lvl.icon}</div>
      <h2 class="gm-win-title">${lvl.sport} Complete!</h2>
      <p class="gm-win-sub">You defeated all 5 ${lvl.sport} legends!</p>
      <div class="gm-win-stars">⭐⭐⭐</div>
      <p class="gm-win-count">${S.completedLevels.length} / 12 sports mastered</p>
      <div class="gm-win-btns">
        <button class="gm-btn" id="gm-all-sports">All Sports</button>
        <button class="gm-btn gm-btn-primary" id="gm-next">Next Sport →</button>
      </div>
    </div>
  `;
  document.getElementById('gm-all-sports')?.addEventListener('click', () => { S.screen = 'levels'; draw(); });
  document.getElementById('gm-next')?.addEventListener('click', () => {
    S.levelId = nextId;
    S.opponentIdx = 0;
    S.screen = 'game';
    draw();
  });
}

// ==================== ALL DONE ====================

function drawAllDone(): void {
  ROOT.innerHTML = `
    <div class="gm-screen gm-win">
      <div class="gm-win-icon">🏆</div>
      <h2 class="gm-win-title">Sports Legend!</h2>
      <p class="gm-win-sub">You conquered all 12 sports at Mr Wagner's Sports Station!</p>
      <div class="gm-win-stars">🥇🥇🥇</div>
      <div class="gm-win-btns">
        <button class="gm-btn" id="gm-home">Home</button>
        <button class="gm-btn gm-btn-primary" id="gm-reset">Play Again</button>
      </div>
    </div>
  `;
  document.getElementById('gm-home')?.addEventListener('click', () => { S.screen = 'home'; draw(); });
  document.getElementById('gm-reset')?.addEventListener('click', () => {
    S.completedLevels = [];
    localStorage.removeItem(SAVE_KEY);
    S.screen = 'levels';
    draw();
  });
}
