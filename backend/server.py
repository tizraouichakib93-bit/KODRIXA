#!/usr/bin/env python3
"""KODRIXA server — static site + secure same-origin AI proxy (stdlib only).

Run (from the repository root):
    python backend/server.py

Live AI (optional): set these in the SERVER environment, never in frontend code:
    KODRIXA_API_KEY   provider API key (required for live mode)
    KODRIXA_API_BASE  OpenAI-compatible base URL (default https://api.openai.com/v1)
    KODRIXA_MODEL     model name (default gpt-4o-mini)
    KODRIXA_HOST      bind address (default 127.0.0.1)
    KODRIXA_PORT      port (default 8000)

Without a key the site runs in clearly-labelled demo mode using the bundled
browser engine. The key is read from the environment at request time and is
never written to disk, logged, or sent to the client.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Serve the frontend from ../docs (repo root/docs), regardless of the
# directory the server is launched from.
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs"))
MAX_BODY = 1024 * 1024  # 1 MB request cap
PROVIDER_TIMEOUT = 60
OPS = ("generate", "translate", "debug", "explain")

SYSTEM_PROMPTS = {
    "generate": (
        "You are KODRIXA's code generator. Given a natural-language description and a target "
        "programming language, write a complete, correct, runnable program that fulfils the "
        "description. Respond with ONLY a JSON object: {\"code\": \"<full program>\", "
        "\"notes\": [\"<short note about decisions>\"]}. No markdown fences, no commentary."
    ),
    "translate": (
        "You are KODRIXA's code translator. Translate the source code from the source language "
        "to the target language, preserving behaviour. Respond with ONLY a JSON object: "
        "{\"code\": \"<translated program>\", \"limitations\": [\"<anything that could not be "
        "converted accurately>\"], \"note\": \"<one short sentence>\"}. If an accurate translation "
        "is impossible, return an empty code string and explain why in limitations. No markdown fences."
    ),
    "debug": (
        "You are KODRIXA's code debugger. Find syntax errors and obvious static issues in the code. "
        "Respond with ONLY a JSON object: {\"issues\": [{\"line\": <1-based int>, \"severity\": "
        "\"error\"|\"warning\", \"title\": \"<short>\", \"detail\": \"<explanation + fix>\"}], "
        "\"fixedCode\": \"<corrected full code, or the original if no fix is needed>\"}. No markdown fences."
    ),
    "explain": (
        "You are KODRIXA's code explainer. Explain the code line by line for a beginner. "
        "Respond with ONLY a JSON object: {\"items\": [{\"line\": <1-based int>, \"code\": \"<the line>\", "
        "\"text\": \"<plain-language explanation>\", \"tag\": \"<category e.g. Loop, Variable, Output>\"}], "
        "\"summary\": \"<one or two sentence overview>\"}. Cover every non-empty line. No markdown fences."
    ),
}


def configured():
    return bool(os.environ.get("KODRIXA_API_KEY", "").strip())


def strip_fences(text):
    t = text.strip()
    m = re.match(r"^```[a-zA-Z0-9_+-]*\s*\n([\s\S]*?)\n?```$", t)
    return m.group(1) if m else t


def parse_json_content(content):
    """Models sometimes wrap JSON in fences or prose; recover the object."""
    t = strip_fences(content)
    try:
        return json.loads(t)
    except (ValueError, TypeError):
        pass
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(t[start:end + 1])
        except ValueError:
            pass
    return None


def call_provider(op, payload):
    key = os.environ.get("KODRIXA_API_KEY", "").strip()
    base = os.environ.get("KODRIXA_API_BASE", "https://api.openai.com/v1").rstrip("/")
    model = os.environ.get("KODRIXA_MODEL", "gpt-4o-mini")
    user_content = json.dumps(payload, ensure_ascii=False)
    body = json.dumps({
        "model": model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPTS[op]},
            {"role": "user", "content": user_content},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        base + "/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=PROVIDER_TIMEOUT) as res:
        data = json.loads(res.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    parsed = parse_json_content(content)
    if parsed is None:
        # Generation/translation may legitimately return bare code.
        if op in ("generate", "translate"):
            return {"code": strip_fences(content)}
        raise ValueError("The model returned an unrecognised response format.")
    return parsed


def normalize(op, result):
    """Coerce provider output into the exact shapes the frontend expects."""
    if op == "generate":
        return {"code": str(result.get("code", "")), "notes": list(result.get("notes", []))}
    if op == "translate":
        return {
            "code": str(result.get("code", "")),
            "limitations": [str(x) for x in result.get("limitations", [])],
            "note": str(result.get("note", "")),
        }
    if op == "debug":
        issues = []
        for it in result.get("issues", []):
            issues.append({
                "line": int(it.get("line", 0) or 0),
                "severity": "warning" if str(it.get("severity", "error")).lower() == "warning" else "error",
                "title": str(it.get("title", "Issue")),
                "detail": str(it.get("detail", "")),
            })
        return {"issues": issues, "fixedCode": str(result.get("fixedCode", ""))}
    items = []
    for it in result.get("items", []):
        items.append({
            "line": int(it.get("line", 0) or 0),
            "code": str(it.get("code", "")),
            "text": str(it.get("text", "")),
            "tag": str(it.get("tag", "Step")),
        })
    return {"items": items, "summary": str(result.get("summary", ""))}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[kodrixa] %s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _blocked_static(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        parts = [p for p in path.split("/") if p]
        if any(p.startswith(".") for p in parts):
            return True
        return path.lower().endswith((".py", ".pyc", ".env", ".key", ".pem"))

    def list_directory(self, path):
        self.send_error(404, "Directory listing is disabled")
        return None

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/health":
            self._send_json({
                "configured": configured(),
                "model": os.environ.get("KODRIXA_MODEL", "gpt-4o-mini") if configured() else None,
                "mode": "live" if configured() else "demo",
            })
            return
        if path.startswith("/api/"):
            self._send_json({"error": "Unknown API endpoint."}, 404)
            return
        if self._blocked_static():
            self.send_error(403, "This file is not served")
            return
        super().do_GET()

    def do_HEAD(self):
        if self._blocked_static() or self.path.split("?", 1)[0].startswith("/api/"):
            self.send_error(403, "Not served")
            return
        super().do_HEAD()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if not path.startswith("/api/"):
            self._send_json({"error": "Unknown endpoint."}, 404)
            return
        op = path[len("/api/"):]
        if op not in OPS:
            self._send_json({"error": "Unknown API operation."}, 404)
            return
        if not configured():
            self._send_json({"error": "Live AI is not configured. Set KODRIXA_API_KEY on the server; the site is running in demo mode."}, 503)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._send_json({"error": "Request body missing or too large (1 MB max)."}, 400)
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError
        except (ValueError, UnicodeDecodeError):
            self._send_json({"error": "Invalid JSON body."}, 400)
            return
        try:
            result = call_provider(op, payload)
            self._send_json(normalize(op, result))
        except urllib.error.HTTPError as e:
            # Never echo provider bodies (they can contain account details).
            self._send_json({"error": "The AI provider rejected the request (HTTP %d). Check the server key, base URL and model." % e.code}, 502)
        except urllib.error.URLError:
            self._send_json({"error": "Could not reach the AI provider. Check KODRIXA_API_BASE and your network."}, 502)
        except (KeyError, IndexError, ValueError, TimeoutError, OSError):
            self._send_json({"error": "The AI provider returned an unexpected response. Try again or check the model setting."}, 502)


def main():
    host = os.environ.get("KODRIXA_HOST", "127.0.0.1")
    port = int(os.environ.get("KODRIXA_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), Handler)
    state = "LIVE AI configured" if configured() else "DEMO mode (set KODRIXA_API_KEY for live AI)"
    print("KODRIXA serving %s at http://%s:%d  [%s]" % (ROOT, host, port, state))
    print("Provider key is read from the environment and never sent to the browser.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()