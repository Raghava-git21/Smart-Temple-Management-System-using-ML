import cv2
from fastapi import FastAPI, Response, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from main import TempleCounter
import threading
import json
import uvicorn
import os
import argparse
import sqlite3
import time

parser = argparse.ArgumentParser(description="Temple Counter API Server")
parser.add_argument("--port", type=int, default=8000, help="Port to run the server on")
parser.add_argument("--sources", type=str, default="", help="Comma-separated video sources (Default: empty)")
parser.add_argument("--temple", type=str, required=True, help="Temple name for identification")
args = parser.parse_args()

# Split sources by comma
source_list = [s.strip() for s in args.sources.split(",")] if args.sources else []

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FIREBASE SETUP ---
import firebase_admin
from firebase_admin import credentials, db

FIREBASE_DB_URL = "https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app"
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "serviceAccount.json")

# Use service account from parking if not in current dir
if not os.path.exists(SERVICE_ACCOUNT_PATH):
    SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Temple parking using cctv", "backend", "serviceAccount.json")

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})
        print(f"✅ Firebase initialized for Counter: {args.temple}")
    except Exception as e:
        print(f"⚠️ Firebase Error: {e}")
        print(f"🔍 Looked for serviceAccount at: {SERVICE_ACCOUNT_PATH}")

# Initialize TempleCounter with initial sources
tc = TempleCounter(sources=source_list)

def on_config_change(event):
    new_sources = event.data if event.data else []
    print(f"🔔 Config Change Detected: {new_sources}")
    try:
        with open("config_updates.log", "a") as f:
            f.write(f"[{time.ctime()}] New sources: {new_sources}\n")
    except:
        pass
    tc.update_sources(new_sources)

# Listen for counter source changes
if firebase_admin._apps:
    db.reference(f"temples/{args.temple}/config/counter_sources").listen(on_config_change)

# Start processing in a background thread
thread = threading.Thread(target=tc.process_frames, daemon=True)
thread.start()

# Helper to generate video frames
def gen_frames():
    while True:
        if tc.current_frame is not None:
            ret, buffer = cv2.imencode('.jpg', tc.current_frame)
            if not ret:
                time.sleep(0.03)
                continue
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.04) # ~25fps throttle to prevent browser freeze
        else:
            time.sleep(0.1)

@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/debug_frame")
async def debug_frame():
    if tc.current_frame is not None:
        ret, buffer = cv2.imencode('.jpg', tc.current_frame)
        if ret:
            return Response(content=buffer.tobytes(), media_type="image/jpeg")
    return {"error": "no frame available"}

@app.get("/stats")
async def get_stats():
    return tc.get_stats()

@app.get("/check_camera")
async def check_camera():
    results = []
    for i, cap in enumerate(tc.captures):
        results.append({
            "id": i + 1,
            "source": str(cap.source),
            "is_connected": cap.is_connected,
            "ret": cap.ret,
            "is_opened": cap.cap.isOpened() if cap.cap else False
        })
    return {"cameras": results}

@app.get("/config")
async def get_config():
    if firebase_admin._apps:
        try:
            # Note: AdminConsole uses 'templeData', but server.py used 'temples' for config.
            # Let's check templeData which is the main profile storage.
            ref = db.reference(f"templeData/{args.temple}")
            data = ref.get()
            if data:
                return data
        except Exception as e:
            print(f"Error fetching config: {e}")
    
    # Fallback if Firebase fails or data missing
    return {
        "name": args.temple.replace('_', ' ').title(),
        "coords": [0, 0]
    }

@app.post("/settings")
async def update_settings(line_length: float, space_per_person: float, processing_rate: float = 5):
    tc.update_settings(line_length, space_per_person, processing_rate)
    return {"status": "success", "settings": tc.get_stats()}

# Mount static files
static_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

if __name__ == "__main__":
    try:
        print(f"🚀 Starting Temple Counter on port {args.port}...")
        uvicorn.run(app, host="0.0.0.0", port=args.port)
    except Exception as e:
        print(f"❌ FATAL ERROR: Server failed to start: {e}")
        with open("error_log.txt", "a") as f:
            f.write(f"\n[{time.ctime()}] FATAL ERROR: {e}")
