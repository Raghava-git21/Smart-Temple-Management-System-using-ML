import cv2
import time
import numpy as np
import threading
import firebase_admin
from firebase_admin import credentials, db
from ultralytics import YOLO
import argparse
import os
import sys
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json

# Global state for streaming: { temple_id: { camera_id: frame } }
streaming_frames = {}
frame_lock = threading.Lock()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ARGUMENT PARSING ---
parser = argparse.ArgumentParser(description="Temple Parking AI Worker")
parser.add_argument("--temple", type=str, default="somnath", help="Temple ID (e.g. somnath)")
parser.add_argument("--cameras", type=str, default="parking_entrance", help="Comma-separated Camera IDs")
parser.add_argument("--sources", type=str, default="http://192.168.0.4:8080/video", help="Comma-separated Video sources")
parser.add_argument("--masks", type=str, help="Comma-separated paths to masks (optional)")
parser.add_argument("--show", action="store_true", default=False, help="Show camera preview windows")
args = parser.parse_args()

# Parse lists
camera_list = [c.strip() for c in args.cameras.split(",")]
source_list = [s.strip() for s in args.sources.split(",")]
mask_list = [m.strip() for m in args.masks.split(",")] if args.masks else []

if len(camera_list) != len(source_list):
    print("Error: Number of cameras must match number of sources.")
    sys.exit(1)

# --- CONFIGURATION ---
MODEL_PATH = "yolov8s.pt"
FIREBASE_DB_URL = "https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app"

# Initialize Firebase
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "serviceAccount.json")

if not firebase_admin._apps:
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        try:
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})
            print(f"✅ Firebase initialized for Temple: {args.temple}")
        except Exception as e:
            print(f"⚠️ Firebase Error: {e}. Running without database sync.")
    else:
        print(f"⚠️ Service account not found at {SERVICE_ACCOUNT_PATH}. Sync disabled.")


class ParkingBrain:
    def __init__(self, model_path, mask_path, temple_id, camera_id):
        print(f"Loading Model for {camera_id}: {model_path}...")
        self.model = YOLO(model_path)
        self.mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE) if mask_path and os.path.exists(mask_path) else None
        self.db_path = f"temples/{temple_id}/parking/{camera_id}"
        self.db_ref = db.reference(self.db_path)
        print(f"Reporting to Firebase Path: {self.db_path}")
        
        self.detection_history = []
        self.history_limit = 8
        
    def push_to_firebase(self, spots, status):
        try:
            if firebase_admin._apps:
                self.db_ref.update({
                    "available_spots": spots,
                    "status": status,
                    "last_updated": time.strftime("%H:%M:%S")
                })
        except Exception as e:
            pass


    def enhance_image(self, frame):
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

    def process_frame(self, frame):
        enhanced = self.enhance_image(frame)
        if self.mask is not None:
            mask_resized = cv2.resize(self.mask, (frame.shape[1], frame.shape[0]))
            masked_frame = cv2.bitwise_and(enhanced, enhanced, mask=mask_resized)
        else:
            masked_frame = enhanced
            
        results = self.model(masked_frame, classes=[2, 3, 5, 7], conf=0.35, iou=0.45, verbose=False)
        
        current_cars = 0
        for result in results:
            for box in result.boxes:
                current_cars += 1
                
        self.detection_history.append(current_cars)
        if len(self.detection_history) > self.history_limit:
            self.detection_history.pop(0)
        
        avg_cars = round(sum(self.detection_history) / len(self.detection_history))
        max_spots = 10
        available_spots = max(0, max_spots - avg_cars)
        status = "Available" if available_spots > 3 else "Limited" if available_spots > 0 else "Full"
        
        self.push_to_firebase(available_spots, status)
        return available_spots, results


class CameraCapture(threading.Thread):
    def __init__(self, source, cam_id):
        super().__init__()
        self.source = source
        self.cam_id = cam_id
        self.cap = cv2.VideoCapture(source)
        self.ret = False
        self.frame = None
        self.stopped = False
        self.daemon = True
        self.is_connected = False

    def run(self):
        while not self.stopped:
            if not self.cap.isOpened():
                time.sleep(2)
                self.cap = cv2.VideoCapture(self.source)
                continue
            
            self.ret, frame = self.cap.read()
            if self.ret:
                if not self.is_connected:
                    print(f"✅ [SUCCESS] Parking Camera {self.cam_id} connected: {self.source}")
                self.frame = frame
                self.is_connected = True
            else:
                if self.is_connected:
                    print(f"❌ [LOSS] Parking Camera {self.cam_id} connection lost: {self.source}")
                self.is_connected = False
                self.cap.release()
                time.sleep(2)
                self.cap = cv2.VideoCapture(self.source)

    def stop(self):
        self.stopped = True
        self.cap.release()


def run_camera_worker(temple_id, camera_id, source, mask_path, show, abort_event):
    # --- PRIVACY SHIELD: Blocking Laptop Webcam (Source 0) Permanently ---
    if str(source).strip() == "0":
        print(f"🚫 [PRIVACY] Blocked Attempt to access Laptop Webcam for: {temple_id}/{camera_id}")
        return # Skip this worker entirely
    
    print(f"Starting Worker Thread: {temple_id}/{camera_id} with source: {source}")
    brain = ParkingBrain(MODEL_PATH, mask_path, temple_id, camera_id)
    stream = CameraCapture(source, camera_id)
    stream.start()
    
    frame_count = 0
    STD_H, STD_W = 720, 1280

    try:
        while not stream.stopped and not abort_event.is_set():
            frame_count += 1
            im0 = stream.frame
            
            if stream.is_connected and im0 is not None:
                # Process every 10th frame
                if frame_count % 10 == 0:
                    frame = im0.copy()
                    frame_input = cv2.resize(frame, (800, 600))
                    spots, results = brain.process_frame(frame_input)
                    print(f"[{camera_id}] Status: {spots} spots available")
                    
                    preview = results[0].plot()
                    preview_std = cv2.resize(preview, (STD_W, STD_H))
                    
                    with frame_lock:
                        if temple_id not in streaming_frames:
                            streaming_frames[temple_id] = {}
                        streaming_frames[temple_id][camera_id] = preview_std
                    
                    if show:
                        cv2.imshow(f"AI: {temple_id}/{camera_id}", preview_std)
            else:
                # Show "Connecting..." status
                loading_frame = np.zeros((STD_H, STD_W, 3), dtype=np.uint8)
                msg = f"{temple_id.upper()} / {camera_id.upper()}: DISCONNECTED"
                cv2.putText(loading_frame, msg, (100, 360), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
                cv2.putText(loading_frame, f"Source: {source}", (100, 420), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1)
                
                # Report "Disconnected" to Firebase with null spots
                brain.push_to_firebase(None, "Disconnected")

                with frame_lock:
                    if temple_id not in streaming_frames:
                        streaming_frames[temple_id] = {}
                    streaming_frames[temple_id][camera_id] = loading_frame
                
                # Check abort_event during sleep
                for _ in range(20): 
                    if abort_event.is_set(): break
                    time.sleep(0.1)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        print(f"🏁 Cleaning up Worker: {temple_id}/{camera_id}")
        stream.stop()
        if show:
            try: cv2.destroyWindow(f"AI: {temple_id}/{camera_id}")
            except: pass

class WorkerManager:
    def __init__(self, temple_id, show):
        self.temple_id = temple_id
        self.show = show
        self.workers = {} # cam_id -> { "abort_event": event, "source": source }
        self.lock = threading.Lock()

    def update_workers(self, event):
        new_config = event.data if event.data else {}
        print(f"🔄 Firebase Config Update: {new_config}")
        
        with self.lock:
            # Identify removed cameras
            for cam_id in list(self.workers.keys()):
                if cam_id not in new_config:
                    self.stop_worker(cam_id)

            # Identify added or changed cameras
            for cam_id, source in new_config.items():
                if cam_id not in self.workers or self.workers[cam_id]["source"] != source:
                    if cam_id in self.workers:
                        self.stop_worker(cam_id)
                    
                    print(f"✨ Starting Camera Worker: {cam_id} -> {source}")
                    abort_event = threading.Event()
                    t = threading.Thread(target=run_camera_worker, 
                                         args=(self.temple_id, cam_id, source, None, self.show, abort_event))
                    t.daemon = True
                    t.start()
                    self.workers[cam_id] = {"abort_event": abort_event, "source": source}

    def stop_worker(self, cam_id):
        if cam_id in self.workers:
            print(f"🛑 Stopping Camera Worker: {self.temple_id}/{cam_id}")
            self.workers[cam_id]["abort_event"].set()
            if self.temple_id in streaming_frames and cam_id in streaming_frames[self.temple_id]:
                with frame_lock:
                    del streaming_frames[self.temple_id][cam_id]
            del self.workers[cam_id]

class GlobalManager:
    def __init__(self, show):
        self.show = show
        self.temple_managers = {} # temple_id -> WorkerManager
        self.lock = threading.Lock()

    def update_temples(self, event):
        temples_data = event.data if event.data else {}
        print(f"🏠 [GLOBAL] Syncing Database Temples... ({len(temples_data)} total)")
        
        with self.lock:
            # Handle removed temples
            for t_id in list(self.temple_managers.keys()):
                if t_id not in temples_data:
                    print(f"🗑️ [GLOBAL] Removing Temple Handler: {t_id}")
                    for c_id in list(self.temple_managers[t_id].workers.keys()):
                        self.temple_managers[t_id].stop_worker(c_id)
                    del self.temple_managers[t_id]
                    if t_id in streaming_frames:
                        with frame_lock:
                            del streaming_frames[t_id]

            # Handle added or updated temples
            for t_id, data in temples_data.items():
                if not isinstance(data, dict): continue
                config = data.get("config", {}).get("parking_sources", {})
                
                if t_id not in self.temple_managers:
                    print(f"✨ [GLOBAL] Initializing Temple: {t_id}")
                    self.temple_managers[t_id] = WorkerManager(t_id, self.show)
                
                # Update this temple's workers with its current config
                # We simulate a Firebase event structure for update_workers
                class ConfigEvent:
                    def __init__(self, data): self.data = data
                self.temple_managers[t_id].update_workers(ConfigEvent(config))

if __name__ == "__main__":
    global_manager = GlobalManager(args.show)

    print(f"🚀 Starting GLOBAL Multi-Temple AI System")
    
    if firebase_admin._apps:
        print("🛰️ Connecting to Firebase Root 'temples/' listener...")
        db.reference("temples").listen(global_manager.update_temples)
    else:
        # Fallback to local args (for 1 temple) if Firebase is disconnected
        print("⚠️ Firebase Offline. Starting fallbacks for:", args.temple)
        global_manager.update_temples(type('E',(),{'data':{args.temple:{'config':{'parking_sources':{args.cameras:args.sources}}}}})())
    
    # --- STREAMING SERVER LOGIC ---
    def gen_frames(temple_id=None, cam_id=None):
        while True:
            frame = None
            with frame_lock:
                if temple_id and cam_id:
                    # Single Camera Feed
                    if temple_id in streaming_frames and cam_id in streaming_frames[temple_id]:
                        frame = streaming_frames[temple_id][cam_id]
                elif temple_id:
                    # Temple Grid Feed
                    if temple_id in streaming_frames and len(streaming_frames[temple_id]) > 0:
                        frames = list(streaming_frames[temple_id].values())
                        frame = create_grid(frames)
                else:
                    # Global Aggregate Grid (All active cameras)
                    all_frames = []
                    for t_frames in streaming_frames.values():
                        all_frames.extend(t_frames.values())
                    if len(all_frames) > 0:
                        frame = create_grid(all_frames)

            if frame is None:
                # Standby Frame
                frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                title = f"SYSTEM STANDBY: {temple_id if temple_id else 'GLOBAL'}"
                cv2.putText(frame, title, (300, 360), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.04)

    def create_grid(frames):
        num = len(frames)
        if num == 1: return frames[0]
        # Calculate rows/cols for as square as possible
        cols = int(np.ceil(np.sqrt(num)))
        rows = int(np.ceil(num / cols))
        
        # Standardize size for grid elements
        GH, GW = 480, 640
        grid_rows = []
        for r in range(rows):
            row_items = []
            for c in range(cols):
                idx = r * cols + c
                if idx < num:
                    row_items.append(cv2.resize(frames[idx], (GW, GH)))
                else:
                    row_items.append(np.zeros((GH, GW, 3), dtype=np.uint8))
            grid_rows.append(np.concatenate(row_items, axis=1))
        
        return np.concatenate(grid_rows, axis=0)


    @app.get("/video_feed")
    async def video_feed_global():
        return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

    @app.get("/video_feed/{temple_id}")
    async def video_feed_temple(temple_id: str):
        return StreamingResponse(gen_frames(temple_id=temple_id), media_type="multipart/x-mixed-replace; boundary=frame")

    @app.get("/video_feed/{temple_id}/{camera_id}")
    async def video_feed_cam(temple_id: str, camera_id: str):
        return StreamingResponse(gen_frames(temple_id=temple_id, cam_id=camera_id), media_type="multipart/x-mixed-replace; boundary=frame")


    # Start FastAPI in a thread
    server_thread = threading.Thread(target=lambda: uvicorn.run(app, host="0.0.0.0", port=8003), daemon=True)
    server_thread.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping system...")
    
    print("System Shutdown.")
