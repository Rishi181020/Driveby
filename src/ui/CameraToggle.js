<<<<<<< HEAD
const MODES = ['chase', 'birds-eye'];

// Close 3rd-person chase cam.
// Lower pitch = look more level down the street (buildings stop blocking the car).
const CHASE = {
  zoom: 19.5,       // close
  pitch: 50,        // moderate — avoids looking through buildings ahead
  aheadMetres: 8,   // small offset so car sits just below centre
};
const BIRDS_EYE = { zoom: 16.5, pitch: 0 };

const M_PER_DEG_LAT = 111320;

export class CameraToggle {
  constructor(map) {
    this.map = map;
    this.modeIndex = 0;
    this._label = document.getElementById('cam-label');

    window.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') this.toggle();
    });
    this._updateLabel();
  }

  toggle() {
    this.modeIndex = (this.modeIndex + 1) % MODES.length;
    this._updateLabel();
  }

  update(car) {
    const s = car.getState();

    if (MODES[this.modeIndex] === 'chase') {
      // Centre exactly on the car (the car pins itself to this same centre).
      this.map.jumpTo({
        center: [s.lng, s.lat],
        bearing: s.heading * 180 / Math.PI,
        pitch: CHASE.pitch,
        zoom: CHASE.zoom,
      });
    } else {
      this.map.jumpTo({
        center: [s.lng, s.lat],
        bearing: 0,
        pitch: BIRDS_EYE.pitch,
        zoom: BIRDS_EYE.zoom,
      });
    }
  }

  _updateLabel() {
    if (!this._label) return;
    this._label.textContent =
      MODES[this.modeIndex] === 'chase' ? '[C] Chase Cam' : "[C] Bird's Eye";
  }
}
=======
// Manages the two camera modes (Task 6). Because the Three.js scene is rendered
// through Mapbox's shared camera, both modes drive the Mapbox camera, keeping
// the player car centred so it never drives off-screen:
//   - bird's eye: top-down view (pitch 0, north up)
//   - follow cam: pitched view that rotates to trail behind the car
class CameraToggle {

  constructor(map, label) {
    this.map = map;
    this.label = label;       // HUD element for the mode text
    this.mode = 'bird';       // default to bird's eye

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'c') this.toggle();
    });

    this.updateLabel();
  }

  toggle() {
    this.mode = this.mode === 'bird' ? 'follow' : 'bird';
    this.updateLabel();
  }

  // Called every frame with the player car. Keeps the camera locked on the car.
  update(car) {
    const { lng, lat, heading } = car.getPosition();

    if (this.mode === 'bird') {
      this.map.jumpTo({ center: [lng, lat], bearing: 0, pitch: 0, zoom: 19 });
    } else {
      // follow cam: look in the car's direction of travel, pitched back
      const bearing = heading * 180 / Math.PI;
      const target = { center: [lng, lat], bearing, pitch: 45, zoom: 20.5 };

      // lerp bearing for smoothness, snap centre to the car
      const cur = this.map.getBearing();
      const smooth = cur + shortestAngle(cur, bearing) * 0.15;
      this.map.jumpTo({ center: target.center, bearing: smooth, pitch: 45, zoom: 20.5 });
    }
  }

  updateLabel() {
    if (!this.label) return;
    this.label.textContent = this.mode === 'bird' ? "[C] Bird's Eye" : '[C] Follow Cam';
  }

}

// shortest signed angular distance a->b in degrees
function shortestAngle(a, b) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export { CameraToggle };
>>>>>>> origin/ui-merged
