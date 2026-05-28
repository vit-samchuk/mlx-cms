/* ==========================================================================
   Print utilities — html2canvas capture + rotation for A5 landscape
   ========================================================================== */

/**
 * Capture an element as a rotated canvas and trigger the browser print dialog.
 * Used by the A5 editor to print labels in landscape orientation.
 *
 * @param {string} captureId  — ID of the element to capture
 * @param {string} printContainerId — ID of the print container element
 */
async function printRotatedCapture(captureId, printContainerId) {
  const element = document.getElementById(captureId);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
  const rotated = rotateCanvas(canvas, 90);

  const img = document.createElement('img');
  img.className = 'rotated-image';
  const container = document.getElementById(printContainerId);
  container.innerHTML = '';
  container.appendChild(img);
  img.src = rotated.toDataURL();

  try {
    await img.decode();
  } catch {
    await new Promise((r) => {
      img.onload = r;
      img.onerror = r;
    });
  }

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.print();
}

/**
 * Rotate a canvas element by the given angle in degrees.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} degrees
 * @returns {HTMLCanvasElement}
 */
function rotateCanvas(canvas, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = canvas.height * sin + canvas.width * cos;
  const h = canvas.height * cos + canvas.width * sin;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;

  const ctx = c.getContext('2d');
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return c;
}
