"""Quick check that Alpaca paper-trading keys work. No extra packages needed."""
import json
import os
import urllib.error
import urllib.request

# Load .env from the project root (one level above scripts/)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

KEY = os.environ.get("APCA_API_KEY_ID", "")
SECRET = os.environ.get("APCA_API_SECRET_KEY", "")
BASE_URL = os.environ.get("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")

if not KEY or not SECRET or "paste" in KEY or "paste" in SECRET:
    raise SystemExit("Put your real keys in .env first (APCA_API_KEY_ID / APCA_API_SECRET_KEY).")

req = urllib.request.Request(
    f"{BASE_URL}/v2/account",
    headers={"APCA-API-KEY-ID": KEY, "APCA-API-SECRET-KEY": SECRET},
)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        acct = json.load(resp)
except urllib.error.HTTPError as e:
    body = e.read().decode(errors="replace")
    if e.code in (401, 403):
        raise SystemExit(
            f"Auth failed ({e.code}): {body}\n"
            "- Keys must be from the PAPER account (key starts with PK)\n"
            "- Regenerate keys if the secret was lost; no spaces/quotes around values"
        )
    raise SystemExit(f"HTTP {e.code}: {body}")

print("Connected to Alpaca!")
print(f"  Account status : {acct['status']}")
print(f"  Cash           : ${float(acct['cash']):,.2f}")
print(f"  Buying power   : ${float(acct['buying_power']):,.2f}")
