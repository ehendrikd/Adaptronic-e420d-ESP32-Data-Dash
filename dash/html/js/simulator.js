// GET variables passed in via URL
var get = [];

// Populate GET url variables
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(a, name, value) {
    get[name] = value;
});

// Turn on/off simulate ECU and GPS
var simulateECUConnected = get['ecu-connected'];
var simulateGPSConnected = get['gps-connected'];

// Generate a sin wave value
var getSinValue = function(min, max, now) {
    return ((Math.sin(((now / 10.0) % 360) * Math.PI / 180) + 1) / 2) * (max - min);
}

// Get the simulated ECU values
function simulatedValues() {
    var now = new Date().getTime();

    // Simluate ESP32 data
    var values = {
        wt: getSinValue(0, 120, now),
        tps: getSinValue(0, 150, now += 500),
        bat: getSinValue(0, 150, now += 500),
        fuel: ((getSinValue(0, 100, now += 500) / 100.0) * 400.0) + 490.0,
        rpm: getSinValue(0, 9000, now += 500),
        map: getSinValue(0, 30, now += 500),
        mat: getSinValue(0, 120, now += 500),
        auxt: getSinValue(0, 120, now += 500),
        afr: getSinValue(0, 25, now += 500),
        gpsFix: 0
    };

    if (simulateGPSConnected) {
        values.gpsFix = 1;
        values.gpsLatitude = getSinValue(-90, 90, now += 500);
        values.gpsLongitude = getSinValue(-180, 180, now += 500);
        values.gpsLat = 0;
        values.gpsLon = 0;
        values.gpsSpeed = getSinValue(0, 250, now += 500) / 1.852;
        values.gpsAngle = 0;
        values.gpsAlt = 0;
        values.gpsQual = 0;
        values.gpsSats = 0;	
    }

    return values;
}
