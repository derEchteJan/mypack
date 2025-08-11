@echo off

if exist node_moules rd /s /q node_modules

where npm > NUL 2>&1
if %errorlevel% NEQ 0 (
    echo command 'npm' not found. Please install Node.js
) else (
    echo installing node module '@minecraft/server'...
    npm i @minecraft/server
    echo installing node module '@minecraft/server-gametest'...
    npm i @minecraft/server-gametest
)
