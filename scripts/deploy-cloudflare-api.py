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
parser.add_argument("--verify-owner", action="store_true", help="Verify sign-in using the saved Farfalli Basic credential")
parser.add_argument("--expect-version", required=True, help="Abort if production has changed")
parser.add_argument("--local-smoke", help="Loopback URL for the same build when Cloudflare doesn't provide a version URL")
args = parser.parse_args()
if args.worker != "l" or args.site.rstrip("/") != "https://l.lmitcafe.workers.dev":
    parser.error("This deployment branch can target only the Farfalli café Worker, not the POS.")
if args.local_smoke and not args.local_smoke.startswith("http://127.0.0.1:"):
    parser.error("The local smoke check must target a loopback server.")
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
by_hash = {entry["hash"]: files[url] for url, entry in manifest.items()}
# These short-lived upload JWTs are returned by Cloudflare for this asset session.
# They are NOT the user's credential. Use the JWT directly as the API requires;
# the user-credential proxy would otherwise replace its Authorization header.
upload_session = requests.Session()
upload_session.trust_env = False


def active():
    deployments = api("GET", script + "/deployments")["deployments"]
    versions = deployments[0]["versions"]
    if len(versions) != 1 or versions[0]["percentage"] != 100:
        raise RuntimeError("Production has a gradual deployment. No changes made.")
    return versions[0]["version_id"]


def require_active(version):
    if active() != version:
        raise RuntimeError("The active Worker version changed unexpectedly. Refusing to overwrite it.")


def deploy(version, message):
    result = api("POST", script + "/deployments", json={
        "strategy": "percentage", "versions": [{"version_id": version, "percentage": 100}],
        "annotations": {"workers/message": message}, "code_update_strategy": {"mode": "immediate"},
    })
    print(f"Deployed {version}: {result['id']}", flush=True)


def upload_version(bindings):
    upload = api("POST", script + "/assets-upload-session", json={"manifest": manifest})
    completion = upload["jwt"]
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
        print(f"Uploaded {len(bucket)} changed static assets.", flush=True)
    config = {
        "html_handling": "none",
        "run_worker_first": ["/api/*", "/media/*", "/admin", "/admin/", "/healthz"],
        "_headers": (asset_dir / "_headers").read_text(),
    }
    metadata = {
        "main_module": "worker.js", "compatibility_date": "2026-11-06",
        "compatibility_flags": ["nodejs_compat"], "bindings": bindings,
        "assets": {"jwt": completion, "config": config},
    }
    result = api("POST", script + "/versions", params={"bindings_inherit": "strict"}, files={
        "metadata": (None, json.dumps(metadata), "application/json"),
        "worker.js": ("worker.js", Path(args.bundle).read_bytes(), "application/javascript+module"),
    })
    print(f"Uploaded inactive version {result['id']}.", flush=True)
    return result["id"]


def verify_public(site):
    for path, marker in [
        ("/healthz", "ok"), ("/", "فارفيلي"), ("/en", "hero-location"),
        ("/menu", "كابتشينو"), ("/en/menu", "Neapolitan Margherita"),
        ("/screen", "screen-fullscreen"), ("/admin", "Farfalli Admin"),
    ]:
        response = upload_session.get(site + path, timeout=15, allow_redirects=False)
        if response.status_code != 200 or marker not in response.text:
            raise RuntimeError(f"Verification failed on {path}: HTTP {response.status_code}.")
    site_data = upload_session.get(site + "/api/site", timeout=15)
    site_data.raise_for_status()
    data = site_data.json()
    if data["business"]["name_en"] != "Farfalli" or data["orders"]["enabled"]:
        raise RuntimeError("Unexpected site identity or order configuration.")
    image = data["hero"]["image"]
    photo = upload_session.get(f"{site}/media/{image['key']}-orig.{image['ext']}", timeout=15)
    if photo.status_code != 200 or not photo.content.startswith(b"RIFF") or image["w"] < 1920 or image["h"] < 1080:
        raise RuntimeError("The Full HD hero photo did not verify.")


def verify_owner():
    login = session.post(args.site + "/api/admin/login", timeout=30)
    if not login.ok or "farfalli_sid" not in login.cookies or not login.json().get("user"):
        raise RuntimeError(f"Farfalli owner sign-in verification failed: HTTP {login.status_code}.")
    response = session.get(args.site + "/api/admin/me", timeout=30)
    if not response.ok or response.json().get("user") != login.json()["user"]:
        raise RuntimeError("Farfalli owner session verification failed.")
    print("Farfalli owner sign-in and authenticated session verified.", flush=True)


def await_public(site):
    for attempt in range(5):
        try:
            verify_public(site)
            return
        except (RuntimeError, requests.RequestException):
            if attempt == 4:
                raise
            time.sleep(3)


def release_resources(version):
    return api("GET", f"{script}/versions/{version}")


def version_bindings(data):
    return {b["name"]: b for b in data["resources"]["bindings"]}


require_active(args.expect_version)
original = release_resources(args.expect_version)
names = version_bindings(original)
if names.get("CAFE", {}).get("namespace_id") != "c609af0928004dbf9f748dbae99aa5d0":
    raise RuntimeError("The original café Durable Object namespace does not match. No changes made.")
if "FARFALLI_SETUP_KEY" in names:
    raise RuntimeError("An earlier setup key is still active. Resolve it before deploying.")
bindings = [
    {"name": b["name"], "type": "inherit"} if b["type"] in ("secret_text", "secret_key") else b
    for b in names.values()
]
active_attempt = None
try:
    release = upload_version(bindings)
    version = release_resources(release)
    resources = version["resources"]
    uploaded = version_bindings(version)
    if uploaded.get("CAFE") != names["CAFE"] or resources["script_runtime"].get("migration_tag") != "v1":
        raise RuntimeError("The inactive release does not preserve the existing café binding and migration tag.")
    if version["metadata"].get("has_preview"):
        await_public(f"https://{release[:8]}-l.lmitcafe.workers.dev")
        print("Inactive production version passed public smoke checks.", flush=True)
    elif args.local_smoke:
        await_public(args.local_smoke.rstrip("/"))
        print("Cloudflare did not generate a version URL. Checked the inactive release binding and smoke-tested the matching local build.", flush=True)
    else:
        raise RuntimeError("No Cloudflare version URL is available. Pass --local-smoke with the matching Wrangler build.")
    if args.setup_owner:
        key = secrets.token_urlsafe(48)
        setup = upload_version([*bindings, {"name": "FARFALLI_SETUP_KEY", "type": "secret_text", "text": key}])
        require_active(args.expect_version)
        active_attempt = setup
        deploy(setup, "Farfalli: provision the isolated café owner")
        await_public(args.site)
        response = session.post(args.site + "/api/admin/bootstrap", headers={"X-Setup-Key": key}, timeout=30)
        if response.status_code not in (200, 409):
            raise RuntimeError(f"Farfalli owner setup failed: HTTP {response.status_code}.")
        verify_owner()
    require_active(active_attempt or args.expect_version)
    active_attempt = release
    deploy(release, "Farfalli: Full HD café and separate owner dashboard")
    require_active(release)
    await_public(args.site)
    if args.setup_owner or args.verify_owner:
        verify_owner()
    # The script-level settings can describe the latest uploaded version, not
    # the actively deployed version. Verify the confirmed release directly.
    current_bindings = version_bindings(release_resources(release))
    if "FARFALLI_SETUP_KEY" in current_bindings or current_bindings.get("CAFE") != names["CAFE"]:
        raise RuntimeError("Production setup key or Durable Object binding did not verify.")
    print("Verified final production release without the one-time setup binding.", flush=True)
except Exception:
    if active_attempt and active() == active_attempt:
        deploy(args.expect_version, "Rollback: Farfalli verification failed")
        require_active(args.expect_version)
    raise
