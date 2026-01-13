# ShebaHub (Backend + Frontend)

A platform connecting students and mentors. This repository contains **both** the backend (Django/DRF) and the frontend (React/Vite).

---

## What’s inside

- `ShebaHub_Backend/` — Django + DRF + JWT (API)
- `ShebaHub_Front/` — React + Vite (Client)

✅ API prefix is **/api/** (no `/api/v1` support)

---

## Prerequisites

- Git
- Python 3.x (`python --version` / `python3 --version` / `py --version`)
- Node.js LTS + npm (`node --version`, `npm --version`)

---

## Run locally

### 1) Clone

```bash
git clone -b backend-and-frontend-functionality https://github.com/yonatanel-Dev/shebahub-backend.git Sheba_Hub
cd Sheba_Hub
```

### 2) Backend (Django)

```bash
cd ShebaHub_Backend
py setup.py  # Windows
python3 setup.py  # Linux/macOS

# run server
venv\\Scripts\\python.exe manage.py runserver 8000  # Windows
venv/bin/python manage.py runserver 8000  # Linux/macOS
```

Backend:
- http://localhost:8000

### 3) Frontend (React/Vite)

Open a new terminal (keep backend running):

```bash
cd ShebaHub_Front
npm install
npm run dev
```

Frontend (usually):
- http://localhost:5173

---

## API Docs (Backend)

- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

---

## Environment (.env)

- `.env` is local-only (not committed)
- `.env.example` is the template
- `ShebaHub_Backend/setup.py` creates `.env` from `.env.example` if missing
