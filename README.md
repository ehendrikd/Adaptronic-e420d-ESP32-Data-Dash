# Adaptronic e420d ESP32 Data Dash 🏎️

<img align="right" src="./doc/dashboard-animated.gif?raw=true">

A platform agnostic **digital dashboard** for displaying and logging internal combustion engine electronic fuel injection (EFI) data from the programmable [Adaptronic e420d](https://www.google.com/search?tbm=isch&q=Adaptronic+e420d) engine control unit (ECU).

- [Progressive Web App (PWA)](https://en.wikipedia.org/wiki/Progressive_web_application) dashboard
- Lightweight vanilla JavaScript, except for the [SVG gauges](https://github.com/naikus/svg-gauge)
- Data logged in [IndexedDB](https://en.wikipedia.org/wiki/Indexed_Database_API)
- Data downloadable from dashboard in [CSV](https://en.wikipedia.org/wiki/Comma-separated_values) format
- ECU communication using the [ESP32](https://en.wikipedia.org/wiki/ESP32) [Arduino core](https://github.com/espressif/arduino-esp32)
- GPS coordinates acquired by an [Adafruit Ultimate GPS Breakout v3](https://www.adafruit.com/product/746)

[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)](https://github.com/ehendrikd/Adaptronic-e420d-ESP32-Data-Dash/pulls)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PWA Shields](https://www.pwa-shields.com/1.0.0/series/install/purple.svg)](https://ehendrikd.github.io/Adaptronic-e420d-ESP32-Data-Dash/dash/html)

## Dashboard demo & installation

[Demo the PWA dashboard](https://ehendrikd.github.io/dashboard-demo) with simulated ECU and GPS data via the checkboxes at the top of the page. The logged data can be downloaded via the drop down lists at the bottom of the dashboard when the *ignition is off*.
<!--
<img align="right" src="https://img.youtube.com/vi/JcmNZFP9-5Q/hqdefault.jpg" style="height: 50%; width: 50%;">
-->
[Install the PWA dashboard](https://ehendrikd.github.io/Adaptronic-e420d-ESP32-Data-Dash/dash/html) on a supported browser:

- Safari for iOS (iPhone, iPad) - [show me how](https://www.macrumors.com/how-to/add-a-web-link-to-home-screen-iphone-ipad)
- Google Chrome for Android - [show me how](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en&oco=1)
- Mozilla Firefox for Android - [show me how](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Add_to_home_screen)
- Google Chrome for Desktop (Windows, macOS, Linux) - [show me how](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop&hl=en&oco=1)
- Microsoft Edge for Windows - [show me how](https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/#pwas-on-microsoft-edge-chromium)

<!--
## Use in the wild

[![Watch the video](https://img.youtube.com/vi/JcmNZFP9-5Q/hqdefault.jpg)](https://www.youtube.com/watch?v=JcmNZFP9-5Q)
-->
<!--
# Implementation

The system is comprised of two main components, the *digital dashoard* software and the *data acquisition unit* (DAU), or black box that contains all the electronic bits.

## Digital dashboard

## DAU
->
<!--
# Adaptronic-e420d-ESP32-Data-Dash

Ardunio sketch for ESP32 that reads data from an Adaptronic e420d ECU. This is achieved by sending MODBUS read register requests through a Sparkfun MAX3232 RS232 to TTL board connected to the e420d serial out 2.5mm socket. GPS data is read from an Adafruit Ultimate GPS Breakout. Fuel tank level read via analogue input. 3.3v - 5v converted from car 12v via LM2596 step down module. ESP32 creates a WiFi hotspot and HTTP server that serves JSON data when requested. Dashboard HTML file can be run on any device with a web browser connected to the ESP32 hotspot to request and render dashboard guages (currently using a 7" Android tablet).
-->
# Wiring

![Wiring](doc/wiring.png)
<!--
# Todo

* Log data
* Display logged data
* Create immobilizer with fuel cut
-->
