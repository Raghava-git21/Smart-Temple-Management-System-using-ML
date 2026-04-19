import cv2
from ultralytics import solutions
import pygame
import threading
import time
import numpy as np

class CameraCapture(threading.Thread):
    def __init__(self, source, cam_id):
        super().__init__()
        self.source = int(source) if str(source).isdigit() else source
        self.cam_id = cam_id
        
        # Optimize for RTSP streams
        if isinstance(self.source, str) and (self.source.startswith("rtsp://") or self.source.startswith("http://")):
            # Try with FFMPEG backend for RTSP for better stability
            self.cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Reduce latency
        else:
            self.cap = cv2.VideoCapture(self.source)
            
        self.ret = False
        self.frame = None
        self.stopped = False
        self.daemon = True
        self.is_connected = False
        self.drop_count = 0
        self.error_msg = ""
        self._log(f"Initializing Camera {self.cam_id+1} with source: {self.source}")

    def _log(self, msg):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open("camera_debug.log", "a") as f:
                f.write(f"[{timestamp}] [CAM {self.cam_id+1}] {msg}\n")
        except:
            pass
        print(f"[{timestamp}] [CAM {self.cam_id+1}] {msg}")

    def run(self):
        while not self.stopped:
            if not self.cap.isOpened():
                self._log(f"Connection failed/closed. Retrying in 2s...")
                time.sleep(2)
                if isinstance(self.source, str) and (self.source.startswith("rtsp://") or self.source.startswith("http://")):
                    self.cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
                else:
                    self.cap = cv2.VideoCapture(self.source)
                continue
            
            self.ret, frame = self.cap.read()
            if self.ret:
                if not self.is_connected:
                    self._log(f"✅ [SUCCESS] Camera connected: {self.source}")
                    self.is_connected = True
                self.frame = frame
                self.drop_count = 0
            else:
                self.drop_count += 1
                if self.drop_count > 30: # ~1 second of pure drops
                    if self.is_connected:
                        self._log(f"❌ [LOSS] Connection lost: {self.source}")
                    self.is_connected = False
                    self.cap.release()
                    time.sleep(2)
                    if isinstance(self.source, str) and (self.source.startswith("rtsp://") or self.source.startswith("http://")):
                        self.cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
                    else:
                        self.cap = cv2.VideoCapture(self.source)
                    self.drop_count = 0
                else:
                    time.sleep(0.01)

    def stop(self):
        self.stopped = True
        self.cap.release()


class TempleCounter:
    def __init__(self, sources, model_path="yolov8n.pt", line_length=15, space_per_person=1.2, processing_rate=5):
        if isinstance(sources, str):
            sources = [sources]
        
        self.sources = sources
        self.model_path = model_path
        pygame.mixer.init()
        try:
            self.alarm_sound = pygame.mixer.Sound("alarm.mp3") 
        except Exception as e:
            print(f"⚠️ Audio initialization failed (likely no audio device): {e}")
            self.alarm_sound = None

        self.line_length_meters = line_length
        self.space_per_person_meters = space_per_person
        self.processing_rate = processing_rate # people per minute
        self.limit = int(self.line_length_meters / self.space_per_person_meters)
        
        self.line_points = [(0, 350), (1280, 350)]
        
        self.captures = [CameraCapture(s, i) for i, s in enumerate(self.sources)]
        for c in self.captures:
            c.start()

        self.counters = [solutions.ObjectCounter(
            show=False,
            region=self.line_points,
            model=model_path,
            classes=[0]
        ) for _ in self.sources]
        
        self.current_frame = None
        self.camera_counts = [0] * len(self.sources)
        self.total_entered = 0
        self.is_running = False
        self._lock = threading.Lock()

    def update_settings(self, line_length, space_per_person, processing_rate=5):
        with self._lock:
            self.line_length_meters = line_length
            self.space_per_person_meters = space_per_person
            self.processing_rate = processing_rate
            self.limit = int(self.line_length_meters / self.space_per_person_meters)

    def get_stats(self):
        with self._lock:
            # Check connection status
            any_connected = any(cap.is_connected for cap in self.captures)
            
            # Calculate wait time: people / rate
            wait_time_minutes = round(self.total_entered / self.processing_rate) if self.processing_rate > 0 else 0
            
            # Determine status
            percentage = (self.total_entered / self.limit) * 100 if self.limit > 0 else 0
            if not any_connected:
                status = "Connecting"
            elif percentage < 30:
                status = "ENTRY OPEN"
            elif percentage < 80:
                status = "Moderate"
            else:
                status = "Full"

            return {
                "total_entered": self.total_entered,
                "limit": self.limit,
                "line_length": self.line_length_meters,
                "space_per_person": self.space_per_person_meters,
                "processing_rate": self.processing_rate,
                "wait_time_minutes": wait_time_minutes if any_connected else 0,
                "crowd_status": status,
                "is_full": (self.total_entered >= self.limit) if any_connected else False,
                "is_connected": any_connected
            }

    def process_frames(self):
        self.is_running = True
        import numpy as np

        while self.is_running:
            try:
                frames = []
                new_total = 0
                
                # Standard Canvas Size
                STD_H, STD_W = 720, 1280

                # Take a thread-safe snapshot of references
                with self._lock:
                    current_captures = list(self.captures)
                    current_counters = list(self.counters)
                
                if len(current_captures) == 0:
                    standby = np.zeros((STD_H, STD_W, 3), dtype=np.uint8)
                    cv2.putText(standby, "WAITING FOR CAMERA SOURCE...", (300, 360), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 3)
                    cv2.putText(standby, "Add via Camera Manager", (400, 420), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (150, 150, 150), 2)
                    self.current_frame = standby
                    time.sleep(1)
                    continue

                for i, cap_thread in enumerate(current_captures):
                    im0 = cap_thread.frame
                    
                    if cap_thread.is_connected and im0 is not None:
                        im0_copy = im0.copy()
                        # Ensure counter exists (prevents IndexError mid-switch)
                        if i < len(current_counters):
                            try:
                                # New ultralytics API uses .count(), try fallback if __call__ fails
                                if hasattr(current_counters[i], 'count'):
                                    processed_frame = current_counters[i].count(im0_copy)
                                    in_count = current_counters[i].in_count if hasattr(current_counters[i], 'in_count') else 0
                                elif hasattr(current_counters[i], 'process_data'):
                                    results = current_counters[i].process_data(im0_copy)
                                    processed_frame = current_counters[i].im0 if hasattr(current_counters[i], 'im0') else im0_copy
                                    in_count = current_counters[i].in_counts if hasattr(current_counters[i], 'in_counts') else 0
                                else:
                                    # Fallback to the original implementation
                                    results = current_counters[i](im0_copy)
                                    processed_frame = results.plot_im if hasattr(results, 'plot_im') else im0_copy
                                    in_count = results.in_count if hasattr(results, 'in_count') else 0
                            except Exception as model_err:
                                import traceback
                                with open("error_log.txt", "a") as f:
                                    f.write(f"Model error: {model_err}\n{traceback.format_exc()}\n")
                                processed_frame = im0_copy
                                in_count = 0
                            
                            self.camera_counts[i] = in_count
                            new_total += in_count
                        else:
                            processed_frame = im0_copy
                        
                        # Resize to standard height/width
                        processed_frame = cv2.resize(processed_frame, (STD_W, STD_H))
                        
                        cv2.putText(processed_frame, f"CAM {i+1} - LIVE", (20, 50), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                        frames.append(processed_frame)
                    else:
                        loading_frame = np.zeros((STD_H, STD_W, 3), dtype=np.uint8)
                        cv2.putText(loading_frame, f"CAM {i+1}: CONNECTING...", (300, 360), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 3)
                        # Display Source
                        src_txt = str(self.sources[i]) if i < len(self.sources) else "Loading"
                        cv2.putText(loading_frame, f"Source: {src_txt}", (300, 420), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (150, 150, 150), 2)
                        
                        # Add a hint about checking the Camera Manager
                        cv2.putText(loading_frame, "Verify URL in Camera Manager (Port 8004)", (300, 480), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 255), 2)
                        frames.append(loading_frame)
                
                if not frames:
                    time.sleep(0.1)
                    continue

                with self._lock:
                    self.total_entered = new_total
                    
                    # Create Grid UI
                    num_frames = len(frames)
                    if num_frames == 1:
                        grid_frame = frames[0]
                    else:
                        rows = (num_frames + 1) // 2
                        grid_rows = []
                        for r in range(rows):
                            row_frames = frames[r*2 : (r+1)*2]
                            if len(row_frames) == 1:
                                row_frames.append(np.zeros_like(row_frames[0]))
                            grid_rows.append(np.concatenate(row_frames, axis=1))
                        grid_frame = np.concatenate(grid_rows, axis=0) if len(grid_rows) > 1 else grid_rows[0]
    
                # Resize grid to reasonable display size
                h, w = grid_frame.shape[:2]
                max_w = 1280
                if w > max_w:
                    grid_frame = cv2.resize(grid_frame, (max_w, int(h * max_w / w)))

                # Alert Logic and Overlays on Grid
                if self.total_entered >= self.limit:
                    cv2.rectangle(grid_frame, (0, 0), (grid_frame.shape[1], 90), (0, 0, 255), -1)
                    cv2.putText(grid_frame, "TEMPLE FULL - STOP", (grid_frame.shape[1]//2 - 300, 65), 
                                cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 5)
                    
                    if self.alarm_sound and not pygame.mixer.get_busy():
                        self.alarm_sound.play()

                status_bg = np.zeros((100, grid_frame.shape[1], 3), dtype=np.uint8)
                cv2.putText(status_bg, f"Total Entered (All Cams): {self.total_entered} / {self.limit}", (20, 60), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
                
                self.current_frame = np.concatenate([grid_frame, status_bg], axis=0)

            except Exception as e:
                import traceback
                with open("error_log.txt", "a") as f:
                    f.write(f"Outer loop error: {e}\n{traceback.format_exc()}\n")
                time.sleep(1)

    def update_sources(self, new_sources):
        with self._lock:
            print(f"🔄 Updating Sources: {new_sources}")
            # Stop existing
            for c in self.captures:
                c.stop()
            
            self.sources = new_sources
            self.camera_counts = [0] * len(self.sources)
            self.captures = [CameraCapture(s, i) for i, s in enumerate(self.sources)]
            for c in self.captures:
                c.start()

            # Re-initialize counters with the safely stored model_path
            self.counters = [solutions.ObjectCounter(
                show=False,
                region=self.line_points,
                model=self.model_path,
                classes=[0]
            ) for _ in self.sources]

    def stop(self):
        self.is_running = False

if __name__ == "__main__":
    # Fallback to local display if run directly
    tc = TempleCounter(sources=["0"])
    t = threading.Thread(target=tc.process_frames)
    t.start()
    
    try:
        while True:
            if tc.current_frame is not None:
                cv2.imshow("Temple AI Counter", tc.current_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        tc.stop()
        t.join()
        cv2.destroyAllWindows()
