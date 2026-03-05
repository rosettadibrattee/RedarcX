import os
from urllib.parse import urlparse


def _normalized_base_url(url):
    if not url:
        return None
    value = url.strip().rstrip("/")
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return None


render_external = _normalized_base_url(os.getenv("RENDER_EXTERNAL_URL"))
redarc_api = os.getenv("REDARC_API")
if redarc_api:
    REDARC_API = redarc_api.rstrip("/")
elif render_external:
    REDARC_API = f"{render_external}/api"
else:
    REDARC_API = "http://localhost/api"

server_name = os.getenv("SERVER_NAME")
if server_name:
    SERVER_NAME = server_name
elif os.getenv("RENDER_EXTERNAL_HOSTNAME"):
    SERVER_NAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")
elif render_external:
    SERVER_NAME = urlparse(render_external).hostname or "_"
else:
    SERVER_NAME = "_"

API_UPSTREAM = os.getenv("API_UPSTREAM", "http://127.0.0.1:18000")

with open("redarc_original.conf", encoding="utf-8") as f:
    new_text = f.read().replace("$REDARC_API", REDARC_API)
    new_text = new_text.replace("$SERVER_NAME", SERVER_NAME)
    new_text = new_text.replace("$API_UPSTREAM", API_UPSTREAM)

with open("redarc.conf", "w", encoding="utf-8") as f:
    f.write(new_text)
