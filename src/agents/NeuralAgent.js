import * as THREE from 'three';
import { worldToMap, mercatorScale, mapToWorld } from '../map/sfLayer.js';
import { samplePathToWaypoints } from '../map/RoadGraph.js';

const MAX_SPEED_MS = 14;

export class NeuralAgent {
  constructor(id, scene, hue, roadGraph) {
    this.id = id;
    this.scene = scene;
    this.roadGraph = roadGraph;
    
    // Agent identity
    this.generation = 1;
    this.score = 0.0;
    this.bestScore = -9999.0;
    
    // Status flags
    this.collided = false;
    this.collisionReported = false;
    this.reachedWaypoint = false;
    this.spawnGraceTimer = 0.0;
    this.crashResetTimer = 0.0;
    
    // Active states
    this.speed = 0.0;
    this.heading = 0.0;
    this.pos = new THREE.Vector3();
    this.lng = 0.0;
    this.lat = 0.0;
    
    // Route states
    this.waypoints = [];
    this.currentWpIdx = 0;
    this.targetWp = null;
    
    // 3D Group
    this.group = null;
    this._spawnMesh(hue);

    // Active actions (last received from server or calculated from autopilot)
    this.lastAction = { throttle: 0, steering: 0, brake: 0 };

    // Reset to a starting point along a valid A* path
    this.reset();
  }

  // Finds a route where the starting spawn point is not inside or too close to a building
  _findSafeSpawnRoute() {
    let tries = 50;
    const m = mercatorScale();
    const padding = 2.2 * m; // Safe buffer distance from any building edge

    while (tries-- > 0) {
      const route = this.roadGraph.getValidRoute();
      const firstWp = route.path[0];
      
      let collides = false;
      if (window.buildingObstacles) {
        for (const b of window.buildingObstacles) {
          if (firstWp.x >= b.minX - padding && firstWp.x <= b.maxX + padding &&
              firstWp.y >= b.minY - padding && firstWp.y <= b.maxY + padding) {
            collides = true;
            break;
          }
        }
      }
      
      if (!collides) {
        return route;
      }
    }
    
    // Fallback if no safe route found
    return this.roadGraph.getValidRoute();
  }

  reset(keepCurrentRoute = false) {
    this.speed = 0.0;
    this.collided = false;
    this.collisionReported = false;
    this.reachedWaypoint = false;
    this.score = 0.0;
    this.lastAction = { throttle: 0, steering: 0, brake: 0 };
    this.crashResetTimer = 0.0;
    
    // 0.5 seconds invulnerability on spawn to avoid chain-crash loops
    this.spawnGraceTimer = 0.5;

    if (!keepCurrentRoute || this.waypoints.length === 0) {
      // Retrieve a valid safe road-aligned A* route from the graph
      const route = this._findSafeSpawnRoute();
      this.waypoints = samplePathToWaypoints(route.path, 20);
    }
    
    // Spawn exactly at the start node (centerline)
    this.pos.copy(this.waypoints[0]);
    this.currentWpIdx = 1;
    this.targetWp = this.waypoints[1];

    // Compute heading towards the first waypoint
    const dir = new THREE.Vector3().subVectors(this.targetWp, this.pos);
    this.heading = Math.atan2(dir.x, -dir.y);

    // Convert Mercator back to Lng/Lat for follow camera support
    const lngLat = mapToWorld(this.pos.x, this.pos.y, this.pos.z);
    this.lng = lngLat.lng;
    this.lat = lngLat.lat;

    this._syncMesh();
  }

  _spawnMesh(hue) {
    const m = mercatorScale();
    this.group = new THREE.Group();

    // Custom cuboid car design for agents
    this._color = new THREE.Color().setHSL(hue, 0.9, 0.55);
    const paint = new THREE.MeshPhongMaterial({ color: this._color, shininess: 70 });
    const tyre  = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 30 });
    const glass = new THREE.MeshPhongMaterial({ color: 0x9fd0ee, opacity: 0.8, transparent: true, shininess: 90 });
    const light = new THREE.MeshBasicMaterial({ color: 0xfff4c0 });
    const tail  = new THREE.MeshBasicMaterial({ color: 0xff3322 });

    // Scale factors (oversized by 2.5x like PlayerCar)
    const scale = m * 2.5;
    const L = 4.4, W = 1.9;
    const chassisH = 0.45;
    const wheelR = 0.36, wheelW = 0.28;
    const chassisZ = wheelR + 0.04;

    // 1. Chassis (Main body slab)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(L * scale, W * scale, chassisH * scale), paint);
    chassis.position.set(0, 0, (chassisZ + chassisH / 2) * scale);
    this.group.add(chassis);

    // 2. Cabin
    const cabinL = L * 0.42, cabinH = 0.42;
    const cabinZ = chassisZ + chassisH;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinL * scale, W * 0.88 * scale, cabinH * scale), paint);
    cabin.position.set(-0.25 * scale, 0, (cabinZ + cabinH / 2) * scale);
    this.group.add(cabin);

    // 3. Windows
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(cabinL * 1.02 * scale, W * 0.9 * scale, cabinH * 0.6 * scale), glass);
    winBand.position.set(-0.25 * scale, 0, (cabinZ + cabinH * 0.45) * scale);
    this.group.add(winBand);

    // 4. Wheels
    const wheelGeo = new THREE.CylinderGeometry(wheelR * scale, wheelR * scale, wheelW * scale, 8);
    wheelGeo.rotateX(Math.PI / 2);
    for (const x of [L * 0.31, -L * 0.31]) {
      for (const y of [W / 2 - wheelW * 0.35, -(W / 2 - wheelW * 0.35)]) {
        const w = new THREE.Mesh(wheelGeo, tyre);
        w.position.set(x * scale, y * scale, wheelR * scale);
        this.group.add(w);
      }
    }

    // 5. Headlights & Taillights
    for (const y of [W / 2 - 0.3, -(W / 2 - 0.3)]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.34 * scale, 0.18 * scale), light);
      hl.position.set((L / 2 - 0.02) * scale, y * scale, (chassisZ + chassisH * 0.55) * scale);
      this.group.add(hl);
      
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.32 * scale, 0.16 * scale), tail);
      tl.position.set((-L / 2 + 0.02) * scale, y * scale, (chassisZ + chassisH * 0.55) * scale);
      this.group.add(tl);
    }

    // 6. Glowing floating marker sphere on top (visible in Bird's Eye view, depth tested off so it renders on top of buildings)
    const markerR = 0.6 * scale;
    const markerGeo = new THREE.SphereGeometry(markerR, 8, 8);
    const markerMat = new THREE.MeshBasicMaterial({
      color: this._color,
      depthTest: false,
      depthWrite: false
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 0, (chassisZ + chassisH + cabinH + 0.9) * scale); // hover above the cabin
    marker.renderOrder = 9999;
    this.group.add(marker);

    this.scene.add(this.group);
  }

  _syncMesh() {
    if (this.group) {
      this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.group.rotation.set(0, 0, this.heading - Math.PI / 2);
    }
  }

  applyAction({ throttle, steering, brake }, delta) {
    const m = mercatorScale();
    const maxSpd = m * MAX_SPEED_MS;
    const accel = m * 6;
    const timeStep = delta || (1 / 60);
    
    if (throttle > 0) {
      this.speed += throttle * accel * timeStep;
    }
    if (brake > 0) {
      this.speed -= brake * accel * timeStep * 1.5;
    }
    
    if (throttle === 0 && brake === 0) {
      this.speed -= Math.sign(this.speed) * m * 2 * timeStep;
      if (Math.abs(this.speed) < 0.25 * m) this.speed = 0;
    }
    
    this.speed = THREE.MathUtils.clamp(this.speed, -maxSpd * 0.2, maxSpd);

    if (Math.abs(this.speed) > 0.05 * m) {
      this.heading += steering * 1.8 * (this.speed / maxSpd) * timeStep;
    }
  }

  _ruleBasedDrive(delta) {
    const m = mercatorScale();
    const dist = this.pos.distanceTo(this.targetWp);
    
    if (dist > 2.0 * m) {
      // 1. Target heading calculation
      const dir = new THREE.Vector3().subVectors(this.targetWp, this.pos);
      const targetHeading = Math.atan2(dir.x, -dir.y);
      
      // 2. Turn towards target heading
      let angleDiff = targetHeading - this.heading;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // wrap to [-PI, PI]
      const steering = THREE.MathUtils.clamp(angleDiff * 2.5, -1.0, 1.0);
      
      // 3. Accelerate up to driving speed
      const targetSpeed = 7 * m; // ~25 km/h equivalent
      let throttle = 0.0;
      let brake = 0.0;
      
      if (this.speed < targetSpeed) {
        throttle = 0.6;
      } else {
        throttle = 0.0;
      }
      
      this.lastAction = { throttle, steering, brake };
    } else {
      this.lastAction = { throttle: 0, steering: 0, brake: 0.5 };
    }
  }

  update(delta, allAgents, environment) {
    const m = mercatorScale();

    // If collided, freeze position and handle timer / resets
    if (this.collided) {
      this.speed = 0;
      this.lastAction = { throttle: 0, steering: 0, brake: 0 };
      if (window.socket && !window.socket._connected) {
        this.crashResetTimer -= delta;
        if (this.crashResetTimer <= 0) {
          this.reset(true); // reset back to Point A of current route
        }
      }
      return;
    }

    // If Python server is not connected, use rule-based autopilot fallback
    if (window.socket && !window.socket._connected) {
      this._ruleBasedDrive(delta);
    }

    // Apply the last action continuous integration
    this.applyAction(this.lastAction, delta);

    // Advance position based on kinematic bicycle model (same as PlayerCar)
    const distM = (this.speed * delta) / m;
    const M_PER_DEG_LAT = 111320;
    const M_PER_DEG_LNG = 111320 * Math.cos(this.lat * Math.PI / 180);
    
    this.lat += (Math.cos(this.heading) * distM) / M_PER_DEG_LAT;
    this.lng += (Math.sin(this.heading) * distM) / M_PER_DEG_LNG;
    
    const p = worldToMap(this.lng, this.lat, 0);
    this.pos.copy(p);

    this._syncMesh();

    // Decrease the collision grace timer
    if (this.spawnGraceTimer > 0) {
      this.spawnGraceTimer -= delta;
    }

    // Time step penalty (discourages idling)
    this.score -= 0.01;
    
    // --- Waypoint Navigation ---
    const distToWp = this.pos.distanceTo(this.targetWp);
    if (distToWp < 14 * m) {
      this.score += 100.0; // Waypoint success reward
      this.reachedWaypoint = true;
      
      if (this.currentWpIdx < 19) {
        this.currentWpIdx++;
        this.targetWp = this.waypoints[this.currentWpIdx];
      } else {
        // Route complete: receive route completion reward and pick new A* route
        this.score += 200.0;
        
        // Target a new A* route starting from current location node
        let closestNodeIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < this.roadGraph.nodes.length; i++) {
          const d = this.pos.distanceTo(this.roadGraph.nodes[i]);
          if (d < minDist) {
            minDist = d;
            closestNodeIdx = i;
          }
        }
        
        // Find new random destination index
        let endIdx = this.roadGraph.getRandomNodeIdx();
        while (endIdx === closestNodeIdx) {
          endIdx = this.roadGraph.getRandomNodeIdx();
        }
        
        const path = this.roadGraph.findPath(closestNodeIdx, endIdx);
        if (path && path.length >= 2) {
          this.waypoints = samplePathToWaypoints(path, 20);
        }
        
        this.currentWpIdx = 1;
        this.targetWp = this.waypoints[1];
      }
    }

    // --- Obstacle/Collision checks ---
    this._checkCollisions(allAgents, environment);
  }

  _checkCollisions(allAgents, environment) {
    // Ignore all collisions during initial spawn grace period
    if (this.spawnGraceTimer > 0) return;

    const m = mercatorScale();

    // 1. Check boundary walls
    const bounds = {
      minLng: -122.404, maxLng: -122.393,
      minLat: 37.788,  maxLat: 37.797
    };
    const minM = worldToMap(bounds.minLng, bounds.minLat, 0);
    const maxM = worldToMap(bounds.maxLng, bounds.maxLat, 0);
    const minX = minM.x, maxX = maxM.x;
    const minY = maxM.y, maxY = minM.y;

    if (this.pos.x < minX || this.pos.x > maxX || this.pos.y < minY || this.pos.y > maxY) {
      this.collided = true;
      this.crashResetTimer = 1.0;
      this.score -= 100.0; // Collision penalty
      return;
    }

    // 2. Check overlap with building bounding boxes
    if (window.buildingObstacles) {
      const padding = 1.1 * m;
      for (const b of window.buildingObstacles) {
        if (this.pos.x >= b.minX - padding && this.pos.x <= b.maxX + padding &&
            this.pos.y >= b.minY - padding && this.pos.y <= b.maxY + padding) {
          this.collided = true;
          this.crashResetTimer = 1.0;
          this.score -= 100.0; // Collision penalty
          return;
        }
      }
    }

    // 3. Check other vehicles
    const carRadius = 3.2 * m;
    for (const other of allAgents) {
      if (other.id === this.id) continue;
      if (this.pos.distanceTo(other.pos) < carRadius) {
        this.collided = true;
        this.crashResetTimer = 1.0;
        this.score -= 100.0; // Collision penalty
        return;
      }
    }

    // 4. Check pedestrians
    const pedRadius = 1.6 * m;
    if (environment && environment._peds) {
      for (const ped of environment._peds) {
        if (this.pos.distanceTo(ped.position) < pedRadius) {
          this.collided = true;
          this.crashResetTimer = 1.0;
          this.score -= 100.0; // Collision penalty
          return;
        }
      }
    }
  }

  // --- Compile the 16-Dimensional State Vector ---
  getStateVector(allAgents, environment) {
    const m = mercatorScale();
    const state = [];

    // 1. Ego state (2 dims)
    state.push(this.speed / (MAX_SPEED_MS * m)); // normalized speed
    state.push(this.heading / (Math.PI * 2));    // normalized heading

    // 2. Nav target (2 dims)
    const distToWp = this.pos.distanceTo(this.targetWp);
    state.push(Math.min(distToWp / (100 * m), 1.0)); // normalized distance

    const angleToWp = Math.atan2(this.targetWp.y - this.pos.y, this.targetWp.x - this.pos.x) - (Math.PI / 2 - this.heading);
    let relWpAngle = Math.atan2(Math.sin(angleToWp), Math.cos(angleToWp));
    state.push(relWpAngle / Math.PI); // normalized relative angle

    // 3. Surrounding Assets (12 dims: top 3 closest assets)
    const detectedAssets = [];

    // Scan buildings (static assets - type 1.0) using closest AABB point for accurate distance
    if (window.buildingObstacles) {
      for (const b of window.buildingObstacles) {
        const closestX = Math.max(b.minX, Math.min(this.pos.x, b.maxX));
        const closestY = Math.max(b.minY, Math.min(this.pos.y, b.maxY));
        const edgePos = new THREE.Vector3(closestX, closestY, 0);
        const dist = this.pos.distanceTo(edgePos);
        if (dist < 45 * m) {
          const angle = Math.atan2(closestY - this.pos.y, closestX - this.pos.x) - (Math.PI / 2 - this.heading);
          const relAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
          detectedAssets.push({
            type: 1.0, // Building/Curb
            dist: dist / (50 * m),
            angle: relAngle / Math.PI,
            ruleState: -1.0 // static obstacle
          });
        }
      }
    }

    // Scan pedestrians (dynamic assets - type 4.0)
    if (environment && environment._peds) {
      for (const ped of environment._peds) {
        const dist = this.pos.distanceTo(ped.position);
        if (dist < 45 * m) {
          const angle = Math.atan2(ped.position.y - this.pos.y, ped.position.x - this.pos.x) - (Math.PI / 2 - this.heading);
          const relAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
          detectedAssets.push({
            type: 4.0, // Pedestrian
            dist: dist / (50 * m),
            angle: relAngle / Math.PI,
            ruleState: -1.0 // obstacle
          });
        }
      }
    }

    // Scan other agents (dynamic assets - type 3.0)
    for (const other of allAgents) {
      if (other.id === this.id) continue;
      const dist = this.pos.distanceTo(other.pos);
      if (dist < 45 * m) {
        const angle = Math.atan2(other.pos.y - this.pos.y, other.pos.x - this.pos.x) - (Math.PI / 2 - this.heading);
        const relAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
        detectedAssets.push({
          type: 3.0, // Vehicle
          dist: dist / (50 * m),
          angle: relAngle / Math.PI,
          ruleState: -1.0 // obstacle
        });
      }
    }

    // Sort by normalized distance
    detectedAssets.sort((a, b) => a.dist - b.dist);

    // Take top 3 and populate state
    for (let i = 0; i < 3; i++) {
      if (i < detectedAssets.length) {
        const asset = detectedAssets[i];
        state.push(asset.type);
        state.push(asset.dist);
        state.push(asset.angle);
        state.push(asset.ruleState);
      } else {
        // Padding
        state.push(0.0);
        state.push(0.0);
        state.push(0.0);
        state.push(0.0);
      }
    }

    return state;
  }

  getState() {
    return {
      lng: this.lng,
      lat: this.lat,
      heading: this.heading,
      speed: this.speed / mercatorScale() // in m/s
    };
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
  }
}
