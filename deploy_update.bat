@echo off
setlocal
echo ==========================================
echo    FAST DEPLOY to QOMMAND CENTER
echo ==========================================
echo.

set IP=192.168.50.242
set USER=arduino

echo 1. Syncing codebase...
echo (You will be prompted for your Arduino Q password)
scp -r "src" %USER%@%IP%:~/incendo-dashboard/
echo.

echo 2. Forcing Docker rebuild...
echo (You will be prompted for your Arduino Q password again)
ssh %USER%@%IP% "cd ~/incendo-dashboard && sudo docker-compose build --no-cache dashboard && sudo docker-compose up -d"

echo.
echo ==========================================
echo    DONE! Hit CTRL+F5 in your browser.
echo ==========================================
pause
