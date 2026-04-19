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

// --- DYNAMIC TEMPLE ID ---
const urlParams = new URLSearchParams(window.location.search);
const templeId = urlParams.get('tid') || "annavaram"; // Fallback to annavaram if not provided

console.log("Camera Manager acting for Temple:", templeId);

let currentConfig = {
    counter_sources: [],
    parking_sources: {}
};

// --- DATA LISTENERS ---
db.ref(`temples/${templeId}/config`).on('value', (snapshot) => {
    const config = snapshot.val() || {};
    currentConfig.counter_sources = config.counter_sources || [];
    currentConfig.parking_sources = config.parking_sources || {};
    renderLists();
});

function renderLists() {
    // Render Counter List
    const counterList = document.getElementById('counter-list');
    counterList.innerHTML = '';
    currentConfig.counter_sources.forEach((src, index) => {
        counterList.appendChild(createItem(`Source ${index}`, src, () => removeSource('counter', index)));
    });

    // Render Parking List
    const parkingList = document.getElementById('parking-list');
    parkingList.innerHTML = '';
    Object.keys(currentConfig.parking_sources).forEach(id => {
        parkingList.appendChild(createItem(id, currentConfig.parking_sources[id], () => removeSource('parking', id)));
    });
}

function createItem(label, value, onDelete) {
    const div = document.createElement('div');
    div.className = 'source-item';
    div.innerHTML = `
        <div class="source-info">
            <span class="src-id">${label.toUpperCase()}</span>
            <span class="src-val">${value}</span>
        </div>
        <button class="btn-delete">×</button>
    `;
    div.querySelector('.btn-delete').onclick = onDelete;
    return div;
}

// --- ACTIONS ---
async function addSource(type) {
    if (type === 'counter') {
        const input = document.getElementById('counter-input');
        const val = input.value.trim();
        if (!val) return;
        
        currentConfig.counter_sources.push(val);
        await db.ref(`temples/${templeId}/config/counter_sources`).set(currentConfig.counter_sources);
        input.value = '';
    } else {
        const idInput = document.getElementById('parking-id-input');
        const srcInput = document.getElementById('parking-src-input');
        const id = idInput.value.trim();
        const src = srcInput.value.trim();
        
        if (!id || !src) return;
        
        currentConfig.parking_sources[id] = src;
        await db.ref(`temples/${templeId}/config/parking_sources`).set(currentConfig.parking_sources);
        idInput.value = '';
        srcInput.value = '';
    }
    showToast();
}

async function removeSource(type, identifier) {
    if (type === 'counter') {
        currentConfig.counter_sources.splice(identifier, 1);
        await db.ref(`temples/${templeId}/config/counter_sources`).set(currentConfig.counter_sources);
    } else {
        delete currentConfig.parking_sources[identifier];
        await db.ref(`temples/${templeId}/config/parking_sources`).set(currentConfig.parking_sources);
    }
    showToast();
}

function showToast() {
    const toast = document.getElementById('status-toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}
