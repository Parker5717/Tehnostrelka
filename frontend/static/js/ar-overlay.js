/**
 * CASPER AR Overlay
 * Рисует поверх видео через Canvas 2D.
 *
 * Шаг 3: анимация сканирования (HUD-эстетика).
 * Шаг 4: добавятся bounding boxes от детекций YOLOv8 и ArUco.
 */

const AROverlay = (() => {
  let _canvas = null;
  let _ctx = null;
  let _animFrame = null;
  let _detections = [];   // будет заполняться на шаге 4
  let _scanAngle = 0;
  let _scanPulse = 0;

  /**
   * Инициализировать оверлей.
   * @param {HTMLCanvasElement} canvas
   */
  function init(canvas) {
    _canvas = canvas;
    _ctx = canvas.getContext('2d');
    _resize();
    window.addEventListener('resize', _resize);
    _loop();
  }

  function _resize() {
    if (!_canvas) return;
    _canvas.width  = _canvas.offsetWidth;
    _canvas.height = _canvas.offsetHeight;
  }

  function _loop() {
    _animFrame = requestAnimationFrame(_loop);
    _draw();
  }

  function _draw() {
    const w = _canvas.width;
    const h = _canvas.height;
    const ctx = _ctx;

    ctx.clearRect(0, 0, w, h);

    _scanPulse += 0.03;
    _scanAngle += 0.008;

    // ---- Центральный прицел ----
    const cx = w / 2;
    const cy = h / 2;
    const size = Math.min(w, h) * 0.18;

    ctx.save();
    ctx.strokeStyle = `rgba(0, 170, 255, ${0.4 + 0.2 * Math.sin(_scanPulse)})`;
    ctx.lineWidth = 1.5;

    // Угловые скобки прицела
    const corners = [
      [cx - size, cy - size, 1, 1],
      [cx + size, cy - size, -1, 1],
      [cx + size, cy + size, -1, -1],
      [cx - size, cy + size, 1, -1],
    ];
    const len = size * 0.35;
    corners.forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * len, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * len);
      ctx.stroke();
    });

    // Вращающийся радар
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(_scanPulse * 1.3);
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1;

    const sweepLen = size * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(_scanAngle) * sweepLen,
      cy + Math.sin(_scanAngle) * sweepLen
    );
    ctx.stroke();

    // Малый круг в центре
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // ---- Bounding boxes от детекций (шаг 4) ----
    _detections.forEach(det => _drawDetection(det));
  }

  function _drawDetection({ x, y, w, h, label, confidence, color = '#00ff88' }) {
    const ctx = _ctx;
    const cw = _canvas.width;
    const ch = _canvas.height;

    // Координаты нормализованы 0..1 относительно размера canvas
    const px = x * cw;
    const py = y * ch;
    const pw = w * cw;
    const ph = h * ch;

    // Bounding box
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeRect(px, py, pw, ph);

    // Угловые скобки
    const cs = 14;
    [
      [px, py, cs, cs],
      [px + pw - cs, py, -cs, cs],
      [px, py + ph - cs, cs, -cs],
      [px + pw - cs, py + ph - cs, -cs, -cs],
    ].forEach(([bx, by, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(bx + dx, by);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + dy);
      ctx.stroke();
    });

    // Лейбл
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = 'bold 13px Consolas, monospace';
    const text = confidence ? `${label} ${Math.round(confidence * 100)}%` : label;
    ctx.fillRect(px, py - 20, ctx.measureText(text).width + 12, 20);
    ctx.fillStyle = '#070b14';
    ctx.fillText(text, px + 6, py - 5);

    ctx.restore();
  }

  /**
   * Обновить список детекций (вызывается из WebSocket на шаге 5).
   * @param {Array} detections — массив { x, y, w, h, label, confidence, color }
   */
  function updateDetections(detections) {
    _detections = detections || [];
  }

  /**
   * Показать вспышку успешного сканирования.
   */
  function flashSuccess() {
    const ctx = _ctx;
    const w = _canvas.width;
    const h = _canvas.height;
    let alpha = 0.5;
    const flash = () => {
      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      alpha -= 0.05;
      if (alpha > 0) requestAnimationFrame(flash);
    };
    flash();
  }

  function stop() {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    window.removeEventListener('resize', _resize);
  }

  return { init, updateDetections, flashSuccess, stop };
})();
