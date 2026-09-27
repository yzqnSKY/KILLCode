@echo off
cd /d "%~dp0"
title KILLCode Launcher

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-killcode.ps1"
if errorlevel 1 (
  echo.
  echo KILLCode failed to start. The error is shown above.
  pause
)
