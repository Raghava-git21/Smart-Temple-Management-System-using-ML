# 🛕 Smart Temple Management System - Pro Guide

This workspace contains a suite of AI-powered multi-camera tools for real-time temple management.

---

## ⚡ 🚀 1-Click Fast Start
I have created a unified startup script for you. 
1. Navigate to `C:\Users\raghu\Videos\`
2. Double-click **`start_all.bat`**
*This will launch both AI backends and all three frontend dashboards in separate windows.*

---

## 🌐 Network & Port Mapping
To avoid conflicts, the systems are mapped as follows:

| System | Role | URL | Port |
| :--- | :--- | :--- | :--- |
| **Temple Counter** | AI Processor + Grid View | [localhost:8000](http://localhost:8000) | `8000` |
| **Main Dashboard** | Devotee Stat View | [localhost:8001](http://localhost:8001) | `8001` |
| **Parking Map** | Visual Map View | [localhost:8002](http://localhost:8002) | `8002` |
| **Parking Stream** | Live CCTV Node | [localhost:8003](http://localhost:8003/video_feed) | `8003` |

---

## 📹 Multi-Camera Configuration
By default, the system uses **Webcam 0** and **Webcam 1**.

### Adding more cameras:
- **Temple Counter**: Modify `--sources "0, 1, 2"` in the startup command.
- **Parking**: Modify `--cameras "gate1, gate2" --sources "0, 1"` in `main.py` arguments.

---

## 🏎️ Performance Boost (GPU Acceleration)
If you have an NVIDIA GPU, you can run the AI **10x faster** by installing the CUDA-enabled version of PyTorch:
1. Uninstall existing torch: `pip uninstall torch torchvision torchaudio`
2. Install CUDA version: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`
3. The YOLOv8 model will automatically detect the GPU and switch from `CPU` to `CUDA`.

---

## 📐 AI Camera Placement Tips
For the best detection accuracy:
- **Height**: Best results at **8-12 feet** high.
- **Angle**: **45 to 60 degrees** downward. Avoid looking straight down or exactly horizontal.
- **Lighting**: Ensure entry points are well-lit at night to prevent AI "ghosting."

---

## 🛠️ Troubleshooting
- **Port in Use**: If a port is busy, change the number in the `start_all.bat` script.
- **Firebase Sync**: Updates take ~2 seconds to reflect on the web map.
- **Camera Not Found**: Ensure no other app (like Zoom or Teams) is using your webcam.

