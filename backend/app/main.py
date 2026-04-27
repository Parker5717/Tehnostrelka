"""
CASPER AR Assistant — точка входа FastAPI.

Запуск (из директории backend/):
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

После запуска:
    http://localhost:8000/         — заглушка (потом отдадим фронт)
    http://localhost:8000/health   — проверка живости
    http://localhost:8000/docs     — Swagger UI с автодокументацией
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.db.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("casper")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan-хук FastAPI: код до `yield` выполняется на старте,
    после `yield` — на остановке приложения.
    """
    log.info("Starting %s v%s", settings.app_name, settings.app_version)
    log.info("Initializing database at %s", settings.database_url)
    init_db()
    log.info("Database ready")
    # Сюда позже добавим: загрузку YOLO-моделей, сидинг квестов из YAML
    yield
    log.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AR-помощник для адаптации молодых сотрудников на производстве. "
        "Хакатон «Цифровой вызов» от Casper AI."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Базовые эндпоинты (на шаге 1 их два — корень и health)
# ---------------------------------------------------------------------------

@app.get("/", tags=["meta"])
async def root() -> dict:
    """Заглушка корня. На шаге 3 заменим на отдачу index.html."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"])
async def health() -> JSONResponse:
    """
    Проверка живости. Используется самим приложением и системами мониторинга.
    Возвращает 200, если процесс жив. Расширим на шаге 4 проверкой ML-моделей.
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "debug": settings.debug,
        },
    )


# Роутеры API будут подключаться здесь по мере реализации:
# from app.api import auth, quests, progress, vision_ws
# app.include_router(auth.router,    prefix="/api/auth",    tags=["auth"])
# app.include_router(quests.router,  prefix="/api/quests",  tags=["quests"])
# app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
# app.include_router(vision_ws.router, prefix="/ws",         tags=["vision"])
