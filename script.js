// Default Coordinates: New Delhi Tech Defense Hub
const INITIAL_LAT = 28.6139;
const INITIAL_LNG = 77.2090;

// Initialize Tactical Map with CartoDB Dark Matter tiles (Free, No API Key needed)
const map = L.map('map', { zoomControl: false }).setView([INITIAL_LAT, INITIAL_LNG], 13);
L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// 1. DEFINE ARBITRARY N-SIDED POLYGON GEOFENCE (RED RESTRICTED ZONE)
const geofencePolygon = [
    [28.6250, 77.2000],
    [28.6300, 77.2250],
    [28.6100, 77.2350],
    [28.6000, 77.2100],
    [28.6150, 77.1950]
];

const polygonLayer = L.polygon(geofencePolygon, {
    color: '#FF2E55',
    fillColor: '#FF2E55',
    fillOpacity: 0.25,
    weight: 2,
    dashArray: '5, 5'
}).addTo(map);

// Add pulsating Target Marker
const targetIcon = L.divIcon({
    className: 'custom-drone-icon',
    html: '<div style="width:16px; height:16px; background:#00F0FF; border:2px solid white; border-radius:50%; box-shadow:0 0 12px #00F0FF;"></div>',
    iconSize: [16, 16]
});

let currentPosition = [28.5900, 77.1900]; // Starts outside the zone
let targetMarker = L.marker(currentPosition, { icon: targetIcon }).addTo(map);

let lastPosition = [...currentPosition];
let lastTimestamp = Date.now();

// ==========================================
// 2. RAY-CASTING ALGORITHM (JORDAN CURVE THEOREM)
// Tests whether a coordinate (x, y) is inside polygon without external libraries
// ==========================================
function isPointInPolygon(point, polygon) {
    const lat = point[0];
    const lng = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }
    return inside;
}

// ==========================================
// 3. HAVERSINE DISTANCE & SPOOFING DETECTOR
// ==========================================
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's mean radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function updateTargetLocation(newLat, newLng) {
    const now = Date.now();
    const timeDeltaHours = (now - lastTimestamp) / (1000 * 3600);
    const distanceKm = calculateHaversineKm(lastPosition[0], lastPosition[1], newLat, newLng);

    const speedKmH = timeDeltaHours > 0 ? (distanceKm / timeDeltaHours) : 0;

    // Telemetry UI Update
    document.getElementById('telemetryLat').textContent = newLat.toFixed(5);
    document.getElementById('telemetryLng').textContent = newLng.toFixed(5);
    document.getElementById('telemetrySpeed').textContent = `${speedKmH.toFixed(1)} km/h`;

    // Move Marker
    currentPosition = [newLat, newLng];
    targetMarker.setLatLng(currentPosition);

    // 1. Check for Teleportation Anomaly / GPS Spoofing (> 800 km/h jump)
    if (speedKmH > 800 && distanceKm > 10) {
        logAlert(`⚠️ SPOOFING DETECTED: Kinematic Jump of ${distanceKm.toFixed(1)}km at ${speedKmH.toFixed(0)}km/h!`);
        document.getElementById('geoStatus').textContent = "ANOMALY: GPS SPOOFING";
        document.getElementById('geoStatus').className = "hud-status breach";
        lastPosition = [newLat, newLng];
        lastTimestamp = now;
        return;
    }

    // 2. Ray-Casting Geofence Check
    const inside = isPointInPolygon(currentPosition, geofencePolygon);
    const statusElem = document.getElementById('geoStatus');

    if (inside) {
        statusElem.textContent = "ALARM: RESTRICTED AIRSPACE BREACHED!";
        statusElem.className = "hud-status breach";
        polygonLayer.setStyle({ fillColor: '#FF2E55', fillOpacity: 0.5 });
        logAlert(`🚨 GEOFENCE BREACH: Entity entered restricted airspace at [${newLat.toFixed(3)}, ${newLng.toFixed(3)}]`);
    } else {
        statusElem.textContent = "PERIMETER: SECURE";
        statusElem.className = "hud-status";
        polygonLayer.setStyle({ fillColor: '#FF2E55', fillOpacity: 0.2 });
    }

    lastPosition = [newLat, newLng];
    lastTimestamp = now;
}

// Click anywhere on map to trigger location update
map.on('click', function(e) {
    updateTargetLocation(e.latlng.lat, e.latlng.lng);
});

// Logger
function logAlert(msg) {
    const stream = document.getElementById('breachLog');
    const row = document.createElement('div');
    row.innerHTML = `<span class="log-alert">${msg}</span>`;
    stream.appendChild(row);
    if (stream.children.length > 5) stream.removeChild(stream.children[0]);
}

// ==========================================
// 4. SIMULATION SEQUENCES
// ==========================================
let flightInterval;
function startFlightSimulation() {
    clearInterval(flightInterval);
    let step = 0;
    // Straight flight path that cuts through the restricted polygon
    const steps = [
        [28.5900, 77.1900],
        [28.6000, 77.2000],
        [28.6150, 77.2150], // Inside!
        [28.6200, 77.2200], // Inside!
        [28.6350, 77.2350]  // Exits
    ];

    flightInterval = setInterval(() => {
        if (step >= steps.length) {
            clearInterval(flightInterval);
            return;
        }
        updateTargetLocation(steps[step][0], steps[step][1]);
        map.panTo(steps[step]);
        step++;
    }, 1800);
}

function triggerSpoofingAttack() {
    // Impossible Jump (From Delhi to Mumbai: ~1150 km in 1 millisecond)
    const spoofedLat = 19.0760;
    const spoofedLng = 72.8777;
    updateTargetLocation(spoofedLat, spoofedLng);
}

// ==========================================
// 5. EXIF GEOTAG EXTRACTION
// ==========================================
function extractExif(event) {
    const file = event.target.files[0];
    if (!file) return;

    EXIF.getData(file, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lon = EXIF.getTag(this, "GPSLongitude");
        const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
        const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";

        if (lat && lon) {
            // Convert DMS (Degrees, Minutes, Seconds) to Decimal Degrees
            const latDec = (lat[0] + lat[1] / 60 + lat[2] / 3600) * (latRef === "N" ? 1 : -1);
            const lonDec = (lon[0] + lon[1] / 60 + lon[2] / 3600) * (lonRef === "E" ? 1 : -1);

            document.getElementById('exifData').innerHTML = `
                Found Coordinates in EXIF:<br>
                <strong>LAT:</strong> ${latDec.toFixed(6)} | <strong>LNG:</strong> ${lonDec.toFixed(6)}
            `;

            updateTargetLocation(latDec, lonDec);
            map.flyTo([latDec, lonDec], 15);
        } else {
            document.getElementById('exifData').textContent = 
                "No GPS metadata found in photo (camera location was disabled or stripped).";
        }
    });
}
