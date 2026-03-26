@echo off
setlocal
echo ==========================================
echo    Incendo Dashboard - GitHub Push Helper
echo ==========================================
echo.

:: Check if git is initialized
if not exist .git (
    echo [ERROR] Git is not initialized. Initializing now...
    git init
)

:: Add all files
echo [INFO] Adding files to commit...
git add .

:: Commit (ask for message or use default)
set /p commit_msg="Enter commit message (Press Enter for default 'Update'): "
if "%commit_msg%"=="" set commit_msg=Update
git commit -m "%commit_msg%"

:: Check for remote 'origin'
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARN] No remote repository found!
    set /p repo_url="Please paste your new GitHub Repository URL here: "
    git remote add origin %repo_url%
    git branch -M main
    echo [INFO] Remote 'origin' added.
)

:: Push
echo.
echo [INFO] Pushing to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Project successfully pushed to GitHub!
) else (
    echo.
    echo [ERROR] Push failed. Please check your URL or permissions.
)

echo.
pause
