# DriveBy — Multi-Agent RL Driving Simulator

DriveBy is a browser-based reinforcement-learning environment set in a real San
Francisco downtown block. Ten autonomous car agents — each driven by its own
neural network learn to navigate real streets from a start point to a goal,
following an A\*-planned route while avoiding buildings, other cars, and
pedestrians. A live dashboard lets you spectate any agent and watch it train. A
human can also take control of a car with the keyboard.

The 3D city is rendered with **Mapbox GL JS** (real SF geometry and 3D
buildings); the agents, paths, and sensors live in a **Three.js** layer sharing
Mapbox's WebGL context. Training runs in a lightweight **Python** backend that
talks to the browser over WebSocket.

Built on top of [SynthCity](https://github.com/jeffbeene/synthcity) by Jeff
Beene — the Three.js renderer setup and sedan car model are derived from that
project.

---

## The Problem It Solves

**You cannot train a car to drive by letting it crash into real things.**

Reinforcement learning works through trial and error: the agent acts, gets a
reward or penalty, and gradually learns what works. A self-driving car needs
millions of these trials before it gets good. In the real world that means
millions of potential crashes, injuries, deaths, and destroyed cars. That's
impossible. This is the **training-data and safety problem that every autonomous
vehicle company faces** — DriveBy is an open, hackathon-scale take on the same
pipeline Waymo and others build internally.

**Real-world data collection is slow and expensive.** Waymo has spent over a
billion dollars and a decade driving real cars millions of miles just to collect
training scenarios. Even then, the truly dangerous edge cases — a child running
into the road, a car drifting into your lane at 70 mph, a truck jackknifing on a
wet highway — are rare in real life. You might drive for years and never see one.
But the car has to handle it perfectly the first time. In simulation you can
**manufacture those scenarios deliberately, run them thousands of times, for
free, at many times real speed.**

**Multi-agent training is what makes the behaviour real.** A car trained in
isolation learns to drive in a world with no other cars — useless, because real
driving is mostly about predicting and reacting to other people. By training many
agents at once in the same world, they are forced to learn to navigate around
each other: merging, yielding, following at safe distances, anticipating lane
changes. No one hand-codes "yield" — it *emerges* because not yielding causes
collisions, which cause penalties.

**The end product is just a file.** The trained policy is a neural network. You
deploy that file to any car with cameras: frames go in, steering and throttle
come out. That is the "plug it into any car and it drives itself" vision, learned
entirely in simulation where infinite crashes cost nothing and no one gets hurt —
and the resulting software runs in a real vehicle.

> **In one line:** real-world autonomous-driving training is too dangerous, too
> slow, and too expensive. Simulation with reinforcement learning fixes all
> three — infinite crashes for free, at speed, with no one harmed, producing
> software that works in a real car.

---

## How It Works

Each of the 10 agents runs an independent loop on a shared clock:

1. **Plan** — At spawn, the agent is given a Point A (start) and Point B (goal)
   a few blocks apart. **A\*** runs over a grid rasterized from real building
   footprints and produces a path, resampled to **20 waypoints**, drawn on the
   map as a blue ribbon. Paths are validated to never cross a building.
2. **Perceive** — Each tick the browser builds the agent's observation: its
   speed/heading, the vector to its next waypoint, and the nearest assets (other
   cars, traffic lights) with their speed and heading.
3. **Act** — Observations are sent over WebSocket to the Python learner, which
   runs each agent's policy network and returns a continuous action
   (steering + acceleration) for the next tick.
4. **Reward & learn** — The browser computes a reward: a dense
   progress-toward-waypoint signal, a bonus at each checkpoint, a large reward
   at the goal, and penalties for hitting a building / car / pedestrian or
   idling. Crashes reset the agent to its start; reaching the goal assigns a
   fresh A→B route. The learner updates each agent's network with PPO.

The browser is the environment; Python is the learner. If the Python backend
isn't running, cars fall back to scripted routes so the scene never freezes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Map & 3D buildings | Mapbox GL JS v3 (real SF geometry) |
| 3D agents, paths, scene | Three.js (custom Mapbox layer) |
| Navigation | A\* over a building-footprint grid (in-browser) |
| Physics scaffolding | Rapier.js (WASM) |
| Real-time comms | WebSocket (`ws` / Python `websockets`) |
| RL backend | Python — PyTorch (PPO, one network per agent) |
| Data storage | [Insforge](https://insforge.dev/) (training runs & agent data) |
| Build tool | Webpack |

---

## How to Run

### Requirements

- [Node.js](https://nodejs.org/) v18+ and npm
- A **Mapbox public access token** (`pk.…`) — free at
  [account.mapbox.com](https://account.mapbox.com/access-tokens/)
- Python 3.10+ with `torch`, `numpy`, `websockets` (only needed for training)

### 1. Configure the Mapbox token

Copy `.env.example` to `.env` and add your **public** token:

```
MAPBOX_TOKEN=pk.your_public_token_here
```

> Use a `pk.` (public) token only — never an `sk.` (secret) token. The token is
> compiled into the browser bundle at build time, so a secret token would be
> exposed publicly.

### 2. Install and build

```bash
npm install
npm run build
```

The token is baked into the bundle during `build`, so **re-run `npm run build`
whenever you change `.env` or the source.**

### 3. Serve the app

```bash
npx http-server -p 8080 -c-1 .
```

Open [http://localhost:8080](http://localhost:8080). (Serve over HTTP — opening
`index.html` directly via `file://` breaks asset loading.)

### 4. (Optional) Start the RL training backend

```bash
python rl/server.py
```

With the backend running, the agents are driven by their networks and train
live; you'll see per-agent PPO updates in the terminal. Without it, the cars use
scripted fallback routes.

---

## Controls & Dashboard

| Key | Action |
|---|---|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / reverse |
| `A` / `←` | Steer left |
| `D` / `→` | Steer right |
| `C` | Toggle bird's-eye / follow camera |

The side **dashboard** shows the spectated agent's status, speed, heading,
reward, episode, waypoint progress, and nearby assets. Click any agent button to
spectate that agent (the camera follows it).

---

## Project Structure

```
/
├── index.html                — Mapbox + Three.js canvas, dashboard mount
├── webpack.config.js         — build; injects MAPBOX_TOKEN from .env
├── src/
│   ├── index.js              — app bootstrap & main loop
│   ├── map/
│   │   ├── mapbox.js         — Mapbox GL JS init, SF downtown view
│   │   ├── sfLayer.js        — Three.js custom layer (shared WebGL context)
│   │   ├── Navigation.js     — building grid + A* path-finding + waypoints
│   │   └── PathRenderer.js   — blue path ribbon (car-width) on the map
│   ├── agents/
│   │   ├── PlayerCar.js      — human-controlled car (WASD)
│   │   └── Traffic.js        — 10 RL agents: dynamics, rewards, env step
│   ├── network/
│   │   └── AgentSocket.js    — WebSocket client + common training clock
│   ├── physics/
│   │   └── PhysicsWorld.js   — Rapier.js world scaffolding
│   ├── ui/
│   │   ├── Dashboard.js      — spectate panel + per-agent buttons
│   │   └── CameraToggle.js   — bird's-eye / follow camera
│   └── classes/AssetManager.js — model/texture loader
└── rl/
    ├── perception.py         — raw assets → 16-D state vector
    ├── policy.py             — MLP policy network
    ├── actuator.py           — network output → steering/acceleration
    ├── env.py                — headless 2D environment (offline training)
    ├── train.py              — offline PPO training loop
    └── server.py             — live WebSocket learner (10 independent agents)
```

---

## Future Expansion

DriveBy is a foundation, not a finished product. Planned and possible directions:

- **Scale to 100+ agents.** The architecture targets up to 100 simultaneous
  agents; current focus is 10 for clarity. Batched inference and instanced
  rendering would push the count up while holding frame rate.
- **Camera-based observations.** Per-agent front/back/side
  `WebGLRenderTarget` sensors (84×84) feeding a CNN policy, so agents learn from
  pixels rather than hand-built feature vectors.
- **Richer traffic rules.** Make agents obey traffic-light phases, stop signs,
  lane discipline, and right-of-way, with rewards/penalties tied to compliance.
- **Dynamic pedestrians & traffic.** Pedestrians that cross unpredictably and
  cars with intent, turning the task into genuine interactive negotiation.
- **Curriculum & shared learning.** Start with short routes and grow difficulty;
  experiment with shared-policy vs. independent-network training and
  population-based methods.
- **Persisted & shareable policies.** Save/load trained checkpoints and let
  users load a pre-trained "Waymo-like" agent to watch without training.
- **Metrics & evaluation.** Success rate, collisions per km, time-to-goal, and
  route efficiency charts in the dashboard for comparing training runs.
- **Hardened navigation.** Source-level building extraction (independent of the
  current viewport) and swept collision to eliminate edge-case tunneling.

---

## Credits

- [SynthCity](https://github.com/jeffbeene/synthcity) by Jeff Beene — base
  Three.js renderer and sedan car model
- Sedan 3D model — Quaz30 ([sketchfab.com/quaz30](https://sketchfab.com/quaz30))
- Map data & 3D buildings — [Mapbox](https://www.mapbox.com/)
### Sponsors

- **[Insforge](https://insforge.dev/)** — data storage; used to store training
  runs and agent data
- **Replicas** — AI-assisted development; used to write parts of the codebase
