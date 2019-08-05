var statusGauge, tempGauge, tpsGauge, speedGauge, rpmGauge, batGauge, fuelGauge, connectStatus;
var fuelSmoothVal = 5.0;
var numFuel = 0;
var fuelSmooth = 0;

document.addEventListener("DOMContentLoaded", function(event) {
	// Get guauge elements
    statusGauge = Gauge(document.getElementById("statusGauge"), {max: 100, dialStartAngle: 180, dialEndAngle: 0});
    tempGauge = Gauge(document.getElementById("tempGauge"), {max: 120, dialStartAngle: 180, dialEndAngle: 0});
    tpsGauge = Gauge(document.getElementById("tpsGauge"), {max: 150, dialStartAngle: 180, dialEndAngle: 0});
    speedGauge = Gauge(document.getElementById("speedGauge"), {max: 250, dialStartAngle: 180, dialEndAngle: 0});
    rpmGauge = Gauge(document.getElementById("rpmGauge"), {max: 9000, dialStartAngle: 180, dialEndAngle: 0});
    batGauge = Gauge(document.getElementById("batGauge"), {max: 15, dialStartAngle: 180, dialEndAngle: 0, label: function(value) {return Math.round(value * 100) / 100}});
    fuelGauge = Gauge(document.getElementById("fuelGauge"), {max: 100, dialStartAngle: 180, dialEndAngle: 0});

    // Get status elements
    connectStatus = document.getElementById("connectStatus");
    gpsConnectStatus = document.getElementById("gpsConnectStatus");

    getECUData();
});
    
function ajax(cfg) {
    var xhr,
        url = cfg.url,
        method = cfg.method || 'GET',
        success = cfg.success || function () {},
        failure = cfg.failure || function () {};

    try {
        xhr = new XMLHttpRequest();
    } catch (e) {
        xhr = new ActiveXObject("Msxml2.XMLHTTP");
    }

    xhr.timeout = cfg.timeout || 2000;
    xhr.ontimeout = cfg.ontimeout || function () {
    	console.log('xhr to ' + url + ' timed out');
    };

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                success.call(null, xhr);
            } else {
                failure.call(null, xhr);
            }
        }
    }

    xhr.open(method, url);
    xhr.send(null);
}

function showStatus(element, status) {
    element.style.backgroundColor = status ? "#00ff00" : "#ff0000";
}

function xhrFailure(obj) {
    showStatus(connectStatus, false);
    showStatus(gpsConnectStatus, false);
    update(0, 0, 0, 0, 0, 0);
    fuelGauge.setValue(0);
    getECUData();
}

// Get the data from the ECU (via ESP32 hotspot)
function getECUData() {
    ajax({
        url: 'http://192.168.4.1',
        timeout: 1000,
        success: function(xhr) {
            var values = JSON.parse(xhr.response);
            var hasFix = values['gpsFix'] == 1;
            update(values['temp'], values['tps'], hasFix ? values['gpsSpeed'] : 0, values['rpm'], values['bat'], values['fuel']);
            showStatus(connectStatus, true);
            showStatus(gpsConnectStatus, hasFix);
            getECUData();
        },
        failure: function(xhr) {
            xhrFailure(xhr);
        },
        ontimeout: function(e) {
            //xhrFailure(e);
        }    
    });
}

// Update values
function update(newTemp, newTps, newSpeed, newRpm, newBat, newFuel) {
    tempGauge.setValue(newTemp == 128 ? 0 : newTemp);
    tpsGauge.setValue(newTps == 255 ? 0 : newTps);
    speedGauge.setValue(newSpeed * 1.852); // Convert knots to km/h
    rpmGauge.setValue(newRpm);
    batGauge.setValue(newBat / 10.0);

    if (numFuel < fuelSmoothVal) {
    	fuelSmooth += ((newFuel - 490.0) / 400.0) * 100.0; // Specific range from fuel level sensor
    	numFuel++;
    } else {
    	fuelGauge.setValue(Math.round(fuelSmooth / fuelSmoothVal));
    	fuelSmooth = 0;
    	numFuel = 0;
    }
}