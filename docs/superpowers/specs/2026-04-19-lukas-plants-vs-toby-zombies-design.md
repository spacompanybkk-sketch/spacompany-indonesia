# Lukas Plants vs Toby Zombies — Game Design Spec

## Overview

A Plants vs Zombies-inspired browser game where players choose to play as Plants or Zombies. Both sides have unique units with distinct abilities that battle across 5 lanes. Plants are stationary with ranged attacks; zombies are mobile with melee focus. The game features a dual-currency economy, a 20-30 level campaign, and an endless survival mode.

**Platform**: Web browser (HTML5)
**Engine**: Phaser.js
**Site framework**: Astro + Tailwind CSS
**Hosting**: Firebase Hosting
**Visual style**: Minecraft-style blocky pixel art — slightly pixelated but recognizable shapes

## Core Gameplay

### Match Flow

1. Faction select — choose Plants or Zombies
2. Loadout screen — see unlocked roster (bring everything you own)
3. Battle — 5 horizontal lanes x 10 columns, your base on one side, enemy base on the other
4. Place units — drag from bottom bar onto the field, costs LukieCoins
5. Combat — units auto-attack based on their mechanics
6. Enhancers — activate your 3 spells strategically
7. Win condition — destroy the enemy base

### Asymmetric Balance

Plants are stationary, zombies walk. Balance is achieved through:

- **Plants** have ranged attacks, defensive walls, area denial. They control space.
- **Zombies** are cheaper, have more HP on average, and mobility lets them choose which lane to pressure. They control tempo.
- **Plant base** is at the back — zombies walk through 9-10 tiles of fire to reach it.
- **Zombie base** is at the back — plants must shoot it down from range. Only ranged plants (Peashooter, Mango-Pult, Kernel-Pult) can damage the zombie base once the lane is clear.
- **Pumpkin Squash** is the only plant that moves (leaps).

**Plants win** by building overlapping fire zones and wearing down the zombie base from range.
**Zombies win** by rushing through defenses, eating key plants, and overwhelming the plant base.

### Energy System (LukieCoins)

Three sources feed into in-battle energy:

- **Passive trickle** — energy generates automatically over time
- **Producers** — Sunflower (plants) / Necromancer (zombies) generate extra energy; tap to collect
- **Kill rewards** — destroying an enemy gives a small energy bonus

LukieCoins reset to zero after every match.

## Units

### Plants (10 types, stationary)

| # | Plant | Cost | HP | Attack | Range | Speed | Special |
|---|-------|------|----|--------|-------|-------|---------|
| 1 | Sunflower | Low | Low | Kernel shot | Short | Fast | Generates sun energy passively |
| 2 | Walnut-Bomb | Medium | Very High | Explodes on death | Melee | One-time | Wall that absorbs damage, explodes when destroyed |
| 3 | Peashooter | Low | Medium | Pea shot | Long | Medium | Core ranged damage dealer |
| 4 | Potato Mine | Low | Low | Explosion | Melee | One-time | Invisible underground, huge damage when zombie steps on it |
| 5 | Cherry Bomber | High | Low | 3x3 explosion | Area | One-time | Nukes a zone, then dies |
| 6 | Avocado Bunker | High | Highest | None | N/A | N/A | Pure wall, protects plants behind it |
| 7 | Mango-Pult | Medium | Medium | Lobs mangos | Long (arc) | Slow | Splash damage, shoots over walls |
| 8 | Kernel-Pult | Medium | Medium | Lobs kernels | Long (arc) | Medium | Sometimes throws butter — 2s stun |
| 9 | Pumpkin Squash | High | High | Leap + crush | Medium (leap) | Slow | Jumps on strongest enemy — the only plant that moves |
| 10 | Torchwood | Medium | Medium | None | N/A | N/A | Projectiles passing through it deal double fire damage |

**Roles:**
- Damage dealers: Peashooter, Mango-Pult, Kernel-Pult
- Tanks/Walls: Avocado Bunker, Walnut-Bomb
- Burst/Bomb: Cherry Bomber, Potato Mine
- Support: Sunflower (energy), Torchwood (damage boost)
- Assassin: Pumpkin Squash

### Zombies (10 types, mobile)

| # | Zombie | Cost | HP | Attack | Range | Speed | Special |
|---|--------|------|----|--------|-------|-------|---------|
| 1 | Brain Eater | Medium | Medium | Brain throw + bite | Medium/Melee | Slow | Brain boomerangs back, massive bite damage |
| 2 | Very Fast Walker | Low | Low | Bite | Melee | Very Fast | Targets back-row plants first |
| 3 | Skeleton Archer | Medium | Low | Bone arrows | Long | Slow | Arrows pierce through first plant, hit second |
| 4 | Skeleton Warrior | Medium | High | Sword slash | Melee | Medium | Blocks one projectile every few seconds with sword |
| 5 | Necromancer | High | Medium | Dark pulse | Short | Slow | Heals nearby zombies, revives one dead zombie every 20s, generates LukieCoins passively (zombie energy producer) |
| 6 | Hot Topic | Medium | Medium | Bite/devour | Melee | Medium | Gets +HP, +attack, +energy per plant eaten |
| 7 | Trident Zombie | High | Medium | Trident throw | Medium | Medium | Damages every plant in the lane, long cooldown |
| 8 | Desert Zombie | Medium | Medium | Sand throw | Short | Medium | Blinds plants — they miss for 3 seconds |
| 9 | Cowboy Zombie | Medium | Medium | Lasso + pistol | Medium | Medium | Pulls plants forward one tile, ranged pistol |
| 10 | Brain Rot | High | Low | Rotting brain throw | Long | Slow | Infests plants — DOT that spreads to adjacent plants |

**Roles:**
- Ranged damage: Skeleton Archer, Brain Eater, Brain Rot
- Tanks/Bruisers: Skeleton Warrior, Hot Topic
- Rushdown: Very Fast Walker
- Support: Necromancer (heal/revive), Desert Zombie (blind)
- Disruptors: Cowboy Zombie (repositioning), Trident Zombie (lane sweep)

## Enhancers (3 per side)

### Plant Enhancers

| Enhancer | Type | Effect |
|----------|------|--------|
| Photosynthesis Aura | Passive | All plants regenerate a small amount of HP over time. Always active once unlocked |
| Solar Flare | Active (area damage) | Choose a 3x3 area — concentrated sunlight scorches everything in it. One-time use per round, long cooldown |
| Nature's Avatar | Superpower (5s) | Target one plant — it grows massive, triples attack speed, doubles damage, invincible for 5 seconds |

### Zombie Enhancers

| Enhancer | Type | Effect |
|----------|------|--------|
| Death Stench | Passive | All zombies emit stench that slows plant attack speed by 20%. Always active once unlocked |
| Graveyard Eruption | Active (area damage) | Choose a 3x3 area — tombstones erupt from ground dealing massive damage and knockback. One-time use per round, long cooldown |
| Undead Rage | Superpower (5s) | Target one zombie — turns red, 3x speed/damage, lifesteal, stun immune for 5 seconds |

## Currency & Progression

### Dual Currency System

**LukieCoins (in-battle):**
- Earned during battle: passive trickle + producers + kill rewards
- Spent to place units and activate enhancers
- Resets to zero after every match

**Toby Dollars (persistent):**
- Earned after battle: victory bonus, domination bonus (win with base above 50% HP), campaign milestone rewards
- Spent in the Marketplace to:
  - Unlock new units
  - Upgrade unit stats (HP, damage, attack speed) — 10 levels per unit
  - Upgrade enhancers (bigger area, longer duration, stronger effect)
- Carries over permanently

### Unit Upgrades

- 10 upgrade levels per unit
- Each level gives a small stat boost (HP, damage, attack speed)
- Costs increase per level
- Players choose where to invest, creating unique builds

### Starting Experience

- Player starts with enough Toby Dollars to unlock 2-3 units
- Cheaper units (Peashooter, Very Fast Walker) are affordable early
- Powerful units (Cherry Bomber, Necromancer) require saving up

### Enhancer Unlocks

- Passive enhancer: unlocks at campaign level 5
- Active enhancer: unlocks at campaign level 15
- Superpower enhancer: unlocks at campaign level 25

## Game Modes

### Campaign (20-30 levels)

- Levels grouped into themed worlds (Backyard, Graveyard, Desert, etc.)
- Each world introduces new enemy types gradually
- Boss levels every 5-10 levels — Gargantuar-class enemies with unique mechanics
- Difficulty scales: AI gets smarter, deploys more units, uses enhancers
- Designed for easy expansion to 40+ levels post-launch

### Endless Mode

- Unlocks after completing the campaign
- Waves get progressively harder
- Leaderboard — how many waves can you survive
- Earn bonus Toby Dollars for high wave counts

## Players

There are exactly two players — no account system needed:

- **Lukas** — always plays as Plants
- **Toby** — always plays as Zombies

### Landing Page

Split-screen "Who are you?" character select:
- Left side (green): Lukas's portrait/avatar → click to enter as Lukas (Plants)
- Right side (purple): Toby's portrait/avatar → click to enter as Toby (Zombies)
- Each player has their own campaign progress, unlocked units, and Toby Dollar balance

### Multiplayer

When both Lukas and Toby are online, they can play against each other in real-time instead of AI:
- **Lobby system**: After selecting your character, you see if the other player is online
- **Challenge**: If both online, a "Battle Lukas/Toby!" button appears
- **Real-time sync**: Game state synced via Firebase Realtime Database — unit placements, projectiles, damage, and base HP
- **Fallback**: If the other player is not online, play vs AI as normal
- **Presence**: Firebase Realtime Database presence system tracks who is online

## Website Design

### Tech Stack

- Astro (site shell and routing)
- Phaser.js (game engine)
- Tailwind CSS (website UI styling)
- Firebase Hosting (deployment)
- Firebase Realtime Database (multiplayer sync + presence)

### Pages

- **Landing/Home** — split-screen "Who are you?" — Lukas (green/left) or Toby (purple/right). Minecraft-style blocky font. Click your name to enter
- **Lobby** — shows your profile, online status of the other player, "Play vs AI" or "Battle [other player]!" buttons
- **Marketplace** — shop UI: roster display, upgrade bars (1-10), Toby Dollar balance, buy/upgrade buttons
- **Campaign Map** — world map with level nodes connected by paths, locked/unlocked states
- **Endless Mode** — wave counter, leaderboard
- **Game Screen** — full Phaser.js canvas with HUD overlay

### Visual Style

- Minecraft-style blocky pixel aesthetic throughout
- Color palette: greens/yellows for plant side, purples/grays for zombie side
- Blocky buttons, pixelated borders, chunky UI elements
- Dark background with glowing accents
- Minecraft-style blocky font for all text

### In-Game HUD

- **Top bar**: LukieCoin counter, enhancer cooldown icons
- **Bottom bar**: draggable unit cards with energy costs
- **Lane grid**: visible with subtle tile lines
- **Base health bars**: at opposite ends of the field

## Save System

- Two save slots: one for Lukas, one for Toby — stored in Firebase Realtime Database
- Each save tracks: unlocked units, upgrade levels, Toby Dollars, campaign progress
- Firebase Realtime Database also handles multiplayer game state and presence
