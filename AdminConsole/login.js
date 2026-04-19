const USERS = {
    "superadmin": {
        password: "789",
        role: "super_admin"
    },
    "admin_mahakal": {
        password: "123",
        role: "temple_admin",
        templeName: "Mahakal Temple",
        templeId: "mahakal"
    },
    "admin_somnath": {
        password: "456",
        role: "temple_admin",
        templeName: "Somnath Temple",
        templeId: "somnath"
    },
    "admin_kashi": {
        password: "1011",
        role: "temple_admin",
        templeName: "Kashi Vishwanath",
        templeId: "kashi"
    },
    "admin_tirupati": {
        password: "1213",
        role: "temple_admin",
        templeName: "Tirumala Tirupati",
        templeId: "tirupati"
    },
    "admin_arunachala": {
        password: "1415",
        role: "temple_admin",
        templeName: "Arunachaleswar Temple",
        templeId: "arunachala"
    },
    "admin_ekambareshwar": {
        password: "1617",
        role: "temple_admin",
        templeName: "Ekambareshwar Temple",
        templeId: "ekambareshwar"
    },
    "admin_varadharaja": {
        password: "1819",
        role: "temple_admin",
        templeName: "Varadharaja Perumal",
        templeId: "varadharaja"
    },
    "admin_annavaram": {
        password: "2021",
        role: "temple_admin",
        templeName: "Sri Veera Venkata Satyanarayana Swamy",
        templeId: "annavaram"
    }
};

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    console.log("Login attempt:", user);
    if (USERS[user] && USERS[user].password === pass) {
        const userData = USERS[user];
        console.log("Success! Role:", userData.role);
        // Success: Set Session
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        sessionStorage.setItem('userRole', userData.role);

        if (userData.role === 'temple_admin') {
            sessionStorage.setItem('templeName', userData.templeName);
            sessionStorage.setItem('templeId', userData.templeId);
        } else {
            sessionStorage.removeItem('templeName');
            sessionStorage.removeItem('templeId');
        }

        window.location.href = "index.html?v=1.3";
    } else {
        // Fail
        errorMsg.style.display = 'block';
    }
});
