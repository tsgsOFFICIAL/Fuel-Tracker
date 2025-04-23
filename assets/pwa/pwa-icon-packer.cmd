@echo off
rem Set a local scope, allowing for delayed expansion of variables
setlocal EnableDelayedExpansion

rem Get the directory where the script resides using %~dp0
set "search_dir=%~dp0"

rem Define output directory
set "output_dir=icons"

rem Ensure output directory exists
if not exist "%search_dir%%output_dir%" mkdir "%search_dir%%output_dir%"

rem Loop through all files with "x" in the filename in the script directory and its subdirectories
echo Searching for x files...
echo.
for /R "%search_dir%" %%i in (*x*.*) do (
    rem Output the full path, filename, and extension of each file
    echo X File: %%i
    echo Filename without extension: %%~ni
    echo File Extension: %%~xi
    rem Remove all files with "x" in the filename
    del "%%i"
)

rem Define the exact path to logo.png
set "logo_path=%search_dir%..\img\logo.png"

echo Logo Path: %logo_path%

rem Check if logo.png exists
echo.
echo Searching for logo...
echo.
if exist "%logo_path%" (
    echo Found: %logo_path%
    rem Run ffmpeg commands to resize logo.png
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=72:72 "%search_dir%%output_dir%\72x72.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=96:96 "%search_dir%%output_dir%\96x96.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=128:128 "%search_dir%%output_dir%\128x128.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=144:144 "%search_dir%%output_dir%\144x144.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=152:152 "%search_dir%%output_dir%\152x152.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=192:192 "%search_dir%%output_dir%\192x192.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=384:384 "%search_dir%%output_dir%\384x384.png"
    ffmpeg -loglevel quiet -y -i "%logo_path%" -vf scale=512:512 "%search_dir%%output_dir%\512x512.png"
) else (
    echo Error: %logo_path% not found!
)

endlocal

echo.
pause