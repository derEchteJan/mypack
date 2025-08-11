@echo off

if exist package (
    del /f /s /q package\* > NUL
) else (
    mkdir package
)

tar -ca -f package\mypack_behaviour.zip mypack_behaviour
tar -ca -f package\mypack_resources.zip mypack_resources

rename package\mypack_behaviour.zip mypack_behaviour.mcpack
rename package\mypack_resources.zip mypack_resources.mcpack

tar -ca -f package\mypack_addon.zip -C package mypack_behaviour.mcpack mypack_resources.mcpack

rename package\mypack_addon.zip mypack.mcaddon

del /s /f /q package\mypack_behaviour.mcpack > NUL
del /s /f /q package\mypack_resources.mcpack > NUL

