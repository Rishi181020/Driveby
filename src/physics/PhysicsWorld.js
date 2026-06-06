<<<<<<< HEAD
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  constructor() {
    this.world = null;
    this.bodies = new Map(); // handle → rigidBody
    this._ready = false;
  }

  async init() {
    await RAPIER.init();
    // gravity zero — cars are on a flat plane, Y is locked per body
    this.world = new RAPIER.World({ x: 0.0, y: 0.0, z: 0.0 });
    this._ready = true;
  }

  get ready() { return this._ready; }

  step(delta) {
    if (!this._ready) return;
    this.world.timestep = delta;
    this.world.step();
  }

  // Static box collider (buildings, boundary walls)
  addBoxCollider(x, y, z, halfW, halfH, halfD) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, halfD);
    this.world.createCollider(colliderDesc, body);
=======
import RAPIER from "@dimforge/rapier3d-compat";

class PhysicsWorld {

  constructor() {
    this.world = null;
    this.bodies = new Map(); // body handle -> body
  }

  async init() {
    console.log("PhysicsWorld: Initializing Rapier WASM...");
    await RAPIER.init();
    
    // Create world with Earth-like gravity along the Y axis
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    console.log("PhysicsWorld: Rapier World initialized successfully.");

    // Run test scene: dynamic box falling under gravity and landing on a static plane body
    const groundHandle = this.addBoxCollider(0, -2, 0, 10, 0.1, 10, true);
    const boxHandle = this.addBoxCollider(0, 10, 0, 0.5, 0.5, 0.5, false);
    
    console.log("PhysicsWorld Test: Starting fall simulation under gravity...");
    for (let step = 0; step < 120; step++) {
      this.world.timestep = 1 / 60;
      this.world.step();
      if (step % 20 === 0 || step === 119) {
        console.log(`Step ${step}: Box Y position = ${this.getPosition(boxHandle).y.toFixed(3)}`);
      }
    }
    console.log("PhysicsWorld Test: Fall simulation completed.");

    // Clean up test bodies from the world so they don't clutter the active simulation
    const boxBody = this.bodies.get(boxHandle);
    const groundBody = this.bodies.get(groundHandle);
    if (boxBody) this.world.removeRigidBody(boxBody);
    if (groundBody) this.world.removeRigidBody(groundBody);
    this.bodies.delete(boxHandle);
    this.bodies.delete(groundHandle);
  }

  step(delta) {
    if (this.world) {
      // Step simulation using the delta time
      this.world.timestep = Math.max(0.001, Math.min(0.1, delta));
      this.world.step();
    }
  }

  addBoxCollider(x, y, z, halfW, halfH, halfD, isStatic) {
    if (!this.world) {
      throw new Error("PhysicsWorld: Cannot add box collider, world not initialized.");
    }

    const bodyDesc = isStatic 
      ? RAPIER.RigidBodyDesc.fixed() 
      : RAPIER.RigidBodyDesc.dynamic();
    
    bodyDesc.setTranslation(x, y, z);
    
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, halfD);
    this.world.createCollider(colliderDesc, body);
    
>>>>>>> origin/ui-merged
    const handle = body.handle;
    this.bodies.set(handle, body);
    return handle;
  }

<<<<<<< HEAD
  // Dynamic box body sized for a car (~4m × 2m × 1.5m in mercator units)
  addCarCollider(x, y, z, halfW, halfH, halfD) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .lockTranslations() // we control position manually; collisions handled via events
      .setLinearDamping(4.0)
      .setAngularDamping(10.0);
    const body = this.world.createRigidBody(bodyDesc);
    // unlock X/Y (mercator plane), keep Z locked
    body.lockTranslations(false);
    body.setEnabledTranslations(true, true, false, true);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, halfD)
      .setRestitution(0.3)
      .setFriction(0.8);
    this.world.createCollider(colliderDesc, body);
=======
  addCarCollider(x, y, z) {
    if (!this.world) {
      throw new Error("PhysicsWorld: Cannot add car collider, world not initialized.");
    }

    // Car bounding box: width = 2.0, height = 1.5, length = 4.8
    // So half-extents are: halfW = 1.0, halfH = 0.75, halfD = 2.4
    const halfW = 1.0;
    const halfH = 0.75;
    const halfD = 2.4;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic();
    bodyDesc.setTranslation(x, y, z);
    
    // Lock translation along Y and lock rotation on X and Z (no tip over or flight)
    bodyDesc.enabledTranslations(true, false, true);
    bodyDesc.enabledRotations(false, true, false);

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, halfD);
    this.world.createCollider(colliderDesc, body);

>>>>>>> origin/ui-merged
    const handle = body.handle;
    this.bodies.set(handle, body);
    return handle;
  }

  getBody(handle) {
    return this.bodies.get(handle) ?? null;
  }

  getPosition(handle) {
    const body = this.bodies.get(handle);
<<<<<<< HEAD
    if (!body) return null;
    return body.translation();
=======
    if (!body) throw new Error(`PhysicsWorld: Unknown body handle ${handle}.`);
    const translation = body.translation();
    return { x: translation.x, y: translation.y, z: translation.z };
>>>>>>> origin/ui-merged
  }

  applyForce(handle, fx, fy, fz) {
    const body = this.bodies.get(handle);
<<<<<<< HEAD
    if (!body) return;
    body.applyImpulse({ x: fx, y: fy, z: fz }, true);
=======
    if (body) {
      body.resetForces(true);
      body.addForce({ x: fx, y: fy, z: fz }, true);
    }
>>>>>>> origin/ui-merged
  }

  removeBody(handle) {
    const body = this.bodies.get(handle);
<<<<<<< HEAD
    if (!body) return;
    this.world.removeRigidBody(body);
    this.bodies.delete(handle);
  }
}
=======
    if (body) {
      this.world.removeRigidBody(body);
      this.bodies.delete(handle);
    }
  }

}

export { PhysicsWorld };
>>>>>>> origin/ui-merged
