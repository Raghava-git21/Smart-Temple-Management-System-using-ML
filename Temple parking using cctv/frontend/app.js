// --- CONFIGURATION ---
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC8GD5f-xjOmIKk2nZuiY7BWMH5LgUKNj0",
    authDomain: "temple-cctv.firebaseapp.com",
    databaseURL: "https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "temple-cctv",
    storageBucket: "temple-cctv.firebasestorage.app",
    messagingSenderId: "512279960972",
    appId: "1:512279960972:web:ce61bc0e223b4273a20aa9"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
const db = firebase.database();

// --- DYNAMIC TEMPLE ID ---
const urlParams = new URLSearchParams(window.location.search);
const templeId = urlParams.get('tid') || "somnath";
let templeCoords = null; // Start null to wait for real data

const cameraMarkers = {};
const cameraLocations = {};
let manualSpots = 0; // Baseline manual spots
let map = null;

function initMap() {
    if (map || !templeCoords) return;
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView(templeCoords, 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    // Ensure marker shows on initial load
    const titleEl = document.getElementById('temple-parking-title');
    const templeName = titleEl ? titleEl.textContent.replace(' Parking', '') : 'Temple';
    updateTempleMarker(templeCoords, templeName);

    // Add Coordinate Jump Overlay
    const jumpOverlay = document.createElement('div');
    jumpOverlay.style.cssText = 'position: absolute; bottom: 10px; left: 10px; z-index: 1000; background: rgba(0,0,0,0.6); padding: 8px; border-radius: 8px; display: flex; gap: 8px; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1);';
    jumpOverlay.innerHTML = `
        <input type="text" id="manual-coords" placeholder="Lat, Lng" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; width: 110px; outline: none;">
        <button id="jump-btn" style="background: #ff9500; border: none; color: #000; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">GO</button>
    `;
    document.getElementById('map').appendChild(jumpOverlay);

    document.getElementById('jump-btn').addEventListener('click', () => {
        const val = document.getElementById('manual-coords').value;
        // Robust split by comma or space
        const parts = val.includes(',') ? val.split(',') : val.trim().split(/\s+/);
        const [lat, lng] = parts.map(s => parseFloat(s.trim()));

        if (!isNaN(lat) && !isNaN(lng)) {
            templeCoords = [lat, lng];
            map.setView(templeCoords, 16);
            updateTempleMarker(templeCoords, document.getElementById('temple-parking-title').textContent.replace(' Parking', ''));
        } else {
            alert("Invalid coordinates format. Use: latitude, longitude or latitude longitude");
        }
    });
}

function updateTempleMarker(coords, name = 'Temple') {
    if (!map) return;
    const templeIcon = L.divIcon({
        className: 'temple-marker',
        html: `<div style="background: #ff9500; color: white; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.4); border-top-left-radius: 0; transform: rotate(-45deg);"><span style="transform: rotate(45deg);">🛕</span></div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 42]
    });

    if (mainTempleMarker) mainTempleMarker.remove();
    mainTempleMarker = L.marker(coords, { icon: templeIcon }).addTo(map)
        .bindPopup(`<b style="font-family: 'Clash Display';">${name}</b><br>Main Entrance`).openPopup();
}

let mainTempleMarker = null;

db.ref(`templeData/${templeId}`).on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Update title
    const titleEl = document.getElementById('temple-parking-title');
    if (titleEl) titleEl.textContent = `${data.name || templeId} Parking`;

    // Update manual spots
    manualSpots = data.manual_parking_spots || 0;
    updateGlobalStats(); // Refresh stats with new manual baseline

    if (data.coords) {
        templeCoords = data.coords;
        if (map) {
            map.setView(templeCoords, 16);
            updateTempleMarker(templeCoords, data.name);
        } else {
            initMap();
            // Call again after initMap to ensure marker is placed
            updateTempleMarker(templeCoords, data.name);
        }
    }
});

function updateCameraMarker(camId, data) {
    const spots = data.available_spots;
    const status = data.status;
    initMap();

    // Update Camera Status List in the Live Occupancy card
    const listEl = document.getElementById('cameraStatusList');
    if (listEl) {
        let itemEl = document.getElementById(`item-${camId}`);
        if (!itemEl) {
            itemEl = document.createElement('div');
            itemEl.id = `item-${camId}`;
            itemEl.className = 'camera-item';
            listEl.appendChild(itemEl);
        }
        
        let statusText = `${spots} Spots`;
        let statusClass = spots > 5 ? 'chip-success' : spots > 2 ? 'chip-warning' : 'chip-danger';
        
        if (spots === null || status === "Disconnected") {
            statusText = "Not Available";
            statusClass = "chip-neutral";
        }

        itemEl.innerHTML = `
            <span class="cam-name">${camId.replace('_', ' ').toUpperCase()}</span>
            <span class="chip ${statusClass}">${statusText}</span>
        `;
    }

    // Teardrop Marker on Map
    let color = spots > 5 ? '#34c759' : spots > 2 ? '#ffcc00' : '#ff3b30';
    let displaySpots = spots;

    if (spots === null || status === "Disconnected") {
        color = '#8e8e93'; // Neutral grey
        displaySpots = 'null';
    }

    const icon = L.divIcon({
        className: 'marker-icon',
        html: `<div style="background: ${color}; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.15);"><span style="transform: rotate(45deg); font-size: 11px;">${displaySpots}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34]
    });

    if (cameraMarkers[camId]) cameraMarkers[camId].remove();
    const markerTarget = cameraLocations[camId] || templeCoords;
    if (markerTarget && map) {
        cameraMarkers[camId] = L.marker(markerTarget, { icon: icon, spots: spots, status: status }).addTo(map);
    }

    updateGlobalStats();
}

function updateGlobalStats() {
    const countEl = document.getElementById('spots-count');
    const labelEl = document.getElementById('parking-status-label');
    const progressEl = document.getElementById('parking-progress');
    const alertEl = document.getElementById('alert-banner');

    if (countEl) {
        let total = 0;
        let anyAvailable = false;
        const currentMarkers = Object.values(cameraMarkers);
        
        // Sum AI detected spots
        currentMarkers.forEach(m => {
            if (m.options.spots !== null && m.options.status !== "Disconnected") {
                total += (m.options.spots || 0);
                anyAvailable = true;
            }
        });

        // Add manual baseline
        if (manualSpots > 0) {
            total += manualSpots;
            anyAvailable = true;

            // Update manual item in list
            const listEl = document.getElementById('cameraStatusList');
            if (listEl) {
                let manualEl = document.getElementById('item-manual');
                if (!manualEl) {
                    manualEl = document.createElement('div');
                    manualEl.id = 'item-manual';
                    manualEl.className = 'camera-item';
                    listEl.insertBefore(manualEl, listEl.firstChild);
                }
                manualEl.innerHTML = `
                    <span class="cam-name">MANUAL UPDATE</span>
                    <span class="chip chip-success">${manualSpots} Spots</span>
                `;
            }
        } else {
            const manualEl = document.getElementById('item-manual');
            if (manualEl) manualEl.remove();
        }

        // Update the big number always
        countEl.textContent = total;
        
        const maxTotal = 20; 
        const percentage = Math.min((total / maxTotal) * 100, 100);
        if (progressEl) progressEl.style.width = `${percentage}%`;

        const alertText = document.getElementById('alert-text');
        const alertIcon = alertEl.querySelector('.alert-icon');
        const alertBanner = document.getElementById('alert-banner');

        if (alertBanner) alertBanner.classList.remove('success', 'warning', 'danger');

        if (total > 8) {
            labelEl.textContent = "Plenty of Space";
            labelEl.style.color = "var(--success)";
            if (alertBanner) alertBanner.classList.add('success');
            if (alertText) alertText.textContent = "PARKING AVAILABLE";
            if (alertIcon) alertIcon.textContent = "✨";
        } else if (total > 0) {
            labelEl.textContent = "Filling Fast";
            labelEl.style.color = "var(--warning)";
            if (alertBanner) alertBanner.classList.add('warning');
            if (alertText) alertText.textContent = "FILLING FAST";
            if (alertIcon) alertIcon.textContent = "⚡";
        } else {
            labelEl.textContent = "PARKING FULL";
            labelEl.style.color = "var(--danger)";
            if (alertBanner) alertBanner.classList.add('danger');
            if (alertText) alertText.textContent = "PARKING FULL";
            if (alertIcon) alertIcon.textContent = "⚠️";
        }
    }
}

// Map dynamic re-size only after map exists
setInterval(() => { if (map) map.invalidateSize(); }, 1000);

// Data Listener for Config (Dynamic Grid)
db.ref(`temples/${templeId}/config/parking_sources`).on('value', (snapshot) => {
    const config = snapshot.val() || {};
    console.log(`[Parking] Config received for ${templeId}:`, config);
    const gridEl = document.getElementById('main-video-grid');
    if (!gridEl) {
        console.error("[Parking] Grid element 'main-video-grid' not found!");
        return;
    }

    if (Object.keys(config).length === 0) {
        console.warn(`[Parking] No camera sources found in Firebase for temple: ${templeId}`);
    }

    // Remove existing camera feeds (keep map)
    const existingFeeds = gridEl.querySelectorAll('.feed-item:not(.map-feed)');
    existingFeeds.forEach(f => f.remove());

    const mapFeed = gridEl.querySelector('.map-feed');

    // Always add the aggregate "Live Matrix" feed
    const matrixItem = document.createElement('div');
    matrixItem.className = 'feed-item';
    matrixItem.innerHTML = `
        <div class="cam-label">SYSTEM AI MATRIX</div>
        <div class="video-container">
            <img src="http://localhost:8003/video_feed/${templeId}" alt="Live Matrix" onerror="this.src='https://via.placeholder.com/640x480?text=Matrix+Connecting...'">
        </div>
    `;
    if (mapFeed) {
        gridEl.insertBefore(matrixItem, mapFeed);
    } else {
        gridEl.appendChild(matrixItem);
    }

    Object.keys(config).forEach(id => {
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <div class="cam-label">${id.replace(/_/g, ' ').toUpperCase()}</div>
            <div class="video-container">
                <img src="http://localhost:8003/video_feed/${templeId}/${encodeURIComponent(id)}" alt="${id} Feed" onerror="this.src='https://via.placeholder.com/640x480?text=Camera+Connecting...'">
            </div>
        `;
        
        // Insert before map if map exists, otherwise just append
        if (mapFeed) {
            gridEl.insertBefore(feedItem, mapFeed);
        } else {
            gridEl.appendChild(feedItem);
        }
        
        // Ensure coordinates exist for new cameras (randomly near center)
        if (!cameraLocations[id] && templeCoords) {
            cameraLocations[id] = [templeCoords[0] + (Math.random() - 0.5) * 0.004, templeCoords[1] + (Math.random() - 0.5) * 0.004];
        }
    });
});

// Data Listener for Status
db.ref(`temples/${templeId}/parking`).on('value', (snapshot) => {
    const node = snapshot.val() || {};
    const listEl = document.getElementById('cameraStatusList');
    if (listEl) {
        // Keep dynamic items that are still in the database, remove the rest
        const currentItems = listEl.querySelectorAll('.camera-item');
        currentItems.forEach(item => {
            const id = item.id.replace('item-', '');
            if (!node[id]) item.remove();
        });
        
        // Remove ANY remaining hardcoded placeholders (without IDs)
        const placeholders = listEl.querySelectorAll('.camera-item:not([id])');
        placeholders.forEach(p => p.remove());
    }

    // Remove markers for deleted cameras
    Object.keys(cameraMarkers).forEach(id => {
        if (!node[id]) {
            cameraMarkers[id].remove();
            delete cameraMarkers[id];
        }
    });

    Object.keys(node).forEach(id => updateCameraMarker(id, node[id]));
});
