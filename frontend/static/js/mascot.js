/**
 * CASPER Mascot — робот-наставник.
 *
 * Показывает подсказки, поддерживающие фразы и реакции на события.
 * Антистресс: мягкие сообщения в первые дни, никакого давления.
 */

const Mascot = (() => {
  // Фразы маскота по контексту
  const PHRASES = {
    welcome: [
      "Привет! Я КАСПЕР — твой цифровой напарник. Вместе разберёмся с цехом! 🤖",
      "Добро пожаловать на производство! Не переживай, я буду рядом. 🚀",
      "Первый день? Отлично! Начнём с простого — я покажу как тут всё устроено.",
    ],
    quest_start: [
      "Отличный выбор! Наведи камеру и держи пару секунд. Ты справишься! 🎯",
      "Поехали! Если что-то непонятно — просто наведи камеру на объект.",
      "Этот квест несложный. Главное — не торопись и смотри внимательно.",
    ],
    quest_complete: [
      "Отлично! Вот это я понимаю — профессионал растёт! 🌟",
      "Так держать! Каждый выполненный квест — это шаг к уверенной работе.",
      "Молодец! Ты уже знаешь больше, чем 10 минут назад. 💪",
    ],
    levelup: [
      "УРОВЕНЬ ПОЛУЧЕН! Ты растёшь прямо на глазах! 🎉",
      "Новый уровень — новые возможности! Продолжай в том же духе!",
      "Вот это прокачка! Скоро будешь учить других. 🏆",
    ],
    idle: [
      "Псс... видишь кнопку 🎯? Там квесты. Попробуй один!",
      "Скучно стоять? Наведи камеру куда-нибудь — вдруг что найдём!",
      "Знаешь что? Начни с квеста «Первый шаг» — это быстро и весело.",
    ],
    safety_reminder: [
      "Перед работой — проверь снаряжение! Нажми 🦺 для Safety Check.",
      "Безопасность прежде всего! Это не скучное правило — это забота о тебе.",
    ],
    error: [
      "Упс! Бывает. Попробуй ещё раз — никто не ошибается только тот, кто ничего не делает. 😊",
      "Не вышло? Не проблема! Я верю что у тебя получится.",
    ],
    stress_relief: [
      "Не бойся ошибиться — это часть обучения. Я не буду ругаться! 🤗",
      "Здесь нет неправильных вопросов. Спрашивай у наставника всё что непонятно.",
      "Первый день всегда кажется сложным. Завтра будет легче, обещаю!",
    ],
  };

  let _container = null;
  let _bubble = null;
  let _avatar = null;
  let _idleTimer = null;
  let _isVisible = false;
  let _messageQueue = [];
  let _isShowing = false;

  function init() {
    _createDOM();
    // Приветствие через 2 секунды после загрузки
    setTimeout(() => say('welcome'), 2000);
    // Idle подсказка каждые 90 секунд
    _resetIdleTimer();
  }

  function _createDOM() {
    _container = document.createElement('div');
    _container.id = 'mascot-container';
    _container.style.cssText = `
      position: fixed;
      bottom: 160px;
      left: 16px;
      z-index: 40;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      pointer-events: none;
    `;

    _avatar = document.createElement('div');
    _avatar.style.cssText = `
      width: 52px; height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0055aa, #00aaff);
      border: 2px solid var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
      box-shadow: 0 0 16px rgba(0,170,255,0.4);
      cursor: pointer;
      pointer-events: all;
      transition: transform 0.2s;
      flex-shrink: 0;
    `;
    _avatar.textContent = '🤖';
    _avatar.title = 'КАСПЕР — твой напарник';
    _avatar.addEventListener('click', () => {
      if (_isVisible) hide();
      else say('idle');
    });
    _avatar.addEventListener('mouseenter', () => {
      _avatar.style.transform = 'scale(1.1)';
    });
    _avatar.addEventListener('mouseleave', () => {
      _avatar.style.transform = 'scale(1)';
    });

    _bubble = document.createElement('div');
    _bubble.style.cssText = `
      display: none;
      max-width: 240px;
      padding: 12px 16px;
      background: rgba(7,11,20,0.95);
      border: 1px solid var(--accent);
      border-radius: 12px 12px 12px 4px;
      color: var(--text-primary);
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 0 20px rgba(0,170,255,0.2);
      pointer-events: all;
      cursor: pointer;
      animation: slideUp 0.3s ease;
      position: relative;
    `;
    _bubble.addEventListener('click', () => hide());

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-end;gap:8px';
    row.appendChild(_bubble);
    row.appendChild(_avatar);

    _container.appendChild(row);
    document.body.appendChild(_container);
  }

  function say(context, customText = null) {
    _resetIdleTimer();
    const phrases = PHRASES[context] || PHRASES.idle;
    const text = customText || phrases[Math.floor(Math.random() * phrases.length)];
    _messageQueue.push(text);
    if (!_isShowing) _showNext();
  }

  function _showNext() {
    if (_messageQueue.length === 0) { _isShowing = false; return; }
    _isShowing = true;
    const text = _messageQueue.shift();

    _bubble.textContent = text;
    _bubble.style.display = 'block';
    _isVisible = true;

    // Анимация печати
    _bubble.style.opacity = '0';
    setTimeout(() => { _bubble.style.opacity = '1'; _bubble.style.transition = 'opacity 0.3s'; }, 10);

    // Автоскрытие через 5 секунд
    setTimeout(() => {
      hide();
      setTimeout(_showNext, 500);
    }, 5000);
  }

  function hide() {
    if (!_bubble) return;
    _bubble.style.opacity = '0';
    setTimeout(() => {
      _bubble.style.display = 'none';
      _isVisible = false;
    }, 300);
  }

  function _resetIdleTimer() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(() => {
      const ctx = Math.random() > 0.5 ? 'idle' : 'stress_relief';
      say(ctx);
    }, 90000);
  }

  // Реакции на игровые события
  function onQuestStart()    { say('quest_start'); _resetIdleTimer(); }
  function onQuestComplete() { say('quest_complete'); _resetIdleTimer(); }
  function onLevelUp()       { say('levelup'); _resetIdleTimer(); }
  function onError()         { say('error'); }

  return { init, say, hide, onQuestStart, onQuestComplete, onLevelUp, onError };
})();
