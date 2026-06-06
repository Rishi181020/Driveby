<<<<<<< HEAD
import maplibregl from 'maplibre-gl';
import { mercatorScale } from '../map/sfLayer.js';
=======
import { worldToMapbox } from '../map/sfLayer.js';
>>>>>>> origin/ui-merged

const BOUNDS = {
  minLng: -122.404, maxLng: -122.393,
  minLat: 37.788,  maxLat: 37.797,
};

<<<<<<< HEAD
// Convert lng/lat to flat mercator X/Y (z=0)
function toMerc(lng, lat) {
  const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
  return { x: mc.x, y: mc.y };
}

export function buildColliders(map, physicsWorld) {
  const m = mercatorScale();
=======
export function buildColliders(map, physicsWorld) {
>>>>>>> origin/ui-merged
  window.buildingObstacles = [];

  // --- building colliders ---
  const features = map.queryRenderedFeatures({ layers: ['3d-buildings'] });
  for (const f of features) {
    const h = f.properties?.height ?? 0;
    if (h < 3) continue; // skip lamp posts, kerbs

    // gather all ring coordinates from the polygon
    let coords = [];
    const geom = f.geometry;
    if (geom.type === 'Polygon') coords = geom.coordinates[0];
    else if (geom.type === 'MultiPolygon') coords = geom.coordinates[0][0];
    else continue;

<<<<<<< HEAD
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [lng, lat] of coords) {
      const { x, y } = toMerc(lng, lat);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const halfW = (maxX - minX) / 2;
    const halfD = (maxY - minY) / 2;
    const halfH = m * (h / 2);

    if (halfW < 1e-8 || halfD < 1e-8) continue;

    window.buildingObstacles.push({ minX, maxX, minY, maxY, cx, cy });

    if (physicsWorld) {
      physicsWorld.addBoxCollider(cx, cy, halfH, halfW, halfD, halfH);
    }
  }

  // --- four boundary walls so cars can't escape the SF block ---
  const minM = toMerc(BOUNDS.minLng, BOUNDS.minLat);
  const maxM = toMerc(BOUNDS.maxLng, BOUNDS.maxLat);
  const cx = (minM.x + maxM.x) / 2;
  const cy = (minM.y + maxM.y) / 2;
  const hw = (maxM.x - minM.x) / 2;
  const hh = (maxM.y - minM.y) / 2;
  const thick = m * 2;
  const wallH = m * 20;

  // west wall
  physicsWorld.addBoxCollider(minM.x, cy, wallH, thick, hh, wallH);
  // east wall
  physicsWorld.addBoxCollider(maxM.x, cy, wallH, thick, hh, wallH);
  // south wall
  physicsWorld.addBoxCollider(cx, minM.y, wallH, hw, thick, wallH);
  // north wall
  physicsWorld.addBoxCollider(cx, maxM.y, wallH, hw, thick, wallH);
=======
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [lng, lat] of coords) {
      const p = worldToMapbox(lng, lat, 0);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const halfW = (maxX - minX) / 2;
    const halfD = (maxZ - minZ) / 2;
    const halfH = h / 2;

    if (halfW < 1e-8 || halfD < 1e-8) continue;

    physicsWorld.addBoxCollider(cx, halfH, cz, halfW, halfH, halfD, true);
    window.buildingObstacles.push({ minX, maxX, minZ, maxZ, cx, cz });
  }

  // --- four boundary walls so cars can't escape the SF block ---
  const minM = worldToMapbox(BOUNDS.minLng, BOUNDS.minLat, 0);
  const maxM = worldToMapbox(BOUNDS.maxLng, BOUNDS.maxLat, 0);
  
  const minX = Math.min(minM.x, maxM.x);
  const maxX = Math.max(minM.x, maxM.x);
  const minZ = Math.min(minM.z, maxM.z);
  const maxZ = Math.max(minM.z, maxM.z);

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const hw = (maxX - minX) / 2;
  const hd = (maxZ - minZ) / 2;
  const thick = 2;
  const wallH = 20;

  // west wall
  physicsWorld.addBoxCollider(minX - thick, wallH, cz, thick, wallH, hd, true);
  // east wall
  physicsWorld.addBoxCollider(maxX + thick, wallH, cz, thick, wallH, hd, true);
  // north wall (minZ is north)
  physicsWorld.addBoxCollider(cx, wallH, minZ - thick, hw, wallH, thick, true);
  // south wall
  physicsWorld.addBoxCollider(cx, wallH, maxZ + thick, hw, wallH, thick, true);
>>>>>>> origin/ui-merged
}
