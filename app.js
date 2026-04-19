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

let templeData = {};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
const db = firebase.database();

// Views
const discoveryView = document.getElementById('discoveryView');
const dashboard = document.getElementById('dashboard');
const mapSection = document.getElementById('mapSection');
const mainHeader = document.getElementById('mainHeader');
const heroLanding = document.getElementById('heroLanding');

// Navigation
const btnStartExplore = document.getElementById('btnStartExplore');

// Nav Elements
const navHome = document.getElementById('navHome');
const navMap = document.getElementById('navMap');
const btnBackToGrid = document.getElementById('btnBackToGrid');
const btnMapBack = document.getElementById('btnMapBack');

// Dashboard elements
const templeImageEl = document.getElementById('templeImage');
const selectedTempleNameEl = document.getElementById('selectedTempleName');
const selectedTempleLocEl = document.getElementById('selectedTempleLoc');
const waitTimeEl = document.getElementById('waitTime');
const waitStatusEl = document.getElementById('waitStatus');
const parkingSpotsEl = document.getElementById('parkingSpots');
const parkingStatusEl = document.getElementById('parkingStatus');
const timingListEl = document.getElementById('timingList');
const routeListEl = document.getElementById('routeList');
const smartRouteListEl = document.getElementById('smartRouteList');
const facilityGridEl = document.getElementById('facilityGrid');
const emergencyListEl = document.getElementById('emergencyList');
const templeGridEl = document.getElementById('templeGrid');

// Map elements
const cameraStatusListEl = document.getElementById('cameraStatusList');

let leafletMap = null;
let cameraMarkers = {};
let counterPollingInterval = null;
let currentTempleKey = null;
let parkingData = {}; // Stores latest data per camera

// Initialize Map
function initMap(center = [12.230751782501432, 79.06746053647703]) {
    if (leafletMap) {
        leafletMap.setView(center, 16);
        return;
    }
    leafletMap = L.map('map').setView(center, 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMap);
}

// Render Temple Discovery Grid
function renderTempleGrid() {
    if (!templeGridEl) return;
    templeGridEl.innerHTML = '';
    Object.keys(templeData).forEach(key => {
        const temple = templeData[key];
        const card = document.createElement('div');
        card.className = 'temple-card animate-in';
        
        // Defensive check for missing metadata
        const name = temple.name || key;
        const location = temple.location || 'Location TBA';
        const image = temple.image || './images/placeholder.png';

        card.innerHTML = `
            <div class="card-img" style="background-image: url('${image}')"></div>
            <div class="card-info">
                <h3>${name}</h3>
                <p>📍 ${location}</p>
            </div>
        `;
        card.onclick = () => selectTemple(key);
        templeGridEl.appendChild(card);
    });
}

function selectTemple(key) {
    currentTempleKey = key;
    const data = templeData[key];

    // Update UI headers
    selectedTempleNameEl.textContent = data.name || key;
    selectedTempleLocEl.textContent = `📍 ${data.location || 'N/A'}`;
    templeImageEl.style.backgroundImage = `url('${data.image || './images/placeholder.png'}')`;

    updateDashboardUI(data);
    showView('dashboard');

    // Setup listeners for multiple cameras
    setupParkingListeners(key);

    // Counter polling
    if (data.counter_url) startCounterPolling(data.counter_url);
}

function setupParkingListeners(templeId) {
    parkingData = {}; // Clear old data

    // Remove old markers and listeners
    Object.values(cameraMarkers).forEach(m => m.remove());
    cameraMarkers = {};
    db.ref(`temples/${templeId}/parking`).off();
    db.ref(`temples/${templeId}/config/parking_sources`).off();

    // Listen for configuration changes
    db.ref(`temples/${templeId}/config/parking_sources`).on('value', (configSnapshot) => {
        const config = configSnapshot.val() || {};
        const cameras = Object.keys(config);

        // Remove markers for cameras no longer in config
        Object.keys(cameraMarkers).forEach(camId => {
            if (!config[camId]) {
                cameraMarkers[camId].remove();
                delete cameraMarkers[camId];
                delete parkingData[camId];
            }
        });

        cameras.forEach(camId => {
            // Track status for each camera
            db.ref(`temples/${templeId}/parking/${camId}`).on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    parkingData[camId] = data;
                    aggregateParking();
                }
            });

            // Ensure marker exists or update it
            if (!cameraMarkers[camId]) {
                const center = templeData[templeId]?.coords || [23.1827, 75.7682];
                const coords = [center[0] + (Math.random() - 0.5) * 0.003, center[1] + (Math.random() - 0.5) * 0.003];
                const parkingIcon = L.divIcon({
                    className: `marker-icon chip-warning`,
                    html: `<div style="background: #ccc; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: var(--shadow);"><span style="transform: rotate(45deg);">P</span></div>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 34]
                });

                if (leafletMap) {
                    cameraMarkers[camId] = L.marker(coords, { icon: parkingIcon })
                        .bindPopup(`<strong>${camId.replace('_', ' ').toUpperCase()}</strong><br>Status: Checking...`)
                        .addTo(leafletMap);
                }
            }
        });
        aggregateParking();
    });
}

function aggregateParking() {
    let totalSpots = 0;
    let anyLive = false;
    cameraStatusListEl.innerHTML = '';

    Object.keys(parkingData).forEach(camId => {
        const pData = parkingData[camId];
        const isLive = pData.status !== "Connecting" && pData.status !== "Disconnected";
        if (isLive) {
            totalSpots += (pData.available_spots || 0);
            anyLive = true;
        }

        // Add to map overlay list
        const item = document.createElement('div');
        item.className = 'camera-item';
        const statusClass = isLive ? (pData.available_spots > 3 ? 'chip-success' : pData.available_spots > 0 ? 'chip-warning' : 'chip-danger') : (pData.status === "Disconnected" ? 'chip-neutral' : 'chip-warning');
        const statusText = isLive ? pData.available_spots + ' Spots' : (pData.status === "Disconnected" ? 'Not Available' : 'Connecting...');

        item.innerHTML = `
            <span class="cam-name">${camId.replace('_', ' ').toUpperCase()}</span>
            <span class="chip ${statusClass}">
                ${statusText}
            </span>
        `;
        cameraStatusListEl.appendChild(item);

        // Update individual markers on Map
        if (cameraMarkers[camId]) {
            let color = '#ccc';
            let label = isLive ? pData.available_spots : (pData.status === "Disconnected" ? 'null' : 'P');

            if (isLive) {
                color = pData.available_spots > 3 ? 'var(--success)' : pData.available_spots > 0 ? 'var(--warning)' : 'var(--danger)';
            } else if (pData.status === "Disconnected") {
                color = '#8e8e93';
            }

            const parkingIcon = L.divIcon({
                className: `marker-icon`,
                html: `<div style="background: ${color}; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: var(--shadow);"><span style="transform: rotate(45deg);">${label}</span></div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 34]
            });

            cameraMarkers[camId].setIcon(parkingIcon);
            cameraMarkers[camId].bindPopup(`<strong>${camId.replace('_', ' ').toUpperCase()}</strong><br>Status: ${pData.status}${isLive ? '<br>Spots: ' + pData.available_spots : ''}`);
        }
    });

    // Update Dashboard
    parkingSpotsEl.textContent = anyLive ? totalSpots : "--";
    let statusClass = 'chip-danger';
    let statusText = 'Full';

    if (!anyLive) {
        statusClass = 'chip-warning';
        statusText = 'Connecting...';
    } else if (totalSpots > 5) {
        statusClass = 'chip-success';
        statusText = 'Available';
    } else if (totalSpots > 0) {
        statusClass = 'chip-warning';
        statusText = 'Limited';
    }
    parkingStatusEl.textContent = statusText;
    parkingStatusEl.className = `chip ${statusClass}`;
}

function showView(view) {
    if (heroLanding) heroLanding.style.display = 'none';
    discoveryView.style.display = 'none';
    dashboard.style.display = 'none';
    mapSection.style.display = 'none';
    mainHeader.style.display = 'block';

    if (view === 'landing') {
        if (heroLanding) heroLanding.style.display = 'flex';
    } else if (view === 'home') {
        discoveryView.style.display = 'block';
        navHome.classList.add('active');
        navMap.classList.remove('active');
    } else if (view === 'dashboard') {
        dashboard.style.display = 'block';
    } else if (view === 'map') {
        mapSection.style.display = 'block';
        navMap.classList.add('active');
        navHome.classList.remove('active');

        const temple = templeData[currentTempleKey];
        setTimeout(() => {
            initMap(temple ? temple.coords : undefined);
            if (leafletMap) leafletMap.invalidateSize();
        }, 100);
    }
}

// Event Listeners
if (btnStartExplore) btnStartExplore.onclick = () => showView('home');

navHome.onclick = (e) => { e.preventDefault(); showView('home'); };
navMap.onclick = (e) => {
    e.preventDefault();
    if (currentTempleKey) showView('map');
    else alert("Please select a temple first!");
};
btnBackToGrid.onclick = () => showView('home');
btnMapBack.onclick = () => showView('dashboard');

function startCounterPolling(url) {
    if (counterPollingInterval) clearInterval(counterPollingInterval);
    const fetchStats = () => {
        fetch(url).then(res => res.json()).then(stats => {
            if (stats.crowd_status === "Connecting") {
                waitTimeEl.textContent = "--";
                waitStatusEl.textContent = "Connecting...";
                waitStatusEl.className = "chip chip-warning";
            } else {
                waitTimeEl.textContent = `${stats.wait_time_minutes} min`;
                waitStatusEl.textContent = stats.crowd_status;
                let statusClass = 'chip-success';
                if (stats.crowd_status === 'Moderate') statusClass = 'chip-warning';
                if (stats.crowd_status === 'Full' || stats.crowd_status === 'TEMPLE FULL') statusClass = 'chip-danger';
                waitStatusEl.className = `chip ${statusClass}`;
            }
        }).catch(() => {
            waitTimeEl.textContent = "--";
            waitStatusEl.textContent = "Offline";
            waitStatusEl.className = "chip chip-danger";
        });
    };
    fetchStats();
    counterPollingInterval = setInterval(fetchStats, 5000);
}

function updateDashboardUI(data) {
    if (!data) return;
    timingListEl.innerHTML = '';
    routeListEl.innerHTML = '';
    smartRouteListEl.innerHTML = '';
    facilityGridEl.innerHTML = '';
    emergencyListEl.innerHTML = '';

    if (data.timings) {
        Object.entries(data.timings).forEach(([title, time]) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<span>${title}</span><span style="font-weight:600">${time}</span>`;
            timingListEl.appendChild(item);
        });
    }

    if (data.routes) {
        data.routes.forEach(route => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<div><div style="font-weight:600">${route.name}</div><div style="font-size:0.75rem; color:var(--text-muted)">${route.description}</div></div><div class="chip chip-warning">${route.wait_time}</div>`;
            routeListEl.appendChild(item);
        });
    }

    if (data.smart_routes) {
        data.smart_routes.forEach(route => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.style.background = 'rgba(255, 255, 255, 0.05)';
            item.innerHTML = `
                <div>
                    <div style="font-weight:600; color: #4ade80;">${route.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${route.description}</div>
                </div>
                <div style="text-align:right">
                    <div class="chip chip-success" style="margin-bottom:4px">${route.duration}</div>
                    <a href="${route.google_maps_link}" target="_blank" class="btn-icon" style="font-size:0.8rem; padding:4px 8px; text-decoration:none; display:inline-block;">Navigate ↗</a>
                </div>`;
            smartRouteListEl.appendChild(item);
        });
    }

    if (data.facilities) {
        data.facilities.forEach(facility => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 10px; background: rgba(255,255,255,0.03); border-radius: 10px; font-size: 0.8rem; text-align: center;';
            item.textContent = facility;
            facilityGridEl.appendChild(item);
        });
    }

    if (data.emergency) {
        data.emergency.forEach(contact => {
            const btn = document.createElement('a');
            btn.href = `tel:${contact.number}`;
            btn.className = 'emergency-btn';
            btn.innerHTML = `<div><div style="font-weight:600">${contact.name}</div><div style="font-size:0.75rem; opacity:0.7">${contact.number}</div></div><span>📞</span>`;
            emergencyListEl.appendChild(btn);
        });
    }
}

// Initialize Temple Data from Firebase
db.ref('templeData').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        templeData = data;
        renderTempleGrid();
        if (currentTempleKey) {
            updateDashboardUI(templeData[currentTempleKey]);
        }
    }
});

// App Entry Point
showView('landing');
