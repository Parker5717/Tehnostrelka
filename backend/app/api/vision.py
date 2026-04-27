"""
Vision роутер — обработка кадров с камеры.

POST /api/vision/detect  — принять base64-кадр → вернуть детекции
GET  /api/vision/status  — статус CV-пайплайна (модели загружены?)
"""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.cv.pipeline import process_frame
from app.db.models import User

log = logging.getLogger("casper.api.vision")
router = APIRouter()


class DetectRequest(BaseModel):
    image: str          # base64 JPEG/PNG
    run_ppe: bool = False      # True = фронтальная камера, PPE-проверка
    run_objects: bool = True   # True = задняя камера, YOLOv8


class DetectResponse(BaseModel):
    markers: list[dict]
    objects: list[dict]
    ppe: dict | None
    all_detections: list[dict]
    processing_ms: int
    error: str | None


@router.post(
    "/detect",
    response_model=DetectResponse,
    summary="Обработать кадр с камеры",
    description=(
        "Принимает base64 JPEG-кадр, запускает ArUco + YOLOv8, "
        "возвращает список детекций для AR-оверлея."
    ),
)
def detect(
    req: DetectRequest,
    current_user: User = Depends(get_current_user),
) -> DetectResponse:
    result = process_frame(
        b64_image=req.image,
        run_ppe=req.run_ppe,
        run_objects=req.run_objects,
    )
    return DetectResponse(**result)


@router.get(
    "/status",
    summary="Статус CV-пайплайна",
)
def cv_status(_: User = Depends(get_current_user)) -> dict:
    """Проверить загружены ли ML-модели."""
    from app.cv.object_detector import _model_available
    return {
        "aruco": "ready",
        "yolov8": (
            "ready" if _model_available
            else "unavailable" if _model_available is False
            else "not_loaded_yet"
        ),
    }
