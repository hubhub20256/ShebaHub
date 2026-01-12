@echo off
setlocal EnableExtensions

REM -----------------------------
REM ShebaHub Backend Setup (robust)
REM -----------------------------

REM Choose python launcher
set "PY_CMD=py"
py --version >nul 2>nul
if errorlevel 1 set "PY_CMD=python"

%PY_CMD% --version >nul 2>nul
if errorlevel 1 goto :no_python

echo [1/5] Python OK: %PY_CMD%

echo [2/5] Creating virtual environment...
if exist venv goto :venv_exists
%PY_CMD% -m venv venv
if errorlevel 1 goto :venv_fail
:venv_exists

echo [3/5] Installing dependencies...
venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto :pip_fail

if not exist requirements.txt goto :no_requirements
venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :req_fail

if exist requirements-dev.txt goto :install_dev
echo requirements-dev.txt not found - skipping dev dependencies.
goto :after_dev

:install_dev
echo Installing dev dependencies (requirements-dev.txt)...
venv\Scripts\python.exe -m pip install -r requirements-dev.txt
if errorlevel 1 goto :dev_fail

:after_dev
echo [4/5] Running migrations...
venv\Scripts\python.exe manage.py migrate
if errorlevel 1 goto :mig_fail

echo [5/5] Done.
echo Run tests:
echo   venv\Scripts\python.exe -m pytest
echo Run server:
echo   venv\Scripts\python.exe manage.py runserver
exit /b 0

:no_python
echo ERROR: Python not found (py/python not available).
exit /b 1

:venv_fail
echo ERROR: Failed to create venv.
exit /b 1

:pip_fail
echo ERROR: Failed to upgrade pip.
exit /b 1

:no_requirements
echo ERROR: requirements.txt not found.
exit /b 1

:req_fail
echo ERROR: Failed to install requirements.txt
exit /b 1

:dev_fail
echo ERROR: Failed to install requirements-dev.txt
exit /b 1

:mig_fail
echo ERROR: migrate failed.
exit /b 1
