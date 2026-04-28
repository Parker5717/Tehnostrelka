# 🤖 CASPER AR Assistant

> **Команда:** «Команда которая объективно лучше всех, но судьи этого не замечают» 🎯
>
> Хакатон **«Цифровой Вызов»** от Casper AI, Нижний Новгород 2026

**Молодой сотрудник → камера смартфона → AR-подсказки и квесты → уверенная работа в цеху**

---

## Что это

AR-помощник для адаптации новичков на производстве. Открывается в браузере смартфона, не требует установки. Камера распознаёт ArUco-маркеры на оборудовании и выдаёт контекстные подсказки через геймифицированную систему квестов.

### Ключевые фичи

| Функция | Описание |
|---------|----------|
| 🎯 **AR-квесты** | 7 квестов по нарастающей сложности, цепочка разблокировок |
| 📷 **ArUco детекция** | Мгновенное распознавание маркеров через OpenCV |
| 🦺 **Safety Check** | Проверка СИЗ через фронтальную камеру |
| 🏆 **XP и ачивки** | Уровни от «Стажёр» до «Мастер цеха», 5 достижений |
| 🤖 **Маскот КАСПЕР** | Антистресс-фразы, реакции на события |
| 👤 **Лидерборд** | Топ-10 среди новичков (не с ветеранами) |
| 🖨️ **Печатные маркеры** | Готовые к печати ArUco PNG через `/markers` |

---

## Быстрый старт

```bash
cd backend
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate.bat

pip install -r requirements.txt
pip install numpy==2.2.0  # Windows + Python 3.13

uvicorn app.main:app --reload
```

Открой **http://localhost:8000** — страница логина.

### Запуск на телефоне через ngrok

Камера в браузере требует HTTPS. ngrok даёт публичный HTTPS-адрес за 2 минуты.

```bash
# 1. Скачай ngrok: https://ngrok.com/download
# 2. Зарегистрируйся на ngrok.com, получи authtoken
ngrok config add-authtoken ТВОЙ_ТОКЕН

# 3. Запусти сервер (в одном окне)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. Запусти туннель (в другом окне)
ngrok http 8000
```

ngrok выдаст URL вида `https://abc123.ngrok-free.app` — открывай на любом телефоне в той же сети или через мобильный интернет. Камера, WebSocket и все фичи работают полностью.

### Маркеры для демо

Открой **http://localhost:8000/markers** → распечатай → прикрепи к объектам.

| Маркер | Квест |
|--------|-------|
| ID 0 — Входная зона | Первый шаг |
| ID 1 — Аварийный стоп | Аварийная остановка |
| ID 2 — Рабочий станок | Знакомство со станком |
| ID 3 — Зона инструмента | Финальный осмотр |
| ID 4 — Огнетушитель | Где огнетушитель? |
| ID 10 — Каска (СИЗ) | Safety Check |
| ID 11 — Жилет (СИЗ) | Safety Check |

### Очистка БД

```bash
python reset_db.py          # полный сброс
python reset_db.py --users  # только пользователи
```

---

## Архитектура

```
casper-ar-assistant/
├── backend/
│   ├── app/
│   │   ├── api/        # REST + WebSocket эндпоинты
│   │   ├── core/       # конфиг, WS менеджер
│   │   ├── cv/         # ArUco + YOLOv8 + PPE детекторы
│   │   ├── db/         # SQLAlchemy модели, seed
│   │   ├── game/       # XP engine, ачивки, контент YAML
│   │   └── main.py     # FastAPI entry point
│   ├── models/         # YOLO веса (.pt)
│   ├── reset_db.py     # утилита очистки БД
│   └── requirements.txt
├── frontend/
│   ├── index.html      # логин
│   ├── app.html        # AR-камера + HUD
│   ├── safety.html     # Safety Check
│   ├── profile.html    # профиль + лидерборд
│   └── markers.html    # маркеры для печати
└── docs/
    └── demo-script.md  # сценарий для жюри
```

## Стек

| Слой | Технология |
|------|-----------|
| Backend | FastAPI 0.115, SQLAlchemy 2.0, SQLite |
| Computer Vision | OpenCV 4.10 (ArUco), YOLOv8n (ultralytics) |
| Transport | REST API + WebSocket (real-time) |
| Frontend | Vanilla JS, Canvas 2D AR overlay |
| Auth | JWT (python-jose) |

---

## Демо-сценарий

Подробный сценарий для презентации жюри: [`docs/demo-script.md`](docs/demo-script.md)
