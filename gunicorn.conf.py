# Gunicorn 生产配置
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "config.json"

try:
    _cfg = json.loads(CONFIG_FILE.read_text())
    BIND = f"0.0.0.0:{_cfg.get('port', 8765)}"
except Exception:
    BIND = "0.0.0.0:8765"

bind = BIND
workers = 2
worker_class = "sync"
timeout = 30
keepalive = 5
accesslog = "vault-web.log"
errorlog = "vault-web.log"
loglevel = "info"
capture_output = True
