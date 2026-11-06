"""Deploy a Wrangler dry-run bundle through the official Cloudflare API.

Run inside `pplx credentials run` with the Cloudflare host credential. To provision
the first owner, also select the site's Basic credential and --setup-owner.
Secrets and upload JWTs stay in process memory and are never logged or saved.
This maintenance tool is not part of the application or its production build.
"""
import argparse
import base64
import json
import mimetypes
from pathlib import Path
import secrets
import subprocess
import time
import requests

parser = argparse.ArgumentParser()
parser.add_argument("--account-id", required=True)
parser.add_argument("--worker", required=True)
parser.add_argument("--bundle", required=True)
parser.add_argument("--assets", required=True)
parser.add_argument("--site", required=True)
parser.add_argument("--setup-owner", action="store_true")
args = parser.parse_args()
base = f"https://api.cloudflare.com/client/v4/accounts/{args.account_id}"
script = f"{base}/workers/scripts/{args.worker}"
session = requests.Session()  # Uses the credential proxy, not a raw API token.


def api(method, url, **kwargs):
    response = session.request(method, url, timeout=120, **kwargs)
    data = response.json()
    if not response.ok or not data.get("success"):
        # Cloudflare error messages are safe metadata; never print request data.
        codes = [(item.get("code"), item.get("message")) for item in data.get("errors", [])]
        raise RuntimeError(f"Cloudflare API {response.status_code}: {codes}")
    return data["result"]


asset_dir = Path(args.assets).resolve()
files = {"/" + str(p.relative_to(asset_dir)).replace("\\", "/"): str(p) for p in asset_dir.rglob("*")
         if p.is_file() and p.name not in ("_headers", "_redirects", ".assetsignore")}
hash_script = """
const fs = require('node:fs'), path = require('node:path'), b3 = require('blake3-wasm');
const files = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(files).map(([url, file]) => {
  const body = fs.readFileSync(file);
  return [url, {hash:b3.hash(body.toString('base64') + path.extname(file).slice(1)).toString('hex').slice(0,32),size:body.length}];
}))));
"""
manifest = json.loads(subprocess.run(["node", "-e", hash_script], input=json.dumps(files),
                                     text=True, capture_output=True, check=True).stdout)
settings = api("GET", script + "/settings")
upload = api("POST", script + "/assets-upload-session", json={"manifest": manifest})
by_hash = {entry["hash"]: files[url] for url, entry in manifest.items()}
completion = upload["jwt"]
# These short-lived upload JWTs are returned by Cloudflare for this asset session.
# They are NOT the user's credential. Use the JWT directly as the API requires;
# the user-credential proxy would otherwise replace its Authorization header.
upload_session = requests.Session()
upload_session.trust_env = False
for bucket in upload["buckets"]:
    form = {}
    for digest in bucket:
        file = Path(by_hash[digest])
        mime = mimetypes.guess_type(str(file))[0] or "application/octet-stream"
        form[digest] = (digest, base64.b64encode(file.read_bytes()), mime)
    response = upload_session.post(base + "/workers/assets/upload?base64=true", files=form,
                                   headers={"Authorization": "Bearer " + upload["jwt"]}, timeout=120)
    result = response.json()
    if not response.ok or not result.get("success"):
        raise RuntimeError(f"Asset upload failed: HTTP {response.status_code}; no credential details logged.")
    completion = result["result"].get("jwt") or completion
    print(f"Uploaded {len(bucket)} changed static assets.")

setup_key = secrets.token_urlsafe(48) if args.setup_owner else None
try:
    if setup_key:
        api("PUT", script + "/secrets", json={"name": "ADMIN_SETUP_KEY", "text": setup_key, "type": "secret_text"})
    bindings = [binding for binding in settings["bindings"] if binding["type"] not in ("secret_text", "secret_key")]
    config = {
        "html_handling": "none",
        "run_worker_first": ["/api/*", "/media/*", "/admin", "/admin/", "/healthz"],
        "_headers": (asset_dir / "_headers").read_text(),
    }
    metadata = {
        "main_module": "worker.js", "compatibility_date": "2026-11-06",
        "compatibility_flags": ["nodejs_compat"], "bindings": bindings,
        "keep_bindings": ["secret_text", "secret_key"],
        "assets": {"jwt": completion, "config": config},
        "code_update_strategy": {"mode": "immediate"},
    }
    result = api("PUT", script, files={
        "metadata": (None, json.dumps(metadata), "application/json"),
        "worker.js": ("worker.js", Path(args.bundle).read_bytes(), "application/javascript+module"),
    })
    print("Deployed Worker:", args.worker)
    if setup_key:
        deadline = time.monotonic() + 120
        while True:
            response = session.post(args.site.rstrip("/") + "/api/admin/bootstrap",
                                    headers={"X-Setup-Key": setup_key}, timeout=30)
            if response.status_code in (200, 409):
                break
            if response.status_code not in (403, 404, 502, 503):
                error = response.json().get("error", {})
                raise RuntimeError(f"Owner setup failed: HTTP {response.status_code}; {error.get('code', 'unknown')}. No credentials logged.")
            if time.monotonic() > deadline:
                raise RuntimeError(f"Owner setup unavailable: HTTP {response.status_code}. No credentials logged.")
            time.sleep(2)
        response = session.post(args.site.rstrip("/") + "/api/admin/login", timeout=30)
        if not response.ok:
            raise RuntimeError(f"Owner sign-in verification failed: HTTP {response.status_code}.")
        owner = response.json()["user"]
        print("Owner sign-in verified:", owner["email"])
        response = session.get(args.site.rstrip("/") + "/api/admin/me", timeout=30)
        if not response.ok:
            raise RuntimeError("Owner session verification failed.")
        print("Authenticated owner session verified.")
finally:
    if setup_key:
        api("DELETE", script + "/secrets/ADMIN_SETUP_KEY")
        print("Removed the one-time owner-setup secret.")
