#!/usr/bin/env python3
"""One-file test for uploading a PNG to eqlwiki via the MediaWiki API.

Usage:
    .venv/bin/python wiki_upload_test.py LOCAL_FILE TARGET_NAME

Examples:
    # Sandbox-style test that's easy to delete afterwards:
    .venv/bin/python wiki_upload_test.py docs/data/wiki/icons/icon_0004.png Test_Spellicon_4.png

    # The real thing (only do this once we've confirmed the test works):
    .venv/bin/python wiki_upload_test.py docs/data/wiki/icons/icon_0004.png Spellicon_4.png

Credentials: either set WIKI_USER + WIKI_PASS in the environment, or you'll
be prompted. For scripted use, generate a bot password at
Special:BotPasswords on eqlwiki — the resulting credentials look like
"YourName@BotName" + a generated password and are scoped to specific
permissions (give it at least "Edit existing pages" and "Create, edit, and
move pages"; for upload, "Upload new files" is needed too).
"""
import argparse, getpass, json, os, sys
import requests

API = "https://eqlwiki.com/api.php"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("local_file", help="path to local PNG to upload")
    ap.add_argument("target_name", help="filename on the wiki (without 'File:' prefix), e.g. Test_Spellicon_4.png")
    ap.add_argument("--api", default=API, help=f"MediaWiki API endpoint (default: {API})")
    ap.add_argument("--user", default=os.environ.get("WIKI_USER"),
                    help="username (or set WIKI_USER env var). For bot passwords: 'YourName@BotName'")
    ap.add_argument("--password", default=os.environ.get("WIKI_PASSWORD") or os.environ.get("WIKI_PASS"),
                    help="password (or set WIKI_PASSWORD / WIKI_PASS env var)")
    ap.add_argument("--comment", default="EQL icon migration — test upload",
                    help="upload comment / edit summary")
    args = ap.parse_args()

    if not os.path.exists(args.local_file):
        sys.exit(f"local file not found: {args.local_file}")

    user = args.user or input("Wiki username (or BotName format): ")
    pw   = args.password or getpass.getpass("Password: ")

    s = requests.Session()
    s.headers["User-Agent"] = "EQL-icon-upload-test/1.0 (icon-migration)"

    # 1) Login token
    print("• fetching login token ...", end=" ", flush=True)
    r = s.get(args.api, params={"action": "query", "meta": "tokens",
                                "type": "login", "format": "json"}, timeout=20)
    r.raise_for_status()
    login_token = r.json()["query"]["tokens"]["logintoken"]
    print("ok")

    # 2) Login
    print(f"• logging in as {user!r} ...", end=" ", flush=True)
    r = s.post(args.api, data={"action": "login",
                               "lgname": user, "lgpassword": pw,
                               "lgtoken": login_token, "format": "json"}, timeout=20)
    r.raise_for_status()
    login = r.json().get("login", {})
    if login.get("result") != "Success":
        print("FAILED")
        print("  response:", json.dumps(r.json(), indent=2))
        print("\nNote: if you got 'Aborted' / 'WrongToken' / similar with a normal account,"
              "\nMediaWiki may require a bot password. Generate one at:"
              "\n  https://eqlwiki.com/index.php/Special:BotPasswords"
              "\nThen pass it as 'YourUsername@BotName' + the generated token.")
        sys.exit(1)
    print(f"ok (as {login.get('lgusername')})")

    # 3) CSRF token
    print("• fetching CSRF token ...", end=" ", flush=True)
    r = s.get(args.api, params={"action": "query", "meta": "tokens",
                                "format": "json"}, timeout=20)
    r.raise_for_status()
    csrf = r.json()["query"]["tokens"]["csrftoken"]
    if csrf == "+\\":
        sys.exit("got the anonymous CSRF token — login didn't actually take effect")
    print("ok")

    # 4) Upload
    print(f"• uploading {args.local_file} → File:{args.target_name} ...", flush=True)
    with open(args.local_file, "rb") as f:
        r = s.post(args.api, data={
            "action": "upload",
            "filename": args.target_name,
            "token": csrf,
            "comment": args.comment,
            "ignorewarnings": "1",   # overwrite if exists; remove if you want to be strict
            "format": "json",
        }, files={"file": (args.target_name, f, "image/png")}, timeout=60)
    r.raise_for_status()
    body = r.json()

    upload = body.get("upload", {})
    result = upload.get("result")
    if result == "Success":
        ii = upload.get("imageinfo", {})
        print(f"\n  SUCCESS")
        print(f"  File page: {ii.get('descriptionurl')}")
        print(f"  Direct:    {ii.get('url')}")
        print(f"  Size:      {ii.get('size')} bytes  ({ii.get('width')}x{ii.get('height')})")
    elif result == "Warning":
        # MediaWiki upload "Warning" means it was rejected because of duplicates etc.
        # With ignorewarnings=1 above this normally doesn't happen — if it does, show
        # what the warnings were.
        print(f"\n  WARNING (rejected): {json.dumps(upload.get('warnings', {}), indent=2)}")
        sys.exit(2)
    else:
        print(f"\n  UNEXPECTED RESULT: {result}")
        print(json.dumps(body, indent=2))
        sys.exit(3)


if __name__ == "__main__":
    main()
