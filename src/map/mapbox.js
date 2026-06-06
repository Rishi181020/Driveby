<<<<<<< HEAD
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Free OpenFreeMap "liberty" style — daylight, no API key, OpenMapTiles source
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// SF Financial District centre
export const SF_CENTER = [-122.3988, 37.7956];

let _map = null;

export function initMap() {
  return new Promise((resolve) => {
    _map = new maplibregl.Map({
      container: 'map',
      style: STYLE,
      center: SF_CENTER,
      zoom: 16,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });

    // suppress harmless "image not found" sprite warnings (style references
    // POI icons not in the sprite sheet — irrelevant to us)
    _map.on('styleimagemissing', (e) => {
      if (!_map.hasImage(e.id)) {
        _map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    });

    // lock all user interaction
    _map.dragPan.disable();
    _map.scrollZoom.disable();
    _map.doubleClickZoom.disable();
    _map.dragRotate.disable();
    _map.keyboard.disable();
    _map.touchZoomRotate.disable();

    _map.on('load', () => {
      // Find the vector tile source name dynamically (differs by style)
      const sources = _map.getStyle().sources;
      const vecSource = Object.keys(sources).find(k =>
        sources[k].type === 'vector'
      );

      if (vecSource && !_map.getLayer('3d-buildings')) {
        _map.addLayer({
          id: '3d-buildings',
          source: vecSource,
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#c8ccd4',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.85,
          },
        });
      }
      resolve(_map);
    });
  });
}

export function getMap() {
  return _map;
}
=======
// Mapbox GL JS is loaded from the CDN in index.html and available as a global.
const mapboxgl = window.mapboxgl;

// Token is injected at build time by webpack DefinePlugin (see webpack.config.js).
// Never hardcode it here. Set MAPBOX_TOKEN in a .env file (see .env.example).
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

// Centered on the player car spawn (Market St & 1st St) so the car is in view.
const SF_CENTER = [-122.3988, 37.7916];

// Creates the Mapbox map locked to a top-down bird's-eye view of downtown SF
// with the 3D buildings layer enabled. Returns the map instance.
function createMap(container = 'map') {

  if (!MAPBOX_TOKEN) {
    console.error('mapbox: MAPBOX_TOKEN is not set. Copy .env.example to .env, add your token, and rebuild.');
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: SF_CENTER,
    zoom: 18,
    pitch: 0,    // bird's eye to start
    bearing: 0,
    antialias: true
  });

  // Lock interaction — the map must not be draggable or zoomable by the user.
  map.dragPan.disable();
  map.scrollZoom.disable();
  map.doubleClickZoom.disable();
  map.boxZoom.disable();
  map.dragRotate.disable();
  map.keyboard.disable();
  map.touchZoomRotate.disable();

  map.on('load', () => add3dBuildings(map));

  return map;

}

// Adds the Mapbox 3D buildings fill-extrusion layer, dark themed.
function add3dBuildings(map) {

  map.addLayer({
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    paint: {
      'fill-extrusion-color': '#1a1a2e',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.9
    }
  });

}

export { createMap, SF_CENTER };
>>>>>>> origin/ui-merged
