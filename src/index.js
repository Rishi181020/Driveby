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

  // --- 3D A* Route Visualizer ---
  const pathGeometry = new THREE.BufferGeometry();
  const initPositions = new Float32Array(20 * 3);
  pathGeometry.setAttribute('position', new THREE.BufferAttribute(initPositions, 3));
  const pathMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00f0ff, 
    linewidth: 4, // slightly thicker
    depthTest: false,
    depthWrite: false
  });
  const pathLine = new THREE.Line(pathGeometry, pathMaterial);
  pathLine.renderOrder = 9998;
  scene.add(pathLine);

  // Glowing waypoint spheres
  const pathPointsGroup = new THREE.Group();
  scene.add(pathPointsGroup);
  const m = mercatorScale();
  const sphereGeo = new THREE.SphereGeometry(1.5 * m, 8, 8);
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

    // Update physics step
    physicsWorld.step(delta);
    
    // Update environment asset animations (pedestrians)
    environment.update(delta);

    // Update all autonomous agents
    for (const agent of agents) {
      agent.update(delta, agents, environment);
    }

    // Refresh HUD telemetry
    hud.update(agents, environment);

    // Smoothly focus camera on the selected agent
    const followedAgent = agents[hud.selectedAgentId];
    if (followedAgent) {
      cameras.update(followedAgent);

      // Render the A* path of the focused agent in 3D
      if (followedAgent.waypoints && followedAgent.waypoints.length > 0) {
        const positionAttr = pathGeometry.attributes.position;
        const m = mercatorScale();
        for (let i = 0; i < followedAgent.waypoints.length; i++) {
          const wp = followedAgent.waypoints[i];
          const zOffset = wp.z + 1.2 * m;
          positionAttr.setXYZ(i, wp.x, wp.y, zOffset);
          
          const sphere = waypointSpheres[i];
          if (sphere) {
            sphere.position.set(wp.x, wp.y, zOffset);
            sphere.scale.setScalar(i === followedAgent.currentWpIdx ? 1.6 : 1.0); // highlight current target
            sphere.visible = true;
          }
        }
        positionAttr.needsUpdate = true;
        pathGeometry.computeBoundingSphere();
        pathGeometry.computeBoundingBox();
        pathLine.visible = true;
      } else {
        pathLine.visible = false;
        waypointSpheres.forEach(s => s.visible = false);
      }
    } else {
      pathLine.visible = false;
      waypointSpheres.forEach(s => s.visible = false);
    }
  }

  animate();
}

main().catch(console.error);
