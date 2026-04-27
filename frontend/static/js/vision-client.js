/**
 * CASPER Vision Client (WebSocket версия, шаг 5)
 *
 * Устанавливает постоянное WS-соединение с /ws/vision.
 * Отправляет кадры каждую секунду.
 * Получает детекции и обновляет AR-оверлей + квест-прогресс.
 *
 * Fallback: если WS недоступен — переключается на REST /api/vision/detect.
 */

const VisionClient = (() => {
  let _ws = null;
  let _intervalId = null;
  let _pingInterval = null;
  let _captureCanvas = null;
  let _ctx = null;
  let _videoEl = null;
  let _isPPEMode = false;
  let _isProcessing = false;
  let _useREST = false;

  const INTERVAL_MS   = 1000;
  const REST_INTERVAL = 1500;
  const JPEG_QUALITY  = 0.65;

  function init() {
    _captureCanvas = document.createElement('canvas');
    _ctx = _captureCanvas.getContext('2d');
  }

  function captureFrame(videoEl) {
    if (!videoEl || videoEl.readyState < 2) return null;
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return null;
    _captureCanvas.width  = w;
    _captureCanvas.height = h;
    _ctx.drawImage(videoEl, 0, 0, w, h);
    return _captureCanvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
  }

  function _connectWS() {
    const token = sessionStorage.getItem('casper_token');
    if (!token) return;

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url   = `${proto}://${location.host}/ws/vision?token=${token}`;
    _ws = new WebSocket(url);

    _ws.onopen = () => {
      console.log('[VisionClient] WS подключён');
      _useREST = false;
      if (_pingInterval) clearInterval(_pingInterval);
      _pingInterval = setInterval(() => {
        if (_ws && _ws.readyState === WebSocket.OPEN) {
          _ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    _ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'detections') _handleDetections(data);
      } catch (e) {}
      _isProcessing = false;
    };

    _ws.onerror = () => {
      console.warn('[VisionClient] WS ошибка — переключаемся на REST');
      _useREST = true;
    };

    _ws.onclose = () => {
      _ws = null;
      if (_intervalId) setTimeout(_connectWS, 3000);
    };
  }

  async function _sendFrame() {
    if (!_videoEl || _isProcessing) return;
    const b64 = captureFrame(_videoEl);
    if (!b64) return;
    _isProcessing = true;

    if (!_useREST && _ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({
        type: 'frame', image: b64,
        run_ppe: _isPPEMode, run_objects: !_isPPEMode,
      }));
    } else {
      await _sendREST(b64);
      _isProcessing = false;
    }
  }

  async function _sendREST(b64) {
    try {
      const token = sessionStorage.getItem('casper_token');
      if (!token) return;
      const resp = await fetch('/api/vision/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ image: b64, run_ppe: _isPPEMode, run_objects: !_isPPEMode }),
      });
      if (resp.ok) _handleDetections(await resp.json());
    } catch (e) {
      console.debug('[VisionClient] REST ошибка:', e.message);
    }
  }

  function _handleDetections(data) {
    AROverlay.updateDetections(data.all_detections || []);
    if (_isPPEMode && data.ppe) { _updatePPEUI(data.ppe); return; }
    const dets = data.all_detections || [];
    if (dets.length > 0) {
      console.log('[Vision] Детекций:', dets.length,
        '| markers:', (data.markers||[]).map(m=>m.marker_id),
        '| objects:', (data.objects||[]).map(o=>o.detected_class));
      _checkQuestProgress(data);
    }
  }

  function _checkQuestProgress(data) {
    const q = QuestEngine.getActive();
    if (!q) {
      console.log('[Quest] Нет активного квеста — начни квест через 🎯');
      return;
    }
    console.log('[Quest] Активный:', q.slug,
      '| target_marker_id:', q.target_marker_id,
      '| target_class:', q.target_class);

    let matched = false;
    if (q.target_marker_id !== null && q.target_marker_id !== undefined) {
      matched = (data.markers || []).some(m => m.marker_id === q.target_marker_id);
      console.log('[Quest] Маркер совпадение:', matched,
        '(ищем ID', q.target_marker_id, ', видим', (data.markers||[]).map(m=>m.marker_id), ')');
    }
    if (!matched && q.target_class) {
      matched = (data.objects || []).some(o => o.detected_class === q.target_class);
    }
    if (matched) {
      console.log('[Quest] ✅ СОВПАДЕНИЕ! Показываю кнопку завершения');
      _showCompleteButton(q);
    }
  }

  let _completeTimeout = null;
  function _showCompleteButton(quest) {
    let btn = document.getElementById('btn-complete-quest');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-complete-quest';
      btn.style.cssText = [
        'position:fixed', 'bottom:120px', 'left:50%',
        'transform:translateX(-50%)', 'padding:14px 28px',
        'background:#00ff88', 'color:#070b14', 'border:none',
        'border-radius:12px', 'font-size:16px', 'font-weight:800',
        'cursor:pointer', 'z-index:30',
        'box-shadow:0 0 30px rgba(0,255,136,0.5)', 'white-space:nowrap',
      ].join(';');
      document.body.appendChild(btn);
      btn.addEventListener('click', async () => {
        btn.remove();
        clearTimeout(_completeTimeout);
        await QuestEngine.complete(quest.slug);
        try { XPBar.update(await API.getProfile()); } catch (_) {}
      });
    }
    btn.textContent = `✅ Засчитать «${quest.title}»!`;
    clearTimeout(_completeTimeout);
    _completeTimeout = setTimeout(() => {
      document.getElementById('btn-complete-quest')?.remove();
    }, 5000);
  }

  function _updatePPEUI(ppe) {
    const h = document.getElementById('ppe-helmet');
    const v = document.getElementById('ppe-vest');
    const s = document.getElementById('ppe-status');
    if (h) h.textContent = ppe.helmet ? '✅ Каска' : '❌ Каска';
    if (v) v.textContent = ppe.vest   ? '✅ Жилет' : '❌ Жилет';
    if (s) {
      s.textContent = ppe.all_ok ? 'Снаряжение в порядке!' : `Не хватает: ${ppe.missing.join(', ')}`;
      s.style.color = ppe.all_ok ? '#00ff88' : '#ff3355';
    }
    if (ppe.all_ok) {
      const q = QuestEngine.getActive();
      if (q && q.type === 'safety') _showCompleteButton(q);
    }
  }

  function start(videoEl, isPPEMode = false) {
    stop();
    _videoEl = videoEl;
    _isPPEMode = isPPEMode;
    _connectWS();
    _intervalId = setInterval(_sendFrame, isPPEMode ? REST_INTERVAL : INTERVAL_MS);
    console.log('[VisionClient] Запущен, режим:', isPPEMode ? 'PPE' : 'detection');
  }

  function stop() {
    if (_intervalId)  { clearInterval(_intervalId);  _intervalId  = null; }
    if (_pingInterval){ clearInterval(_pingInterval); _pingInterval = null; }
    if (_ws)          { _ws.close(); _ws = null; }
    _isProcessing = false;
    _videoEl = null;
  }

  return { init, start, stop, captureFrame };
})();
