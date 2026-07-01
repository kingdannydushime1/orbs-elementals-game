export type ObjectiveType = 'score' | 'orbs_matched' | 'destroy_ice' | 'destroy_crates';

export interface LevelObjective {
  type: ObjectiveType;
  target: number;
  element?: number;
}

export interface CrateDef {
  row: number;
  col: number;
  hits?: number;
}

export interface IceDef {
  row: number;
  col: number;
  layers?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  rows: number;
  cols: number;
  time: number;
  moves?: number;
  orbTypes: number;
  objectives: LevelObjective[];
  crates: CrateDef[];
  ice: IceDef[];
  starScore: [number, number, number];
}

export const levels: LevelDef[] = [
  {
    id: 1,
    name: 'First Sparks',
    rows: 6,
    cols: 6,
    time: 10, // 90,
    orbTypes: 3,
    objectives: [{ type: 'score', target: 300 }],
    crates: [],
    ice: [],
    starScore: [300, 600, 1000],
  },
  {
    id: 2,
    name: 'Warm Up',
    rows: 7,
    cols: 7,
    time: 10, // 80,
    orbTypes: 3,
    objectives: [{ type: 'score', target: 500 }],
    crates: [],
    ice: [],
    starScore: [500, 900, 1400],
  },
  {
    id: 3,
    name: 'Elemental Mix',
    rows: 8,
    cols: 8,
    time: 10, // 70,
    orbTypes: 4,
    objectives: [{ type: 'score', target: 800 }],
    crates: [],
    ice: [],
    starScore: [800, 1400, 2200],
  },
  {
    id: 4,
    name: 'Crate Buster',
    rows: 8,
    cols: 8,
    moves: 20,
    time: 999,
    orbTypes: 4,
    objectives: [{ type: 'destroy_crates', target: 4 }],
    crates: [
      { row: 2, col: 2 }, { row: 2, col: 5 },
      { row: 5, col: 2 }, { row: 5, col: 5 },
    ],
    ice: [],
    starScore: [4, 4, 4],
  },
  {
    id: 5,
    name: 'Frozen Orbs',
    rows: 8,
    cols: 8,
    moves: 25,
    time: 999,
    orbTypes: 4,
    objectives: [{ type: 'destroy_ice', target: 4 }],
    crates: [],
    ice: [
      { row: 1, col: 1, layers: 2 }, { row: 1, col: 6, layers: 2 },
      { row: 6, col: 1, layers: 2 }, { row: 6, col: 6, layers: 2 },
    ],
    starScore: [4, 4, 4],
  },
  {
    id: 6,
    name: 'Fire Frenzy',
    rows: 8,
    cols: 8,
    time: 10, // 55,
    orbTypes: 4,
    objectives: [{ type: 'orbs_matched', target: 30, element: 0 }],
    crates: [
      { row: 0, col: 3 }, { row: 3, col: 0 }, { row: 3, col: 7 },
      { row: 7, col: 3 },
    ],
    ice: [],
    starScore: [30, 50, 80],
  },
  {
    id: 7,
    name: 'Water World',
    rows: 8,
    cols: 8,
    time: 10, // 60,
    orbTypes: 4,
    objectives: [{ type: 'orbs_matched', target: 30, element: 1 }],
    crates: [],
    ice: [
      { row: 0, col: 0, layers: 1 }, { row: 0, col: 7, layers: 1 },
      { row: 7, col: 0, layers: 1 }, { row: 7, col: 7, layers: 1 },
      { row: 3, col: 3, layers: 2 }, { row: 4, col: 4, layers: 2 },
    ],
    starScore: [30, 50, 80],
  },
  {
    id: 8,
    name: 'Rock Garden',
    rows: 8,
    cols: 8,
    time: 10, // 60,
    orbTypes: 4,
    objectives: [{ type: 'orbs_matched', target: 25, element: 2 }],
    crates: [
      { row: 1, col: 1 }, { row: 1, col: 6 },
      { row: 6, col: 1 }, { row: 6, col: 6 },
      { row: 3, col: 3 }, { row: 4, col: 4 },
    ],
    ice: [],
    starScore: [25, 45, 70],
  },
  {
    id: 9,
    name: 'Leaf Storm',
    rows: 8,
    cols: 8,
    time: 10, // 50,
    orbTypes: 4,
    objectives: [{ type: 'orbs_matched', target: 35, element: 3 }],
    crates: [
      { row: 0, col: 2 }, { row: 0, col: 5 },
      { row: 2, col: 0 }, { row: 2, col: 7 },
      { row: 5, col: 0 }, { row: 5, col: 7 },
      { row: 7, col: 2 }, { row: 7, col: 5 },
    ],
    ice: [],
    starScore: [35, 55, 85],
  },
  {
    id: 10,
    name: 'Double Trouble',
    rows: 8,
    cols: 8,
    time: 10, // 70,
    orbTypes: 4,
    objectives: [
      { type: 'score', target: 1200 },
      { type: 'orbs_matched', target: 20, element: 0 },
    ],
    crates: [
      { row: 1, col: 3 }, { row: 1, col: 4 },
      { row: 6, col: 3 }, { row: 6, col: 4 },
    ],
    ice: [
      { row: 3, col: 1, layers: 2 }, { row: 3, col: 6, layers: 2 },
      { row: 4, col: 1, layers: 2 }, { row: 4, col: 6, layers: 2 },
    ],
    starScore: [1200, 2000, 3500],
  },
  {
    id: 11,
    name: 'Crate Maze',
    rows: 8,
    cols: 8,
    time: 10, // 65,
    orbTypes: 4,
    objectives: [{ type: 'score', target: 1500 }],
    crates: [
      { row: 0, col: 1 }, { row: 0, col: 6 },
      { row: 1, col: 3 }, { row: 1, col: 4 },
      { row: 3, col: 0 }, { row: 3, col: 7 },
      { row: 4, col: 0 }, { row: 4, col: 7 },
      { row: 6, col: 3 }, { row: 6, col: 4 },
      { row: 7, col: 1 }, { row: 7, col: 6 },
    ],
    ice: [],
    starScore: [1500, 2500, 4000],
  },
  {
    id: 12,
    name: 'Ice Age',
    rows: 8,
    cols: 8,
    time: 10, // 80,
    orbTypes: 4,
    objectives: [{ type: 'score', target: 2000 }],
    crates: [],
    ice: [
      { row: 0, col: 0, layers: 2 }, { row: 0, col: 7, layers: 2 },
      { row: 7, col: 0, layers: 2 }, { row: 7, col: 7, layers: 2 },
      { row: 1, col: 1, layers: 1 }, { row: 1, col: 6, layers: 1 },
      { row: 6, col: 1, layers: 1 }, { row: 6, col: 6, layers: 1 },
      { row: 3, col: 3, layers: 2 }, { row: 4, col: 4, layers: 2 },
    ],
    starScore: [2000, 3500, 5000],
  },
  {
    id: 13,
    name: 'Elementalist',
    rows: 8,
    cols: 8,
    time: 10, // 60,
    orbTypes: 4,
    objectives: [
      { type: 'orbs_matched', target: 15, element: 0 },
      { type: 'orbs_matched', target: 15, element: 1 },
      { type: 'orbs_matched', target: 15, element: 2 },
      { type: 'orbs_matched', target: 15, element: 3 },
    ],
    crates: [],
    ice: [],
    starScore: [15, 25, 40],
  },
  {
    id: 14,
    name: 'Fortress',
    rows: 8,
    cols: 8,
    time: 10, // 70,
    orbTypes: 4,
    objectives: [{ type: 'score', target: 2500 }],
    crates: [
      { row: 0, col: 3 }, { row: 0, col: 4 },
      { row: 3, col: 0 }, { row: 3, col: 7 },
      { row: 4, col: 0 }, { row: 4, col: 7 },
      { row: 7, col: 3 }, { row: 7, col: 4 },
      { row: 2, col: 2 }, { row: 2, col: 5 },
      { row: 5, col: 2 }, { row: 5, col: 5 },
    ],
    ice: [
      { row: 3, col: 3, layers: 1 }, { row: 3, col: 4, layers: 1 },
      { row: 4, col: 3, layers: 1 }, { row: 4, col: 4, layers: 1 },
    ],
    starScore: [2500, 4000, 6000],
  },
  {
    id: 15,
    name: 'Gauntlet',
    rows: 9,
    cols: 9,
    time: 10, // 90,
    orbTypes: 4,
    objectives: [{ type: 'score', target: 3000 }],
    crates: [
      { row: 1, col: 1 }, { row: 1, col: 7 },
      { row: 3, col: 3 }, { row: 3, col: 5 },
      { row: 5, col: 3 }, { row: 5, col: 5 },
      { row: 7, col: 1 }, { row: 7, col: 7 },
    ],
    ice: [
      { row: 0, col: 4, layers: 2 },
      { row: 4, col: 0, layers: 2 }, { row: 4, col: 8, layers: 2 },
      { row: 8, col: 4, layers: 2 },
    ],
    starScore: [3000, 5000, 8000],
  },
];

export function getLevel(id: number): LevelDef | undefined {
  return levels.find(l => l.id === id);
}

export function getTotalLevels(): number {
  return levels.length;
}
