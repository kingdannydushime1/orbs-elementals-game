export type ObjectiveType = 'score' | 'orbs_matched' | 'destroy_ice' | 'destroy_crates' | 'collect_ingredient' | 'clear_jelly';

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

export interface StartSpecial {
  row: number;
  col: number;
  type: 'StripedH' | 'StripedV' | 'Bomb' | 'ColorBomb';
  element?: number;
}

export interface IceDef {
  row: number;
  col: number;
  layers?: number;
}

export interface JellyDef {
  row: number;
  col: number;
}

export interface PortalDef {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

export interface LevelDef {
  id: number;
  name: string;
  rows: number;
  cols: number;
  moves: number;
  time: number;
  orbTypes: number;
  objectives: LevelObjective[];
  crates: CrateDef[];
  ice: IceDef[];
  jelly: JellyDef[];
  holes: { row: number; col: number }[];
  portals: PortalDef[];
  startSpecials?: StartSpecial[];
  starScore: [number, number, number];
}

function genLevels(): LevelDef[] {
  const out: LevelDef[] = [];

  const names = [
    'First Sparks', 'Warm Up', 'Elemental Mix', 'Crate Buster', 'Frozen Orbs',
    'Deep Freeze', 'Rock Garden', 'Fire Storm', 'Waterfall', 'Leaf Pile',
    'Thunder Clap', 'Iceberg', 'Wind Tunnel', 'Crystal Cave', 'Lava Flow',
    'Bamboo Grove', 'Storm Front', 'Glacier', 'Dust Devil', 'Rain Forest',
    'Volcano', 'Tide Pool', 'Meadow', 'Avalanche', 'Sand Storm',
    'Typhoon', 'Tundra', 'Wild Fire', 'Oasis', 'Blizzard',
    'Quake', 'Monsoon', 'Thorn Patch', 'Hail Storm', 'Tornado Alley',
    'Magma Chamber', 'Coral Reef', 'Canopy', 'Permafrost', 'Hurricane',
    'Ember Glade', 'Deep Blue', 'Root Bound', 'Flash Freeze', 'Gale Force',
    'Pyre', 'Abyss', 'Verdant', 'Shard', 'Tempest',
    'Inferno', 'Depths', 'Jungle', 'Frost', 'Squall',
    'Nova', 'Riptide', 'Bloom', 'Chill', 'Zephyr',
    'Scorch', 'Lagoon', 'Thicket', 'Hail', 'Gust',
    'Meltdown', 'Whirlpool', 'Sprout', 'Shiver', 'Breeze',
    'Combustion', 'Stream', 'Foliage', 'Sleet', 'Draft',
    'Eruption', 'Cascade', 'Grove', 'Freeze', 'Flurry',
    'Cinder', 'Spring', 'Forest', 'Frostbite', 'Windswept',
    'Blaze', 'Brook', 'Fern', 'Icicle', 'Cyclone',
    'Torch', 'River', 'Moss', 'Glaciate', 'Monsoon',
    'Bonfire', 'Ocean', 'Petal', 'Subzero', 'Tailwind',
    'Spark', 'Dew', 'Vine', 'Chillwind', 'Airburst',
    'Flashover', 'Raindrop', 'Pollen', 'Crystal', 'Headwind',
    'Sear', 'Puddle', 'Branch', 'Frozen Lake', 'Whirlwind',
    'Caldera', 'Estuary', 'Canopy', 'Permafrost Rise', 'Jet Stream',
    'Fire Pit', 'Reservoir', 'Fungus', 'Cold Snap', 'Updraft',
    'Smolder', 'Geyser', 'Herb', 'Frost Heave', 'Downdraft',
    'Char', 'Wellspring', 'Orchard', 'Névé', 'Crosswind',
    'Ember Nest', 'Delta', 'Hedge', 'Firn', 'Cirrus',
    'Flame Spire', 'Bayou', 'Bramble', 'Ice Core', 'Nimbus',
    'Radiant', 'Springs', 'Thorns', 'Snowcap', 'Sirocco',
    'Glow Worm', 'Marsh', 'Fern Gully', 'Glacial', 'Zephyr Vale',
    'Solar Flare', 'Aquifer', 'Shrub', 'Frost Line', 'Trade Wind',
    'Flint', 'Bog', 'Root Cell', 'Freeze Tag', 'Santa Ana',
    'Crematory', 'Fjord', 'Berries', 'Ice Flow', 'Mistral',
    'Burning Bush', 'Rain Barrow', 'Vines', 'Cryo', 'Bora',
    'Wildfire', 'Stream Bed', 'Wild Rose', 'White Out', 'Chinook',
    'Charcoal', 'Springs', 'Dogwood', 'Black Ice', 'Harmattan',
    'Oven', 'Creek', 'Briar', 'Hoarfrost', 'Khamsin',
    'Furnace', 'Tide', 'Sap', 'Rime', 'Shamal',
    'Pit', 'Wetland', 'Hollow', 'Deep Chill', 'Mountain Wave',
    'Sulfur', 'Watering Hole', 'Thistle', 'Cryogenic', 'Levanter',
    'Firelight', 'Pond', 'Maple', 'Permachill', 'Vendaval',
    'Inferno Core', 'Underground', 'Fern Gully', 'Glacial Drift', 'Southerly',
    'Molten', 'Reservoir', 'Vineyard', 'Snow Field', 'Squall Line',
    'Ash Heap', 'Fountain', 'Bamboo', 'Ice Sheet', 'Foehn',
    'Cinder Block', 'Well', 'Garden', 'Frost Field', 'Meltwater',
    'Flame Guard', 'Water Wheel', 'Topiary', 'Ice Patch', 'Wind Shear',
    'Fire Wall', 'Rain Chain', 'Hedge Maze', 'Glazed', 'Jet Stream',
    'Pods', 'Aqueduct', 'Thorn Wall', 'Frozen Tundra', 'Cumulus',
    'Incineration', 'Reservoir 2', 'Root Maze', 'Glacier Pass', 'Stratus',
    'Smelting', 'Watercourse', 'Shrubbery', 'Permafrost 2', 'Anvil',
    'Dragon Fire', 'Silver Lake', 'Jade', 'Ice Palace', 'Nephology',
    'Greek Fire', 'Crystal Lake', 'Emerald', 'Frost Palace', 'Alto',
    'Hellfire', 'Mirror Lake', 'Jungle Gym', 'Crystal Palace', 'Cirrostratus',
    'Sunburst', 'Lakebed', 'Forest Floor', 'Ice Castle', 'High Alto',
    'Solar Wind', 'Deep Sea', 'Canopy Walk', 'Snow Fort', 'Stratocumulus',
    'Nebula', 'Trench', 'Tree Top', 'Frozen Fortress', 'Cumulonimbus',
    'Supernova', 'Abyssal', 'Forest Canopy', 'Icelands', 'Storm Front',
  ];

  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  for (let id = 1; id <= 300; id++) {
    const t = (id - 1) / 299;
    const difficulty = Math.min(t, 1);

    const rows = Math.min(6 + Math.floor(difficulty * 4), 10);
    const cols = Math.min(6 + Math.floor(difficulty * 4), 10);
    const orbTypes = Math.min(3 + Math.floor(difficulty * 4), 7);

    let moves: number;
    let time: number;
    const isMoves = difficulty > 0.2 || (id % 3 !== 0);

    if (isMoves) {
      moves = Math.max(20, Math.min(45, Math.floor(20 + difficulty * 20 + (Math.random() - 0.5) * 6)));
      time = 999;
    } else {
      moves = 0;
      time = Math.max(60, Math.min(120, Math.floor(60 + difficulty * 30 + (Math.random() - 0.5) * 15)));
    }

    const multiObjective = difficulty > 0.4;
    const objectives: LevelObjective[] = [];

    const objRoll = Math.random();
    if (difficulty < 0.15 || objRoll < 0.4) {
      const target = Math.floor(15000 + difficulty * 35000 + Math.random() * 3000);
      objectives.push({ type: 'score', target });
    } else if (difficulty < 0.3 || objRoll < 0.6) {
      const crateCount = Math.min(3 + Math.floor(difficulty * 8), 12);
      objectives.push({ type: 'destroy_crates', target: Math.max(1, Math.floor(crateCount * (0.5 + Math.random() * 0.3))) });
    } else if (difficulty < 0.5 || objRoll < 0.75) {
      const iceCount = Math.min(3 + Math.floor(difficulty * 10), 15);
      objectives.push({ type: 'destroy_ice', target: Math.max(1, Math.floor(iceCount * (0.4 + Math.random() * 0.3))) });
    } else if (difficulty < 0.7 || objRoll < 0.9) {
      const el = Math.floor(Math.random() * orbTypes);
      const target = Math.floor(10 + difficulty * 20 + Math.random() * 8);
      objectives.push({ type: 'orbs_matched', element: el, target });
    } else {
      const jellyTarget = Math.min(3 + Math.floor(difficulty * 10), 15);
      objectives.push({ type: 'clear_jelly', target: Math.max(1, Math.floor(jellyTarget * (0.4 + Math.random() * 0.3))) });
    }

    if (multiObjective && Math.random() < 0.5) {
      const secondTarget = Math.floor(8000 + difficulty * 22000 + Math.random() * 2000);
      objectives.push({ type: 'score', target: secondTarget });
    }

    const crates: CrateDef[] = [];
    const crateCount = difficulty > 0.2 ? Math.floor(difficulty * 8 * (0.3 + Math.random() * 0.7)) : 0;
    const crateSet = new Set<string>();
    for (let i = 0; i < crateCount && i < 15; i++) {
      let attempts = 0;
      while (attempts < 10) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const key = `${r},${c}`;
        if (!crateSet.has(key) && !((r === 0 || r === rows - 1) && (c === 0 || c === cols - 1))) {
          crateSet.add(key);
          crates.push({ row: r, col: c, hits: difficulty > 0.6 && Math.random() < 0.3 ? 2 : 1 });
          break;
        }
        attempts++;
      }
    }

    const ice: IceDef[] = [];
    const iceCount = difficulty > 0.25 ? Math.floor(difficulty * 10 * (0.2 + Math.random() * 0.6)) : 0;
    const iceSet = new Set<string>();
    for (let i = 0; i < iceCount && i < 12; i++) {
      let attempts = 0;
      while (attempts < 10) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const key = `${r},${c}`;
        if (!crateSet.has(key) && !iceSet.has(key)) {
          iceSet.add(key);
          ice.push({ row: r, col: c, layers: difficulty > 0.7 && Math.random() < 0.3 ? 2 : 1 });
          break;
        }
        attempts++;
      }
    }

    const jelly: JellyDef[] = [];
    const jellyCount = difficulty > 0.5 ? Math.floor(difficulty * 6 * (0.2 + Math.random() * 0.5)) : 0;
    const jellySet = new Set<string>();
    for (let i = 0; i < jellyCount && i < 10; i++) {
      let attempts = 0;
      while (attempts < 10) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const key = `${r},${c}`;
        if (!crateSet.has(key) && !iceSet.has(key) && !jellySet.has(key)) {
          jellySet.add(key);
          jelly.push({ row: r, col: c });
          break;
        }
        attempts++;
      }
    }

    const holes: { row: number; col: number }[] = [];
    const holeCount = difficulty > 0.55 ? Math.max(0, Math.floor(difficulty * 5 * Math.random() - 1)) : 0;
    const holeSet = new Set<string>();
    for (let i = 0; i < holeCount && i < 4; i++) {
      let attempts = 0;
      while (attempts < 10) {
        const r = 1 + Math.floor(Math.random() * (rows - 2));
        const c = 1 + Math.floor(Math.random() * (cols - 2));
        const key = `${r},${c}`;
        if (!crateSet.has(key) && !iceSet.has(key) && !jellySet.has(key) && !holeSet.has(key)) {
          holeSet.add(key);
          holes.push({ row: r, col: c });
          break;
        }
        attempts++;
      }
    }

    const portals: PortalDef[] = [];
    if (difficulty > 0.65 && Math.random() < 0.2 && rows >= 6 && cols >= 6) {
      const r1 = 1 + Math.floor(Math.random() * (rows - 2));
      const c1 = 1 + Math.floor(Math.random() * (cols - 2));
      const r2 = 1 + Math.floor(Math.random() * (rows - 2));
      const c2 = 1 + Math.floor(Math.random() * (cols - 2));
      const k1 = `${r1},${c1}`, k2 = `${r2},${c2}`;
      if (!crateSet.has(k1) && !crateSet.has(k2) && !holeSet.has(k1) && !holeSet.has(k2) && (r1 !== r2 || c1 !== c2)) {
        portals.push({ from: { row: r1, col: c1 }, to: { row: r2, col: c2 } });
      }
    }

    const starScore: [number, number, number] = [
      Math.max(5000, Math.floor(8000 + difficulty * 22000 + Math.random() * 2000)),
      Math.max(10000, Math.floor(15000 + difficulty * 35000 + Math.random() * 3000)),
      Math.max(20000, Math.floor(25000 + difficulty * 55000 + Math.random() * 5000)),
    ];

    out.push({
      id,
      name: names[(id - 1) % names.length] + (id > names.length ? ` ${Math.ceil(id / names.length)}` : ''),
      rows, cols,
      moves, time,
      orbTypes,
      objectives: objectives.length > 0 ? objectives : [{ type: 'score', target: 10000 }],
      crates, ice, jelly, holes, portals,
      starScore,
    });
  }

  return out;
}

export const levels = genLevels();

export function getLevel(id: number): LevelDef | undefined {
  return levels.find(l => l.id === id);
}

export function getTotalLevels(): number {
  return levels.length;
}
