const COINS_KEY = 'save_coins';
const LIVES_KEY = 'save_lives';
const LAST_LEVEL_KEY = 'save_last_level';
const MAX_LIVES = 3;
const LIVES_COST = 10;
const COINS_PER_WIN = 100;

function starCoins(): number {
  try {
    let total = 0;
    for (let i = 1; i <= 15; i++) {
      total += parseInt(localStorage.getItem(`level_${i}_stars`) || '0', 10);
    }
    return total;
  } catch { return 0; }
}

export function loadCoins(): number {
  try {
    const raw = localStorage.getItem(COINS_KEY);
    if (raw === null) {
      const initial = starCoins();
      if (initial > 0) saveCoins(initial);
      return initial;
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

export { MAX_LIVES, LIVES_COST, COINS_PER_WIN };
