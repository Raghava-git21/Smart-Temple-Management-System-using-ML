import cv2
import numpy as np

# --- CONFIGURATION ---
VIDEO_SOURCE = 0  # 0 for webcam, or "path/to/video.mp4"
OUTPUT_MASK = "mask.png"

points = []

def click_event(event, x, y, flags, params):
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append((x, y))
        # Draw a small circle and line to show progress
        cv2.circle(img, (x, y), 5, (0, 255, 0), -1)
        if len(points) > 1:
            cv2.line(img, points[-2], points[-1], (0, 255, 0), 2)
        cv2.imshow("Define Parking Zone", img)

print("INSTRUCTIONS:")
print("1. Click points around the edge of your PARKING LANE.")
print("2. Press 'c' to close the polygon and generate the mask.")
print("3. Press 'q' to quit without saving.")

cap = cv2.VideoCapture(VIDEO_SOURCE)
ret, frame = cap.read()
if not ret:
    print("Error: Could not read from video source.")
    exit()

img = frame.copy()
cv2.imshow("Define Parking Zone", img)
cv2.setMouseCallback("Define Parking Zone", click_event)

while True:
    key = cv2.waitKey(1) & 0xFF
    if key == ord('c'):
        if len(points) > 2:
            # Create a black image the same size as the frame
            mask = np.zeros((frame.shape[0], frame.shape[1]), dtype=np.uint8)
            # Fill the polygon defined by points with white
            cv2.fillPoly(mask, [np.array(points)], 255)
            cv2.imwrite(OUTPUT_MASK, mask)
            print(f"Success! Mask saved as {OUTPUT_MASK}")
            break
        else:
            print("Please select at least 3 points.")
    elif key == ord('q'):
        print("Quit without saving.")
        break

cap.release()
cv2.destroyAllWindows()
