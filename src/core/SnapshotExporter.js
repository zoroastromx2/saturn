import * as THREE from 'three';
import { CONSTANTS } from '../math/AstroScale.js';

function formatUtc(date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} // ${iso.slice(11, 19)} UTC`;
}

function formatFileTimestamp(date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10).replace(/-/g, '')}_${iso.slice(11, 19).replace(/:/g, '')}`;
}

function drawLabeledLine(ctx, x, y, label, value, align, fonts) {
  ctx.font = fonts.bold;
  const labelText = `${label} `;
  const labelWidth = ctx.measureText(labelText).width;

  ctx.font = fonts.regular;
  const valueWidth = ctx.measureText(value).width;
  const totalWidth = labelWidth + valueWidth;

  let startX = x;
  if (align === 'center') {
    startX = x - totalWidth * 0.5;
  } else if (align === 'right') {
    startX = x - totalWidth;
  }

  ctx.textAlign = 'left';
  ctx.font = fonts.bold;
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(labelText, startX, y);

  ctx.font = fonts.regular;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(value, startX + labelWidth, y);
}

export class SnapshotExporter {
  capture(composer, camera, sceneState = {}) {
    if (!composer?.renderer?.domElement || !camera) return null;

    composer.render();

    const glCanvas = composer.renderer.domElement;
    const width = glCanvas.width;
    const height = glCanvas.height;
    const footerHeight = 90;
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height + footerHeight;

    const ctx = output.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(glCanvas, 0, 0);

    const footerTop = height;
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, footerTop, width, footerHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, footerTop, width, 2);

    const simulationDate =
      sceneState.simulationDate instanceof Date
        ? sceneState.simulationDate
        : new Date(sceneState.simulationDate ?? Date.now());
    const targetPosition =
      sceneState.targetPosition instanceof THREE.Vector3
        ? sceneState.targetPosition
        : new THREE.Vector3();
    const sunDirection =
      sceneState.sunDirection instanceof THREE.Vector3
        ? sceneState.sunDirection.clone().normalize()
        : new THREE.Vector3(1, 0.35, 0.35).normalize();

    const targetToSun = sunDirection.clone().normalize();
    const targetToCamera = camera.position.clone().sub(targetPosition).normalize();
    const phaseAngleDeg = THREE.MathUtils.radToDeg(
      Math.acos(THREE.MathUtils.clamp(targetToSun.dot(targetToCamera), -1, 1))
    ).toFixed(1);

    const scaleFactor = sceneState.scaleFactor ?? 10000;
    const saturnEqRadius =
      sceneState.saturnEqRadius ?? CONSTANTS.SATURN.RADIUS_EQUATORIAL / scaleFactor;
    const distanceKm = camera.position.distanceTo(targetPosition) * scaleFactor;
    const range = Math.round(distanceKm).toLocaleString('en-US');
    const utcString = formatUtc(simulationDate);
    const missionName = String(sceneState.missionName || 'FREE FLIGHT').toUpperCase();
    const instrumentName = String(
      sceneState.instrumentName || 'FREE ORBITAL CAM | HDR RAW'
    ).toUpperCase();
    const targetName = String(sceneState.targetName || 'SATURN').toUpperCase();
    const camX = (camera.position.x / saturnEqRadius).toFixed(3);
    const camY = (camera.position.y / saturnEqRadius).toFixed(3);
    const camZ = (camera.position.z / saturnEqRadius).toFixed(3);

    const fontSize = Math.max(11, Math.round(width * 0.008));
    const lineHeight = Math.round(fontSize * 1.35);
    const startY = footerTop + Math.round((footerHeight - lineHeight * 2) * 0.5);
    const fontFamily = '"JetBrains Mono", "Courier New", monospace';
    const fonts = {
      bold: `600 ${fontSize}px ${fontFamily}`,
      regular: `500 ${fontSize}px ${fontFamily}`
    };

    ctx.textBaseline = 'middle';
    const leftX = Math.round(width * 0.02);
    const centerX = Math.round(width * 0.5);
    const rightX = width - Math.round(width * 0.02);

    ctx.textAlign = 'left';
    ctx.font = fonts.bold;
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('NASA / JPL-CALTECH / SSI ARCHIVESIM', leftX, startY);
    drawLabeledLine(ctx, leftX, startY + lineHeight, 'MISSION:', missionName, 'left', fonts);
    drawLabeledLine(
      ctx,
      leftX,
      startY + lineHeight * 2,
      'INSTRUMENT:',
      instrumentName,
      'left',
      fonts
    );

    drawLabeledLine(ctx, centerX, startY, 'TARGET:', targetName, 'center', fonts);
    drawLabeledLine(ctx, centerX, startY + lineHeight, 'RANGE:', `${range} KM`, 'center', fonts);
    drawLabeledLine(
      ctx,
      centerX,
      startY + lineHeight * 2,
      'SOLAR PHASE ANGLE:',
      `${phaseAngleDeg}°`,
      'center',
      fonts
    );

    drawLabeledLine(ctx, rightX, startY, 'EARTH RECEIVED / SCET:', utcString, 'right', fonts);
    drawLabeledLine(
      ctx,
      rightX,
      startY + lineHeight,
      'COORDS:',
      `[${camX}, ${camY}, ${camZ}] RS`,
      'right',
      fonts
    );

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, output.width - 2, output.height - 2);

    const dataUrl = output.toDataURL('image/png');
    const filename = `JPL_SATURN_${formatFileTimestamp(simulationDate)}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    return { canvas: output, dataUrl, filename };
  }
}
