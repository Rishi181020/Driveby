import * as THREE from 'three';
<<<<<<< HEAD
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { worldToMap, mercatorScale } from '../map/sfLayer.js';

const MAX_SPEED_MS = 12;

function carScale() {
  return (4.5 * mercatorScale()) / 7;
}

// Shared geometry + per-instance material for performance
let _sharedGeo = null;
function getSharedGeo(scene) {
  // Fallback box until OBJ loads — reused across all agents
  if (!_sharedGeo) _sharedGeo = new THREE.BoxGeometry(1, 0.4, 0.5);
  return _sharedGeo;
}

export class CarAgent {
  constructor(id, lng, lat, physicsWorld, scene, hue) {
    this.id = id;
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    const m = mercatorScale();
    this.pos = worldToMap(lng, lat, 0);
=======
import { mapboxWorldToLngLat, worldToMapbox } from '../map/sfLayer.js';

const MAX_SPEED_MS = 12;

export class CarAgent {
  constructor(id, lng, lat, physicsWorld, scene, hue, rlEnabled = false) {
    this.id = id;
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.rlEnabled = rlEnabled;
    this._rlActionAge = Infinity;

    this.pos = worldToMapbox(lng, lat, 0);
>>>>>>> origin/ui-merged
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 0;

    this._turnTimer = 2 + Math.random() * 3;
    this._turnDir = Math.random() < 0.5 ? 1 : -1;

<<<<<<< HEAD
    this._color = new THREE.Color().setHSL(hue, 0.85, 0.55);
    this._scale = carScale();
    this.mesh = null;
    this._spawnMesh();

    const hw = m * 2.5, hh = m * 0.8, hd = m * 1.2;
    this.bodyHandle = physicsWorld.addCarCollider(
      this.pos.x, this.pos.y, hh, hw, hh, hd
=======
    this._colorHex = new THREE.Color().setHSL(hue, 0.85, 0.55).getHex();
    this.mesh = new THREE.Group();
    this._spawnMesh();

    this.bodyHandle = physicsWorld.addCarCollider(
      this.pos.x, this.pos.y, this.pos.z
>>>>>>> origin/ui-merged
    );
  }

  _spawnMesh() {
<<<<<<< HEAD
    // Lightweight box placeholder — visually correct size, loads instantly
    const s = this._scale;
    const geo = new THREE.BoxGeometry(s * 7, s * 3, s * 3);
    const mat = new THREE.MeshPhongMaterial({
      color: this._color,
      emissive: this._color.clone().multiplyScalar(0.15),
      shininess: 60,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.pos);
    this.scene.add(this.mesh);
  }

  _ruleBased(delta) {
    const m = mercatorScale();
    const maxSpd = m * MAX_SPEED_MS;
    this.speed = Math.min(this.speed + m * 3 * delta, maxSpd * 0.5);
=======
    const sedanModel = window.game.assets?.models['sedan'];
    if (!sedanModel) {
      throw new Error(`CarAgent ${this.id} requires assets.models.sedan to be loaded.`);
    }

    const carModel = sedanModel.clone();

    const box = new THREE.Box3().setFromObject(carModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const targetLength = 4.8;
    const scale = targetLength / size.z;
    carModel.scale.set(scale, scale, scale);
    carModel.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    carModel.rotateX(-Math.PI / 2);

    carModel.traverse((node) => {
      if (node.isMesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map((mat) => {
            const m = mat.clone();
            if (m.color && (m.name === 'blinn2SG' || m.name === 'dull')) {
              m.color.setHex(this._colorHex);
            }
            return m;
          });
        } else {
          node.material = node.material.clone();
          if (node.material.color && (node.material.name === 'blinn2SG' || node.material.name === 'dull')) {
            node.material.color.setHex(this._colorHex);
          }
        }
      }
    });

    this.mesh.add(carModel);

    if (this.rlEnabled) {
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12),
        new THREE.MeshBasicMaterial({ color: 0x00fff7 })
      );
      beacon.position.y = 2.4;
      beacon.name = 'RL enabled beacon';
      this.mesh.add(beacon);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.7, 0.05, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ff95 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.08;
      halo.name = 'RL enabled footprint';
      this.mesh.add(halo);
    }

    this.scene.add(this.mesh);
    this.mesh.position.copy(this.pos);
  }

  _ruleBased(delta) {
    const maxSpd = MAX_SPEED_MS;
    this.speed = Math.min(this.speed + 3 * delta, maxSpd * 0.5);
>>>>>>> origin/ui-merged

    this._turnTimer -= delta;
    if (this._turnTimer <= 0) {
      this._turnTimer = 2 + Math.random() * 4;
      this._turnDir = Math.random() < 0.5 ? 1 : -1;
    }
    this.heading += this._turnDir * 0.35 * delta;
  }

<<<<<<< HEAD
  applyAction({ throttle = 0, steering = 0, brake = 0 }) {
    const m = mercatorScale();
    const maxSpd = m * MAX_SPEED_MS;
    const accel = m * 6;
=======
  applyAction(action) {
    const { throttle, steering, brake } = action;
    if (![throttle, steering, brake].every(Number.isFinite)) {
      throw new Error(`Invalid RL action for agent ${this.id}: throttle, steering, and brake must be finite numbers.`);
    }

    const maxSpd = MAX_SPEED_MS;
    const accel = 6;
>>>>>>> origin/ui-merged
    this.speed = THREE.MathUtils.clamp(
      this.speed + throttle * accel * (1/60) - brake * accel * (1/60),
      -maxSpd * 0.2, maxSpd
    );
    this.heading += steering * 1.4 * (this.speed / maxSpd) * (1/60);
  }

<<<<<<< HEAD
  update(delta) {
    this._ruleBased(delta);
    this.pos.x += Math.sin(this.heading) * this.speed * delta;
    this.pos.y -= Math.cos(this.heading) * this.speed * delta;

    if (this.mesh) {
      this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.mesh.rotation.set(0, -this.heading, 0);
    }
  }

  getObservation() {
    return { id: this.id, x: this.pos.x, y: this.pos.y, heading: this.heading, speed: this.speed };
  }

  dispose() {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    if (this.bodyHandle !== null) this.physicsWorld.removeBody(this.bodyHandle);
=======
  markRlControlled() {
    this._rlActionAge = 0;
  }

  update(delta) {
    this._rlActionAge += delta;
    if (!this.rlEnabled) {
      this._ruleBased(delta);
    }

    // X is east, Z is south in Three.js world coordinates
    this.pos.x += Math.sin(this.heading) * this.speed * delta;
    this.pos.z += Math.cos(this.heading) * this.speed * delta;

    if (this.mesh) {
      this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.mesh.rotation.set(0, this.heading, 0);
    }
  }

  isRlControlled() {
    return this.rlEnabled && this._rlActionAge < 0.5;
  }

  getPosition() {
    const { lng, lat } = mapboxWorldToLngLat(this.pos.x, this.pos.z);
    return { lng, lat, heading: this.heading };
  }

  getObservation() {
    const obs = { id: this.id, x: this.pos.x, y: this.pos.z, heading: this.heading, speed: this.speed };
    if (this.sensorCamera) {
      obs.camera = this.sensorCamera.getFrames();
    }
    return obs;
  }

  attachSensorCamera(sensorCamera) {
    this.sensorCamera = sensorCamera;
    this.sensorCamera.attach(this.mesh);
  }

  dispose() {
    if (this.sensorCamera) this.sensorCamera.detach(this.mesh);
    if (this.mesh) { this.scene.remove(this.mesh); }
    if (this.bodyHandle !== null) {
        const body = this.physicsWorld.bodies.get(this.bodyHandle);
        if (body) this.physicsWorld.world.removeRigidBody(body);
    }
>>>>>>> origin/ui-merged
  }
}
