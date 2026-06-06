<<<<<<< HEAD
import { initMap } from './map/mapbox.js';
import { sfLayer, mercatorScale } from './map/sfLayer.js';
import { CameraToggle } from './ui/CameraToggle.js';
import { Environment } from './map/Environment.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { buildColliders } from './physics/Colliders.js';
import { NeuralAgent } from './agents/NeuralAgent.js';
import { AgentSocket } from './network/AgentSocket.js';
import { TrainingHUD } from './ui/TrainingHUD.js';
import { RoadGraph } from './map/RoadGraph.js';
import { AssetManager } from './assets/AssetManager.js';
import * as THREE from 'three';

async function main() {
  // --- Map ---
  const map = await initMap();

  // --- Three.js layer: insert before the first symbol (label) layer ---
  const layers = map.getStyle().layers;
  const firstSymbol = layers.find(l => l.type === 'symbol');
  map.addLayer(sfLayer, firstSymbol ? firstSymbol.id : undefined);
  const scene = sfLayer.getScene();

  // --- Physics World & Building Footprints ---
  const physicsWorld = new PhysicsWorld();
  await physicsWorld.init();
  buildColliders(map, physicsWorld);

  // --- Environment Assets (Sidewalks, trees, streetlights, pedestrians) ---
  const environment = new Environment(map, scene);
  environment.build();

  // --- Road Network Graph & Connectivity ---
  const roads = environment._queryRoads();
  const roadGraph = new RoadGraph(roads);

  // --- Asset Manager (traffic lights, signs, pedestrians) ---
  const assetManager = new AssetManager(scene);

  // --- Spawning 10 Autonomous RL Agents along safe road nodes ---
  const agents = [];
  for (let i = 0; i < 10; i++) {
    const hue = i / 10;
    agents.push(new NeuralAgent(i, scene, hue, roadGraph));
  }

  // --- WebSocket Relay Client ---
  const socket = new AgentSocket(agents, environment);
  window.socket = socket;

  // --- Camera Toggle ---
  const cameras = new CameraToggle(map);

  // --- Training Telemetry Panel ---
  const hud = new TrainingHUD(agents);

  const m = mercatorScale();

  // --- 3D A* Route Visualizer (Cylinder segments for thick, high-visibility path) ---
  const pathGeometry = new THREE.BufferGeometry();
  const initPositions = new Float32Array(20 * 3);
  pathGeometry.setAttribute('position', new THREE.BufferAttribute(initPositions, 3));
  const pathMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00f0ff, 
    linewidth: 4, 
    depthTest: false,
    depthWrite: false
  });
  const pathLine = new THREE.Line(pathGeometry, pathMaterial);
  pathLine.renderOrder = 9998;
  scene.add(pathLine);

  // Thick cylinder segments connecting the waypoints
  const pathSegmentsGroup = new THREE.Group();
  scene.add(pathSegmentsGroup);
  const segmentGeo = new THREE.CylinderGeometry(0.8 * m, 0.8 * m, 1, 5); // 1.6m thick pipe
  segmentGeo.rotateX(Math.PI / 2); // align cylinder length with Z axis
  const segmentMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.6
  });
  const pathSegments = [];
  for (let i = 0; i < 19; i++) {
    const segment = new THREE.Mesh(segmentGeo, segmentMat);
    segment.renderOrder = 9997;
    segment.visible = false;
    pathSegmentsGroup.add(segment);
    pathSegments.push(segment);
  }

  // Glowing waypoint spheres
  const pathPointsGroup = new THREE.Group();
  scene.add(pathPointsGroup);
  const sphereGeo = new THREE.SphereGeometry(2.0 * m, 8, 8); // 4m diameter (highly visible)
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x00a8ff,
    depthTest: false,
    depthWrite: false
  });
  const waypointSpheres = [];
  for (let i = 0; i < 20; i++) {
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.renderOrder = 9998;
    sphere.visible = false;
    pathPointsGroup.add(sphere);
    waypointSpheres.push(sphere);
  }

  // --- Clock ---
  const clock = new THREE.Clock();

  // --- Animation loop ---
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    physicsWorld.step(delta);
    environment.update(delta);
    assetManager.update(delta);

    for (const agent of agents) {
      agent.update(delta, agents, environment);
    }

    hud.update(agents, environment);

    const followedAgent = agents[hud.selectedAgentId];
    if (followedAgent) {
      cameras.update(followedAgent);

      // Render the A* path of the focused agent in 3D
      if (followedAgent.waypoints && followedAgent.waypoints.length > 0) {
        const positionAttr = pathGeometry.attributes.position;
        const m = mercatorScale();
        const zOffset = 1.2 * m;

        let displayPoints = [];
        // Add current agent position as the start of the visible line
        displayPoints.push(new THREE.Vector3(followedAgent.pos.x, followedAgent.pos.y, followedAgent.pos.z + zOffset));

        // Add all upcoming waypoints
        for (let i = followedAgent.currentWpIdx; i < followedAgent.waypoints.length; i++) {
          const wp = followedAgent.waypoints[i];
          displayPoints.push(new THREE.Vector3(wp.x, wp.y, wp.z + zOffset));
        }

        // Fill the path line geometry (up to 20 vertices)
        for (let i = 0; i < 20; i++) {
          if (i < displayPoints.length) {
            positionAttr.setXYZ(i, displayPoints[i].x, displayPoints[i].y, displayPoints[i].z);
          } else {
            // Repeat the last point to hide unused segments
            const last = displayPoints[displayPoints.length - 1];
            positionAttr.setXYZ(i, last.x, last.y, last.z);
          }
        }

        // Hide all decorative spheres and segments first
        for (let i = 0; i < 20; i++) {
          if (waypointSpheres[i]) waypointSpheres[i].visible = false;
          if (pathSegments[i]) pathSegments[i].visible = false;
        }

        // Place spheres at remaining waypoints
        let sphereIdx = 0;
        for (let i = followedAgent.currentWpIdx; i < followedAgent.waypoints.length; i++) {
          const wp = followedAgent.waypoints[i];
          const pos = new THREE.Vector3(wp.x, wp.y, wp.z + zOffset);
          const sphere = waypointSpheres[sphereIdx];
          if (sphere) {
            sphere.position.copy(pos);
            sphere.scale.setScalar(i === followedAgent.currentWpIdx ? 1.6 : 1.0); // highlight current target
            sphere.visible = true;
          }
          sphereIdx++;
        }

        // Place thick cylinders along the visible path
        for (let i = 0; i < displayPoints.length - 1; i++) {
          const p1 = displayPoints[i];
          const p2 = displayPoints[i + 1];
          const segment = pathSegments[i];
          if (segment) {
            const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            const dir = new THREE.Vector3().subVectors(p2, p1);
            const len = dir.length();
            
            segment.position.copy(midpoint);
            segment.scale.set(1, 1, len); // scale cylinder length
            
            const up = new THREE.Vector3(0, 0, 1);
            if (len > 0.001) {
              const alignDir = dir.clone().normalize();
              segment.quaternion.setFromUnitVectors(up, alignDir);
            }
            segment.visible = true;
          }
        }
        
        positionAttr.needsUpdate = true;
        pathGeometry.computeBoundingSphere();
        pathGeometry.computeBoundingBox();
        pathLine.visible = true;
      } else {
        pathLine.visible = false;
        waypointSpheres.forEach(s => s.visible = false);
        pathSegments.forEach(s => s.visible = false);
      }
    } else {
      pathLine.visible = false;
      waypointSpheres.forEach(s => s.visible = false);
      pathSegments.forEach(s => s.visible = false);
    }
  }

  animate();
}

main().catch(console.error);
=======
import { AssetManager } from './classes/AssetManager.js';
import { createMap } from './map/mapbox.js';
import { SFLayer } from './map/sfLayer.js';
import { PlayerCar } from './agents/PlayerCar.js';
import { CameraToggle } from './ui/CameraToggle.js';
import { TrafficManager } from './agents/Traffic.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { AgentManager } from './agents/AgentManager.js';
import { AgentSocket } from './network/AgentSocket.js';
import { buildColliders } from './physics/Colliders.js';
import { TrainingHUD } from './ui/TrainingHUD.js';

// Car start position: intersection of Market St and 1st St.
const CAR_START = { lng: -122.3988, lat: 37.7916 };

class Game {

  constructor() {
    this.keys = {};
    this.rlSocketStatus = 'not-started';
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup',   (e) => this.keys[e.key.toLowerCase()] = false);

    // --- debug overlay ---
    this.dbg = document.createElement('div');
    this.dbg.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:99;background:rgba(0,0,0,.8);' +
      'color:#0f0;font:11px monospace;padding:8px;white-space:pre;line-height:1.5;' +
      'pointer-events:none;border-radius:4px;max-width:46ch;';
    document.body.appendChild(this.dbg);
    this.fps = 0; this.frames = 0; this.fpsT = 0;
    this.infoPanel = document.getElementById('info');

    // start immediately — no terminal, no launch screen
    this.load();
  }

  load() {
    this.assets = new AssetManager();
    this.assets.setPath('assets/');
    this.assets.load();
  }

  // called by AssetManager when all assets have loaded
  async onLoad() {
    this.physics = new PhysicsWorld();
    await this.physics.init();

    this.map = createMap('map');
    this.sfLayer = new SFLayer();
    this.map.on('load', () => this.onMapLoad());
  }

  onMapLoad() {
    // Build physics colliders for buildings and boundaries
    buildColliders(this.map, this.physics);

    // inject the Three.js scene as a Mapbox custom layer, above the buildings
    this.map.addLayer(this.sfLayer, 'waterway-label');

    // player car at Market & 1st
    this.player = new PlayerCar({
      scene: this.sfLayer,
      lng: CAR_START.lng,
      lat: CAR_START.lat,
      heading: 0,
      scale: 1
    });

    // traffic system (other cars, trees, pedestrians)
    this.traffic = new TrafficManager(this.sfLayer);

    // rl agents system
    this.agentManager = new AgentManager(this.physics, this.sfLayer);
    this.agentSocket = new AgentSocket(this.agentManager, (status) => {
      this.rlSocketStatus = status;
    });
    this.agentSocket.setEnvironment(this.traffic);
    this.focusTarget = this.player;
    this.trainingHud = new TrainingHUD(this.agentManager.agents, (agentId) => {
      this.focusTarget = this.agentManager.getAgentById(agentId);
    });

    // camera toggle (bird's eye <-> follow), C key
    this.cameraToggle = new CameraToggle(this.map, document.getElementById('hud'));

    // per-frame update, driven by Mapbox's continuous repaint
    this.lastTime = performance.now();
    this.map.on('render', () => this.update());
  }

  update() {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.physics) this.physics.step(delta);
    this.player.update(delta, this.keys);
    if (this.traffic) this.traffic.update(delta);
    if (this.agentManager) this.agentManager.update(delta, this.traffic);
    this.cameraToggle.update(this.focusTarget);
    this.trainingHud.update(this.agentManager.agents, this.traffic);

    const pos = this.player.getPosition();
    const speed = this.player.speed;
    this.frames++; this.fpsT += delta;
    if (this.fpsT >= 0.5) { this.fps = Math.round(this.frames / this.fpsT); this.frames = 0; this.fpsT = 0; }
    const held = Object.keys(this.keys).filter(k => this.keys[k]).join(',') || '(none)';
    this.dbg.textContent =
      `fps:        ${this.fps}\n` +
      `delta(ms):  ${(delta * 1000).toFixed(1)}\n` +
      `keys:       ${held}\n` +
      `speed(m/s): ${speed.toFixed(2)}\n` +
      `heading:    ${(pos.heading * 180 / Math.PI).toFixed(1)}°\n` +
      `lng,lat:    ${pos.lng.toFixed(6)}, ${pos.lat.toFixed(6)}\n` +
      `bearing:    ${this.map.getBearing().toFixed(1)}°  pitch:${this.map.getPitch().toFixed(0)}  zoom:${this.map.getZoom().toFixed(2)}`;

    this.updateInfoPanel();
  }

  updateInfoPanel() {
    if (!this.infoPanel || !this.agentManager) return;

    const stats = this.agentManager.getStats();
    this.infoPanel.innerHTML = `
      <h3>DriveBy RL Training</h3>
      <p>Simulation-first training for dangerous edge cases before real cars touch the road.</p>
      <div class="info-grid">
        <div><span>RL agents</span><strong>${stats.total}</strong></div>
        <div><span>Sensor feeds</span><strong>${stats.sensors}</strong></div>
        <div><span>Backend</span><strong>${this.rlSocketStatus}</strong></div>
        <div><span>RL controlled</span><strong>${stats.rlControlled}/${stats.total}</strong></div>
      </div>
      <div class="info-foot">Cyan beacons mark RL-enabled vehicles. WASD/Arrows drive. C toggles camera.</div>
    `;
  }

}

window.game = new Game();
>>>>>>> origin/ui-merged
