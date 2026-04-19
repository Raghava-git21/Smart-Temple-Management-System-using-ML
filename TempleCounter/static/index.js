const currentCountEl = document.getElementById('current-count');
const maxLimitEl = document.getElementById('max-limit');
const waitTimeEl = document.getElementById('wait-time');
const crowdStatusEl = document.getElementById('crowd-status');
const occupancyProgress = document.getElementById('occupancy-progress');
const occupancyLabel = document.getElementById('occupancy-label');
const alertBanner = document.getElementById('alert-banner');

// Update UI with new stats
function updateStats(stats) {
    const { total_entered, limit, is_full, wait_time_minutes, crowd_status } = stats;

    if (currentCountEl) currentCountEl.textContent = total_entered;
    if (maxLimitEl) maxLimitEl.textContent = limit;
    if (waitTimeEl) waitTimeEl.textContent = wait_time_minutes;

    // Update Crowd Status Badge
    if (crowdStatusEl) {
        crowdStatusEl.textContent = crowd_status;
        crowdStatusEl.className = 'status-badge ' + (crowd_status || 'free').toLowerCase();
    }

    const percentage = limit > 0 ? Math.min((total_entered / limit) * 100, 100) : 0;
    if (occupancyProgress) occupancyProgress.style.width = `${percentage}%`;

    const alertText = document.getElementById('alert-text');
    const alertIcon = alertBanner ? alertBanner.querySelector('.alert-icon') : null;

    if (alertBanner) alertBanner.classList.remove('success', 'warning', 'danger');

    // Update color and label based on occupancy
    if (is_full) {
        if (occupancyLabel) {
            occupancyLabel.textContent = "TEMPLE FULL";
            occupancyLabel.style.color = "var(--danger)";
        }
        if (occupancyProgress) occupancyProgress.style.background = "var(--danger)";
        if (alertBanner) alertBanner.classList.add('danger');
        if (alertText) alertText.textContent = "TEMPLE FULL - STOP ENTRY";
        if (alertIcon) alertIcon.textContent = "⚠️";
    } else if (percentage > 80) {
        if (occupancyLabel) {
            occupancyLabel.textContent = "Nearly Full";
            occupancyLabel.style.color = "#ff9500";
        }
        if (occupancyProgress) occupancyProgress.style.background = "#ff9500";
        if (alertBanner) alertBanner.classList.add('warning');
        if (alertText) alertText.textContent = "CROWDED - PROCEED WITH CARE";
        if (alertIcon) alertIcon.textContent = "⚡";
    } else {
        if (occupancyLabel) {
            occupancyLabel.textContent = "Comfortable";
            occupancyLabel.style.color = "var(--success)";
        }
        if (occupancyProgress) occupancyProgress.style.background = "linear-gradient(to right, var(--accent-secondary), var(--accent-primary))";
        if (alertBanner) alertBanner.classList.add('success');
        if (alertText) alertText.textContent = "ENTRY OPEN";
        if (alertIcon) alertIcon.textContent = "✨";
    }
}

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

// --- INITIALIZATION ---
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
const templeId = urlParams.get('tid') || "annavaram";

// Fetch stats periodically
async function fetchStats() {
    try {
        const response = await fetch('/stats');
        const stats = await response.json();
        updateStats(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Global config
let templeConfig = {
    name: "Temple",
    coords: null // Wait for real data
};
let mainTempleMarker = null;

// REAL-TIME CONFIG LISTENER
db.ref(`templeData/${templeId}`).on('value', (snapshot) => {
    const config = snapshot.val();
    if (config) {
        templeConfig = config;
        if (config.name) {
            const headerH1 = document.querySelector('header h1');
            if (headerH1) headerH1.textContent = config.name + " Counter";
            document.title = config.name + " - Smart Counter";
        }
        
        const center = config.coords;
        if (map && center) {
            map.setView(center, 17);
            
            const icon = L.divIcon({
                className: 'marker-icon',
                html: `<div style="background: var(--accent-primary); color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.15);"><span style="transform: rotate(45deg); font-size: 11px;">🛕</span></div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 34]
            });

            if (mainTempleMarker) mainTempleMarker.remove();
            mainTempleMarker = L.marker(center, { icon: icon }).addTo(map).bindPopup(`<b>${config.name}</b>`).openPopup();
        } else if (center) {
            initMap();
        }
    }
});

// Map Initialization
let map = null;
function initMap() {
    if (map || !templeConfig.coords) return;
    const center = templeConfig.coords;
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView(center, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// Start interval
setInterval(fetchStats, 1000);
fetchStats();
