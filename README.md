# Pirate Ship Battle

A 3D local multiplayer pirate ship combat game built with [Three.js](https://threejs.org/). Two players share a keyboard and battle on the high seas with cannons, flintlocks, swords, and muskets.

## How to Play

Serve the files with any HTTP server and open in a browser:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Choose a map from the main menu and start battling.

## Controls

### Player 1 — Captain Redbeard (Red Ship)

| Key | Action |
|-----|--------|
| W / A / S / D | Sail / Turn |
| F | Fire Cannons |
| G | Flintlock |
| R | Sword Attack |
| T | Musket |
| E | Board Enemy Ship |
| Q | Raid for Coins |

### Player 2 — Captain Bluebeard (Blue Ship)

| Key | Action |
|-----|--------|
| Arrow Keys | Sail / Turn |
| L | Fire Cannons |
| K | Flintlock |
| O | Sword Attack |
| P | Musket |
| . | Board Enemy Ship |
| , | Raid for Coins |

## Maps

- **Open Sea Battle** — Open water with scattered rocks, floating barrels, whirlpools, a kraken, and a leviathan.
- **Port Battle** — A harbor with docks, port buildings, a stone fortress, a sandy beach, and sea hazards in the channel.

## Weapons & Mechanics

| Weapon | Damage | Cooldown | Range | Notes |
|--------|--------|----------|-------|-------|
| Cannons | 15 (hull) | 1.5s | Projectile | Fires broadsides from both sides of the ship with arcing cannonballs |
| Flintlock | 8 (crew) | 2.0s | 40 units | Hitscan with 70% accuracy |
| Sword | 12 (crew) | 0.8s | 25 units (boarding range) | 80% hit chance |
| Musket | 20 (crew) | 3.0s | 60 units | Hitscan with 75% accuracy, highest crew damage |
| Boarding | 15 (crew) | 2.0s | 25 units | Resets raid cooldown on success |
| Raid | — | 3.0s | 20 units | Steals up to 10 doubloons from the enemy |

- **Ship Hull** — Damaged by cannons and sea hazards. Ship sinks at 0.
- **Crew Health** — Damaged by small arms and boarding. Crew lost at 0.
- **Doubloons** — Earned passively (1 every 5 seconds) or stolen via raiding. Displayed on the HUD.

## Sea Hazards

- **Kraken** — Rises from the deep periodically. Tentacles animate and deal hull damage to nearby ships.
- **Leviathan** — A serpentine sea monster that roams the map, surfacing to damage ships that get too close.
- **Whirlpools** — Pull nearby ships toward their center with increasing force. The vortex core deals heavy hull damage.

## Architecture

The game is two files with zero build step:

```
index.html   — UI layout, HUD, menus, and CSS styling
game.js      — All game logic (~1600 lines)
```

`game.js` is organized into these sections:

| Section | Description |
|---------|-------------|
| Global State & Constants | `Game` singleton, tuning values (speeds, damage, cooldowns, ranges) |
| Initialization | Renderer, camera, scene setup, loading screen |
| Lighting | Ambient, directional (sun with shadows), hemisphere lights, fog |
| Ocean | Animated water plane with vertex-displaced waves, gradient skybox with clouds |
| Ship Builder | Procedural 3D pirate ships — hull, deck, stern, cabin, masts, sails, cannons, railings, flag, lanterns, figurehead, crew |
| Pirate Builder | Procedural crew members with body, hat, sword |
| Map Setup | Open Sea (rocks, barrels) and Port (docks, buildings, fortress, beach, land) |
| Sea Hazards | Kraken, Leviathan, and Whirlpool creation and AI |
| Combat | Cannon projectiles with gravity, hitscan weapons, boarding, raiding |
| Visual Effects | Muzzle flashes, smoke, sparks, wood splinters, coin showers, water splashes, sword arcs, ship wakes |
| Game Loop | Player update (movement, weapons, death check), projectile physics, particle system, hazard AI, camera tracking, HUD |

### Rendering

- **Three.js r128** loaded from CDN
- WebGL renderer with PCF soft shadow maps and ACES filmic tone mapping
- Dynamic camera that frames both ships and pulls back as they separate
- Vertex-animated ocean surface (3 layered sine waves)

### Key Design Decisions

- **No assets** — Everything is procedurally generated geometry (ships, pirates, sea monsters, buildings, terrain)
- **No build tools** — Single HTML + JS, runs from any static file server
- **Shared keyboard** — Designed for couch co-op on one machine
- **Dual damage model** — Hull integrity (structural, from cannons/hazards) and crew health (from small arms/boarding) provide two paths to victory

## Tech Stack

- Three.js r128 (via CDN)
- Vanilla JavaScript (ES6)
- HTML5 Canvas (for procedural textures — sky gradient, pirate flag)

## License

See repository for license information.
