<<<<<<< HEAD
import * as THREE from 'three';
import { worldToMap, mercatorScale } from '../map/sfLayer.js';

// Start: Market St & 1st St
const START_LNG = -122.3988;
const START_LAT  = 37.7916;

const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LNG = 111320 * Math.cos(START_LAT * Math.PI / 180);

// Clean low-poly sedan from simple boxes. Sleek proportions read well from the
// chase cam. In metres, +X = forward, +Z = up.
function buildCarMesh(scale, bodyColor = 0x2266dd) {
  const car = new THREE.Group();

  const paint = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.5, roughness: 0.35 });
  const tyre  = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd0ee, metalness: 0.3, roughness: 0.1 });
  const light = new THREE.MeshStandardMaterial({ color: 0xfff4c0, emissive: 0xffdd66, emissiveIntensity: 1.4 });
  const tail  = new THREE.MeshStandardMaterial({ color: 0xff3322, emissive: 0xcc1100, emissiveIntensity: 1.1 });

  const L = 4.6, W = 1.9;
  const wheelR = 0.36, wheelW = 0.28;

  // --- main body: low, long slab (the chassis) ---
  const chassisH = 0.45;
  const chassisZ = wheelR + 0.04;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(L, W, chassisH), paint);
  chassis.position.set(0, 0, chassisZ + chassisH / 2);
  car.add(chassis);

  // --- cabin: shorter box centred slightly rearward, lower & sleek ---
  const cabinL = L * 0.42, cabinH = 0.42;
  const cabinZ = chassisZ + chassisH;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinL, W * 0.88, cabinH), paint);
  cabin.position.set(-0.25, 0, cabinZ + cabinH / 2);
  car.add(cabin);

  // --- windows: thin glass band wrapping the cabin sides + front/back ---
  const winBand = new THREE.Mesh(new THREE.BoxGeometry(cabinL * 1.02, W * 0.9, cabinH * 0.6), glass);
  winBand.position.set(-0.25, 0, cabinZ + cabinH * 0.45);
  car.add(winBand);

  // --- wheels ---
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 18);
  wheelGeo.rotateX(Math.PI / 2);
  for (const x of [L * 0.31, -L * 0.31]) {
    for (const y of [W / 2 - wheelW * 0.35, -(W / 2 - wheelW * 0.35)]) {
      const w = new THREE.Mesh(wheelGeo, tyre);
      w.position.set(x, y, wheelR);
      car.add(w);
    }
  }

  // --- head/taillights ---
  for (const y of [W / 2 - 0.3, -(W / 2 - 0.3)]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.18), light);
    hl.position.set(L / 2 - 0.02, y, chassisZ + chassisH * 0.55);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.16), tail);
    tl.position.set(-L / 2 + 0.02, y, chassisZ + chassisH * 0.55);
    car.add(tl);
  }

  car.scale.setScalar(scale);
  return car;
}

export class PlayerCar {
  constructor(scene) {
    this.scene = scene;

    this.lng = START_LNG;
    this.lat = START_LAT;
    this.heading = 0;       // compass bearing, radians (0=N, +cw)
    this.speed = 0;         // m/s, signed

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // primitives authored in metres → scale by mercator-units-per-metre.
    // 2.5× oversize so the car reads clearly against the buildings.
    const m = mercatorScale() * 2.5;
    this.car = buildCarMesh(m, 0x2266dd);
    this.group.add(this.car);

    this._sync();
  }

  // `map` is passed so the car can pin itself to the map centre each frame.
  attachMap(map) { this.map = map; }

  update(delta, keys = {}) {
    const MAX_SPEED = 22, ACCEL = 14, BRAKE = 28, REVERSE = 8, STEER = 2.0;

    const throttle  = (keys['w'] || keys['ArrowUp'])    ? 1 : 0;
    const braking   = (keys['s'] || keys['ArrowDown'])  ? 1 : 0;
    const turnLeft  = (keys['a'] || keys['ArrowLeft'])  ? 1 : 0;
    const turnRight = (keys['d'] || keys['ArrowRight']) ? 1 : 0;

    if (throttle)      this.speed += ACCEL * delta;
    else if (braking)  this.speed -= BRAKE * delta;
    else {
      this.speed -= Math.sign(this.speed) * 10 * delta;
      if (Math.abs(this.speed) < 0.2) this.speed = 0;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -REVERSE, MAX_SPEED);

    if (Math.abs(this.speed) > 0.1) {
      const steer = turnRight - turnLeft;
      const ratio = Math.min(Math.abs(this.speed) / MAX_SPEED + 0.3, 1);
      this.heading += steer * STEER * ratio * delta * Math.sign(this.speed);
    }

    const distM = this.speed * delta;
    this.lat += (Math.cos(this.heading) * distM) / M_PER_DEG_LAT;
    this.lng += (Math.sin(this.heading) * distM) / M_PER_DEG_LNG;

    this._sync();
  }

  _sync() { this.pinToCentre(); }

  // Place the car mesh exactly at the map's current centre, facing its heading.
  pinToCentre() {
    const c = this.map ? this.map.getCenter() : { lng: this.lng, lat: this.lat };
    const p = worldToMap(c.lng, c.lat, 0);
    this.group.position.copy(p);

    const ahead = worldToMap(
      c.lng + Math.sin(this.heading) * 1e-5,
      c.lat + Math.cos(this.heading) * 1e-5, 0
    );
    const yaw = Math.atan2(ahead.y - p.y, ahead.x - p.x);
    this.group.rotation.set(0, 0, yaw);
  }

  getState() {
    return { lng: this.lng, lat: this.lat, heading: this.heading, speed: this.speed };
  }
}
=======
import { Group, Box3, Vector3 } from 'three';
import { worldToMapbox } from '../map/sfLayer.js';

const mapboxgl = window.mapboxgl;

// SF block bounding box the car must stay inside (Task 5).
const BOUNDS = { minLng: -122.404, maxLng: -122.393, minLat: 37.788, maxLat: 37.797 };

// Vehicle dynamics tuning.
const MAX_SPEED = 16.7;        // ~60 km/h in m/s
const ACCEL = 18;              // m/s^2 throttle acceleration
const BRAKE = 30;              // m/s^2 braking deceleration
const DRAG = 4;                // passive deceleration when coasting
const MAX_STEER = 1.6;         // max steering rate (rad/s) at full lock

// Human-controlled car. Uses a simple bicycle model and keeps its position in
// both Three.js world space (for rendering) and lng/lat (for other systems).
class PlayerCar {

  constructor(params) {

    this.scene = params.scene;        // the SFLayer
    this.lng = params.lng;
    this.lat = params.lat;
    this.heading = params.heading || 0;  // radians, 0 = +Z (south-ish)
    this.speed = 0;

    // Bright box car, sized in real metres (length runs along +Z = heading 0).
    this.mesh = new Group();

    const sedanModel = window.game.assets?.models['sedan'];
    if (!sedanModel) {
      throw new Error('PlayerCar requires assets.models.sedan to be loaded.');
    }

    const carModel = sedanModel.clone();

    // Rotate the model by -90 degrees around X so it lies flat on the road (right side up)
    carModel.rotateX(-Math.PI / 2);

    const box = new Box3().setFromObject(carModel);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);

    const targetLength = 4.8;
    const scale = targetLength / size.z;
    carModel.scale.set(scale, scale, scale);

    // Center the model so it sits on y = 0
    carModel.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    this.mesh.add(carModel);

    this.syncMesh();
    this.scene.add( this.mesh );
  }

  // Drives the car from the keyboard state map for this frame.
  update(delta, keys) {

    if (delta <= 0) return;
    if (delta > 0.1) delta = 0.1; // clamp huge frame gaps

    const throttle = keys['w'] || keys['arrowup'];
    const reverse  = keys['s'] || keys['arrowdown'];
    const left     = keys['a'] || keys['arrowleft'];
    const right    = keys['d'] || keys['arrowright'];

    // longitudinal
    if (throttle) {
      this.speed += ACCEL * delta;
    } else if (reverse) {
      this.speed -= BRAKE * delta;
    } else {
      // coast: decay toward zero
      const drag = DRAG * delta;
      if (this.speed > drag) this.speed -= drag;
      else if (this.speed < -drag) this.speed += drag;
      else this.speed = 0;
    }
    this.speed = Math.max( -MAX_SPEED / 2, Math.min( MAX_SPEED, this.speed ) );

    // steering — scales with speed so the car turns about its heading, not world axes
    let steer = 0;
    if (left) steer += 1;
    if (right) steer -= 1;
    this.heading += steer * MAX_STEER * (this.speed / MAX_SPEED) * delta;

    // advance position along heading
    const dist = this.speed * delta;                 // metres this frame
    const east = Math.sin(this.heading) * dist;
    const south = Math.cos(this.heading) * dist;

    // convert metre delta to lng/lat delta
    const metresPerDegLat = 111320;
    const metresPerDegLng = 111320 * Math.cos(this.lat * Math.PI / 180);
    this.lng += east / metresPerDegLng;
    this.lat -= south / metresPerDegLat;

    // keep inside the SF block bounding box (Task 5)
    if (this.lng < BOUNDS.minLng || this.lng > BOUNDS.maxLng ||
        this.lat < BOUNDS.minLat || this.lat > BOUNDS.maxLat) {
      this.lng = Math.max( BOUNDS.minLng, Math.min( BOUNDS.maxLng, this.lng ) );
      this.lat = Math.max( BOUNDS.minLat, Math.min( BOUNDS.maxLat, this.lat ) );
      this.speed = 0;
    }

    this.syncMesh();
  }

  // Updates the Three.js mesh from the current lng/lat/heading.
  syncMesh() {
    const pos = worldToMapbox( this.lng, this.lat );
    this.mesh.position.copy( pos );
    this.mesh.rotation.set( 0, this.heading, 0 );
  }

  getPosition() {
    return { lng: this.lng, lat: this.lat, heading: this.heading };
  }

}

export { PlayerCar, BOUNDS, MAX_SPEED };
>>>>>>> origin/ui-merged
