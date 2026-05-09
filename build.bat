@echo off
chcp 65001 >nul
echo ==========================================
echo   林途知识进化系统 — Windows 打包工具
echo ==========================================
echo.

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Python，请先安装 Python 3.8+
    echo    下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "delims=" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo ✅ %PYVER%

:: 检查 pip
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip 不可用
    pause
    exit /b 1
)
echo ✅ pip 可用

:: 安装依赖
echo.
echo 📦 正在安装依赖...
python -m pip install customtkinter pyinstaller --quiet --break-system-packages
if errorlevel 1 (
    python -m pip install customtkinter pyinstaller --quiet
)
echo ✅ 依赖安装完成

:: 打包
echo.
echo 🔨 正在打包（首次可能需要3-5分钟）...
python -m PyInstaller vault-web.spec --noconfirm
if errorlevel 1 (
    echo ❌ 打包失败，尝试清理后重试...
    rmdir /s /q build dist __pycache__ 2>nul
    python -m PyInstaller vault-web.spec --noconfirm
)

echo.
echo ==========================================
echo ✅ 打包完成！
echo.
echo 输出目录: dist\林途知识进化系统\
echo.
echo 使用方式:
echo   1. 把整个 dist\林途知识进化系统\ 文件夹分享出去
echo   2. 接收者双击 "林途知识进化系统.exe" 即可运行
echo   3. 首次运行需要输入密令: lintu
echo ==========================================
pause
