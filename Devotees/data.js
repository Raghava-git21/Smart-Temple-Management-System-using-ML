const templeData = {
    "mahakal": {
        "name": "Mahakaal Temple",
        "location": "Ujjain, India",
        "coords": [23.1827, 75.7682],
        "image": "./images/Mahakaal.png",
        "timings": {
            "Darshan": "4:00 AM - 11:00 PM",
            "Bhasma Aarti": "4:00 AM - 6:00 AM"
        },
        "routes": [
            { "name": "General Lane", "wait_time": "30 mins", "description": "Free entry for all devotees." },
            { "name": "VIP Lane", "wait_time": "10 mins", "description": "Paid entry for faster access." }
        ],
        "smart_routes": [
            { "name": "Corridor Route (Traffic Free)", "description": "Best for festivals. Avoids main market congestion.", "duration": "15 mins", "google_maps_link": "https://www.google.com/maps/dir/?api=1&destination=23.1827,75.7682&travelmode=walking" }
        ],
        "facilities": ["Shoe Stall", "Drinking Water", "Restrooms"],
        "emergency": [
            { "name": "Medical", "number": "108" },
            { "name": "Police", "number": "100" }
        ],
        "parking_cameras": {
            "north_gate": { "coords": [23.1835, 75.7685] },
            "south_gate": { "coords": [23.1820, 75.7675] }
        },
        "counter_url": "http://localhost:8000/stats"
    },
    "kashi": {
        "name": "Kashi Vishwanath",
        "location": "Varanasi, India",
        "coords": [25.3109, 83.0107],
        "image": "./images/Kashi.jpg",
        "timings": {
            "Darshan": "3:00 AM - 11:00 PM",
            "Mangala Aarti": "3:00 AM - 4:00 AM"
        },
        "routes": [
            { "name": "Ganga Gate", "wait_time": "45 mins", "description": "Queue starting from the ghats." }
        ],
        "smart_routes": [
            { "name": "River Approach (Boat)", "description": "Scenic and zero traffic. Direct access to Lalita Ghat.", "duration": "20 mins", "google_maps_link": "https://www.google.com/maps/dir/?api=1&destination=25.3109,83.0107" }
        ],
        "facilities": ["Locker Room", "Wheelchair Support"],
        "emergency": [
            { "name": "Helpline", "number": "0542 2392620" }
        ],
        "parking_cameras": {
            "south_gate": { "coords": [25.3100, 83.0115] }
        },
        "counter_url": "http://localhost:8001/stats"
    },
    "tirupati": {
        "name": "Tirumala Tirupati",
        "location": "Tirupati, India",
        "coords": [13.6833, 79.3472],
        "image": "./images/Tirumala.jpeg",
        "timings": {
            "Suprabhatam": "3:00 AM - 4:00 AM",
            "General Darshan": "Open 24/7"
        },
        "routes": [
            { "name": "Sarvadarsanam", "wait_time": "12 hours", "description": "Free tokens required." },
            { "name": "Special Entry", "wait_time": "3 hours", "description": "Rs. 300 Ticket." }
        ],
        "smart_routes": [
            { "name": "Srivari Mettu (Walk)", "description": "Historical steps path. Less crowded than Alipiri.", "duration": "2 hours", "google_maps_link": "https://www.google.com/maps/dir/?api=1&destination=13.6833,79.3472&travelmode=walking" }
        ],
        "facilities": ["Annaprasadam", "Free Bus", "Cottages"],
        "emergency": [
            { "name": "Toll Free", "number": "1800 425 4141" }
        ],
        "parking_cameras": {
            "alipiri_parking": { "coords": [13.6617, 79.3522] },
            "multi_level_parking": { "coords": [13.6804, 79.3445] },
            "rambagicha_parking": { "coords": [13.6760, 79.3510] }
        },
        "counter_url": "http://localhost:8002/stats"
    },
    "arunachala": {
        "name": "Arunachaleswar Temple",
        "location": "Tiruvannamalai, India",
        "coords": [12.2319, 79.0677],
        "image": "./images/Arunachaleswar.jpeg",
        "timings": {
            "Darshan": "5:30 AM - 9:00 PM",
            "Deepam": "Varies by Season"
        },
        "routes": [
            { "name": "Main Tower", "wait_time": "1 hour", "description": "Entrance through the East Gopuram." }
        ],
        "smart_routes": [
            { "name": "Girivalam Path Start", "description": "Easy access during Pournami.", "duration": "10 mins", "google_maps_link": "https://www.google.com/maps/dir/?api=1&destination=12.2319,79.0677" }
        ],
        "facilities": ["Girivalam Path", "Shoe Stand", "Prasadam"],
        "emergency": [
            { "name": "Police", "number": "04175 222500" }
        ],
        "parking_cameras": {
            "east_gate_parking": { "coords": [12.2310, 79.0695] },
            "general_lot": { "coords": [12.2340, 79.0650] }
        },
        "counter_url": "http://localhost:8003/stats"
    },
    "ekambareshwar": {
        "name": "Ekambareshwar Temple",
        "location": "Kanchipuram, India",
        "coords": [12.8465, 79.7001],
        "image": "./images/EkambareshwarTemple.png",
        "timings": {
            "Darshan": "6:00 AM - 12:30 PM, 4:00 PM - 8:30 PM"
        },
        "routes": [
            { "name": "Main Entrance", "wait_time": "20 mins", "description": "Home to the 3500-year-old Mango Tree." }
        ],
        "smart_routes": [
            { "name": "South Gate Access", "description": "Quick entry near parking lot.", "duration": "5 mins", "google_maps_link": "https://www.google.com/maps/dir/?api=1&destination=12.8465,79.7001" }
        ],
        "facilities": ["Holy Mango Tree", "Ancient Halls"],
        "emergency": [
            { "name": "District Hospital", "number": "044 2722 2244" }
        ],
        "parking_cameras": {
            "front_lot": { "coords": [12.8470, 79.7010] }
        },
        "counter_url": "http://localhost:8004/stats"
    },
    "varadharaja": {
        "name": "Varadharaja Perumal",
        "location": "Kanchipuram, India",
        "coords": [12.8197, 79.7246],
        "image": "./images/Varadharaja Permual.png",
        "timings": {
            "Darshan": "6:00 AM - 11:00 AM, 4:00 PM - 8:00 PM"
        },
        "routes": [
            { "name": "Golden Lizard", "wait_time": "40 mins", "description": "Access to the special Golden Lizard shrine." }
        ],
        "smart_routes": [
            { "name": "East Gate", "description": "Less crowded, direct sanctum access.", "duration": "10 mins", "google_maps_link": "https://www.google.com/maps/dir/?api=1&destination=12.8197,79.7246" }
        ],
        "facilities": ["Hall of 100 Pillars", "Water Tank"],
        "emergency": [
            { "name": "Kanipuram Police", "number": "044 2722 2222" }
        ],
        "parking_cameras": {
            "pond_parking": { "coords": [12.8190, 79.7260] }
        },
        "counter_url": "http://localhost:8005/stats"
    },
    "annavaram": {
        "name": "Sri Veera Venkata Satyanarayana Swamy",
        "location": "Annavaram, Andhra Pradesh",
        "coords": [17.2789, 82.4043],
        "image": "./images/placeholder.png",
        "timings": {
            "Darshan": "6:00 AM - 9:00 PM"
        },
        "routes": [
            { "name": "Main Entrance", "wait_time": "15 mins", "description": "General queue" }
        ],
        "smart_routes": [],
        "facilities": ["Prasadam", "Wait Area"],
        "emergency": [],
        "parking_cameras": {
            "main_parking": { "coords": [17.2780, 82.4050] }
        },
        "counter_url": "http://localhost:8010/stats"
    }
};

export default templeData;
