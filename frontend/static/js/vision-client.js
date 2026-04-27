/**
 * CASPER Vision Client
 * Периодически захватывает кадр с видео → отправляет на /api/vision/detect
 * → передаёт детекции в AROverlay и QuestEngine.
 */

const VisionClient = (() => {
  let _intervalId = null;
  let _captureCanvas = null;
  let _ctx = null;
  let _isProcessing = false;

  const INTERVAL_MS = 1500;   // 1 кадр в 1.5 секунды — баланс скорость/нагрузка
  const JPEG_QUALITY = 0.65;  // качество JPEG (меньше = быстрее передача)

  // Цвета AR-боксов по типу детекции
  const TYPE_COLORS = {
    marker: '#00ff88',   // зелёный — ArUco
    object: '#ffaa00',   // оранжевый — YOLOv8
    ppe:    '#00aaff',   // синий — PPE
  };

  /**
   * Инициализировать клиент.
   * Создаёт скрытый canvas для захвата кадров.
   */
  function init() {
    _captureCanvas = document.createElement('canvas');
    _ctx = _captureCanvas.getContext('2d');
  }

  /**
   * Захватить один кадр с видеоэлемента и вернуть base64 JPEG.
   * @param {HTMLVideoElement} videoEl
   * @returns {string|null}
   */
  function captureFrame(videoEl) {
    if (!videoEl || videoEl.readyState < 2) return null;

    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return null;

    _captureCanvas.width  = w;
    _captureCanvas.height = h;
    _ctx.drawImage(videoEl, 0, 0, w, h);

    // Получаем base64 без data URL префикса
    const dataUrl = _captureCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return dataUrl.split(',')[1];
  }

  /**
   * Запустить периодический захват и отправку кадров.
   * @param {HTMLVideoElement} videoEl
   * @param {boolean} isPPEMode — true = фронтальная камера (PPE-проверка)
   */
  function start(videoEl, isPPEMode = false) {
    stop();

    _intervalId = setInterval(async () => {
      if (_isProcessing) return;  // пропускаем если предыдущий ещё не завершён

      const b64 = captureFrame(videoEl);
      if (!b64) return;

      _isProcessing = true;
      try {
        await _processFrame(b64, isPPEMode);
      } finally {
        _isProcessing = false;
      }
    }, INTERVAL_MS);

    console.log('[VisionClient] Запущен, режим:', isPPEMode ? 'PPE' : 'detection');
  }

  /**
   * Остановить периодический захват.
   */
  function stop() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _isProcessing = false;
  }

  /**
   * Обработать один кадр: отправить на сервер, обновить AR-оверлей.
   */
  async function _processFrame(b64Image, isPPEMode) {
    try {
      const token = sessionStorage.getItem('casper_token');
      if (!token) return;

      const resp = await fetch('/api/vision/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: b64Image,
          run_ppe: isPPEMode,
          run_objects: !isPPEMode,
        }),
      });

      if (!resp.ok) return;
      const data = await resp.json();

      // Обновляем AR-оверлей
      if (data.all_detections && data.all_detections.length > 0) {
        AROverlay.updateDetections(data.all_detections);
      } else {
        AROverlay.updateDetections([]);
      }

      // PPE режим — обновляем UI проверки
      if (isPPEMode && data.ppe) {
        _updatePPEUI(data.ppe);
        return;
      }

      // Проверяем совпадение с активным квестом
      if (data.all_detections.length > 0) {
        _checkQuestProgress(data);
      }

    } catch (err) {
      // Тихо игнорируем сетевые ошибки (камера может отправлять быстрее чем сервер отвечает)
      console.debug('[VisionClient] Ошибка:', err.message);
    }
  }

  /**
   * Проверить совпадение детекций с активным квестом.
   * Если совпадение найдено — показать кнопку завершения.
   */
  function _checkQuestProgress(data) {
    const activeQuest = QuestEngine.getActive();
    if (!activeQuest) return;

    let matched = false;

    // Проверяем маркеры
    if (activeQuest.target_marker_id !== null && activeQuest.target_marker_id !== undefined) {
      matched = data.markers.some(m => m.marker_id === activeQuest.target_marker_id);
    }

    // Проверяем объекты по классу
    if (!matched && activeQuest.target_class) {
      matched = data.objects.some(o => o.detected_class === activeQuest.target_class);
    }

    if (matched) {
      _showCompleteButton(activeQuest);
    }
  }

  /**
   * Показать кнопку завершения квеста когда цель найдена.
   */
  let _completeTimeout = null;
  function _showCompleteButton(quest) {
    let btn = document.getElementById('btn-complete-quest');

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-complete-quest';
      btn.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        padding: 14px 28px;
        background: #00ff88;
        color: #070b14;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        z-index: 30;
        box-shadow: 0 0 30px rgba(0,255,136,0.5);
        animation: pulse 1.5s ease-in-out infinite;
      `;
      document.body.appendChild(btn);

      btn.addEventListener('click', async () => {
        btn.remove();
        await QuestEngine.complete(quest.slug);
        // Обновляем профиль после завершения
        try {
          const profile = await API.getProfile();
          XPBar.update(profile);
        } catch (_) {}
      });
    }

    btn.textContent = `✅ Засчитать «${quest.title}»!`;

    // Прячем через 5 секунд если не нажали
    clearTimeout(_completeTimeout);
    _completeTimeout = setTimeout(() => {
      const b = document.getElementById('btn-complete-quest');
      if (b) b.remove();
    }, 5000);
  }

  /**
   * Обновить UI PPE-проверки.
   */
  function _updatePPEUI(ppe) {
    const helmetEl = document.getElementById('ppe-helmet');
    const vestEl   = document.getElementById('ppe-vest');
    const statusEl = document.getElementById('ppe-status');

    if (helmetEl) helmetEl.textContent = ppe.helmet ? '✅ Каска' : '❌ Каска';
    if (vestEl)   vestEl.textContent   = ppe.vest   ? '✅ Жилет' : '❌ Жилет';

    if (statusEl) {
      statusEl.textContent = ppe.all_ok
        ? 'Снаряжение в порядке!'
        : `Не хватает: ${ppe.missing.join(', ')}`;
      statusEl.style.color = ppe.all_ok ? '#00ff88' : '#ff3355';
    }

    // Автоматически завершить safety квест если всё ок
    if (ppe.all_ok) {
      const activeQuest = QuestEngine.getActive();
      if (activeQuest && activeQuest.type === 'safety') {
        _showCompleteButton(activeQuest);
      }
    }
  }

  return { init, start, stop, captureFrame };
})();
