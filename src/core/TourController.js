// src/core/TourController.js
import { DEFAULT_TOUR_STOPS } from './TourCatalog.js';

const MAX_DELTA_SECONDS = 0.25;

export class TourController {
  constructor({
    stops = DEFAULT_TOUR_STOPS,
    targetsByKey = {},
    cameraController = null,
    onStopChange = null,
    onStateChange = null
  } = {}) {
    this.stops = Array.isArray(stops) && stops.length > 0 ? stops : DEFAULT_TOUR_STOPS;
    this.targetsByKey = targetsByKey;
    this.cameraController = cameraController;
    this.onStopChange = onStopChange;
    this.onStateChange = onStateChange;

    this.isActive = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.elapsedInStop = 0;
  }

  getTotalStopDuration(stop = this.getCurrentStop()) {
    if (!stop) return 8.0;
    const transition = Math.max(0.5, Number(stop.transitionDuration) || 2.2);
    const dwell = Math.max(1.0, Number(stop.dwellSeconds) || 6.0);
    return transition + dwell;
  }

  getCurrentStop() {
    return this.stops[this.currentIndex] ?? null;
  }

  getProgress() {
    if (!this.isActive) return 0;
    const total = this.getTotalStopDuration();
    return Math.min(1, Math.max(0, this.elapsedInStop / total));
  }

  getState() {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalStops: this.stops.length,
      currentStop: this.getCurrentStop(),
      progress: this.getProgress()
    };
  }

  _notifyState() {
    this.onStateChange?.(this.getState());
  }

  start(startIndex = 0) {
    if (this.stops.length === 0) return null;
    this.isActive = true;
    this.isPaused = false;
    return this.goToStop(startIndex);
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    this.isPaused = false;
    this.elapsedInStop = 0;
    this.cameraController?.cancelTransition?.();
    this._notifyState();
  }

  pause() {
    if (!this.isActive || this.isPaused) return;
    this.isPaused = true;
    this._notifyState();
  }

  resume() {
    if (!this.isActive || !this.isPaused) return;
    this.isPaused = false;
    this._notifyState();
  }

  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start(0);
    }
    return this.isActive;
  }

  togglePause() {
    if (!this.isActive) return false;
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.isPaused;
  }

  next() {
    if (this.stops.length === 0) return null;
    const nextIndex = (this.currentIndex + 1) % this.stops.length;
    if (!this.isActive) {
      return this.start(nextIndex);
    }
    return this.goToStop(nextIndex);
  }

  prev() {
    if (this.stops.length === 0) return null;
    const prevIndex = (this.currentIndex - 1 + this.stops.length) % this.stops.length;
    if (!this.isActive) {
      return this.start(prevIndex);
    }
    return this.goToStop(prevIndex);
  }

  goToStop(index) {
    if (this.stops.length === 0) return null;
    const normalizedIndex = ((index % this.stops.length) + this.stops.length) % this.stops.length;
    this.currentIndex = normalizedIndex;
    this.elapsedInStop = 0;

    const stop = this.getCurrentStop();
    const targetObject = this.targetsByKey?.[stop?.targetKey] ?? null;

    if (targetObject && this.cameraController?.focusOn) {
      this.cameraController.focusOn(
        targetObject,
        stop.distanceMultiplier,
        stop.elevationBias,
        stop.transitionDuration
      );
    }

    this.onStopChange?.(stop, this.currentIndex, this.stops.length);
    this._notifyState();
    return stop;
  }

  update(deltaTime) {
    if (!this.isActive || this.isPaused) return;
    const stop = this.getCurrentStop();
    if (!stop) return;

    const dt = Math.min(Math.max(Number(deltaTime) || 0, 0), MAX_DELTA_SECONDS);
    if (dt <= 0) return;

    this.elapsedInStop += dt;

    if (!this.cameraController?.tween && typeof this.cameraController?.orbitTarget === 'function') {
      const driftSpeed = Number(stop.orbitDriftSpeed) || 0;
      if (driftSpeed !== 0) {
        this.cameraController.orbitTarget(driftSpeed * dt);
      }
    }

    if (this.elapsedInStop + 1e-6 >= this.getTotalStopDuration(stop)) {
      this.next();
      return;
    }

    this._notifyState();
  }
}
