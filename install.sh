#!/bin/bash
set -e

echo "=========================================="
echo "   Vault Web 安装脚本 v3.0"
echo "=========================================="

# ── 1. 检查 Python 版本 ──
PYTHON_MIN="3.8"
PYTHON_CMD="${PYTHON_CMD:-python3}"
PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(".".join(map(str, sys.version_info[:3])))')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
PYTHON_OK=false
if [ "$PYTHON_MAJOR" -gt 3 ] || [ "$PYTHON_MAJOR" -eq 3 -a "$PYTHON_MINOR" -ge 8 ]; then
    PYTHON_OK=true
fi
if [ "$PYTHON_OK" = false ]; then
    echo "❌ 需要 Python 3.8+，当前版本: $PYTHON_VERSION"
    exit 1
fi
echo "✅ Python 版本: $PYTHON_VERSION"

# ── 2. 检查 pip ──
if ! $PYTHON_CMD -m pip --version > /dev/null 2>&1; then
    echo "❌ 未找到 pip，请先安装: python3 -m ensurepip --upgrade"
    exit 1
fi
echo "✅ pip 可用"

# ── 3. 安装依赖 ──
echo "📦 安装 Python 依赖..."
$PYTHON_CMD -m pip install -r requirements.txt --quiet
echo "✅ 依赖安装完成"

# ── 4. 收集配置 ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.json"

read -p "Vault 目录路径 [默认: $SCRIPT_DIR/../OBScangku]: " VAULT_PATH
VAULT_PATH=${VAULT_PATH:-$SCRIPT_DIR/../OBScangku}

if ! [ -d "$VAULT_PATH" ]; then
    echo "❌ 目录不存在: $VAULT_PATH"
    exit 1
fi

read -p "服务端口 [默认: 8765]: " PORT
PORT=${PORT:-8765}

read -p "登录账号 [默认: admin]: " USERNAME
USERNAME=${USERNAME:-admin}

read -s -p "登录密码: " PASSWORD
echo ""
if [ -z "$PASSWORD" ]; then
    echo "❌ 密码不能为空"
    exit 1
fi

# ── 5. 写入 config.json ──
cat > "$CONFIG_FILE" << EOF
{
  "vault": "$VAULT_PATH",
  "port": $PORT,
  "host": "0.0.0.0",
  "username": "$USERNAME",
  "password": "$PASSWORD"
}
EOF
echo "✅ 配置文件已写入: $CONFIG_FILE"

# ── 6. systemd 服务安装 ──
read -p "是否安装为开机自启服务？(y/N): " DO_INSTALL
if [ "$DO_INSTALL" = "y" ] || [ "$DO_INSTALL" = "Y" ]; then
    CURRENT_USER=$(whoami)
    SERVICE_FILE="$SCRIPT_DIR/vault-web.service"

    # 动态替换 User/WorkingDirectory/ExecStart
    sudo sed -e "s/__USER__/$CURRENT_USER/g" \
             -e "s#__DIR__#$SCRIPT_DIR#g" \
             "$SERVICE_FILE" > /tmp/vault-web.service
    sudo cp /tmp/vault-web.service /etc/systemd/system/vault-web.service
    sudo systemctl daemon-reload
    sudo systemctl enable vault-web
    sudo systemctl start vault-web
    echo "✅ systemd 服务已安装并启动"
    echo "   查看状态: sudo systemctl status vault-web"
    echo "   查看日志: sudo journalctl -u vault-web -f"
else
    echo ""
    echo "=========================================="
    echo "✅ 安装完成！"
    echo ""
    echo "启动服务: ./manage.sh start"
    echo "访问地址: http://localhost:$PORT"
    echo ""
    echo "服务管理: ./manage.sh {start|stop|restart|status|log}"
    echo "=========================================="
fi
