# Lukas Plants vs Toby Zombies — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable core battle with 3 plants and 3 zombies on a 5x10 grid, a "Who are you?" landing page (Lukas = Plants, Toby = Zombies), a lobby with online presence, and real-time multiplayer via Firebase — with AI fallback when the other player is offline.

**Architecture:** New standalone Astro project at `~/Projects/lukas-vs-toby/`. Phaser.js handles all game logic inside a single `<canvas>` embedded in an Astro page. Game code is vanilla TypeScript organized by scene and entity. Firebase Realtime Database handles multiplayer sync and presence. No React/Vue — pure Astro + Phaser.

**Tech Stack:** Astro 6, Phaser 3, TypeScript, Tailwind CSS 4, Firebase Hosting, Firebase Realtime Database

**Phases Overview:**
- **Phase 1 (this plan):** Landing page, lobby, core battle (3+3 units), multiplayer + AI fallback
- Phase 2: Remaining 7+7 units, enhancers
- Phase 3: Toby Dollars, marketplace, upgrades, save system
- Phase 4: Campaign mode (20-30 levels), endless mode

---

## File Structure

```
~/Projects/lukas-vs-toby/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── assets/
│       └── sprites/              # Placeholder colored rectangles for now
├── firebase.json                 # Firebase Hosting + RTDB config
├── .firebaserc                   # Firebase project alias
├── src/
│   ├── pages/
│   │   ├── index.astro           # Landing page — "Who are you?" Lukas or Toby
│   │   ├── lobby.astro           # Lobby — see online status, pick AI or multiplayer
│   │   └── battle.astro          # Game page — mounts Phaser canvas
│   ├── layouts/
│   │   └── GameLayout.astro      # HTML shell with dark bg, no scroll
│   ├── firebase/
│   │   ├── config.ts             # Firebase app init
│   │   ├── presence.ts           # Online/offline presence via RTDB
│   │   └── multiplayer.ts        # Real-time game state sync via RTDB
│   └── game/
│       ├── main.ts               # Phaser.Game config and boot
│       ├── constants.ts          # Grid size, tile size, costs, speeds
│       ├── types.ts              # Shared interfaces (UnitConfig, Faction, etc.)
│       ├── scenes/
│       │   ├── BootScene.ts      # Preload all assets
│       │   ├── BattleScene.ts    # Main gameplay scene (AI mode)
│       │   ├── MultiplayerBattleScene.ts  # Multiplayer variant
│       │   └── GameOverScene.ts  # Win/lose screen
│       ├── entities/
│       │   ├── Unit.ts           # Base unit class (health, position, faction)
│       │   ├── Projectile.ts     # Base projectile class
│       │   ├── plants/
│       │   │   ├── Peashooter.ts
│       │   │   ├── Sunflower.ts
│       │   │   └── WalnutBomb.ts
│       │   └── zombies/
│       │       ├── BrainEater.ts
│       │       ├── VeryFastWalker.ts
│       │       └── SkeletonWarrior.ts
│       ├── systems/
│       │   ├── GridManager.ts    # 5x10 grid state, tile lookup
│       │   ├── EnergyManager.ts  # LukieCoin tracking and generation
│       │   ├── CombatManager.ts  # Projectile-unit collisions, damage
│       │   ├── WaveManager.ts    # AI unit spawning logic
│       │   └── DragDropManager.ts # Unit placement from HUD bar
│       └── ui/
│           ├── HUD.ts            # Energy display, unit bar
│           └── HealthBar.ts      # Per-unit and base health bars
└── tests/
    ├── grid-manager.test.ts
    ├── energy-manager.test.ts
    ├── combat-manager.test.ts
    └── unit.test.ts
```

---

### Task 1: Scaffold the Astro + Phaser project

**Files:**
- Create: `~/Projects/lukas-vs-toby/package.json`
- Create: `~/Projects/lukas-vs-toby/astro.config.mjs`
- Create: `~/Projects/lukas-vs-toby/tsconfig.json`

- [ ] **Step 1: Create project directory and initialize**

```bash
mkdir -p ~/Projects/lukas-vs-toby
cd ~/Projects/lukas-vs-toby
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install astro@latest phaser@latest tailwindcss@latest @tailwindcss/vite@latest
npm install -D typescript vitest
```

- [ ] **Step 3: Create astro.config.mjs**

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 5: Create package.json scripts**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p src/pages src/layouts src/game/scenes src/game/entities/plants src/game/entities/zombies src/game/systems src/game/ui public/assets/sprites tests
```

- [ ] **Step 7: Initialize git and commit**

```bash
cd ~/Projects/lukas-vs-toby
git init
echo "node_modules\ndist\n.astro" > .gitignore
git add -A
git commit -m "chore: scaffold Astro + Phaser project"
```

---

### Task 2: Game constants, types, and Phaser boot

**Files:**
- Create: `src/game/constants.ts`
- Create: `src/game/types.ts`
- Create: `src/game/main.ts`
- Create: `src/game/scenes/BootScene.ts`

- [ ] **Step 1: Create constants.ts**

```typescript
// src/game/constants.ts
export const GRID_ROWS = 5;
export const GRID_COLS = 10;
export const TILE_SIZE = 64;
export const GRID_OFFSET_X = 80;
export const GRID_OFFSET_Y = 100;

export const GAME_WIDTH = GRID_OFFSET_X + GRID_COLS * TILE_SIZE + 80;
export const GAME_HEIGHT = GRID_OFFSET_Y + GRID_ROWS * TILE_SIZE + 120;

export const ENERGY_TICK_INTERVAL = 2000; // ms between passive energy ticks
export const ENERGY_TICK_AMOUNT = 5;
export const ENERGY_KILL_REWARD = 10;
export const STARTING_ENERGY = 50;

export const BASE_HP = 1000;

export const UNIT_COSTS: Record<string, number> = {
  peashooter: 100,
  sunflower: 50,
  walnutBomb: 125,
  brainEater: 100,
  veryFastWalker: 50,
  skeletonWarrior: 125,
};

export const UNIT_STATS: Record<string, { hp: number; damage: number; attackSpeed: number; range: number; moveSpeed: number }> = {
  peashooter:      { hp: 100, damage: 20, attackSpeed: 1000, range: 9, moveSpeed: 0 },
  sunflower:       { hp: 75,  damage: 10, attackSpeed: 1500, range: 3, moveSpeed: 0 },
  walnutBomb:      { hp: 300, damage: 80, attackSpeed: 0,    range: 0, moveSpeed: 0 },
  brainEater:      { hp: 120, damage: 25, attackSpeed: 2000, range: 4, moveSpeed: 1 },
  veryFastWalker:  { hp: 60,  damage: 15, attackSpeed: 800,  range: 0, moveSpeed: 3 },
  skeletonWarrior: { hp: 200, damage: 30, attackSpeed: 1200, range: 0, moveSpeed: 1.5 },
};
```

- [ ] **Step 2: Create types.ts**

```typescript
// src/game/types.ts
export type Faction = 'plants' | 'zombies';

export interface GridPosition {
  row: number;
  col: number;
}

export interface UnitConfig {
  key: string;
  name: string;
  faction: Faction;
  hp: number;
  damage: number;
  attackSpeed: number; // ms between attacks, 0 = no attack
  range: number;       // in tiles, 0 = melee only
  moveSpeed: number;   // tiles per second, 0 = stationary
  cost: number;
}
```

- [ ] **Step 3: Create BootScene.ts**

```typescript
// src/game/scenes/BootScene.ts
import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Generate colored rectangle textures as placeholders
    this.createPlaceholderTexture('peashooter', 0x00cc00);
    this.createPlaceholderTexture('sunflower', 0xffcc00);
    this.createPlaceholderTexture('walnutBomb', 0x8b4513);
    this.createPlaceholderTexture('brainEater', 0x884488);
    this.createPlaceholderTexture('veryFastWalker', 0xaa3333);
    this.createPlaceholderTexture('skeletonWarrior', 0x666666);
    this.createPlaceholderTexture('pea', 0x00ff00, 12);
    this.createPlaceholderTexture('kernel', 0xffee00, 10);
    this.createPlaceholderTexture('brain', 0xff88cc, 14);
    this.createPlaceholderTexture('tile', 0x335533, TILE_SIZE, TILE_SIZE, 0.3);
    this.createPlaceholderTexture('tileDark', 0x2a4a2a, TILE_SIZE, TILE_SIZE, 0.3);
    this.createPlaceholderTexture('base', 0x4444ff, TILE_SIZE, TILE_SIZE * 2);
  }

  create(): void {
    this.scene.start('BattleScene');
  }

  private createPlaceholderTexture(
    key: string,
    color: number,
    width: number = TILE_SIZE - 8,
    height: number = TILE_SIZE - 8,
    alpha: number = 1
  ): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(color, alpha);
    gfx.fillRect(0, 0, width, height);
    gfx.generateTexture(key, width, height);
    gfx.destroy();
  }
}
```

- [ ] **Step 4: Create main.ts**

```typescript
// src/game/main.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

export function launchGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, BattleScene, GameOverScene],
  };

  return new Phaser.Game(config);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/game/constants.ts src/game/types.ts src/game/main.ts src/game/scenes/BootScene.ts
git commit -m "feat: add game constants, types, and Phaser boot scene"
```

---

### Task 3: Astro page and layout to host the game

**Files:**
- Create: `src/layouts/GameLayout.astro`
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create GameLayout.astro**

```astro
---
// src/layouts/GameLayout.astro
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <style>
      @import "tailwindcss";
    </style>
  </head>
  <body class="bg-gray-950 text-white min-h-screen flex items-center justify-center overflow-hidden">
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Create index.astro**

```astro
---
// src/pages/index.astro
import GameLayout from '../layouts/GameLayout.astro';
---
<GameLayout title="Lukas Plants vs Toby Zombies">
  <div id="game-container" class="mx-auto"></div>

  <script>
    import { launchGame } from '../game/main';
    launchGame('game-container');
  </script>
</GameLayout>
```

- [ ] **Step 3: Run dev server to verify canvas renders**

```bash
npm run dev
```

Expected: Browser shows a dark canvas at the correct dimensions. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/GameLayout.astro src/pages/index.astro
git commit -m "feat: add Astro page hosting Phaser canvas"
```

---

### Task 4: GridManager — the 5x10 tile grid

**Files:**
- Create: `src/game/systems/GridManager.ts`
- Create: `tests/grid-manager.test.ts`

- [ ] **Step 1: Write failing tests for GridManager**

```typescript
// tests/grid-manager.test.ts
import { describe, it, expect } from 'vitest';
import { GridManager } from '../src/game/systems/GridManager';

describe('GridManager', () => {
  it('initializes a 5x10 grid of empty cells', () => {
    const grid = new GridManager();
    expect(grid.getRows()).toBe(5);
    expect(grid.getCols()).toBe(10);
    expect(grid.isEmpty(0, 0)).toBe(true);
    expect(grid.isEmpty(4, 9)).toBe(true);
  });

  it('rejects out-of-bounds positions', () => {
    const grid = new GridManager();
    expect(grid.isValid(-1, 0)).toBe(false);
    expect(grid.isValid(5, 0)).toBe(false);
    expect(grid.isValid(0, 10)).toBe(false);
  });

  it('places and removes a unit ID', () => {
    const grid = new GridManager();
    grid.place(2, 3, 'unit-1');
    expect(grid.isEmpty(2, 3)).toBe(false);
    expect(grid.getUnitAt(2, 3)).toBe('unit-1');
    grid.remove(2, 3);
    expect(grid.isEmpty(2, 3)).toBe(true);
  });

  it('prevents placing on an occupied cell', () => {
    const grid = new GridManager();
    grid.place(0, 0, 'unit-1');
    expect(grid.place(0, 0, 'unit-2')).toBe(false);
  });

  it('converts grid position to pixel coordinates', () => {
    const grid = new GridManager();
    const pos = grid.toPixel(0, 0);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });

  it('converts pixel coordinates to grid position', () => {
    const grid = new GridManager();
    const pixel = grid.toPixel(2, 5);
    const cell = grid.toGrid(pixel.x, pixel.y);
    expect(cell.row).toBe(2);
    expect(cell.col).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/grid-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement GridManager**

```typescript
// src/game/systems/GridManager.ts
import { GRID_ROWS, GRID_COLS, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants';

export class GridManager {
  private cells: (string | null)[][];

  constructor() {
    this.cells = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );
  }

  getRows(): number {
    return GRID_ROWS;
  }

  getCols(): number {
    return GRID_COLS;
  }

  isValid(row: number, col: number): boolean {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
  }

  isEmpty(row: number, col: number): boolean {
    return this.isValid(row, col) && this.cells[row][col] === null;
  }

  getUnitAt(row: number, col: number): string | null {
    if (!this.isValid(row, col)) return null;
    return this.cells[row][col];
  }

  place(row: number, col: number, unitId: string): boolean {
    if (!this.isValid(row, col) || !this.isEmpty(row, col)) return false;
    this.cells[row][col] = unitId;
    return true;
  }

  remove(row: number, col: number): void {
    if (this.isValid(row, col)) {
      this.cells[row][col] = null;
    }
  }

  toPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2,
      y: GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  toGrid(x: number, y: number): { row: number; col: number } {
    return {
      row: Math.floor((y - GRID_OFFSET_Y) / TILE_SIZE),
      col: Math.floor((x - GRID_OFFSET_X) / TILE_SIZE),
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/grid-manager.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/systems/GridManager.ts tests/grid-manager.test.ts
git commit -m "feat: add GridManager with 5x10 grid, placement, and coordinate conversion"
```

---

### Task 5: EnergyManager — LukieCoin economy

**Files:**
- Create: `src/game/systems/EnergyManager.ts`
- Create: `tests/energy-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/energy-manager.test.ts
import { describe, it, expect } from 'vitest';
import { EnergyManager } from '../src/game/systems/EnergyManager';

describe('EnergyManager', () => {
  it('starts with the configured starting energy', () => {
    const em = new EnergyManager(50);
    expect(em.getEnergy()).toBe(50);
  });

  it('spends energy and returns true if affordable', () => {
    const em = new EnergyManager(100);
    expect(em.spend(60)).toBe(true);
    expect(em.getEnergy()).toBe(40);
  });

  it('rejects spend if not enough energy', () => {
    const em = new EnergyManager(30);
    expect(em.spend(50)).toBe(false);
    expect(em.getEnergy()).toBe(30);
  });

  it('adds energy from passive tick', () => {
    const em = new EnergyManager(50);
    em.addPassive(5);
    expect(em.getEnergy()).toBe(55);
  });

  it('adds energy from kill reward', () => {
    const em = new EnergyManager(50);
    em.addKillReward(10);
    expect(em.getEnergy()).toBe(60);
  });

  it('adds energy from producer', () => {
    const em = new EnergyManager(50);
    em.addFromProducer(25);
    expect(em.getEnergy()).toBe(75);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/energy-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement EnergyManager**

```typescript
// src/game/systems/EnergyManager.ts
export class EnergyManager {
  private energy: number;

  constructor(startingEnergy: number) {
    this.energy = startingEnergy;
  }

  getEnergy(): number {
    return this.energy;
  }

  spend(amount: number): boolean {
    if (amount > this.energy) return false;
    this.energy -= amount;
    return true;
  }

  addPassive(amount: number): void {
    this.energy += amount;
  }

  addKillReward(amount: number): void {
    this.energy += amount;
  }

  addFromProducer(amount: number): void {
    this.energy += amount;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/energy-manager.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/systems/EnergyManager.ts tests/energy-manager.test.ts
git commit -m "feat: add EnergyManager for LukieCoin economy"
```

---

### Task 6: Base Unit class

**Files:**
- Create: `src/game/entities/Unit.ts`
- Create: `tests/unit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit.test.ts
import { describe, it, expect } from 'vitest';
import { UnitState } from '../src/game/entities/Unit';

describe('UnitState', () => {
  it('initializes with full HP', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    expect(unit.hp).toBe(100);
    expect(unit.maxHp).toBe(100);
    expect(unit.isAlive()).toBe(true);
  });

  it('takes damage and reduces HP', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    unit.takeDamage(30);
    expect(unit.hp).toBe(70);
    expect(unit.isAlive()).toBe(true);
  });

  it('dies when HP reaches zero', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    unit.takeDamage(100);
    expect(unit.hp).toBe(0);
    expect(unit.isAlive()).toBe(false);
  });

  it('does not go below zero HP', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 50, 20, 1000, 9, 0);
    unit.takeDamage(999);
    expect(unit.hp).toBe(0);
  });

  it('tracks grid position', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    unit.setPosition(2, 5);
    expect(unit.row).toBe(2);
    expect(unit.col).toBe(5);
  });

  it('can attack if enough time elapsed since last attack', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    expect(unit.canAttack(0)).toBe(true);
    unit.recordAttack(0);
    expect(unit.canAttack(500)).toBe(false);
    expect(unit.canAttack(1000)).toBe(true);
  });

  it('stationary units have moveSpeed 0', () => {
    const unit = new UnitState('u1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    expect(unit.isStationary()).toBe(true);
  });

  it('mobile units have moveSpeed > 0', () => {
    const unit = new UnitState('u1', 'brainEater', 'zombies', 120, 25, 2000, 4, 1);
    expect(unit.isStationary()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement UnitState**

```typescript
// src/game/entities/Unit.ts
import type { Faction } from '../types';

export class UnitState {
  public readonly id: string;
  public readonly key: string;
  public readonly faction: Faction;
  public readonly maxHp: number;
  public readonly damage: number;
  public readonly attackSpeed: number; // ms between attacks
  public readonly range: number;       // tiles
  public readonly moveSpeed: number;   // tiles per second
  public hp: number;
  public row: number = 0;
  public col: number = 0;
  private lastAttackTime: number = -Infinity;

  constructor(
    id: string,
    key: string,
    faction: Faction,
    hp: number,
    damage: number,
    attackSpeed: number,
    range: number,
    moveSpeed: number,
  ) {
    this.id = id;
    this.key = key;
    this.faction = faction;
    this.maxHp = hp;
    this.hp = hp;
    this.damage = damage;
    this.attackSpeed = attackSpeed;
    this.range = range;
    this.moveSpeed = moveSpeed;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  setPosition(row: number, col: number): void {
    this.row = row;
    this.col = col;
  }

  canAttack(currentTime: number): boolean {
    if (this.attackSpeed === 0) return false;
    return currentTime - this.lastAttackTime >= this.attackSpeed;
  }

  recordAttack(currentTime: number): void {
    this.lastAttackTime = currentTime;
  }

  isStationary(): boolean {
    return this.moveSpeed === 0;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/entities/Unit.ts tests/unit.test.ts
git commit -m "feat: add UnitState class with HP, damage, position, and attack timing"
```

---

### Task 7: CombatManager — damage and projectile logic

**Files:**
- Create: `src/game/systems/CombatManager.ts`
- Create: `src/game/entities/Projectile.ts`
- Create: `tests/combat-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/combat-manager.test.ts
import { describe, it, expect } from 'vitest';
import { CombatManager } from '../src/game/systems/CombatManager';
import { UnitState } from '../src/game/entities/Unit';

describe('CombatManager', () => {
  it('finds enemies in range for a ranged plant (same row, ahead)', () => {
    const cm = new CombatManager();
    const plant = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    plant.setPosition(2, 1);
    const zombie = new UnitState('z1', 'brainEater', 'zombies', 120, 25, 2000, 4, 1);
    zombie.setPosition(2, 7);
    const units = [plant, zombie];
    const target = cm.findTarget(plant, units);
    expect(target).not.toBeNull();
    expect(target!.id).toBe('z1');
  });

  it('returns null when no enemies in range', () => {
    const cm = new CombatManager();
    const plant = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 2, 0);
    plant.setPosition(2, 0);
    const zombie = new UnitState('z1', 'brainEater', 'zombies', 120, 25, 2000, 4, 1);
    zombie.setPosition(2, 8);
    const target = cm.findTarget(plant, [plant, zombie]);
    expect(target).toBeNull();
  });

  it('does not target same-faction units', () => {
    const cm = new CombatManager();
    const p1 = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    p1.setPosition(2, 1);
    const p2 = new UnitState('p2', 'sunflower', 'plants', 75, 10, 1500, 3, 0);
    p2.setPosition(2, 3);
    const target = cm.findTarget(p1, [p1, p2]);
    expect(target).toBeNull();
  });

  it('plants target enemies to the right (higher col)', () => {
    const cm = new CombatManager();
    const plant = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    plant.setPosition(2, 5);
    const zombieBehind = new UnitState('z1', 'brainEater', 'zombies', 120, 25, 2000, 4, 1);
    zombieBehind.setPosition(2, 2); // behind the plant
    const target = cm.findTarget(plant, [plant, zombieBehind]);
    expect(target).toBeNull();
  });

  it('zombies target enemies to the left (lower col)', () => {
    const cm = new CombatManager();
    const zombie = new UnitState('z1', 'brainEater', 'zombies', 120, 25, 2000, 4, 1);
    zombie.setPosition(2, 5);
    const plant = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    plant.setPosition(2, 3);
    const target = cm.findTarget(zombie, [zombie, plant]);
    expect(target).not.toBeNull();
    expect(target!.id).toBe('p1');
  });

  it('melee units only target adjacent tiles', () => {
    const cm = new CombatManager();
    const zombie = new UnitState('z1', 'veryFastWalker', 'zombies', 60, 15, 800, 0, 3);
    zombie.setPosition(2, 5);
    const plant = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    plant.setPosition(2, 4); // adjacent
    const target = cm.findTarget(zombie, [zombie, plant]);
    expect(target).not.toBeNull();
  });

  it('melee units cannot target non-adjacent units', () => {
    const cm = new CombatManager();
    const zombie = new UnitState('z1', 'veryFastWalker', 'zombies', 60, 15, 800, 0, 3);
    zombie.setPosition(2, 5);
    const plant = new UnitState('p1', 'peashooter', 'plants', 100, 20, 1000, 9, 0);
    plant.setPosition(2, 2); // not adjacent
    const target = cm.findTarget(zombie, [zombie, plant]);
    expect(target).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/combat-manager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement CombatManager**

```typescript
// src/game/systems/CombatManager.ts
import { UnitState } from '../entities/Unit';

export class CombatManager {
  /**
   * Find the nearest valid target for a unit.
   * Plants look right (higher col). Zombies look left (lower col).
   * Melee units (range 0) can only target the adjacent tile.
   */
  findTarget(attacker: UnitState, allUnits: UnitState[]): UnitState | null {
    const effectiveRange = attacker.range === 0 ? 1 : attacker.range;
    let bestTarget: UnitState | null = null;
    let bestDistance = Infinity;

    for (const unit of allUnits) {
      if (unit.faction === attacker.faction) continue;
      if (!unit.isAlive()) continue;
      if (unit.row !== attacker.row) continue;

      const distance = unit.col - attacker.col;

      // Plants attack right (positive distance), zombies attack left (negative distance)
      if (attacker.faction === 'plants' && distance <= 0) continue;
      if (attacker.faction === 'zombies' && distance >= 0) continue;

      const absDistance = Math.abs(distance);
      if (absDistance > effectiveRange) continue;

      if (absDistance < bestDistance) {
        bestDistance = absDistance;
        bestTarget = unit;
      }
    }

    return bestTarget;
  }
}
```

- [ ] **Step 4: Create Projectile.ts**

```typescript
// src/game/entities/Projectile.ts
import type { Faction } from '../types';

export interface ProjectileConfig {
  textureKey: string;
  damage: number;
  speed: number; // pixels per second
  faction: Faction;
}

export const PROJECTILE_CONFIGS: Record<string, ProjectileConfig> = {
  pea: { textureKey: 'pea', damage: 20, speed: 300, faction: 'plants' },
  kernel: { textureKey: 'kernel', damage: 10, speed: 250, faction: 'plants' },
  brain: { textureKey: 'brain', damage: 25, speed: 200, faction: 'zombies' },
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/combat-manager.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems/CombatManager.ts src/game/entities/Projectile.ts tests/combat-manager.test.ts
git commit -m "feat: add CombatManager targeting logic and Projectile configs"
```

---

### Task 8: BattleScene — render grid and bases

**Files:**
- Create: `src/game/scenes/BattleScene.ts`

- [ ] **Step 1: Create BattleScene with grid rendering**

```typescript
// src/game/scenes/BattleScene.ts
import Phaser from 'phaser';
import { GRID_ROWS, GRID_COLS, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, GAME_WIDTH, BASE_HP, STARTING_ENERGY } from '../constants';
import { GridManager } from '../systems/GridManager';
import { EnergyManager } from '../systems/EnergyManager';
import { CombatManager } from '../systems/CombatManager';
import { UnitState } from '../entities/Unit';
import type { Faction } from '../types';

export class BattleScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private energyManager!: EnergyManager;
  private combatManager!: CombatManager;
  private playerFaction: Faction = 'plants';
  private units: Map<string, { state: UnitState; sprite: Phaser.GameObjects.Sprite }> = new Map();
  private projectiles!: Phaser.Physics.Arcade.Group;
  private unitIdCounter = 0;
  private plantBaseHp = BASE_HP;
  private zombieBaseHp = BASE_HP;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.gridManager = new GridManager();
    this.energyManager = new EnergyManager(STARTING_ENERGY);
    this.combatManager = new CombatManager();
    this.projectiles = this.physics.add.group();

    this.drawGrid();
    this.drawBases();
  }

  update(time: number, delta: number): void {
    // Will be filled in subsequent tasks
  }

  private drawGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const { x, y } = this.gridManager.toPixel(row, col);
        const tileKey = (row + col) % 2 === 0 ? 'tile' : 'tileDark';
        this.add.sprite(x, y, tileKey);
      }
    }
  }

  private drawBases(): void {
    // Plant base on the left
    const plantBaseX = GRID_OFFSET_X - TILE_SIZE / 2 - 10;
    for (let row = 0; row < GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
      this.add.sprite(plantBaseX, y, 'base').setTint(0x00cc00);
    }
    this.add.text(plantBaseX - 20, GRID_OFFSET_Y - 30, 'PLANT\nBASE', {
      fontSize: '12px',
      color: '#00cc00',
      align: 'center',
    });

    // Zombie base on the right
    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2 + 10;
    for (let row = 0; row < GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
      this.add.sprite(zombieBaseX, y, 'base').setTint(0x884488);
    }
    this.add.text(zombieBaseX - 20, GRID_OFFSET_Y - 30, 'ZOMBIE\nBASE', {
      fontSize: '12px',
      color: '#884488',
      align: 'center',
    });
  }
}
```

- [ ] **Step 2: Run dev server and verify grid + bases render**

```bash
npm run dev
```

Expected: 5x10 checkerboard grid with green plant base on the left and purple zombie base on the right.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/BattleScene.ts
git commit -m "feat: add BattleScene with grid and base rendering"
```

---

### Task 9: GameOverScene

**Files:**
- Create: `src/game/scenes/GameOverScene.ts`

- [ ] **Step 1: Create GameOverScene**

```typescript
// src/game/scenes/GameOverScene.ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: { winner: 'plants' | 'zombies' }): void {
    const isPlantWin = data.winner === 'plants';
    const color = isPlantWin ? '#00cc00' : '#884488';
    const message = isPlantWin ? 'PLANTS WIN!' : 'ZOMBIES WIN!';

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, message, {
      fontSize: '48px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Click to play again', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive();

    restartText.on('pointerdown', () => {
      this.scene.start('BattleScene');
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/GameOverScene.ts
git commit -m "feat: add GameOverScene with restart"
```

---

### Task 10: HUD — energy display and unit bar

**Files:**
- Create: `src/game/ui/HUD.ts`
- Create: `src/game/ui/HealthBar.ts`

- [ ] **Step 1: Create HealthBar utility**

```typescript
// src/game/ui/HealthBar.ts
import Phaser from 'phaser';

export class HealthBar {
  private bar: Phaser.GameObjects.Graphics;
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number = 40, height: number = 6) {
    this.bar = scene.add.graphics();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  update(current: number, max: number): void {
    this.bar.clear();
    const ratio = Math.max(0, current / max);

    // Background (red)
    this.bar.fillStyle(0xff0000);
    this.bar.fillRect(this.x - this.width / 2, this.y, this.width, this.height);

    // Foreground (green)
    this.bar.fillStyle(0x00ff00);
    this.bar.fillRect(this.x - this.width / 2, this.y, this.width * ratio, this.height);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  destroy(): void {
    this.bar.destroy();
  }
}
```

- [ ] **Step 2: Create HUD**

```typescript
// src/game/ui/HUD.ts
import Phaser from 'phaser';
import { EnergyManager } from '../systems/EnergyManager';
import { GAME_WIDTH, GAME_HEIGHT, UNIT_COSTS, TILE_SIZE } from '../constants';

export interface UnitCard {
  key: string;
  label: string;
  cost: number;
  textureKey: string;
}

export class HUD {
  private scene: Phaser.Scene;
  private energyText!: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.Container[] = [];
  private onCardDragStart: (key: string) => void;

  constructor(scene: Phaser.Scene, unitCards: UnitCard[], onCardDragStart: (key: string) => void) {
    this.scene = scene;
    this.onCardDragStart = onCardDragStart;
    this.createEnergyDisplay();
    this.createUnitBar(unitCards);
  }

  updateEnergy(energy: number): void {
    this.energyText.setText(`LukieCoins: ${energy}`);
  }

  private createEnergyDisplay(): void {
    this.energyText = this.scene.add.text(16, 16, 'LukieCoins: 0', {
      fontSize: '20px',
      color: '#ffcc00',
      fontStyle: 'bold',
    });
  }

  private createUnitBar(unitCards: UnitCard[]): void {
    const barY = GAME_HEIGHT - 70;
    const startX = GAME_WIDTH / 2 - (unitCards.length * 80) / 2;

    unitCards.forEach((card, i) => {
      const x = startX + i * 80 + 40;
      const container = this.scene.add.container(x, barY);

      // Card background
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x333333, 0.8);
      bg.fillRoundedRect(-35, -30, 70, 60, 8);
      container.add(bg);

      // Unit sprite preview
      const preview = this.scene.add.sprite(0, -10, card.textureKey).setScale(0.6);
      container.add(preview);

      // Cost text
      const costText = this.scene.add.text(0, 18, `${card.cost}`, {
        fontSize: '12px',
        color: '#ffcc00',
        align: 'center',
      }).setOrigin(0.5);
      container.add(costText);

      // Make interactive for drag
      const hitArea = this.scene.add.rectangle(0, 0, 70, 60).setInteractive({ draggable: true });
      hitArea.setData('unitKey', card.key);
      container.add(hitArea);

      this.cards.push(container);
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/HUD.ts src/game/ui/HealthBar.ts
git commit -m "feat: add HUD with energy display and unit card bar"
```

---

### Task 11: DragDropManager — placing units on the grid

**Files:**
- Create: `src/game/systems/DragDropManager.ts`

- [ ] **Step 1: Create DragDropManager**

```typescript
// src/game/systems/DragDropManager.ts
import Phaser from 'phaser';
import { GridManager } from './GridManager';
import { EnergyManager } from './EnergyManager';
import { UNIT_COSTS, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, GRID_ROWS, GRID_COLS } from '../constants';
import type { Faction } from '../types';

export type PlaceUnitCallback = (unitKey: string, row: number, col: number) => void;

export class DragDropManager {
  private scene: Phaser.Scene;
  private gridManager: GridManager;
  private energyManager: EnergyManager;
  private playerFaction: Faction;
  private onPlaceUnit: PlaceUnitCallback;
  private dragPreview: Phaser.GameObjects.Sprite | null = null;
  private currentDragKey: string | null = null;

  constructor(
    scene: Phaser.Scene,
    gridManager: GridManager,
    energyManager: EnergyManager,
    playerFaction: Faction,
    onPlaceUnit: PlaceUnitCallback,
  ) {
    this.scene = scene;
    this.gridManager = gridManager;
    this.energyManager = energyManager;
    this.playerFaction = playerFaction;
    this.onPlaceUnit = onPlaceUnit;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.scene.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const key = gameObject.getData('unitKey') as string;
      if (!key) return;
      const cost = UNIT_COSTS[key];
      if (this.energyManager.getEnergy() < cost) return;

      this.currentDragKey = key;
      this.dragPreview = this.scene.add.sprite(0, 0, key).setAlpha(0.6);
    });

    this.scene.input.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this.dragPreview) {
        this.dragPreview.setPosition(pointer.x, pointer.y);
      }
    });

    this.scene.input.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragPreview || !this.currentDragKey) {
        this.cleanup();
        return;
      }

      const { row, col } = this.gridManager.toGrid(pointer.x, pointer.y);

      // Validate placement zone: plants on left half (cols 0-4), zombies on right half (cols 5-9)
      const validCol = this.playerFaction === 'plants'
        ? col >= 0 && col <= 4
        : col >= 5 && col <= 9;

      if (this.gridManager.isValid(row, col) && validCol && this.gridManager.isEmpty(row, col)) {
        const cost = UNIT_COSTS[this.currentDragKey];
        if (this.energyManager.spend(cost)) {
          this.onPlaceUnit(this.currentDragKey, row, col);
        }
      }

      this.cleanup();
    });
  }

  private cleanup(): void {
    if (this.dragPreview) {
      this.dragPreview.destroy();
      this.dragPreview = null;
    }
    this.currentDragKey = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/systems/DragDropManager.ts
git commit -m "feat: add DragDropManager for unit placement via drag-and-drop"
```

---

### Task 12: WaveManager — AI spawns enemy units

**Files:**
- Create: `src/game/systems/WaveManager.ts`

- [ ] **Step 1: Create WaveManager**

```typescript
// src/game/systems/WaveManager.ts
import type { Faction } from '../types';

export type SpawnCallback = (unitKey: string, row: number) => void;

export class WaveManager {
  private aiFaction: Faction;
  private onSpawn: SpawnCallback;
  private spawnInterval: number = 4000; // ms between spawns
  private lastSpawnTime: number = 0;
  private availableUnits: string[];

  constructor(aiFaction: Faction, onSpawn: SpawnCallback) {
    this.aiFaction = aiFaction;
    this.onSpawn = onSpawn;

    // AI picks from the opposite faction's units
    this.availableUnits = aiFaction === 'zombies'
      ? ['brainEater', 'veryFastWalker', 'skeletonWarrior']
      : ['peashooter', 'sunflower', 'walnutBomb'];
  }

  update(time: number): void {
    if (time - this.lastSpawnTime < this.spawnInterval) return;
    this.lastSpawnTime = time;

    const unitKey = this.availableUnits[Math.floor(Math.random() * this.availableUnits.length)];
    const row = Math.floor(Math.random() * 5);
    this.onSpawn(unitKey, row);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/systems/WaveManager.ts
git commit -m "feat: add WaveManager for AI unit spawning"
```

---

### Task 13: Plant entities — Peashooter, Sunflower, WalnutBomb

**Files:**
- Create: `src/game/entities/plants/Peashooter.ts`
- Create: `src/game/entities/plants/Sunflower.ts`
- Create: `src/game/entities/plants/WalnutBomb.ts`

- [ ] **Step 1: Create Peashooter**

```typescript
// src/game/entities/plants/Peashooter.ts
import { UnitState } from '../Unit';
import { UNIT_STATS, UNIT_COSTS } from '../../constants';

const stats = UNIT_STATS.peashooter;

export function createPeashooter(id: string): UnitState {
  return new UnitState(id, 'peashooter', 'plants', stats.hp, stats.damage, stats.attackSpeed, stats.range, stats.moveSpeed);
}

export const PEASHOOTER_PROJECTILE = 'pea';
```

- [ ] **Step 2: Create Sunflower**

```typescript
// src/game/entities/plants/Sunflower.ts
import { UnitState } from '../Unit';
import { UNIT_STATS } from '../../constants';

const stats = UNIT_STATS.sunflower;

export function createSunflower(id: string): UnitState {
  return new UnitState(id, 'sunflower', 'plants', stats.hp, stats.damage, stats.attackSpeed, stats.range, stats.moveSpeed);
}

export const SUNFLOWER_PROJECTILE = 'kernel';
export const SUNFLOWER_ENERGY_INTERVAL = 5000; // ms between energy drops
export const SUNFLOWER_ENERGY_AMOUNT = 25;
```

- [ ] **Step 3: Create WalnutBomb**

```typescript
// src/game/entities/plants/WalnutBomb.ts
import { UnitState } from '../Unit';
import { UNIT_STATS } from '../../constants';

const stats = UNIT_STATS.walnutBomb;

export function createWalnutBomb(id: string): UnitState {
  return new UnitState(id, 'walnutBomb', 'plants', stats.hp, stats.damage, stats.attackSpeed, stats.range, stats.moveSpeed);
}

// WalnutBomb doesn't shoot — it explodes on death, dealing AOE damage
export const WALNUT_EXPLOSION_RADIUS = 1; // tiles around it
export const WALNUT_EXPLOSION_DAMAGE = 80;
```

- [ ] **Step 4: Commit**

```bash
git add src/game/entities/plants/
git commit -m "feat: add Peashooter, Sunflower, and WalnutBomb plant factories"
```

---

### Task 14: Zombie entities — BrainEater, VeryFastWalker, SkeletonWarrior

**Files:**
- Create: `src/game/entities/zombies/BrainEater.ts`
- Create: `src/game/entities/zombies/VeryFastWalker.ts`
- Create: `src/game/entities/zombies/SkeletonWarrior.ts`

- [ ] **Step 1: Create BrainEater**

```typescript
// src/game/entities/zombies/BrainEater.ts
import { UnitState } from '../Unit';
import { UNIT_STATS } from '../../constants';

const stats = UNIT_STATS.brainEater;

export function createBrainEater(id: string): UnitState {
  return new UnitState(id, 'brainEater', 'zombies', stats.hp, stats.damage, stats.attackSpeed, stats.range, stats.moveSpeed);
}

export const BRAIN_EATER_PROJECTILE = 'brain';
export const BRAIN_EATER_BITE_DAMAGE = 40; // bonus melee damage when adjacent
```

- [ ] **Step 2: Create VeryFastWalker**

```typescript
// src/game/entities/zombies/VeryFastWalker.ts
import { UnitState } from '../Unit';
import { UNIT_STATS } from '../../constants';

const stats = UNIT_STATS.veryFastWalker;

export function createVeryFastWalker(id: string): UnitState {
  return new UnitState(id, 'veryFastWalker', 'zombies', stats.hp, stats.damage, stats.attackSpeed, stats.range, stats.moveSpeed);
}

// VeryFastWalker is pure melee — no projectile, just fast movement + bite
```

- [ ] **Step 3: Create SkeletonWarrior**

```typescript
// src/game/entities/zombies/SkeletonWarrior.ts
import { UnitState } from '../Unit';
import { UNIT_STATS } from '../../constants';

const stats = UNIT_STATS.skeletonWarrior;

export function createSkeletonWarrior(id: string): UnitState {
  return new UnitState(id, 'skeletonWarrior', 'zombies', stats.hp, stats.damage, stats.attackSpeed, stats.range, stats.moveSpeed);
}

export const SKELETON_BLOCK_COOLDOWN = 4000; // ms between projectile blocks
```

- [ ] **Step 4: Commit**

```bash
git add src/game/entities/zombies/
git commit -m "feat: add BrainEater, VeryFastWalker, and SkeletonWarrior zombie factories"
```

---

### Task 15: Wire everything together in BattleScene

**Files:**
- Modify: `src/game/scenes/BattleScene.ts`

This is the big integration task. BattleScene gets its full `create()` and `update()` loop wired up with all managers, unit spawning, combat, movement, projectiles, energy, HUD, health bars, and win condition.

- [ ] **Step 1: Rewrite BattleScene with full game loop**

```typescript
// src/game/scenes/BattleScene.ts
import Phaser from 'phaser';
import {
  GRID_ROWS, GRID_COLS, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y,
  GAME_WIDTH, GAME_HEIGHT, BASE_HP, STARTING_ENERGY,
  UNIT_COSTS, UNIT_STATS, ENERGY_TICK_INTERVAL, ENERGY_TICK_AMOUNT, ENERGY_KILL_REWARD,
} from '../constants';
import { GridManager } from '../systems/GridManager';
import { EnergyManager } from '../systems/EnergyManager';
import { CombatManager } from '../systems/CombatManager';
import { WaveManager } from '../systems/WaveManager';
import { DragDropManager } from '../systems/DragDropManager';
import { UnitState } from '../entities/Unit';
import { HUD, type UnitCard } from '../ui/HUD';
import { HealthBar } from '../ui/HealthBar';
import { PROJECTILE_CONFIGS } from '../entities/Projectile';
import { createPeashooter, PEASHOOTER_PROJECTILE } from '../entities/plants/Peashooter';
import { createSunflower, SUNFLOWER_PROJECTILE, SUNFLOWER_ENERGY_INTERVAL, SUNFLOWER_ENERGY_AMOUNT } from '../entities/plants/Sunflower';
import { createWalnutBomb, WALNUT_EXPLOSION_RADIUS, WALNUT_EXPLOSION_DAMAGE } from '../entities/plants/WalnutBomb';
import { createBrainEater, BRAIN_EATER_PROJECTILE, BRAIN_EATER_BITE_DAMAGE } from '../entities/zombies/BrainEater';
import { createVeryFastWalker } from '../entities/zombies/VeryFastWalker';
import { createSkeletonWarrior, SKELETON_BLOCK_COOLDOWN } from '../entities/zombies/SkeletonWarrior';
import type { Faction } from '../types';

interface ActiveUnit {
  state: UnitState;
  sprite: Phaser.GameObjects.Sprite;
  healthBar: HealthBar;
  lastProducerTick?: number;
  lastBlockTime?: number;
}

const UNIT_FACTORIES: Record<string, (id: string) => UnitState> = {
  peashooter: createPeashooter,
  sunflower: createSunflower,
  walnutBomb: createWalnutBomb,
  brainEater: createBrainEater,
  veryFastWalker: createVeryFastWalker,
  skeletonWarrior: createSkeletonWarrior,
};

const PROJECTILE_MAP: Record<string, string> = {
  peashooter: PEASHOOTER_PROJECTILE,
  sunflower: SUNFLOWER_PROJECTILE,
  brainEater: BRAIN_EATER_PROJECTILE,
};

export class BattleScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private energyManager!: EnergyManager;
  private combatManager!: CombatManager;
  private waveManager!: WaveManager;
  private dragDropManager!: DragDropManager;
  private hud!: HUD;

  private playerFaction: Faction = 'plants';
  private units: Map<string, ActiveUnit> = new Map();
  private projectiles!: Phaser.Physics.Arcade.Group;
  private unitIdCounter = 0;

  private plantBaseHp = BASE_HP;
  private zombieBaseHp = BASE_HP;
  private plantBaseBar!: HealthBar;
  private zombieBaseBar!: HealthBar;

  private lastEnergyTick = 0;
  private gameEnded = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.units.clear();
    this.unitIdCounter = 0;
    this.plantBaseHp = BASE_HP;
    this.zombieBaseHp = BASE_HP;
    this.lastEnergyTick = 0;
    this.gameEnded = false;

    this.gridManager = new GridManager();
    this.energyManager = new EnergyManager(STARTING_ENERGY);
    this.combatManager = new CombatManager();
    this.projectiles = this.physics.add.group();

    this.drawGrid();
    this.drawBases();
    this.setupHUD();

    const aiFaction: Faction = this.playerFaction === 'plants' ? 'zombies' : 'plants';
    this.waveManager = new WaveManager(aiFaction, (unitKey, row) => {
      const col = aiFaction === 'zombies' ? GRID_COLS - 1 : 0;
      this.spawnUnit(unitKey, row, col, aiFaction);
    });

    this.dragDropManager = new DragDropManager(
      this, this.gridManager, this.energyManager, this.playerFaction,
      (unitKey, row, col) => this.spawnUnit(unitKey, row, col, this.playerFaction),
    );
  }

  update(time: number, delta: number): void {
    if (this.gameEnded) return;

    this.updateEnergyTick(time);
    this.updateSunflowerProducers(time);
    this.waveManager.update(time);
    this.updateMovement(delta);
    this.updateCombat(time);
    this.updateProjectileCollisions();
    this.updateBaseCollisions();
    this.cleanupDeadUnits();
    this.hud.updateEnergy(this.energyManager.getEnergy());
    this.plantBaseBar.update(this.plantBaseHp, BASE_HP);
    this.zombieBaseBar.update(this.zombieBaseHp, BASE_HP);
    this.checkWinCondition();
  }

  private spawnUnit(unitKey: string, row: number, col: number, faction: Faction): void {
    if (!this.gridManager.isEmpty(row, col)) return;

    const id = `unit-${this.unitIdCounter++}`;
    const factory = UNIT_FACTORIES[unitKey];
    if (!factory) return;

    const state = factory(id);
    // Override faction for AI-spawned units of the opposite type
    (state as any).faction = faction;
    state.setPosition(row, col);
    this.gridManager.place(row, col, id);

    const { x, y } = this.gridManager.toPixel(row, col);
    const sprite = this.add.sprite(x, y, unitKey);
    const healthBar = new HealthBar(this, x, y - TILE_SIZE / 2 + 2, TILE_SIZE - 16, 4);
    healthBar.update(state.hp, state.maxHp);

    this.units.set(id, { state, sprite, healthBar });
  }

  private updateEnergyTick(time: number): void {
    if (time - this.lastEnergyTick >= ENERGY_TICK_INTERVAL) {
      this.energyManager.addPassive(ENERGY_TICK_AMOUNT);
      this.lastEnergyTick = time;
    }
  }

  private updateSunflowerProducers(time: number): void {
    for (const [, unit] of this.units) {
      if (unit.state.key !== 'sunflower' || unit.state.faction !== this.playerFaction) continue;
      if (!unit.state.isAlive()) continue;

      const lastTick = unit.lastProducerTick ?? 0;
      if (time - lastTick >= SUNFLOWER_ENERGY_INTERVAL) {
        this.energyManager.addFromProducer(SUNFLOWER_ENERGY_AMOUNT);
        unit.lastProducerTick = time;
      }
    }
  }

  private updateMovement(delta: number): void {
    for (const [, unit] of this.units) {
      if (unit.state.isStationary() || !unit.state.isAlive()) continue;

      const direction = unit.state.faction === 'zombies' ? -1 : 1;
      const pixelSpeed = unit.state.moveSpeed * TILE_SIZE * (delta / 1000);

      // Check if there's an enemy in the adjacent tile (stop to fight)
      const nextCol = unit.state.col + direction;
      const allStates = Array.from(this.units.values()).map(u => u.state);
      const adjacentEnemy = allStates.find(u =>
        u.isAlive() && u.faction !== unit.state.faction && u.row === unit.state.row && u.col === nextCol
      );
      if (adjacentEnemy) continue; // Stop moving, will attack in combat phase

      // Move the sprite smoothly
      unit.sprite.x += direction * pixelSpeed;
      unit.healthBar.setPosition(unit.sprite.x, unit.sprite.y - TILE_SIZE / 2 + 2);

      // Update grid position when crossing tile boundary
      const { row, col } = this.gridManager.toGrid(unit.sprite.x, unit.sprite.y);
      if (col !== unit.state.col && this.gridManager.isValid(row, col)) {
        this.gridManager.remove(unit.state.row, unit.state.col);
        if (this.gridManager.isEmpty(row, col)) {
          this.gridManager.place(row, col, unit.state.id);
          unit.state.setPosition(row, col);
        } else {
          // Can't move into occupied tile, snap back
          this.gridManager.place(unit.state.row, unit.state.col, unit.state.id);
          const snapPos = this.gridManager.toPixel(unit.state.row, unit.state.col);
          unit.sprite.x = snapPos.x;
        }
      }
    }
  }

  private updateCombat(time: number): void {
    const allStates = Array.from(this.units.values()).map(u => u.state);

    for (const [, unit] of this.units) {
      if (!unit.state.isAlive() || !unit.state.canAttack(time)) continue;
      if (unit.state.key === 'walnutBomb') continue; // Walnut doesn't attack

      const target = this.combatManager.findTarget(unit.state, allStates);
      if (!target) continue;

      unit.state.recordAttack(time);

      const projectileKey = PROJECTILE_MAP[unit.state.key];
      if (projectileKey) {
        // Ranged attack — spawn projectile
        this.fireProjectile(unit.state, projectileKey);
      } else {
        // Melee attack — direct damage
        target.takeDamage(unit.state.damage);
        const targetUnit = this.units.get(target.id);
        if (targetUnit) {
          targetUnit.healthBar.update(target.hp, target.maxHp);
        }
      }
    }
  }

  private fireProjectile(attacker: UnitState, projectileKey: string): void {
    const config = PROJECTILE_CONFIGS[projectileKey];
    if (!config) return;

    const { x, y } = this.gridManager.toPixel(attacker.row, attacker.col);
    const proj = this.projectiles.create(x, y, config.textureKey) as Phaser.Physics.Arcade.Sprite;
    const direction = attacker.faction === 'plants' ? 1 : -1;
    proj.setVelocityX(config.speed * direction);
    proj.setData('damage', config.damage);
    proj.setData('faction', attacker.faction);

    // Destroy projectile when it leaves the screen
    proj.setData('checkBounds', true);
  }

  private updateProjectileCollisions(): void {
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Sprite[];

    for (const proj of projectiles) {
      // Remove off-screen projectiles
      if (proj.x < 0 || proj.x > GAME_WIDTH) {
        proj.destroy();
        continue;
      }

      const projFaction = proj.getData('faction') as Faction;
      const projDamage = proj.getData('damage') as number;

      for (const [, unit] of this.units) {
        if (!unit.state.isAlive()) continue;
        if (unit.state.faction === projFaction) continue;

        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, unit.sprite.x, unit.sprite.y);
        if (dist < TILE_SIZE / 2) {
          // Skeleton Warrior block check
          if (unit.state.key === 'skeletonWarrior') {
            const lastBlock = (unit as any).lastBlockTime ?? 0;
            const now = this.time.now;
            if (now - lastBlock >= SKELETON_BLOCK_COOLDOWN) {
              (unit as any).lastBlockTime = now;
              proj.destroy();
              continue; // Blocked!
            }
          }

          unit.state.takeDamage(projDamage);
          unit.healthBar.update(unit.state.hp, unit.state.maxHp);
          proj.destroy();
          break;
        }
      }
    }
  }

  private updateBaseCollisions(): void {
    for (const [, unit] of this.units) {
      if (!unit.state.isAlive()) continue;

      // Zombies reaching plant base (left edge)
      if (unit.state.faction === 'zombies' && unit.sprite.x <= GRID_OFFSET_X) {
        this.plantBaseHp -= unit.state.damage;
        unit.state.takeDamage(unit.state.maxHp); // Unit dies on base hit
      }

      // Plants shooting zombie base — handled by projectiles going off right edge
    }

    // Projectiles hitting zombie base (right edge)
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE;
    for (const proj of projectiles) {
      if (proj.getData('faction') === 'plants' && proj.x >= zombieBaseX) {
        this.zombieBaseHp -= proj.getData('damage') as number;
        proj.destroy();
      }
    }

    // Projectiles hitting plant base (left edge)
    for (const proj of projectiles) {
      if (!proj.active) continue;
      if (proj.getData('faction') === 'zombies' && proj.x <= GRID_OFFSET_X) {
        this.plantBaseHp -= proj.getData('damage') as number;
        proj.destroy();
      }
    }
  }

  private cleanupDeadUnits(): void {
    for (const [id, unit] of this.units) {
      if (unit.state.isAlive()) continue;

      // WalnutBomb explosion on death
      if (unit.state.key === 'walnutBomb') {
        this.walnutExplosion(unit.state.row, unit.state.col);
      }

      // Kill reward for player
      if (unit.state.faction !== this.playerFaction) {
        this.energyManager.addKillReward(ENERGY_KILL_REWARD);
      }

      this.gridManager.remove(unit.state.row, unit.state.col);
      unit.sprite.destroy();
      unit.healthBar.destroy();
      this.units.delete(id);
    }
  }

  private walnutExplosion(row: number, col: number): void {
    for (const [, unit] of this.units) {
      if (!unit.state.isAlive()) continue;
      const rowDist = Math.abs(unit.state.row - row);
      const colDist = Math.abs(unit.state.col - col);
      if (rowDist <= WALNUT_EXPLOSION_RADIUS && colDist <= WALNUT_EXPLOSION_RADIUS) {
        if (unit.state.faction === 'zombies') {
          unit.state.takeDamage(WALNUT_EXPLOSION_DAMAGE);
          unit.healthBar.update(unit.state.hp, unit.state.maxHp);
        }
      }
    }
  }

  private checkWinCondition(): void {
    if (this.plantBaseHp <= 0) {
      this.gameEnded = true;
      this.scene.start('GameOverScene', { winner: 'zombies' });
    } else if (this.zombieBaseHp <= 0) {
      this.gameEnded = true;
      this.scene.start('GameOverScene', { winner: 'plants' });
    }
  }

  private setupHUD(): void {
    const plantCards: UnitCard[] = [
      { key: 'peashooter', label: 'Peashooter', cost: UNIT_COSTS.peashooter, textureKey: 'peashooter' },
      { key: 'sunflower', label: 'Sunflower', cost: UNIT_COSTS.sunflower, textureKey: 'sunflower' },
      { key: 'walnutBomb', label: 'Walnut-Bomb', cost: UNIT_COSTS.walnutBomb, textureKey: 'walnutBomb' },
    ];
    const zombieCards: UnitCard[] = [
      { key: 'brainEater', label: 'Brain Eater', cost: UNIT_COSTS.brainEater, textureKey: 'brainEater' },
      { key: 'veryFastWalker', label: 'Fast Walker', cost: UNIT_COSTS.veryFastWalker, textureKey: 'veryFastWalker' },
      { key: 'skeletonWarrior', label: 'Skeleton', cost: UNIT_COSTS.skeletonWarrior, textureKey: 'skeletonWarrior' },
    ];

    const cards = this.playerFaction === 'plants' ? plantCards : zombieCards;
    this.hud = new HUD(this, cards, () => {});
    this.hud.updateEnergy(this.energyManager.getEnergy());

    // Base health bars
    const plantBaseX = GRID_OFFSET_X - TILE_SIZE / 2 - 10;
    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2 + 10;
    const barY = GRID_OFFSET_Y - 15;
    this.plantBaseBar = new HealthBar(this, plantBaseX, barY, 50, 8);
    this.zombieBaseBar = new HealthBar(this, zombieBaseX, barY, 50, 8);
    this.plantBaseBar.update(this.plantBaseHp, BASE_HP);
    this.zombieBaseBar.update(this.zombieBaseHp, BASE_HP);
  }

  private drawGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const { x, y } = this.gridManager.toPixel(row, col);
        const tileKey = (row + col) % 2 === 0 ? 'tile' : 'tileDark';
        this.add.sprite(x, y, tileKey);
      }
    }
  }

  private drawBases(): void {
    const plantBaseX = GRID_OFFSET_X - TILE_SIZE / 2 - 10;
    for (let row = 0; row < GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
      this.add.sprite(plantBaseX, y, 'base').setTint(0x00cc00);
    }
    this.add.text(plantBaseX - 20, GRID_OFFSET_Y - 30, 'PLANT\nBASE', {
      fontSize: '12px', color: '#00cc00', align: 'center',
    });

    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2 + 10;
    for (let row = 0; row < GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
      this.add.sprite(zombieBaseX, y, 'base').setTint(0x884488);
    }
    this.add.text(zombieBaseX - 20, GRID_OFFSET_Y - 30, 'ZOMBIE\nBASE', {
      fontSize: '12px', color: '#884488', align: 'center',
    });
  }
}
```

- [ ] **Step 2: Run dev server and play-test**

```bash
npm run dev
```

Expected: Grid renders with bases. AI spawns zombies from the right. Player can drag Peashooter/Sunflower/WalnutBomb onto the left half. Units fight. Projectiles fly. Health bars deplete. Game ends when a base is destroyed.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (grid, energy, combat, unit).

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/BattleScene.ts
git commit -m "feat: wire full game loop — combat, movement, projectiles, energy, win condition"
```

---

### Task 16: Manual play-test and bug fix pass

- [ ] **Step 1: Play 3 full rounds as Plants and note issues**

Start the dev server and play through 3 complete battles. Check:
- Drag-and-drop works reliably
- Zombies walk toward plant base
- Peashooter shoots peas that hit zombies
- Sunflower generates energy every 5 seconds
- WalnutBomb absorbs damage and explodes on death
- Skeleton Warrior blocks a projectile periodically
- Very Fast Walker moves faster than other zombies
- Brain Eater throws brain projectiles
- Energy display updates correctly
- Base health bars deplete
- Game over screen appears and restart works

- [ ] **Step 2: Fix any bugs found**

Address each issue found in Step 1.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: play-test bug fixes for Phase 1 core battle"
```

---

### Task 17: Landing page — "Who are you?"

**Files:**
- Create: `src/pages/index.astro`
- Modify: `src/layouts/GameLayout.astro`

- [ ] **Step 1: Update index.astro to be the landing page**

```astro
---
// src/pages/index.astro
import GameLayout from '../layouts/GameLayout.astro';
---
<GameLayout title="Lukas Plants vs Toby Zombies">
  <div class="flex flex-col items-center gap-8">
    <h1 class="text-5xl font-bold tracking-wider" style="font-family: monospace; image-rendering: pixelated;">
      LUKAS PLANTS<br/>
      <span class="text-gray-500">vs</span><br/>
      TOBY ZOMBIES
    </h1>

    <p class="text-xl text-gray-400">Who are you?</p>

    <div class="flex gap-8">
      <!-- Lukas / Plants -->
      <a href="/lobby?player=lukas"
         class="group flex flex-col items-center gap-4 p-8 border-4 border-green-700 rounded-lg bg-green-950/50 hover:bg-green-900/60 hover:border-green-500 transition-all cursor-pointer w-64">
        <div class="w-24 h-24 bg-green-600 rounded-lg flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
          🌱
        </div>
        <span class="text-2xl font-bold text-green-400">LUKAS</span>
        <span class="text-sm text-green-600">Commander of Plants</span>
      </a>

      <!-- Toby / Zombies -->
      <a href="/lobby?player=toby"
         class="group flex flex-col items-center gap-4 p-8 border-4 border-purple-700 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 hover:border-purple-500 transition-all cursor-pointer w-64">
        <div class="w-24 h-24 bg-purple-600 rounded-lg flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
          🧟
        </div>
        <span class="text-2xl font-bold text-purple-400">TOBY</span>
        <span class="text-sm text-purple-600">Lord of Zombies</span>
      </a>
    </div>
  </div>
</GameLayout>
```

- [ ] **Step 2: Run dev server and verify landing page renders**

```bash
npm run dev
```

Expected: Split-screen landing page with Lukas (green/plants) and Toby (purple/zombies) cards. Clicking either goes to `/lobby?player=lukas` or `/lobby?player=toby`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add landing page with Lukas/Toby character select"
```

---

### Task 18: Firebase setup — config, presence, and multiplayer module

**Files:**
- Create: `src/firebase/config.ts`
- Create: `src/firebase/presence.ts`
- Create: `src/firebase/multiplayer.ts`

- [ ] **Step 1: Install Firebase**

```bash
npm install firebase
```

- [ ] **Step 2: Create Firebase config**

```typescript
// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  // TODO: Replace with actual Firebase project config
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  databaseURL: import.meta.env.PUBLIC_FIREBASE_DATABASE_URL || 'https://demo-default-rtdb.firebaseio.com',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
```

- [ ] **Step 3: Create presence system**

```typescript
// src/firebase/presence.ts
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { db } from './config';

export type Player = 'lukas' | 'toby';

export function goOnline(player: Player): void {
  const presenceRef = ref(db, `presence/${player}`);
  const connectedRef = ref(db, '.info/connected');

  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      set(presenceRef, { online: true, lastSeen: serverTimestamp() });
      onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp() });
    }
  });
}

export function watchOpponent(
  player: Player,
  callback: (online: boolean) => void,
): () => void {
  const opponent: Player = player === 'lukas' ? 'toby' : 'lukas';
  const opponentRef = ref(db, `presence/${opponent}`);

  const unsubscribe = onValue(opponentRef, (snap) => {
    const data = snap.val();
    callback(data?.online === true);
  });

  return unsubscribe;
}
```

- [ ] **Step 4: Create multiplayer sync module**

```typescript
// src/firebase/multiplayer.ts
import { ref, set, push, onValue, onChildAdded, remove, serverTimestamp } from 'firebase/database';
import { db } from './config';
import type { Player } from './presence';

export interface GameAction {
  type: 'place_unit' | 'game_over';
  player: Player;
  unitKey?: string;
  row?: number;
  col?: number;
  winner?: 'plants' | 'zombies';
  timestamp?: object;
}

export interface GameRoom {
  id: string;
  lukas: { ready: boolean };
  toby: { ready: boolean };
  status: 'waiting' | 'playing' | 'finished';
}

export function createGameRoom(): string {
  const roomRef = push(ref(db, 'rooms'));
  set(roomRef, {
    lukas: { ready: false },
    toby: { ready: false },
    status: 'waiting',
    createdAt: serverTimestamp(),
  });
  return roomRef.key!;
}

export function joinRoom(roomId: string, player: Player): void {
  set(ref(db, `rooms/${roomId}/${player}/ready`), true);
}

export function watchRoom(roomId: string, callback: (room: GameRoom | null) => void): () => void {
  const roomRef = ref(db, `rooms/${roomId}`);
  return onValue(roomRef, (snap) => {
    const data = snap.val();
    if (data) {
      callback({ id: roomId, ...data });
    } else {
      callback(null);
    }
  });
}

export function sendAction(roomId: string, action: GameAction): void {
  const actionsRef = ref(db, `rooms/${roomId}/actions`);
  push(actionsRef, { ...action, timestamp: serverTimestamp() });
}

export function watchActions(roomId: string, callback: (action: GameAction) => void): () => void {
  const actionsRef = ref(db, `rooms/${roomId}/actions`);
  return onChildAdded(actionsRef, (snap) => {
    callback(snap.val());
  });
}

export function setRoomStatus(roomId: string, status: 'waiting' | 'playing' | 'finished'): void {
  set(ref(db, `rooms/${roomId}/status`), status);
}

export function deleteRoom(roomId: string): void {
  remove(ref(db, `rooms/${roomId}`));
}
```

- [ ] **Step 5: Commit**

```bash
git add src/firebase/
git commit -m "feat: add Firebase config, presence system, and multiplayer sync"
```

---

### Task 19: Lobby page — online status and game mode selection

**Files:**
- Create: `src/pages/lobby.astro`

- [ ] **Step 1: Create lobby page**

```astro
---
// src/pages/lobby.astro
import GameLayout from '../layouts/GameLayout.astro';
---
<GameLayout title="Lobby — Lukas Plants vs Toby Zombies">
  <div id="lobby" class="flex flex-col items-center gap-8">
    <h2 class="text-3xl font-bold" id="welcome-text">Loading...</h2>

    <div class="flex flex-col items-center gap-4">
      <div id="opponent-status" class="text-lg text-gray-400">
        Checking opponent status...
      </div>

      <div class="flex gap-6 mt-8">
        <a id="btn-ai" href="#"
           class="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-xl font-bold transition-colors">
          Play vs AI
        </a>

        <button id="btn-multiplayer" disabled
                class="px-8 py-4 bg-gray-800 rounded-lg text-xl font-bold text-gray-500 cursor-not-allowed transition-colors">
          Battle Opponent!
        </button>
      </div>
    </div>

    <a href="/" class="text-sm text-gray-500 hover:text-gray-300 mt-8">← Back to character select</a>
  </div>

  <script>
    import { goOnline, watchOpponent, type Player } from '../firebase/presence';
    import { createGameRoom, joinRoom, watchRoom, setRoomStatus } from '../firebase/multiplayer';

    const params = new URLSearchParams(window.location.search);
    const player = params.get('player') as Player | null;

    if (!player || (player !== 'lukas' && player !== 'toby')) {
      window.location.href = '/';
    }

    const opponent: Player = player === 'lukas' ? 'toby' : 'lukas';
    const opponentName = opponent === 'lukas' ? 'Lukas' : 'Toby';
    const playerName = player === 'lukas' ? 'Lukas' : 'Toby';
    const faction = player === 'lukas' ? 'plants' : 'zombies';

    // Set welcome text
    document.getElementById('welcome-text')!.textContent = `Welcome, ${playerName}!`;

    // Go online
    goOnline(player!);

    // Set up AI button
    document.getElementById('btn-ai')!.setAttribute('href', `/battle?mode=ai&player=${player}`);

    // Watch opponent presence
    const btnMultiplayer = document.getElementById('btn-multiplayer') as HTMLButtonElement;
    const statusEl = document.getElementById('opponent-status')!;

    watchOpponent(player!, (online) => {
      if (online) {
        statusEl.innerHTML = `<span class="text-green-400">${opponentName} is ONLINE!</span>`;
        btnMultiplayer.disabled = false;
        btnMultiplayer.className = 'px-8 py-4 bg-red-700 hover:bg-red-600 rounded-lg text-xl font-bold cursor-pointer transition-colors';
        btnMultiplayer.textContent = `Battle ${opponentName}!`;
      } else {
        statusEl.innerHTML = `<span class="text-gray-500">${opponentName} is offline</span>`;
        btnMultiplayer.disabled = true;
        btnMultiplayer.className = 'px-8 py-4 bg-gray-800 rounded-lg text-xl font-bold text-gray-500 cursor-not-allowed transition-colors';
        btnMultiplayer.textContent = 'Battle Opponent!';
      }
    });

    // Multiplayer button — create room and redirect
    btnMultiplayer.addEventListener('click', () => {
      if (btnMultiplayer.disabled) return;
      const roomId = createGameRoom();
      joinRoom(roomId, player!);
      window.location.href = `/battle?mode=multiplayer&player=${player}&room=${roomId}`;
    });
  </script>
</GameLayout>
```

- [ ] **Step 2: Run dev server and verify lobby works**

```bash
npm run dev
```

Expected: Lobby shows player name, opponent online/offline status. AI button links to `/battle?mode=ai&player=...`. Multiplayer button enables when opponent is online.

- [ ] **Step 3: Commit**

```bash
git add src/pages/lobby.astro
git commit -m "feat: add lobby page with opponent presence and game mode selection"
```

---

### Task 20: Battle page — route that launches Phaser with mode/player params

**Files:**
- Create: `src/pages/battle.astro`
- Modify: `src/game/main.ts`

- [ ] **Step 1: Create battle.astro**

```astro
---
// src/pages/battle.astro
import GameLayout from '../layouts/GameLayout.astro';
---
<GameLayout title="Battle — Lukas Plants vs Toby Zombies">
  <div id="game-container" class="mx-auto"></div>

  <script>
    import { launchGame } from '../game/main';

    const params = new URLSearchParams(window.location.search);
    const mode = (params.get('mode') || 'ai') as 'ai' | 'multiplayer';
    const player = (params.get('player') || 'lukas') as 'lukas' | 'toby';
    const roomId = params.get('room') || undefined;

    launchGame('game-container', {
      mode,
      player,
      roomId,
    });
  </script>
</GameLayout>
```

- [ ] **Step 2: Update main.ts to accept game options**

```typescript
// src/game/main.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { MultiplayerBattleScene } from './scenes/MultiplayerBattleScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import type { Faction } from './types';

export interface GameOptions {
  mode: 'ai' | 'multiplayer';
  player: 'lukas' | 'toby';
  roomId?: string;
}

// Store globally so scenes can access it
export let gameOptions: GameOptions = { mode: 'ai', player: 'lukas' };

export function getPlayerFaction(): Faction {
  return gameOptions.player === 'lukas' ? 'plants' : 'zombies';
}

export function launchGame(parent: string, options?: GameOptions): Phaser.Game {
  if (options) {
    gameOptions = options;
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, BattleScene, MultiplayerBattleScene, GameOverScene],
  };

  return new Phaser.Game(config);
}
```

- [ ] **Step 3: Update BootScene to route to correct scene based on mode**

In `src/game/scenes/BootScene.ts`, update the `create()` method:

```typescript
create(): void {
  const { gameOptions } = await import('../main');
  if (gameOptions.mode === 'multiplayer') {
    this.scene.start('MultiplayerBattleScene');
  } else {
    this.scene.start('BattleScene');
  }
}
```

Note: Since this is a sync context, use the import at the top of the file instead:

```typescript
// At top of BootScene.ts, add:
import { gameOptions } from '../main';

// In create():
create(): void {
  if (gameOptions.mode === 'multiplayer') {
    this.scene.start('MultiplayerBattleScene');
  } else {
    this.scene.start('BattleScene');
  }
}
```

- [ ] **Step 4: Update BattleScene to use player faction from gameOptions**

In `src/game/scenes/BattleScene.ts`, update the `playerFaction` initialization:

```typescript
// At top, add import:
import { getPlayerFaction } from '../main';

// In create(), change:
// OLD: private playerFaction: Faction = 'plants';
// NEW: set in create()

create(): void {
  this.playerFaction = getPlayerFaction();
  // ... rest of create
}
```

Declare `playerFaction` without default:
```typescript
private playerFaction!: Faction;
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/battle.astro src/game/main.ts src/game/scenes/BootScene.ts src/game/scenes/BattleScene.ts
git commit -m "feat: add battle page with mode/player routing"
```

---

### Task 21: MultiplayerBattleScene — real-time PvP

**Files:**
- Create: `src/game/scenes/MultiplayerBattleScene.ts`

This scene extends the core battle logic but replaces AI spawning with Firebase-synced actions. Each player sees the same 5x10 grid. Lukas controls plants (left side), Toby controls zombies (right side). When a player places a unit, the action is sent to Firebase and the opponent's game reacts.

- [ ] **Step 1: Create MultiplayerBattleScene**

```typescript
// src/game/scenes/MultiplayerBattleScene.ts
import Phaser from 'phaser';
import {
  GRID_ROWS, GRID_COLS, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y,
  GAME_WIDTH, GAME_HEIGHT, BASE_HP, STARTING_ENERGY,
  UNIT_COSTS, ENERGY_TICK_INTERVAL, ENERGY_TICK_AMOUNT, ENERGY_KILL_REWARD,
} from '../constants';
import { GridManager } from '../systems/GridManager';
import { EnergyManager } from '../systems/EnergyManager';
import { CombatManager } from '../systems/CombatManager';
import { DragDropManager } from '../systems/DragDropManager';
import { UnitState } from '../entities/Unit';
import { HUD, type UnitCard } from '../ui/HUD';
import { HealthBar } from '../ui/HealthBar';
import { PROJECTILE_CONFIGS } from '../entities/Projectile';
import { createPeashooter, PEASHOOTER_PROJECTILE } from '../entities/plants/Peashooter';
import { createSunflower, SUNFLOWER_PROJECTILE, SUNFLOWER_ENERGY_INTERVAL, SUNFLOWER_ENERGY_AMOUNT } from '../entities/plants/Sunflower';
import { createWalnutBomb, WALNUT_EXPLOSION_RADIUS, WALNUT_EXPLOSION_DAMAGE } from '../entities/plants/WalnutBomb';
import { createBrainEater, BRAIN_EATER_PROJECTILE } from '../entities/zombies/BrainEater';
import { createVeryFastWalker } from '../entities/zombies/VeryFastWalker';
import { createSkeletonWarrior, SKELETON_BLOCK_COOLDOWN } from '../entities/zombies/SkeletonWarrior';
import { gameOptions, getPlayerFaction } from '../main';
import { sendAction, watchActions, setRoomStatus, type GameAction } from '../../firebase/multiplayer';
import type { Faction } from '../types';

interface ActiveUnit {
  state: UnitState;
  sprite: Phaser.GameObjects.Sprite;
  healthBar: HealthBar;
  lastProducerTick?: number;
  lastBlockTime?: number;
}

const UNIT_FACTORIES: Record<string, (id: string) => UnitState> = {
  peashooter: createPeashooter,
  sunflower: createSunflower,
  walnutBomb: createWalnutBomb,
  brainEater: createBrainEater,
  veryFastWalker: createVeryFastWalker,
  skeletonWarrior: createSkeletonWarrior,
};

const PROJECTILE_MAP: Record<string, string> = {
  peashooter: PEASHOOTER_PROJECTILE,
  sunflower: SUNFLOWER_PROJECTILE,
  brainEater: BRAIN_EATER_PROJECTILE,
};

export class MultiplayerBattleScene extends Phaser.Scene {
  private gridManager!: GridManager;
  private energyManager!: EnergyManager;
  private combatManager!: CombatManager;
  private dragDropManager!: DragDropManager;
  private hud!: HUD;

  private playerFaction!: Faction;
  private units: Map<string, ActiveUnit> = new Map();
  private projectiles!: Phaser.Physics.Arcade.Group;
  private unitIdCounter = 0;

  private plantBaseHp = BASE_HP;
  private zombieBaseHp = BASE_HP;
  private plantBaseBar!: HealthBar;
  private zombieBaseBar!: HealthBar;

  private lastEnergyTick = 0;
  private gameEnded = false;
  private roomId!: string;

  constructor() {
    super('MultiplayerBattleScene');
  }

  create(): void {
    this.playerFaction = getPlayerFaction();
    this.roomId = gameOptions.roomId!;
    this.units.clear();
    this.unitIdCounter = 0;
    this.plantBaseHp = BASE_HP;
    this.zombieBaseHp = BASE_HP;
    this.lastEnergyTick = 0;
    this.gameEnded = false;

    this.gridManager = new GridManager();
    this.energyManager = new EnergyManager(STARTING_ENERGY);
    this.combatManager = new CombatManager();
    this.projectiles = this.physics.add.group();

    this.drawGrid();
    this.drawBases();
    this.setupHUD();

    // Drag-and-drop for local player — sends actions to Firebase
    this.dragDropManager = new DragDropManager(
      this, this.gridManager, this.energyManager, this.playerFaction,
      (unitKey, row, col) => {
        // Place locally
        this.spawnUnit(unitKey, row, col, this.playerFaction);
        // Sync to opponent
        sendAction(this.roomId, {
          type: 'place_unit',
          player: gameOptions.player,
          unitKey,
          row,
          col,
        });
      },
    );

    // Watch for opponent's actions
    watchActions(this.roomId, (action: GameAction) => {
      if (action.player === gameOptions.player) return; // Skip own actions

      if (action.type === 'place_unit' && action.unitKey && action.row !== undefined && action.col !== undefined) {
        const opponentFaction: Faction = this.playerFaction === 'plants' ? 'zombies' : 'plants';
        this.spawnUnit(action.unitKey, action.row, action.col, opponentFaction);
      }

      if (action.type === 'game_over') {
        this.gameEnded = true;
        this.scene.start('GameOverScene', { winner: action.winner });
      }
    });

    setRoomStatus(this.roomId, 'playing');

    // Show "MULTIPLAYER" label
    this.add.text(GAME_WIDTH / 2, 16, 'MULTIPLAYER', {
      fontSize: '16px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
  }

  update(time: number, delta: number): void {
    if (this.gameEnded) return;

    this.updateEnergyTick(time);
    this.updateSunflowerProducers(time);
    this.updateMovement(delta);
    this.updateCombat(time);
    this.updateProjectileCollisions();
    this.updateBaseCollisions();
    this.cleanupDeadUnits();
    this.hud.updateEnergy(this.energyManager.getEnergy());
    this.plantBaseBar.update(this.plantBaseHp, BASE_HP);
    this.zombieBaseBar.update(this.zombieBaseHp, BASE_HP);
    this.checkWinCondition();
  }

  // --- The following methods are identical to BattleScene ---
  // In a real refactor, these would be extracted to a shared base class.
  // For Phase 1, we duplicate to keep things working and refactor later.

  private spawnUnit(unitKey: string, row: number, col: number, faction: Faction): void {
    if (!this.gridManager.isEmpty(row, col)) return;

    const id = `unit-${this.unitIdCounter++}`;
    const factory = UNIT_FACTORIES[unitKey];
    if (!factory) return;

    const state = factory(id);
    (state as any).faction = faction;
    state.setPosition(row, col);
    this.gridManager.place(row, col, id);

    const { x, y } = this.gridManager.toPixel(row, col);
    const sprite = this.add.sprite(x, y, unitKey);
    const healthBar = new HealthBar(this, x, y - TILE_SIZE / 2 + 2, TILE_SIZE - 16, 4);
    healthBar.update(state.hp, state.maxHp);

    this.units.set(id, { state, sprite, healthBar });
  }

  private updateEnergyTick(time: number): void {
    if (time - this.lastEnergyTick >= ENERGY_TICK_INTERVAL) {
      this.energyManager.addPassive(ENERGY_TICK_AMOUNT);
      this.lastEnergyTick = time;
    }
  }

  private updateSunflowerProducers(time: number): void {
    for (const [, unit] of this.units) {
      if (unit.state.key !== 'sunflower' || unit.state.faction !== this.playerFaction) continue;
      if (!unit.state.isAlive()) continue;
      const lastTick = unit.lastProducerTick ?? 0;
      if (time - lastTick >= SUNFLOWER_ENERGY_INTERVAL) {
        this.energyManager.addFromProducer(SUNFLOWER_ENERGY_AMOUNT);
        unit.lastProducerTick = time;
      }
    }
  }

  private updateMovement(delta: number): void {
    for (const [, unit] of this.units) {
      if (unit.state.isStationary() || !unit.state.isAlive()) continue;

      const direction = unit.state.faction === 'zombies' ? -1 : 1;
      const pixelSpeed = unit.state.moveSpeed * TILE_SIZE * (delta / 1000);

      const nextCol = unit.state.col + direction;
      const allStates = Array.from(this.units.values()).map(u => u.state);
      const adjacentEnemy = allStates.find(u =>
        u.isAlive() && u.faction !== unit.state.faction && u.row === unit.state.row && u.col === nextCol
      );
      if (adjacentEnemy) continue;

      unit.sprite.x += direction * pixelSpeed;
      unit.healthBar.setPosition(unit.sprite.x, unit.sprite.y - TILE_SIZE / 2 + 2);

      const { row, col } = this.gridManager.toGrid(unit.sprite.x, unit.sprite.y);
      if (col !== unit.state.col && this.gridManager.isValid(row, col)) {
        this.gridManager.remove(unit.state.row, unit.state.col);
        if (this.gridManager.isEmpty(row, col)) {
          this.gridManager.place(row, col, unit.state.id);
          unit.state.setPosition(row, col);
        } else {
          this.gridManager.place(unit.state.row, unit.state.col, unit.state.id);
          const snapPos = this.gridManager.toPixel(unit.state.row, unit.state.col);
          unit.sprite.x = snapPos.x;
        }
      }
    }
  }

  private updateCombat(time: number): void {
    const allStates = Array.from(this.units.values()).map(u => u.state);
    for (const [, unit] of this.units) {
      if (!unit.state.isAlive() || !unit.state.canAttack(time)) continue;
      if (unit.state.key === 'walnutBomb') continue;

      const target = this.combatManager.findTarget(unit.state, allStates);
      if (!target) continue;

      unit.state.recordAttack(time);
      const projectileKey = PROJECTILE_MAP[unit.state.key];
      if (projectileKey) {
        this.fireProjectile(unit.state, projectileKey);
      } else {
        target.takeDamage(unit.state.damage);
        const targetUnit = this.units.get(target.id);
        if (targetUnit) targetUnit.healthBar.update(target.hp, target.maxHp);
      }
    }
  }

  private fireProjectile(attacker: UnitState, projectileKey: string): void {
    const config = PROJECTILE_CONFIGS[projectileKey];
    if (!config) return;
    const { x, y } = this.gridManager.toPixel(attacker.row, attacker.col);
    const proj = this.projectiles.create(x, y, config.textureKey) as Phaser.Physics.Arcade.Sprite;
    const direction = attacker.faction === 'plants' ? 1 : -1;
    proj.setVelocityX(config.speed * direction);
    proj.setData('damage', config.damage);
    proj.setData('faction', attacker.faction);
  }

  private updateProjectileCollisions(): void {
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const proj of projectiles) {
      if (proj.x < 0 || proj.x > GAME_WIDTH) { proj.destroy(); continue; }
      const projFaction = proj.getData('faction') as Faction;
      const projDamage = proj.getData('damage') as number;
      for (const [, unit] of this.units) {
        if (!unit.state.isAlive() || unit.state.faction === projFaction) continue;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, unit.sprite.x, unit.sprite.y);
        if (dist < TILE_SIZE / 2) {
          if (unit.state.key === 'skeletonWarrior') {
            const lastBlock = (unit as any).lastBlockTime ?? 0;
            if (this.time.now - lastBlock >= SKELETON_BLOCK_COOLDOWN) {
              (unit as any).lastBlockTime = this.time.now;
              proj.destroy(); continue;
            }
          }
          unit.state.takeDamage(projDamage);
          unit.healthBar.update(unit.state.hp, unit.state.maxHp);
          proj.destroy(); break;
        }
      }
    }
  }

  private updateBaseCollisions(): void {
    for (const [, unit] of this.units) {
      if (!unit.state.isAlive()) continue;
      if (unit.state.faction === 'zombies' && unit.sprite.x <= GRID_OFFSET_X) {
        this.plantBaseHp -= unit.state.damage;
        unit.state.takeDamage(unit.state.maxHp);
      }
    }
    const projectiles = this.projectiles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE;
    for (const proj of projectiles) {
      if (proj.getData('faction') === 'plants' && proj.x >= zombieBaseX) {
        this.zombieBaseHp -= proj.getData('damage') as number;
        proj.destroy();
      }
    }
    for (const proj of projectiles) {
      if (!proj.active) continue;
      if (proj.getData('faction') === 'zombies' && proj.x <= GRID_OFFSET_X) {
        this.plantBaseHp -= proj.getData('damage') as number;
        proj.destroy();
      }
    }
  }

  private cleanupDeadUnits(): void {
    for (const [id, unit] of this.units) {
      if (unit.state.isAlive()) continue;
      if (unit.state.key === 'walnutBomb') this.walnutExplosion(unit.state.row, unit.state.col);
      if (unit.state.faction !== this.playerFaction) this.energyManager.addKillReward(ENERGY_KILL_REWARD);
      this.gridManager.remove(unit.state.row, unit.state.col);
      unit.sprite.destroy();
      unit.healthBar.destroy();
      this.units.delete(id);
    }
  }

  private walnutExplosion(row: number, col: number): void {
    for (const [, unit] of this.units) {
      if (!unit.state.isAlive()) continue;
      if (Math.abs(unit.state.row - row) <= WALNUT_EXPLOSION_RADIUS &&
          Math.abs(unit.state.col - col) <= WALNUT_EXPLOSION_RADIUS &&
          unit.state.faction === 'zombies') {
        unit.state.takeDamage(WALNUT_EXPLOSION_DAMAGE);
        unit.healthBar.update(unit.state.hp, unit.state.maxHp);
      }
    }
  }

  private checkWinCondition(): void {
    if (this.plantBaseHp <= 0) {
      this.gameEnded = true;
      sendAction(this.roomId, { type: 'game_over', player: gameOptions.player, winner: 'zombies' });
      setRoomStatus(this.roomId, 'finished');
      this.scene.start('GameOverScene', { winner: 'zombies' });
    } else if (this.zombieBaseHp <= 0) {
      this.gameEnded = true;
      sendAction(this.roomId, { type: 'game_over', player: gameOptions.player, winner: 'plants' });
      setRoomStatus(this.roomId, 'finished');
      this.scene.start('GameOverScene', { winner: 'plants' });
    }
  }

  private setupHUD(): void {
    const plantCards: UnitCard[] = [
      { key: 'peashooter', label: 'Peashooter', cost: UNIT_COSTS.peashooter, textureKey: 'peashooter' },
      { key: 'sunflower', label: 'Sunflower', cost: UNIT_COSTS.sunflower, textureKey: 'sunflower' },
      { key: 'walnutBomb', label: 'Walnut-Bomb', cost: UNIT_COSTS.walnutBomb, textureKey: 'walnutBomb' },
    ];
    const zombieCards: UnitCard[] = [
      { key: 'brainEater', label: 'Brain Eater', cost: UNIT_COSTS.brainEater, textureKey: 'brainEater' },
      { key: 'veryFastWalker', label: 'Fast Walker', cost: UNIT_COSTS.veryFastWalker, textureKey: 'veryFastWalker' },
      { key: 'skeletonWarrior', label: 'Skeleton', cost: UNIT_COSTS.skeletonWarrior, textureKey: 'skeletonWarrior' },
    ];
    const cards = this.playerFaction === 'plants' ? plantCards : zombieCards;
    this.hud = new HUD(this, cards, () => {});
    this.hud.updateEnergy(this.energyManager.getEnergy());

    const plantBaseX = GRID_OFFSET_X - TILE_SIZE / 2 - 10;
    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2 + 10;
    const barY = GRID_OFFSET_Y - 15;
    this.plantBaseBar = new HealthBar(this, plantBaseX, barY, 50, 8);
    this.zombieBaseBar = new HealthBar(this, zombieBaseX, barY, 50, 8);
    this.plantBaseBar.update(this.plantBaseHp, BASE_HP);
    this.zombieBaseBar.update(this.zombieBaseHp, BASE_HP);
  }

  private drawGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const { x, y } = this.gridManager.toPixel(row, col);
        const tileKey = (row + col) % 2 === 0 ? 'tile' : 'tileDark';
        this.add.sprite(x, y, tileKey);
      }
    }
  }

  private drawBases(): void {
    const plantBaseX = GRID_OFFSET_X - TILE_SIZE / 2 - 10;
    for (let row = 0; row < GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
      this.add.sprite(plantBaseX, y, 'base').setTint(0x00cc00);
    }
    this.add.text(plantBaseX - 20, GRID_OFFSET_Y - 30, 'LUKAS\nBASE', {
      fontSize: '12px', color: '#00cc00', align: 'center',
    });

    const zombieBaseX = GRID_OFFSET_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2 + 10;
    for (let row = 0; row < GRID_ROWS; row++) {
      const y = GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
      this.add.sprite(zombieBaseX, y, 'base').setTint(0x884488);
    }
    this.add.text(zombieBaseX - 20, GRID_OFFSET_Y - 30, 'TOBY\nBASE', {
      fontSize: '12px', color: '#884488', align: 'center',
    });
  }
}
```

- [ ] **Step 2: Run dev server and test multiplayer flow**

```bash
npm run dev
```

Open two browser tabs:
1. Tab 1: Go to `/` → click Lukas → lobby shows Toby offline → click "Play vs AI" → game works
2. Tab 2: Go to `/` → click Toby → lobby should show Lukas online (if tab 1 is on lobby)
3. Both on lobby → click "Battle" → both enter multiplayer game
4. Place units on both sides and verify they appear on both screens

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/MultiplayerBattleScene.ts
git commit -m "feat: add MultiplayerBattleScene with Firebase real-time sync"
```

---

### Task 22: Remove old index.astro game page

**Files:**
- Delete: old `src/pages/index.astro` (replaced in Task 17)

The landing page (Task 17) already replaced `index.astro`. The game now lives at `/battle`. This task is a no-op if Task 17 was applied correctly.

- [ ] **Step 1: Verify routing works**

```bash
npm run dev
```

Expected:
- `/` → Landing page (Lukas or Toby)
- `/lobby?player=lukas` → Lobby
- `/battle?mode=ai&player=lukas` → AI game
- `/battle?mode=multiplayer&player=lukas&room=xyz` → Multiplayer game

- [ ] **Step 2: Commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: clean up routing — landing → lobby → battle"
```

---

### Task 23: Full play-test and bug fix pass

- [ ] **Step 1: Test AI mode as Lukas (plants)**

Go through full flow: landing → lobby → play vs AI. Verify all combat, energy, HUD, win/lose.

- [ ] **Step 2: Test AI mode as Toby (zombies)**

Same flow but as Toby. Verify zombie placement works on right side, plants spawn as AI.

- [ ] **Step 3: Test multiplayer (two tabs)**

Open two tabs, one as Lukas, one as Toby. Both join lobby, see each other online, start multiplayer battle. Verify:
- Units placed by one player appear on the other's screen
- Combat resolves correctly
- Game over syncs between both players

- [ ] **Step 4: Fix any bugs found**

Address each issue.

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: play-test bug fixes for landing, lobby, and multiplayer"
```

---

## Phase Summary

After completing Phase 1, you will have:
- A new Astro project at `~/Projects/lukas-vs-toby/`
- **Landing page** — "Who are you?" with Lukas (Plants) and Toby (Zombies) character select
- **Lobby** — shows opponent online status, play vs AI or multiplayer
- **AI mode** — playable 5x10 lane battle with 3 plants and 3 zombies
- **Multiplayer mode** — real-time PvP via Firebase Realtime Database
- Drag-and-drop unit placement
- LukieCoin energy economy (passive + producers + kill rewards)
- Projectile and melee combat
- Base destruction win condition
- GameOver screen with restart

**Next phases** (separate plans):
- Phase 2: Remaining 7+7 units + enhancers
- Phase 3: Toby Dollars, marketplace, upgrades, save system
- Phase 4: Campaign + endless mode
