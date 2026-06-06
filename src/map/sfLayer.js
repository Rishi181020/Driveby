<<<<<<< HEAD
import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { SF_CENTER } from './mapbox.js';

// Converts lng/lat/altitude to Three.js world coordinates aligned with MapLibre
export function worldToMap(lng, lat, altitude = 0) {
  const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitude);
  return new THREE.Vector3(mc.x, mc.y, mc.z);
}

// Converts a MercatorCoordinate scale to metres (approx at SF latitude)
export function mercatorScale() {
  const mc = maplibregl.MercatorCoordinate.fromLngLat(SF_CENTER, 0);
  return mc.meterInMercatorCoordinateUnits();
}

class SFLayer {
=======
import {
  Scene,
  Camera,
  WebGLRenderer,
  Matrix4,
  Vector3,
  DirectionalLight,
  AmbientLight
} from 'three';

const mapboxgl = window.mapboxgl;

// Origin the Three.js world is built around. All geographic coordinates are
// expressed in metres relative to this point so Three.js stays near the origin.
const SF_ORIGIN = [-122.3988, 37.7956];

// Mercator anchor + metre scale for the origin, computed once.
const ORIGIN_MERCATOR = mapboxgl.MercatorCoordinate.fromLngLat(SF_ORIGIN, 0);
const METRE = ORIGIN_MERCATOR.meterInMercatorCoordinateUnits();

// Converts geographic coordinates to Three.js world coordinates (in metres),
// relative to SF_ORIGIN. X = east, Y = up (altitude), Z = south.
function worldToMapbox(lng, lat, altitude = 0) {
  const p = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], altitude);
  return new Vector3(
    (p.x - ORIGIN_MERCATOR.x) / METRE,
    altitude,
    (p.y - ORIGIN_MERCATOR.y) / METRE
  );
}

function mapboxWorldToLngLat(x, z) {
  const p = new mapboxgl.MercatorCoordinate(
    ORIGIN_MERCATOR.x + x * METRE,
    ORIGIN_MERCATOR.y + z * METRE,
    ORIGIN_MERCATOR.z
  );
  const lngLat = p.toLngLat();
  return { lng: lngLat.lng, lat: lngLat.lat };
}

function mercatorScale() {
  return 1;
}

const worldToMap = worldToMapbox;

// Mapbox custom layer that renders a Three.js scene sharing Mapbox's WebGL
// context, aligned to the map's coordinate system.
class SFLayer {

>>>>>>> origin/ui-merged
  constructor() {
    this.id = 'sf-three-layer';
    this.type = 'custom';
    this.renderingMode = '3d';

<<<<<<< HEAD
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.renderer = null;
    this.map = null;

    // Per-frame callback (driving + camera). Runs INSIDE render() so the car
    // position and the map matrix are always computed for the same frame —
    // this is what removes the jitter from a separate rAF loop.
    this.onFrame = null;
    this._lastTime = performance.now();
=======
    this.scene = new Scene();
    this.camera = new Camera();

    // Lights so models added to the scene are visible.
    const sun = new DirectionalLight(0xffffff, 2.0);
    sun.position.set(0.5, -1, 0.5);   // pointing down onto the scene
    this.scene.add(sun);
    this.scene.add(new AmbientLight(0xffffff, 1.0));

    this.worldMatrix = new Matrix4();
>>>>>>> origin/ui-merged
  }

  onAdd(map, gl) {
    this.map = map;

<<<<<<< HEAD
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Daylight: warm sun + sky-blue fill + bright ambient
    const sun = new THREE.DirectionalLight(0xfff4e0, 3.0);
    sun.position.set(0.6, -0.8, 1).normalize();
    this.scene.add(sun);
    const sky = new THREE.HemisphereLight(0xbfd8ff, 0x88886a, 2.0);
    this.scene.add(sky);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  }

  render(gl, args) {
    // Pin the car mesh to the map centre using THIS frame's matrix so the mesh
    // and projection stay consistent. Driving + camera happen in the rAF loop.
    if (this.onFrame) this.onFrame();

    // MapLibre v5 passes a ProjectionData object; v4 a flat array.
    const m = Array.isArray(args)
      ? args
      : (args?.defaultProjectionData?.mainMatrix ?? args?.projectionData?.mainMatrix ?? args);

    this.camera.projectionMatrix.fromArray(m);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();

    this.renderer.resetState();
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
    // NOTE: repaint is driven by the rAF loop in index.js, not here, so the
    // camera (jumpTo) and physics run outside the render callback.
  }

  // Expose scene so other modules can add objects
  getScene() { return this.scene; }
  getRenderer() { return this.renderer; }
  getCamera() { return this.camera; }
}

export const sfLayer = new SFLayer();

export function mapToWorld(x, y, z = 0) {
  const mc = new maplibregl.MercatorCoordinate(x, y, z);
  return mc.toLngLat();
}
=======
    this.renderer = new WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    });
    this.renderer.autoClear = false;

    // Transform from the metre-based, origin-anchored Three.js world into
    // Mapbox's Mercator world. RotX(90°) maps Three.js +Y (up) onto Mercator's
    // +Z (up); the -METRE on Y flips Mercator's south-positive axis so our
    // world +Z points south.
    this.worldMatrix = new Matrix4()
      .makeTranslation(ORIGIN_MERCATOR.x, ORIGIN_MERCATOR.y, ORIGIN_MERCATOR.z)
      .multiply(new Matrix4().makeScale(METRE, -METRE, METRE))
      .multiply(new Matrix4().makeRotationX(Math.PI / 2));
  }

  render(gl, matrix) {
    const projection = new Matrix4().fromArray(matrix);
    this.camera.projectionMatrix = projection.multiply(this.worldMatrix);

    this.renderer.resetState();

    // Clear the depth buffer so our objects are not occluded by the map's
    // own geometry (buildings/terrain) that was drawn before this layer.
    gl.clear(gl.DEPTH_BUFFER_BIT);

    this.renderer.render(this.scene, this.camera);

    // Keep the map continuously repainting so animated objects update.
    this.map.triggerRepaint();
  }

  // Adds a Three.js Object3D to the layer's scene.
  add(object) {
    this.scene.add(object);
  }

}

export { SFLayer, worldToMapbox, worldToMap, mapboxWorldToLngLat, mercatorScale, SF_ORIGIN, METRE };
>>>>>>> origin/ui-merged
