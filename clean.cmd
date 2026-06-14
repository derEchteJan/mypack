@echo off

set target_dir=%AppData%\Minecraft Bedrock\Users\Shared\games\com.mojang
set devb_dir=%target_dir%\development_behavior_packs\mypack\
set devr_dir=%target_dir%\development_resource_packs\mypack\

rmdir "%devb_dir%" /s /q
rmdir "%devr_dir%" /s /q