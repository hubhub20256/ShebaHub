#!/usr/bin/env python
"""ShebaHub Backend setup (cross-platform).

Creates venv, prepares .env, installs deps, runs migrations.
Works on Windows/Linux/macOS using the same file.

Usage:
  python setup.py
  # or on Windows if python isn't on PATH:
  py setup.py
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def _print(step: str) -> None:
    print(step, flush=True)


def _fail(message: str, code: int = 1) -> "never":
    print(f"ERROR: {message}", file=sys.stderr, flush=True)
    raise SystemExit(code)


def _run(args: list[str], *, cwd: Path) -> None:
    result = subprocess.run(args, cwd=str(cwd))
    if result.returncode != 0:
        _fail(f"Command failed ({result.returncode}): {' '.join(args)}", result.returncode)


def _venv_python(venv_dir: Path) -> Path:
    if os.name == "nt":
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"


def main() -> int:
    project_dir = Path(__file__).resolve().parent
    os.chdir(project_dir)

    _print(f"ShebaHub Backend setup ({platform.system()})")

    py = sys.executable
    if not py:
        _fail("Unable to detect Python executable.")

    _print(f"[1/5] Python OK: {py}")

    venv_dir = project_dir / "venv"
    venv_py = _venv_python(venv_dir)

    _print("[2/5] Creating virtual environment...")
    if not venv_dir.exists():
        _run([py, "-m", "venv", str(venv_dir)], cwd=project_dir)

    if not venv_py.exists():
        _fail(f"venv created but python not found at: {venv_py}")

    _print("[2.5/5] Creating .env from .env.example if missing...")
    env_file = project_dir / ".env"
    env_example = project_dir / ".env.example"
    if not env_file.exists():
        if env_example.exists():
            shutil.copyfile(env_example, env_file)
            _print("Created .env")
        else:
            _print("WARNING: .env.example not found, skipping.")
    else:
        _print(".env already exists - skipping.")

    _print("[3/5] Installing dependencies...")
    _run([str(venv_py), "-m", "pip", "install", "--upgrade", "pip"], cwd=project_dir)

    req = project_dir / "requirements.txt"
    if not req.exists():
        _fail("requirements.txt not found.")
    _run([str(venv_py), "-m", "pip", "install", "-r", str(req)], cwd=project_dir)

    req_dev = project_dir / "requirements-dev.txt"
    if req_dev.exists():
        _print("Installing dev dependencies (requirements-dev.txt)...")
        _run([str(venv_py), "-m", "pip", "install", "-r", str(req_dev)], cwd=project_dir)
    else:
        _print("requirements-dev.txt not found - skipping dev dependencies.")

    _print("[4/6] Running migrations...")
    _run([str(venv_py), "manage.py", "migrate"], cwd=project_dir)

    _print("[5/6] Creating default admin account...")
    admin_script = (
        "import django, os; "
        "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); "
        "django.setup(); "
        "from apps.accounts.models import User; "
        "email='admin@sheba.com'; "
        "pwd='ShebahubHit@@!#42'; "
        "exists=User.objects.filter(email=email).exists(); "
        "print(f'Admin already exists: {email}') if exists else "
        "(User.objects.create_user(email=email, password=pwd, firstName='Admin', lastName='User', is_staff=True, is_superuser=True, is_active=True, email_verified=True), "
        "print(f'Created admin: {email}'))"
    )
    _run([str(venv_py), "-c", admin_script], cwd=project_dir)

    _print("[6/6] Done.")
    if os.name == "nt":
        _print("Run tests:\n  venv\\Scripts\\python.exe -m pytest")
        _print("Run server:\n  venv\\Scripts\\python.exe manage.py runserver")
    else:
        _print("Run tests:\n  venv/bin/python -m pytest")
        _print("Run server:\n  venv/bin/python manage.py runserver")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
