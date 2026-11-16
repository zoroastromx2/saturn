// src/core/StatsController.js
import { t } from './Localization.js';

const UPDATE_INTERVAL_MS = 500;
const BYTES_PER_MB = 1024 * 1024;

export function formatMemoryUsage(memoryInfo) {
  if (!memoryInfo || typeof memoryInfo.usedJSHeapSize !== 'number') {
    return null;
  }

  const usedMb = memoryInfo.usedJSHeapSize / BYTES_PER_MB;
  return `${usedMb.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} MB`;
}

export class StatsController {
  constructor(renderer, performanceApi = globalThis.performance) {
    this.renderer = renderer;
    this.performanceApi = performanceApi;
    this.frameCount = 0;
    this.lastSampleTime = this.getNow();
    this.currentFps = null;

    this.fpsElement = document.getElementById('stats-fps');
    this.memoryElement = document.getElementById('stats-memory');
    this.gpuElement = document.getElementById('stats-gpu');
  }

  getNow() {
    if (this.performanceApi && typeof this.performanceApi.now === 'function') {
      return this.performanceApi.now();
    }
    return Date.now();
  }

  update() {
    this.frameCount += 1;
    const now = this.getNow();
    const elapsedMs = now - this.lastSampleTime;

    if (elapsedMs < UPDATE_INTERVAL_MS) {
      return;
    }

    this.currentFps = Math.round((this.frameCount * 1000) / elapsedMs);
    this.frameCount = 0;
    this.lastSampleTime = now;
    this.refresh();
  }

  refresh() {
    if (this.fpsElement) {
      this.fpsElement.innerText = this.currentFps === null ? '—' : `${this.currentFps} FPS`;
    }

    if (this.memoryElement) {
      const formattedMemory = formatMemoryUsage(this.performanceApi?.memory);
      this.memoryElement.innerText = formattedMemory ?? t('stats.unavailable');
    }

    if (this.gpuElement) {
      const memory = this.renderer?.info?.memory;
      this.gpuElement.innerText = memory ? `${memory.geometries} / ${memory.textures}` : '—';
    }
  }
}
