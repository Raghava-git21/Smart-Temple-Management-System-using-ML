import cv2
import numpy as np

def create_test_assets():
    # 1. Create a dummy test_parking.jpg (640x480)
    # We'll make it a gray background with some "car" shapes (blue rectangles)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (100, 100, 100) # Gray asphalt
    
    # Draw some "cars" (YOLO might not detect these, but it fulfills the file requirement)
    # In real use, you'd use a real photo.
    cv2.rectangle(img, (100, 100), (250, 250), (255, 0, 0), -1) # Blue car 1
    cv2.rectangle(img, (350, 100), (500, 250), (0, 0, 255), -1) # Red car 2
    
    cv2.imwrite("test_parking.jpg", img)
    print("Created dummy test_parking.jpg")
    
    # 2. Create a matching mask.png
    # White rectangle where the "parking lane" is
    mask = np.zeros((480, 640), dtype=np.uint8)
    cv2.rectangle(mask, (50, 50), (550, 400), 255, -1)
    
    cv2.imwrite("mask.png", mask)
    print("Created sample mask.png")

if __name__ == "__main__":
    create_test_assets()
