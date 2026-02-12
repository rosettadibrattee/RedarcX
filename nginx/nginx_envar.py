import os

REDARC_API = os.environ['REDARC_API']
SERVER_NAME = os.environ['SERVER_NAME']
API_UPSTREAM = os.getenv('API_UPSTREAM', 'http://127.0.0.1:18000')
with open("redarc_original.conf") as f:
    newText=f.read().replace('$REDARC_API', REDARC_API)
    newText=newText.replace('$SERVER_NAME', SERVER_NAME)
    newText=newText.replace('$API_UPSTREAM', API_UPSTREAM)

with open("redarc.conf", "w") as f:
    f.write(newText)
