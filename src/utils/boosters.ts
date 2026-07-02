export type BoosterType = 'hammer' | 'swap' | 'extra_moves' | 'shuffle';

const BOOSTER_KEYS: Record<BoosterType, string> = {
  hammer: 'booster_hammer',
  swap: 'booster_swap',
  extra_moves: 'booster_extra_moves',
  shuffle: 'booster_shuffle',
};

const BOOSTER_NAMES: Record<BoosterType, string> = {
  hammer: 'Hammer',
  swap: 'Free Swap',
  extra_moves: '+5 Moves',
  shuffle: 'Shuffle',
};

const BOOSTER_PRICES: Record<BoosterType, number> = {
  hammer: 50,
  swap: 30,
  extra_moves: 100,
  shuffle: 80,
};

export function getBoosterCount(type: BoosterType): number {
  try { return parseInt(localStorage.getItem(BOOSTER_KEYS[type]) || '1', 10); } catch { return 1; }
}

export function setBoosterCount(type: BoosterType, count: number) {
  try { localStorage.setItem(BOOSTER_KEYS[type], String(Math.max(0, count))); } catch { }
}

export function useBooster(type: BoosterType): boolean {
  const cur = getBoosterCount(type);
  if (cur <= 0) return false;
  setBoosterCount(type, cur - 1);
  return true;
}

export function addBooster(type: BoosterType, amount: number) {
  setBoosterCount(type, getBoosterCount(type) + amount);
}

export function getBoosterPrice(type: BoosterType): number {
  return BOOSTER_PRICES[type];
}

export function getBoosterName(type: BoosterType): string {
  return BOOSTER_NAMES[type];
}

export function buyBooster(type: BoosterType): boolean {
  return false;
}

export function initStartBoosters() {
  for (const key of Object.keys(BOOSTER_KEYS) as BoosterType[]) {
    const k = BOOSTER_KEYS[key];
    try {
      if (localStorage.getItem(k) === null) localStorage.setItem(k, '2');
    } catch { }
  }
}
