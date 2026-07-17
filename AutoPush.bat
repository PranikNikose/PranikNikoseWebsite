@echo off
setlocal

cd /d "%~dp0"

echo.
echo ====================================
echo Git Auto Push
echo ====================================

echo.
echo ===== CHECKING FOR CHANGES =====

git diff --name-only > "%temp%\git_changes.txt"

findstr . "%temp%\git_changes.txt" >nul
if errorlevel 1 (
echo No modified files found.
) else (
echo Modified files:
type "%temp%\git_changes.txt"
)

echo.
set /p MSG=Enter commit message (or press Enter for "update"):

if "%MSG%"=="" set MSG=update

echo.
echo ===== STAGING FILES =====
git add .

echo.
echo ===== COMMITTING CHANGES =====
git commit -m "%MSG%"

if errorlevel 1 (
echo.
echo No changes to commit.
pause
exit /b 0
)

echo.
echo ===== FETCHING LATEST CHANGES =====
git fetch origin

if errorlevel 1 (
echo.
echo ERROR: Failed to fetch from GitHub.
pause
exit /b 1
)

echo.
echo ===== REBASING ON LATEST REMOTE =====
git pull --rebase

if errorlevel 1 (
echo.
echo ====================================
echo REBASE CONFLICT DETECTED
echo ====================================
echo.
echo Resolve conflicts manually, then run:
echo.
echo     git add .
echo     git rebase --continue
echo.
echo After that, run this script again.
pause
exit /b 1
)

echo.
echo ===== PUSHING TO GITHUB =====
git push

if errorlevel 1 (
echo.
echo Push failed.
pause
exit /b 1
)

echo.
echo ====================================
echo SUCCESS! Changes pushed to GitHub.
echo ====================================
pause
