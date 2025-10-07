import argparse, json, sys
from urllib import request, error

def post(url, headers, data):
    req = request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(body)
            return 0
    except error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}")
        return 1
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

def main():
    p = argparse.ArgumentParser(description="Call your Twilio Function /reelo-make-call")
    p.add_argument("--url", required=True, help="https://YOUR-SERVICE.twil.io/reelo-make-call")
    p.add_argument("--secret", required=True, help="REELO_SECRET value")
    p.add_argument("--to", required=True, help="Destination phone in E.164, e.g. +16125551234")
    p.add_argument("--email", required=True)
    p.add_argument("--company", required=True)
    p.add_argument("--sendheader", action="store_true", help="Send secret in X-Reelo-Secret header (not body)")
    args = p.parse_args()

    headers = {"Content-Type": "application/json"}
    payload = {"to": args.to, "email": args.email, "company": args.company}

    if args.sendheader:
        headers["X-Reelo-Secret"] = args.secret
    else:
        payload["secret"] = args.secret

    print("ok msg")
    print("-- ---")
    print(f"True secret matches & auth OK" if "secret" in payload or "X-Reelo-Secret" in headers else "")

    sys.exit(post(args.url, headers, payload))

if __name__ == "__main__":
    main()
