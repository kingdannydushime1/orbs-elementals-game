const COINS_KEY = 'save_coins';
const LIVES_KEY = 'save_lives';
const MAX_LIVES = 3;
const LIVES_COST = 300;
const COINS_PER_WIN = 100;

export function loadCoins(): number {
  try { return parseInt(localStorage.getItem(COINS_KEY) || '0', 10); } catch { return 0; }
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

export { MAX_LIVES, LIVES_COST, COINS_PER_WIN };
