#!/bin/bash
# vault-web 服务管理脚本
# 用法: ./manage.sh {start|stop|restart|status|log|install|uninstall}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/vault-web.pid"
LOG_FILE="$SCRIPT_DIR/vault-web.log"
SERVICE_FILE="$SCRIPT_DIR/vault-web.service"
SERVICE_NAME="vault-web"

_is_running() {
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

case "$1" in
  start)
    if _is_running; then
        echo "服务已在运行 (PID $(cat "$PID_FILE"))"
        exit 0
    fi
    nohup gunicorn -c gunicorn.conf.py app:app >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    if _is_running; then
        echo "✅ 服务已启动 (PID $(cat "$PID_FILE"))"
    else
        echo "❌ 启动失败，查看日志: tail -f $LOG_FILE"
        exit 1
    fi
    ;;

  stop)
    if _is_running; then
        kill "$(cat "$PID_FILE")" && rm -f "$PID_FILE"
        echo "🛑 服务已停止"
    else
        echo "服务未运行"
        rm -f "$PID_FILE"
    fi
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;

  status)
    if _is_running; then
        echo "✅ 运行中 (PID $(cat "$PID_FILE"))"
    else
        echo "🔴 未运行"
    fi
    ;;

  log)
    tail -f "$LOG_FILE"
    ;;

  install)
    # 安装 systemd 服务（需要 sudo）
    sudo cp "$SERVICE_FILE" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl start "$SERVICE_NAME"
    echo "✅ systemd 服务已安装并启动"
    echo "   查看状态: sudo systemctl status $SERVICE_NAME"
    echo "   查看日志: sudo journalctl -u $SERVICE_NAME -f"
    ;;

  uninstall)
    sudo systemctl stop "$SERVICE_NAME" 2>/dev/null
    sudo systemctl disable "$SERVICE_NAME" 2>/dev/null
    sudo rm -f /etc/systemd/system/"$SERVICE_NAME".service
    sudo systemctl daemon-reload
    echo "🗑️  systemd 服务已卸载"
    ;;

  *)
    echo "用法: $0 {start|stop|restart|status|log|install|uninstall}"
    echo ""
    echo "  start      后台启动服务"
    echo "  stop       停止服务"
    echo "  restart    重启服务"
    echo "  status     查看运行状态"
    echo "  log        实时查看日志"
    echo "  install    安装为 systemd 服务（开机自启）"
    echo "  uninstall  卸载 systemd 服务"
    exit 1
    ;;
esac
