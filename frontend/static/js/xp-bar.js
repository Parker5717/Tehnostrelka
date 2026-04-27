/**
 * CASPER XP Bar
 * Обновляет HUD-элементы профиля: уровень, XP, прогресс-бар.
 */

const XPBar = (() => {
  const els = {
    username:   () => document.getElementById('hud-username'),
    levelLabel: () => document.getElementById('hud-level-label'),
    xpBar:      () => document.getElementById('hud-xp-fill'),
    xpText:     () => document.getElementById('hud-xp-text'),
    avatar:     () => document.getElementById('hud-avatar'),
  };

  /**
   * Обновить HUD данными профиля.
   * @param {object} profile — ответ GET /api/users/me
   */
  function update(profile) {
    if (!profile) return;

    const { username, display_name, level, level_title, total_xp,
            xp_to_next_level, level_progress_pct } = profile;

    const nameEl = els.username();
    if (nameEl) nameEl.textContent = display_name || username;

    const levelEl = els.levelLabel();
    if (levelEl) levelEl.textContent = `LVL ${level} · ${level_title}`;

    const barEl = els.xpBar();
    if (barEl) barEl.style.width = `${Math.round(level_progress_pct * 100)}%`;

    const textEl = els.xpText();
    if (textEl) textEl.textContent = `${total_xp} XP · ещё ${xp_to_next_level} до уровня ${level + 1}`;

    const avatarEl = els.avatar();
    if (avatarEl) avatarEl.textContent = (display_name || username).charAt(0).toUpperCase();
  }

  /**
   * Показать всплывающее уведомление +XP.
   * @param {number} xp
   * @param {boolean} leveledUp
   * @param {number} newLevel
   * @param {string} levelTitle
   */
  function showXPGain(xp, leveledUp = false, newLevel = 1, levelTitle = '') {
    const popup = document.getElementById('xp-popup');
    if (!popup) return;

    popup.textContent = `+${xp} XP`;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 2000);

    if (leveledUp) {
      setTimeout(() => showLevelUp(newLevel, levelTitle), 600);
    }
  }

  /**
   * Большая анимация level-up.
   */
  function showLevelUp(level, title) {
    const popup = document.getElementById('levelup-popup');
    if (!popup) return;

    document.getElementById('levelup-level').textContent = `🎉 Уровень ${level}!`;
    document.getElementById('levelup-title').textContent = title;

    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 3000);
  }

  return { update, showXPGain, showLevelUp };
})();
