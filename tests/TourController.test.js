import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_TOUR_STOPS } from '../src/core/TourCatalog.js';
import { TourController } from '../src/core/TourController.js';

function createTargetsFixture() {
  return {
    saturn: { name: 'Saturn' },
    mimas: { name: 'Mimas' },
    enceladus: { name: 'Enceladus' },
    tethys: { name: 'Tethys' },
    dione: { name: 'Dione' },
    rhea: { name: 'Rhea' },
    titan: { name: 'Titan' },
    iapetus: { name: 'Iapetus' }
  };
}

describe('TourCatalog & TourController', () => {
  it('defines stops covering Saturn points of interest and all major moons', () => {
    const keys = new Set(DEFAULT_TOUR_STOPS.map((stop) => stop.targetKey));
    expect(DEFAULT_TOUR_STOPS.length).toBeGreaterThanOrEqual(8);
    expect(keys.has('saturn')).toBe(true);
    expect(keys.has('mimas')).toBe(true);
    expect(keys.has('enceladus')).toBe(true);
    expect(keys.has('tethys')).toBe(true);
    expect(keys.has('dione')).toBe(true);
    expect(keys.has('rhea')).toBe(true);
    expect(keys.has('titan')).toBe(true);
    expect(keys.has('iapetus')).toBe(true);
  });

  it('starts tour, focuses camera smoothly, and fires onStopChange', () => {
    const cameraController = {
      tween: null,
      focusOn: vi.fn(),
      cancelTransition: vi.fn(),
      orbitTarget: vi.fn()
    };
    const onStopChange = vi.fn();
    const onStateChange = vi.fn();
    const targetsByKey = createTargetsFixture();

    const tour = new TourController({
      targetsByKey,
      cameraController,
      onStopChange,
      onStateChange
    });

    tour.start(0);
    expect(tour.isActive).toBe(true);
    expect(tour.isPaused).toBe(false);
    expect(tour.currentIndex).toBe(0);
    expect(cameraController.focusOn).toHaveBeenCalledWith(
      targetsByKey.saturn,
      DEFAULT_TOUR_STOPS[0].distanceMultiplier,
      DEFAULT_TOUR_STOPS[0].elevationBias,
      DEFAULT_TOUR_STOPS[0].transitionDuration
    );
    expect(onStopChange).toHaveBeenCalledWith(DEFAULT_TOUR_STOPS[0], 0, DEFAULT_TOUR_STOPS.length);
  });

  it('advances automatically based on elapsed dwell+transition time and wraps around', () => {
    const customStops = [
      {
        id: 'stop-a',
        targetKey: 'saturn',
        titleKey: 'a',
        descriptionKey: 'a',
        distanceMultiplier: 4.0,
        elevationBias: 0.4,
        transitionDuration: 1.0,
        dwellSeconds: 1.0,
        orbitDriftSpeed: 0.1
      },
      {
        id: 'stop-b',
        targetKey: 'titan',
        titleKey: 'b',
        descriptionKey: 'b',
        distanceMultiplier: 4.8,
        elevationBias: 0.3,
        transitionDuration: 1.0,
        dwellSeconds: 1.0,
        orbitDriftSpeed: 0.1
      }
    ];
    const cameraController = {
      tween: null,
      focusOn: vi.fn(),
      cancelTransition: vi.fn(),
      orbitTarget: vi.fn()
    };
    const tour = new TourController({
      stops: customStops,
      targetsByKey: createTargetsFixture(),
      cameraController
    });

    tour.start(0);
    // Advance in small steps (< 0.25s clamp) up to 2.0s total duration
    for (let i = 0; i < 10; i++) {
      tour.update(0.2);
    }
    expect(tour.currentIndex).toBe(1);
    expect(cameraController.orbitTarget).toHaveBeenCalled();

    // Advance second stop to wrap back to 0
    for (let i = 0; i < 10; i++) {
      tour.update(0.2);
    }
    expect(tour.currentIndex).toBe(0);
  });

  it('supports pause, resume, prev, next, and stop cleanly', () => {
    const cameraController = {
      tween: null,
      focusOn: vi.fn(),
      cancelTransition: vi.fn(),
      orbitTarget: vi.fn()
    };
    const tour = new TourController({
      targetsByKey: createTargetsFixture(),
      cameraController
    });

    tour.start(0);
    tour.prev();
    expect(tour.currentIndex).toBe(DEFAULT_TOUR_STOPS.length - 1);

    tour.next();
    expect(tour.currentIndex).toBe(0);

    tour.pause();
    expect(tour.isPaused).toBe(true);
    const prevElapsed = tour.elapsedInStop;
    tour.update(0.2);
    expect(tour.elapsedInStop).toBe(prevElapsed);
    expect(cameraController.orbitTarget).not.toHaveBeenCalled();

    tour.resume();
    expect(tour.isPaused).toBe(false);
    tour.update(0.2);
    expect(tour.elapsedInStop).toBeGreaterThan(prevElapsed);

    tour.stop();
    expect(tour.isActive).toBe(false);
    expect(cameraController.cancelTransition).toHaveBeenCalledTimes(1);
  });
});
