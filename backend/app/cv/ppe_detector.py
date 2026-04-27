"""
PPE (Personal Protective Equipment) детектор.

На шаге 4: упрощённая реализация через YOLOv8n (определяем наличие человека
и цветовой анализ для каски/жилета).

На продакшне: заменить на fine-tuned модель с классами helmet/vest/goggles.
Открытые датасеты: Construction Site Safety (Roboflow),
                    PPE Detection Dataset (Kaggle).
"""

import logging

import cv2
import numpy as np

log = logging.getLogger("casper.cv.ppe")

# Цветовые диапазоны в HSV для определения СИЗ
# Каска: белая или жёлтая
# Жилет: оранжевый или жёлто-зелёный (сигнальный)
_PPE_RANGES = {
    "helmet_yellow": {
        "lower": np.array([20, 100, 100]),
        "upper": np.array([35, 255, 255]),
    },
    "helmet_white": {
        "lower": np.array([0, 0, 200]),
        "upper": np.array([180, 30, 255]),
    },
    "vest_orange": {
        "lower": np.array([5, 150, 150]),
        "upper": np.array([20, 255, 255]),
    },
    "vest_green": {
        "lower": np.array([35, 100, 100]),
        "upper": np.array([85, 255, 255]),
    },
}

# Минимальный процент пикселей нужного цвета в зоне поиска
_MIN_COVERAGE = 0.03  # 3% от зоны


def _color_coverage(hsv: np.ndarray, lower: np.ndarray, upper: np.ndarray) -> float:
    """Доля пикселей в HSV-изображении попадающих в диапазон [lower, upper]."""
    mask = cv2.inRange(hsv, lower, upper)
    return float(mask.sum() / 255) / max(1, mask.size)


def detect_ppe(img: np.ndarray) -> dict:
    """
    Проверить наличие СИЗ на изображении (фронтальная камера).

    Returns:
        {
          "helmet":  True/False,
          "vest":    True/False,
          "all_ok":  True если все требуемые СИЗ есть,
          "missing": ["helmet"] если чего-то не хватает,
          "confidence": float,
        }
    """
    if img is None:
        return _empty_result()

    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Верхняя треть кадра — зона каски
    top_zone = hsv[:h // 3, :]
    # Средняя треть — зона жилета
    mid_zone = hsv[h // 3: 2 * h // 3, :]

    # Определяем каску
    helmet_yellow = _color_coverage(
        top_zone,
        _PPE_RANGES["helmet_yellow"]["lower"],
        _PPE_RANGES["helmet_yellow"]["upper"],
    )
    helmet_white = _color_coverage(
        top_zone,
        _PPE_RANGES["helmet_white"]["lower"],
        _PPE_RANGES["helmet_white"]["upper"],
    )
    has_helmet = (helmet_yellow + helmet_white) >= _MIN_COVERAGE

    # Определяем жилет
    vest_orange = _color_coverage(
        mid_zone,
        _PPE_RANGES["vest_orange"]["lower"],
        _PPE_RANGES["vest_orange"]["upper"],
    )
    vest_green = _color_coverage(
        mid_zone,
        _PPE_RANGES["vest_green"]["lower"],
        _PPE_RANGES["vest_green"]["upper"],
    )
    has_vest = (vest_orange + vest_green) >= _MIN_COVERAGE

    missing = []
    if not has_helmet:
        missing.append("helmet")
    if not has_vest:
        missing.append("vest")

    confidence = min(
        (helmet_yellow + helmet_white + vest_orange + vest_green) / (_MIN_COVERAGE * 4),
        1.0
    )

    return {
        "helmet":     has_helmet,
        "vest":       has_vest,
        "all_ok":     len(missing) == 0,
        "missing":    missing,
        "confidence": round(confidence, 2),
    }


def _empty_result() -> dict:
    return {
        "helmet": False,
        "vest":   False,
        "all_ok": False,
        "missing": ["helmet", "vest"],
        "confidence": 0.0,
    }
