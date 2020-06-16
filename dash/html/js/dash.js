// Constants for quota calculations
var ONE_MB = 1048576;
var DAY_IN_MILLISECONDS = 86400000;

// HTML elements
var waterTempGauge, afrGauge, speedGauge, rpmGauge, batGauge, fuelGauge, connectStatus, gpsConnectStatus, logsDiv, logActionSelect, logDaySelect, logSelect, sourceSelect;

// Fuel smoothing
var fuelSmoothVal = 5.0;
var numFuel = 0;
var fuelSmooth = 0;
var smoothedFuel = 0;

// Data logging
var db = null;
var logTimestamp = null;
var logDays = {};

// Backwards compatible quota calculation
var showEstimatedQuota = null;

// Install service worker to cache assets in PWA
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("serviceWorker.js");
}

document.addEventListener("DOMContentLoaded", function(event) {
    // Get guauge elements
    waterTempGauge = Gauge(document.getElementById("waterTempGauge"), {max: 120, dialStartAngle: 180, dialEndAngle: 0});
    afrGauge = Gauge(document.getElementById("afrGauge"), {max: 23, dialStartAngle: 0, dialEndAngle: 0});
    speedGauge = Gauge(document.getElementById("speedGauge"), {max: 250, dialStartAngle: 180, dialEndAngle: 0});
    rpmGauge = Gauge(document.getElementById("rpmGauge"), {max: 9000, dialStartAngle: 180, dialEndAngle: 0});
    batGauge = Gauge(document.getElementById("batGauge"), {max: 15, dialStartAngle: 180, dialEndAngle: 0, label: function(value) {return Math.round(value * 100) / 100}});
    fuelGauge = Gauge(document.getElementById("fuelGauge"), {max: 100, dialStartAngle: 180, dialEndAngle: 0});

    // Get status elements
    connectStatus = document.getElementById("connectStatus");
    gpsConnectStatus = document.getElementById("gpsConnectStatus");

    // Get log div
    logsDiv = document.getElementById("logsDiv");

    // Get select elements
    logActionSelect = document.getElementById("logActionSelect");
    logDaySelect = document.getElementById("logDaySelect");
    logSelect = document.getElementById("logSelect");
    sourceSelect = document.getElementById("sourceSelect");

    // Open data logging database
    //window.indexedDB.deleteDatabase("data_log");
    var request = window.indexedDB.open("data_log"); 

    // Create database if needed
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        db.createObjectStore("data", {keyPath: 'timestamp'}).createIndex("log_timestamp", "log_timestamp", {unique: false});
    };

    // Database opened successfully, refresh log select elements
    request.onsuccess = function(event) {
        db = event.target.result;
	refreshLogDaySelect();
    };

    // Log action select element changed
    logActionSelect.addEventListener("change", function(event) {
        var action = logActionSelect.value;

        if (action == "") {
            logDaySelect.disabled = true;
            logSelect.disabled = true;
        } else if (action == "download" || action == "delete-log") {
            logDaySelect.disabled = false;
            logSelect.disabled = false;
        } else if (action == "delete-day") {
            logDaySelect.disabled = false;
            logSelect.disabled = true;
        }

        logDaySelect.selectedIndex = 0;
        logSelect.selectedIndex = 0;
    });

    // Log day select element chnaged
    logDaySelect.addEventListener("change", function(event) {
        var action = logActionSelect.value;
        var selectedLogDay = parseInt(logDaySelect.value);

        if (action == "download" || action == "delete-log") {
            resetLogSelect();

            if (selectedLogDay != -1) {
                // Recursively populate the log select element with log times and number of log entries
                var index = db.transaction("data").objectStore("data").index("log_timestamp");
                var dayLogs = logDays[selectedLogDay];
                var logIndex = 0;
                var logTimestamp = dayLogs[logIndex];
                var numEntries = 0;                        

                var onSuccess = function(event) {
                    var cursor = event.target.result;

                    if (cursor && logTimestamp) {
                        numEntries++;
                        cursor.continue();
                    } else if (logIndex < dayLogs.length) {
                        addLogSelect(logTimestamp, numEntries);
                        logTimestamp = dayLogs[++logIndex];
                        numEntries = 0;                        
                        index.openKeyCursor(logTimestamp).onsuccess = onSuccess;
                    }
                };

                index.openKeyCursor(logTimestamp).onsuccess = onSuccess;
            }
        } else if (action == "delete-day") {
            if (selectedLogDay != -1 && "delete" == prompt("Enter \"delete\" to confirm you want to delete all logs on this day")) {
                // Recursively delete all logs on a selected day
                enableSelects(false);

                var objectStore = db.transaction(["data"], 'readwrite').objectStore("data");
            	var index = objectStore.index("log_timestamp");
                var dayLogs = logDays[selectedLogDay];
                var logIndex = 0;
                var logTimestamp = dayLogs[logIndex];

                var onSuccess = function(event) {
                    var cursor = event.target.result;

                    if (cursor && logTimestamp) {
			objectStore.delete(cursor.primaryKey);
                        cursor.continue();
                    } else if (logIndex < dayLogs.length) {
                        logTimestamp = dayLogs[++logIndex];
                        index.openKeyCursor(logTimestamp).onsuccess = onSuccess;
                    } else {
                        refreshLogDaySelect();
                    }
                };

                index.openKeyCursor(logTimestamp).onsuccess = onSuccess;
            }
        }
    });

    // Log time select element changed
    logSelect.addEventListener("change", function(event) {
        enableSelects(false);

        var selectedLog = parseInt(logSelect.value);
        var action = logActionSelect.value;

        if (selectedLog != -1 && (action == "download" || (action == "delete-log" && "delete" == prompt("Enter \"delete\" to confirm you want to delete this log")))) {
            var index = db.transaction("data").objectStore("data").index("log_timestamp");
            var logEntries = [];

            if (action == "download") {
                index.openCursor(selectedLog).onsuccess = function(event) {
                    var cursor = event.target.result;

                    if (cursor) {
                        logEntries.push(cursor.value);

                    	cursor.continue();
                    } else {
                        exportCSVFile(logEntries, formatDate(selectedLog, true) + "_" + formatTime(selectedLog, true));
                        enableSelects(true);
                    }
                };
            } else {
                index.openKeyCursor(selectedLog).onsuccess = function(event) {
                    var cursor = event.target.result;

                    if (cursor) {
                        db.transaction(["data"], 'readwrite').objectStore("data").delete(cursor.primaryKey);

                    	cursor.continue();
                    } else {
                        refreshLogDaySelect();
                    }
                };
            }
        }
    });

    // Determine correct quota API based on browser availability
    if (navigator.storage && navigator.storage.estimate) {
        showEstimatedQuota = function() {
            navigator.storage.estimate().then(function(estimate) {
                setQuotaText(estimate.usage, estimate.quota);
            });
        };
    } else if (navigator.webkitTemporaryStorage) {
        showEstimatedQuota = function() {
            navigator.webkitTemporaryStorage.queryUsageAndQuota (
                function(usedBytes, grantedBytes) {
                    setQuotaText(usedBytes, grantedBytes);
                }
            );
        };
    }

    getECUData();
    refreshLogDaySelect();
});

function enableSelects(enable) {
    logActionSelect.disabled = !enable;
    logDaySelect.disabled = !enable;
    logSelect.disabled = !enable;
}

function resetLogSelect() {
    while (logSelect.options.length > 0) {                
        logSelect.remove(0);
    }

    var selectLogOption = document.createElement("option");
    selectLogOption.value = "-1";
    selectLogOption.text = "Select log time";
    selectLogOption.selected = true;
    logSelect.add(selectLogOption);
}

function addLogSelect(timestamp, numEntries) {
    var selectLogOption = document.createElement("option");
    selectLogOption.value = timestamp;
    selectLogOption.text = formatTime(timestamp, false) + " (" + numEntries + " entries)";
    logSelect.add(selectLogOption);
}

// Update log select elements when logs added/deleted
function refreshLogDaySelect() {
    if (!db) {
        return;
    }

    logActionSelect.selectedIndex = 0;
    enableSelects(false);

    showEstimatedQuota();

    var index = db.transaction("data").objectStore("data").index("log_timestamp");

    logDays = {};

    while (logDaySelect.options.length > 0) {                
        logDaySelect.remove(0);
    }  

    var selectLogDayOption = document.createElement("option");
    selectLogDayOption.value = "-1";
    selectLogDayOption.text = "Select log day";
    selectLogDayOption.selected = true;
    logDaySelect.add(selectLogDayOption);

    resetLogSelect();

    index.openKeyCursor(null, "prevunique").onsuccess = function(event) {
        var keyCursor = event.target.result;

        if (keyCursor) {
            var day = Math.floor(keyCursor.key / DAY_IN_MILLISECONDS) * DAY_IN_MILLISECONDS;
            var dayLogs = logDays[day];

            if (!dayLogs) {
                dayLogs = [];
                logDays[day] = dayLogs;
            }

            dayLogs.push(keyCursor.key);
            
            keyCursor.continue();
        } else {
            //console.log("logDays:", logDays);

            var keys = Object.keys(logDays);
            keys.sort(function(a, b) {
                return b - a;
            });

            for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                var key = parseInt(keys[keyIndex]);
                var option = document.createElement("option");
                option.value = key;
                option.text = formatDate(key, false);
                logDaySelect.add(option);
            }
    
            enableSelects(true);
        }
    };
}
    
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

function xhrFailure(xhr) {
    if (logsDiv.style.display == "none") {
        logsDiv.style.display = "block";
        refreshLogDaySelect();
    }
    showStatus(connectStatus, false);
    showStatus(gpsConnectStatus, false);
    update(null);
    logTimestamp = null;
    setTimeout(getECUData, 500);
}

function xhrSuccess(xhr) {
    var values = JSON.parse(xhr.response);
    logsDiv.style.display = "none";
    update(values);
    showStatus(connectStatus, true);
    showStatus(gpsConnectStatus, values['gpsFix'] == 1);
    getECUData();
}

// Get the data from the ECU
function getECUData() {
    if (simulate) {
        // Simulate the ECU data
        setTimeout(function() {
            if (simulateECUConnected) {
                xhrSuccess({response: JSON.stringify(simulatedValues())});
            } else {
                xhrFailure(null);
            }
        }, 5);
   } else {
        // Retrieve ECU data from ESP32 hotspot
        ajax({
            url: 'http://192.168.4.1?' + (new Date().getTime()),
            timeout: 1000,
            success: xhrSuccess,
            failure: xhrFailure,
            ontimeout: function(e) {
                //xhrFailure(e);
            }    
        });
    }
}

// Update values
function update(values) {
    if (values == null) {
        waterTempGauge.setValue(0);
        tpsGauge.setValue(0);
        speedGauge.setValue(0);
        rpmGauge.setValue(0);
        batGauge.setValue(0);
        fuelGauge.setValue(0);
        return;
    }

    var newWaterTemp = values['wt'] == 128 ? 0 : values['wt']; // 128 is undefined from ECU
    var newAfr = values['afr'] == 255 ? 0 : values['afr']; // 255 is undefined from ECU
    var hasFix = values['gpsFix'] == 1;
    var newGpsSpeed = hasFix ? values['gpsSpeed'] * 1.852 : 0; // Convert knots to km/h
    var newRpm = values['rpm'];
    var newBat = values['bat'] / 10.0; // Battery value in volts
    var newFuel = values['fuel'];

    waterTempGauge.setValue(newWaterTemp);
    afrGauge.setValue(newAfr);
    speedGauge.setValue(newGpsSpeed);
    rpmGauge.setValue(newRpm);
    batGauge.setValue(newBat);

    if (numFuel < fuelSmoothVal) {
    	fuelSmooth += ((newFuel - 490.0) / 400.0) * 100.0; // Specific range from fuel level sensor
    	numFuel++;
    } else {
    	smoothedFuel = Math.round(fuelSmooth / fuelSmoothVal);
    	fuelSmooth = 0;
    	numFuel = 0;
    }
    	
    fuelGauge.setValue(smoothedFuel);

    // Log data
    if (db) {
        if (!logTimestamp) {
            // New log, save timestamp
            logTimestamp = new Date().getTime();
        }

        db.transaction(["data"], 'readwrite').objectStore("data").add({ 
            'timestamp': new Date().getTime(),
            'log_timestamp': logTimestamp,
            'water_temp': newWaterTemp,
            'tps': values['tps'],
            'rpm': newRpm,
            'bat': newBat,
            'fuel': smoothedFuel,
            'map': values['map'],
            'mat': values['mat'],
            'aux_temp': values['auxt'],
            'afr': newAfr,
            'gps_speed': hasFix ? newGpsSpeed : null,
            'gps_latitude': hasFix ? values['gpsLatitude'] : null,
            'gps_longitude': hasFix ? values['gpsLongitude'] : null,
            'gps_lat': hasFix ? values['gpsLat'] : null,
            'gps_lon': hasFix ? values['gpsLon'] : null,
            'gps_alt': hasFix ? values['gpsAlt'] : null,
            'gps_qual': hasFix ? values['gpsQual'] : null,
            'gps_sats': hasFix ? values['gpsSats'] : null
        });
    }
}

// Show the quota text
function setQuotaText(usedBytes, grantedBytes) {
    document.getElementById("quota").innerHTML =
       Math.round(usedBytes / ONE_MB) + " MB / " + Math.round(grantedBytes / ONE_MB) + " MB (" + Math.round((usedBytes / grantedBytes) * 100) + "%)";
}

// Format a date for dsiplay or filename
function formatDate(timestamp, isFile) {
    var date = new Date(timestamp);

    if (isFile) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2);
    }
    
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return days[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}

// Format a time for dsiplay or filename
function formatTime(timestamp, isFile) {
    var date = new Date(timestamp);

    if (isFile) {
        return pad(date.getHours(), 2) + "-" + pad(date.getMinutes(), 2) + "-" + pad(date.getSeconds(), 2);
    }

    var hours = date.getHours();
    var ampm = "am";

    if (hours >= 12) {
        ampm = "pm";
    }

    hours = hours % 12;
    if (hours == 0) {
        hours = 12;
    }

    return hours + ":" + pad(date.getMinutes(), 2) + ":" + pad(date.getSeconds(), 2) + " " + ampm;
}

// Pad a value
function pad(rawValue, num) {
    var value = rawValue.toString();

    while (value.length < num) {
        value = "0" + value;
    }

    return value;
}
