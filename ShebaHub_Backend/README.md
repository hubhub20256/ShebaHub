# ShebaHub Backend

Backend for ShebaHub – a platform connecting students and mentors.

Built with Django, Django REST Framework (DRF), and JWT authentication.

Repository:
- https://github.com/yonatanel-Dev/shebahub-backend

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

### All OS (Windows / Linux / macOS)

1) Run the setup script (optional)
```bash
git clone https://github.com/yonatanel-Dev/shebahub-backend.git
cd shebahub-backend
python setup.py
```

Run server:
```bash
venv/bin/python manage.py runserver  # Linux/macOS
venv\\Scripts\\python.exe manage.py runserver  # Windows
```

Open the API documentation in your browser:
http://localhost:8000/api/docs/

