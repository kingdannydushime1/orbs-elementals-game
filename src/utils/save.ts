const COINS_KEY = 'save_coins';
const LIVES_KEY = 'save_lives';
const LAST_LEVEL_KEY = 'save_last_level';
const DAILY_DATE_KEY = 'save_daily_date';
const DAILY_STREAK_KEY = 'save_daily_streak';
const MAX_LIVES = 3;
const LIVES_COST = 10;
const COINS_PER_WIN = 100;
const DAILY_REWARDS = [50, 100, 150, 200, 250, 300, 500];

function starCoins(): number {
  try {
    let total = 0;
    for (let i = 1; i <= 15; i++) {
      total += parseInt(localStorage.getItem(`level_${i}_stars`) || '0', 10);
    }
    return total;
  } catch { return 0; }
}

const START_COINS = 300;

export function loadCoins(): number {
  try {
    const raw = localStorage.getItem(COINS_KEY);
    if (raw === null) {
      const initial = starCoins();
      if (initial > 0) saveCoins(initial);
      else saveCoins(START_COINS);
      return initial || START_COINS;
    }
    return parseInt(raw, 10);
  } catch { return 0; }
}

export function saveCoins(amount: number) {
  try { localStorage.setItem(COINS_KEY, String(amount)); } catch { }
}

export function addCoins(amount: number) {
  saveCoins(loadCoins() + amount);
}

export function spendCoins(amount: number): boolean {
  const cur = loadCoins();
  if (cur < amount) return false;
  saveCoins(cur - amount);
  return true;
}

export function loadLives(): number {
  try { return parseInt(localStorage.getItem(LIVES_KEY) || String(MAX_LIVES), 10); } catch { return MAX_LIVES; }
}

export function saveLives(amount: number) {
  try { localStorage.setItem(LIVES_KEY, String(Math.min(amount, MAX_LIVES))); } catch { }
}

export function deductLife(): boolean {
  const cur = loadLives();
  if (cur <= 0) return false;
  saveLives(cur - 1);
  return true;
}

export function buyLives(): boolean {
  if (loadCoins() < LIVES_COST) return false;
  spendCoins(LIVES_COST);
  saveLives(MAX_LIVES);
  return true;
}

export function hasLives(): boolean {
  return loadLives() > 0;
}

export function saveLastLevel(id: number) {
  try { localStorage.setItem(LAST_LEVEL_KEY, String(id)); } catch { }
}

export function loadLastLevel(): number {
  try { return parseInt(localStorage.getItem(LAST_LEVEL_KEY) || '1', 10); } catch { return 1; }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function checkDailyReward(): 'claimable' | 'claimed' | 'streak_lost' {
  try {
    const last = localStorage.getItem(DAILY_DATE_KEY) || '';
    const today = todayStr();
    if (last === today) return 'claimed';
    if (last >= yesterdayStr()) return 'claimable';
    return 'streak_lost';
  } catch { return 'claimable'; }
}

export function claimDailyReward(): number {
  const state = checkDailyReward();
  if (state === 'claimed') return 0;
  let streak = 0;
  try { streak = parseInt(localStorage.getItem(DAILY_STREAK_KEY) || '0', 10); } catch { }
  if (state === 'streak_lost') streak = 0;
  streak++;
  const idx = Math.min(streak - 1, DAILY_REWARDS.length - 1);
  const reward = DAILY_REWARDS[idx];
  try {
    localStorage.setItem(DAILY_DATE_KEY, todayStr());
    localStorage.setItem(DAILY_STREAK_KEY, String(streak));
  } catch { }
  addCoins(reward);
  return reward;
}

export function getDailyStreak(): number {
  try { return parseInt(localStorage.getItem(DAILY_STREAK_KEY) || '0', 10); } catch { return 0; }
}

export { MAX_LIVES, LIVES_COST, COINS_PER_WIN, DAILY_REWARDS };
