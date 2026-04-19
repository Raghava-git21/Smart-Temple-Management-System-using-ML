// --- FIREBASE CONFIG ---
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
if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
const db = firebase.database();

console.log("App script loaded. Path:", window.location.pathname);
const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
const isLoginPage = window.location.pathname.includes('login.html');

if (!isLoggedIn && !isLoginPage) {
    console.log("Redirecting to login.html...");
    window.location.href = "login.html?v=1.2";
}

function handleLogout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

// Global UI state
let currentTempleId = null;
const userRole = sessionStorage.getItem('userRole');

document.addEventListener('DOMContentLoaded', () => {
    // Check session again
    if (!sessionStorage.getItem('isAdminLoggedIn')) {
        window.location.href = "login.html";
        return;
    }

    // --- Role Based UI ---
    const roleSelector = document.getElementById('role-selector-container');
    const roleProfile = document.getElementById('role-profile-card');
    const addNewBtn = document.getElementById('add-new-temple-btn');
    const managementUI = document.getElementById('management-ui');
    const templeSelect = document.getElementById('temple-select');

    const roleDetails = document.getElementById('role-details-container');
    if (userRole === 'temple_admin') {
        if (roleSelector) roleSelector.style.display = 'none';
        if (roleProfile) roleProfile.style.display = 'none';
        if (roleDetails) roleDetails.style.display = 'grid'; // Details visible for temple admin
        if (addNewBtn) addNewBtn.style.display = 'none';
        
        currentTempleId = sessionStorage.getItem('templeId');
        if (currentTempleId) {
            managementUI.style.display = 'block';
            loadTempleData(currentTempleId);
        }
    } else {
        // Super Admin
        if (roleSelector) roleSelector.style.display = 'block';
        if (roleProfile) roleProfile.style.display = 'block';
        if (roleDetails) roleDetails.style.display = 'none'; // Hide details for super admin
        if (addNewBtn) addNewBtn.style.display = 'block';
    }

    // --- Clock Logic ---
    const timeDisplay = document.getElementById('current-time');
    function updateTime() {
        if (!timeDisplay) return;
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString('en-US', { 
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
    }
    
    setInterval(updateTime, 1000);
    updateTime();

    // --- Logout Listener ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // --- Dynamic Temple Selection (Super Admin only) ---
    if (userRole === 'super_admin') {
        // Populate dropdown from Firebase
        db.ref('templeData').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const currentSelection = templeSelect.value;
            templeSelect.innerHTML = '<option value="">Select a temple to manage...</option>';
            Object.keys(data).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = data[key].name || key;
                templeSelect.appendChild(option);
            });
            
            // Restore selection if it still exists
            if (currentSelection && data[currentSelection]) {
                templeSelect.value = currentSelection;
            } else if (currentTempleId && data[currentTempleId]) {
                templeSelect.value = currentTempleId;
            }
        });

        templeSelect.addEventListener('change', (e) => {
            currentTempleId = e.target.value;
            if (currentTempleId) {
                managementUI.style.display = 'block';
                loadTempleData(currentTempleId);
            } else {
                managementUI.style.display = 'none';
            }
        });

        addNewBtn.addEventListener('click', () => {
            const name = prompt("Enter New Temple Name:");
            if (!name) return;
            
            const id = name.toLowerCase().replace(/\s+/g, '_');
            db.ref(`templeData/${id}`).set({
                name: name,
                location: "TBA",
                image: "./images/placeholder.png",
                coords: [0, 0],
                counter_url: "http://localhost:8010/stats",
                parking_url: "http://localhost:8002",
                camera_manager_url: "http://localhost:8004",
                timings: { "Darshan": "6:00 AM - 9:00 PM" },
                facilities: ["Wait Area"],
                routes: [{ name: "Main Entrance", wait_time: "5 mins", description: "General queue" }],
                manual_parking_spots: 10
            }).then(() => {
                // Initialize Parking Sources & Status
                db.ref(`temples/${id}/config/parking_sources`).set({
                    "main_entrance": "0" 
                });
                db.ref(`temples/${id}/parking/main_entrance`).set({
                    "available_spots": 10,
                    "status": "Available",
                    "last_updated": new Date().toLocaleTimeString()
                });

                templeSelect.value = id;
                currentTempleId = id;
                managementUI.style.display = 'block';
                loadTempleData(id);
                alert("✨ New temple created! Please fill in the details below.");
            });
        });
    }

    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveTempleData);
});

// --- Settings Management Functions ---

function addTimingField(label = '', value = '') {
    const container = document.getElementById('timing-inputs');
    const div = document.createElement('div');
    div.className = 'input-row';
    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
    div.innerHTML = `
        <input type="text" placeholder="Label (e.g. Darshan)" value="${label}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff;">
        <input type="text" placeholder="Time (e.g. 4 AM - 9 PM)" value="${value}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff;">
        <button onclick="this.parentElement.remove()" style="background: rgba(239, 68, 68, 0.2); border: none; color: #ef4444; padding: 0 10px; border-radius: 6px; cursor: pointer;">&times;</button>
    `;
    container.appendChild(div);
}

function addFacilityField(value = '') {
    const container = document.getElementById('facility-inputs');
    const div = document.createElement('div');
    div.className = 'facility-tag';
    div.style.cssText = 'display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);';
    div.innerHTML = `
        <input type="text" value="${value}" style="background: transparent; border: none; color: #fff; width: 100px; font-size: 0.8rem;">
        <span onclick="this.parentElement.remove()" style="cursor: pointer; color: #ef4444; font-size: 1.2rem; line-height: 1;">&times;</span>
    `;
    container.appendChild(div);
}

function addRouteField(name = '', wait = '', desc = '') {
    const container = document.getElementById('route-inputs');
    const div = document.createElement('div');
    div.className = 'input-row-multi';
    div.style.cssText = 'background: rgba(0,0,0,0.1); padding: 10px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);';
    div.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 5px;">
            <input type="text" placeholder="Route Name" value="${name}" style="flex: 2; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff;">
            <input type="text" placeholder="Wait Time" value="${wait}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff;">
            <button onclick="this.parentElement.parentElement.remove()" style="background: rgba(239, 68, 68, 0.2); border: none; color: #ef4444; padding: 0 10px; border-radius: 6px; cursor: pointer;">&times;</button>
        </div>
        <input type="text" placeholder="Description" value="${desc}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; box-sizing: border-box;">
    `;
    container.appendChild(div);
}

// Window globally scoped functions for onclick
window.addTimingField = addTimingField;
window.addFacilityField = addFacilityField;
window.addRouteField = addRouteField;

function loadTempleData(id) {
    db.ref(`templeData/${id}`).once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Populate Profile
        document.getElementById('profile-name').value = data.name || '';
        document.getElementById('profile-location').value = data.location || '';
        document.getElementById('profile-image').value = data.image || '';
        document.getElementById('profile-lat').value = data.coords ? data.coords[0] : '';
        document.getElementById('profile-lng').value = data.coords ? data.coords[1] : '';
        document.getElementById('url-counter').value = data.counter_url || '';
        document.getElementById('url-parking').value = data.parking_url || '';
        document.getElementById('url-camera').value = data.camera_manager_url || '';
        document.getElementById('parking-manual-spots').value = data.manual_parking_spots || '';

        const displayElement = document.getElementById('temple-display-name');
        if (displayElement) displayElement.textContent = data.name || id;

        // Clear existing
        document.getElementById('timing-inputs').innerHTML = '';
        document.getElementById('facility-inputs').innerHTML = '';
        document.getElementById('route-inputs').innerHTML = '';

        // Populate Timings
        if (data.timings) {
            Object.entries(data.timings).forEach(([label, value]) => {
                addTimingField(label, value);
            });
        }

        // Populate Facilities
        if (data.facilities) {
            data.facilities.forEach(facility => addFacilityField(facility));
        }

        // Populate Routes
        if (data.routes) {
            data.routes.forEach(route => addRouteField(route.name, route.wait_time, route.description));
        }

        // --- UPDATE MODULE LINKS ---
        updateModuleLinks(id, data);
    });
}

function updateModuleLinks(id, data) {
    const counterBtn = document.getElementById('module-counter');
    const parkingBtn = document.getElementById('module-parking');
    const cameraBtn = document.getElementById('module-camera');

    if (data.counter_url) {
        const baseUrl = data.counter_url.replace('/stats', '');
        if (counterBtn) {
            counterBtn.href = `${baseUrl}/?tid=${id}`;
            counterBtn.querySelector('span').textContent = `Manage ${data.name || id} Counter`;
        }
    }

    if (data.parking_url) {
        if (parkingBtn) {
            parkingBtn.href = `${data.parking_url}/?tid=${id}`;
            parkingBtn.querySelector('span').textContent = `Monitor ${data.name || id} Parking`;
        }
    }

    if (data.camera_manager_url) {
        if (cameraBtn) {
            cameraBtn.href = `${data.camera_manager_url}/?tid=${id}`;
            cameraBtn.querySelector('span').textContent = `Manage ${data.name || id} Cameras`;
        }
    }
}

function saveTempleData() {
    if (!currentTempleId) return;

    let updateData = {};

    if (userRole === 'super_admin') {
        // Only save profile/config fields
        updateData = {
            name: document.getElementById('profile-name').value,
            location: document.getElementById('profile-location').value,
            image: document.getElementById('profile-image').value,
            coords: [
                parseFloat(document.getElementById('profile-lat').value) || 0,
                parseFloat(document.getElementById('profile-lng').value) || 0
            ],
            counter_url: document.getElementById('url-counter').value,
            parking_url: document.getElementById('url-parking').value,
            camera_manager_url: document.getElementById('url-camera').value,
            manual_parking_spots: parseInt(document.getElementById('parking-manual-spots').value) || 0
        };
    } else {
        // Only save operational details
        const timings = {};
        document.querySelectorAll('#timing-inputs .input-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs[0].value) timings[inputs[0].value] = inputs[1].value;
        });

        const facilities = [];
        document.querySelectorAll('#facility-inputs .facility-tag input').forEach(input => {
            if (input.value) facilities.push(input.value);
        });

        const routes = [];
        document.querySelectorAll('#route-inputs .input-row-multi').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs[0].value) {
                routes.push({
                    name: inputs[0].value,
                    wait_time: inputs[1].value,
                    description: inputs[2].value
                });
            }
        });

        updateData = {
            timings: timings,
            facilities: facilities,
            routes: routes,
            manual_parking_spots: parseInt(document.getElementById('parking-manual-spots').value) || 0
        };
    }

    db.ref(`templeData/${currentTempleId}`).update(updateData)
        .then(() => alert("✅ Changes saved successfully!"))
        .catch(err => alert("❌ Error saving: " + err.message));
}
