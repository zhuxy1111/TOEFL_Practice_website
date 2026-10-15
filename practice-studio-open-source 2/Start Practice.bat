@echo off
setlocal
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -X utf8 -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>nul
  if not errorlevel 1 goto use_venv
)
py -3 -X utf8 -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>nul
if not errorlevel 1 goto use_py
python -X utf8 -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>nul
if not errorlevel 1 goto use_python
echo Python 3.10 or newer was not found.
echo Install Python from https://www.python.org/downloads/windows/
echo Enable the Python launcher or Add Python to PATH, then reopen this file.
pause
exit /b 1
:use_venv
".venv\Scripts\python.exe" -X utf8 tools\windows_start.py %*
goto finished
:use_py
py -3 -X utf8 tools\windows_start.py %*
goto finished
:use_python
python -X utf8 tools\windows_start.py %*
:finished
set "PRACTICE_EXIT=%ERRORLEVEL%"
if not "%PRACTICE_EXIT%"=="0" echo Practice Studio stopped with an error. See the message above.
pause
exit /b %PRACTICE_EXIT%
