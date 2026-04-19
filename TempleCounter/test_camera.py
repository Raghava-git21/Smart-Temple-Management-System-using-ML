import cv2
import sys

def test_source(source):
    print(f"Testing Source: {source}")
    # Try with FFMPEG backend for RTSP
    if str(source).startswith("rtsp://"):
        cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    else:
        cap = cv2.VideoCapture(source)
    
    if not cap.isOpened():
        print("❌ FAILED: Cannot open camera source.")
        return False
    
    ret, frame = cap.read()
    if ret:
        print("✅ SUCCESS: Captured frame!")
        # Save a sample frame
        cv2.imwrite("test_sample.jpg", frame)
        print("Sample frame saved to test_sample.jpg")
    else:
        print("⚠️ WARNING: Source opened but failed to capture frame (is it streaming?)")
    
    cap.release()
    return ret

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "0"
    test_source(src)
