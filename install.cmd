@echo off

set target_dir="C:\Users\dajan\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"
set devb_dir=%target_dir%\development_behavior_packs\mypack
set devr_dir=%target_dir%\development_resource_packs\mypack

if exist %devb_dir% rd /s /q %devb_dir%
mkdir %devb_dir%

if exist %devr_dir% rd /s /q %devr_dir%
mkdir %devr_dir%

xcopy mypack_behaviour %devb_dir% /e /s /i > NUL
xcopy mypack_resources %devr_dir% /e /s /i > NUL