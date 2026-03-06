# ShebaHub Backend

Backend for ShebaHub – a platform connecting students and mentors.

Built with Django, Django REST Framework (DRF), and JWT authentication.

---

## Features

- Custom user model (email login, case-insensitive)
- JWT signup & login with password confirmation
- Terms & conditions acceptance tracking
- Student and Mentor profiles (me-only endpoints)
- Reference data endpoints for dropdowns (placeholder values seeded)
- API versioning (/api/v1/...)
- OpenAPI/Swagger documentation
- Django admin
- Tests for auth + profiles

---

## API Documentation

After running the server, access:

- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

---

## Run locally

### 1) Clone

```bash
git clone https://github.com/yonatanel-Dev/shebahub-backend.git
cd shebahub-backend
```

### 2) Create a virtualenv + install dependencies

Windows (PowerShell):

```powershell
py -m venv venv
venv\Scripts\pip.exe install -r requirements.txt
```

Linux/macOS:

```bash
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

### 3) Migrate + run

Windows:

```powershell
venv\Scripts\python.exe manage.py migrate
venv\Scripts\python.exe manage.py runserver 8000
```

Linux/macOS:

```bash
venv/bin/python manage.py migrate
venv/bin/python manage.py runserver 8000
```

Open Swagger UI:
http://localhost:8000/api/docs/

