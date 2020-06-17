# Adaptronic e420d ESP32 Data Dash

A **digital dashboard** for displaying and logging internal combustion engine electronic fuel injection (EFI) data from the programmable **Adaptronic e420d** engine control unit (ECU).

![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
<!--
# Adaptronic-e420d-ESP32-Data-Dash

Ardunio sketch for ESP32 that reads data from an Adaptronic e420d ECU. This is achieved by sending MODBUS read register requests through a Sparkfun MAX3232 RS232 to TTL board connected to the e420d serial out 2.5mm socket. GPS data is read from an Adafruit Ultimate GPS Breakout. Fuel tank level read via analogue input. 3.3v - 5v converted from car 12v via LM2596 step down module. ESP32 creates a WiFi hotspot and HTTP server that serves JSON data when requested. Dashboard HTML file can be run on any device with a web browser connected to the ESP32 hotspot to request and render dashboard guages (currently using a 7" Android tablet).

# Wiring

![Wiring](wiring.png)

# Todo

* Log data
* Display logged data
* Create immobilizer with fuel cut
-->