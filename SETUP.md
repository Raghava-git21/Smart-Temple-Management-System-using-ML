# 📖 Detailed Setup Guide: Temple Parking System

This guide provides exhaustive, step-by-step instructions to get your parking system up and running. **Now updated to use Leaflet (No credit card or tokens required for maps).**

---

## 🛠️ Part 1: AI Backend Requirements (Python)

*Refer to the previous section or the backend code for details - no changes here.*

---

## 🌐 Part 2: Web Frontend Setup (Leaflet Map)

Leaflet is an open-source library. We have configured it to load directly from the web, so there is **zero installation** required on your computer.

### Step 1: No Account Needed
Unlike Google Maps or Mapbox, you do **not** need to create an account, provide a credit card, or get an API key for the map tiles. It uses OpenStreetMap by default.

### Step 2: Set Your Temple Location
Currently, the map is centered on Bangalore. To change it to your temple:
1.  Find your temple's coordinates (Latitude and Longitude) on Google Maps.
2.  Open `frontend/app.js`.
3.  On **Line 16**, change the coordinates in `setView([Lat, Lng], 15)`.
    *   Example: `setView([12.3456, 78.9101], 15)`.
4.  On **Line 31**, change the `latlng` constant to the same coordinates so the "P" marker moves to the right spot.

### Step 3: Run the Website
1.  **Option A (Best)**: If you use VS Code, install the **"Live Server"** extension. Right-click `index.html` and select "Open with Live Server".
2.  **Option B (Python)**: Open a terminal in the `frontend` folder and run:
    ```powershell
    python -m http.server 8000
    ```
3.  Open your browser and go to `http://localhost:8000`.

---

## � Part 3: Firebase Setup (The Data Bridge)

Even with Leaflet, you still need Firebase to store and sync the parking data between the AI and the Map.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a project (e.g., "TempleParking").
3.  Click the **Web (</>)** icon to get your keys.
4.  Copy the `firebaseConfig` and paste it into `frontend/app.js`.
5.  Go to **Realtime Database** in the left menu and click "Create Database".
6.  Once created, copy your **Database URL** and update it in `app.js`.

---

## �📁 Part 4: Essential Files
Make sure these are present in your `backend/` folder:
1.  `yolov8n.pt`: The AI brain.
2.  `mask.png`: Your parking zone mask.

---

## 🆘 Troubleshooting
*   **"Map is blank"**: Ensure you have an active internet connection to load the Leaflet library and map tiles.
*   **"Firebase error"**: Double-check your API keys in `app.js`.
