#define DEBUG

#ifdef DEBUG
  #define DEBUG_BEGIN Serial.begin(115200);
  #define DEBUG_PRINT(...) Serial.print(__VA_ARGS__)
  #define DEBUG_PRINTLN(...) Serial.println(__VA_ARGS__)
#else
  #define DEBUG_BEGIN
  #define DEBUG_PRINT(...)
  #define DEBUG_PRINTLN(...)
#endif

#include <WiFi.h>
#include <driver/adc.h>

#define NUM_DATA_READ 25
#define REG_START 3

#define UInt16 uint16_t

// Compute the MODBUS RTU CRC
UInt16 ModRTU_CRC(char * buf, int len) {
  UInt16 crc = 0xFFFF;
 
  for (int pos = 0; pos < len; pos++) {
    crc ^= (UInt16)buf[pos];          // XOR byte into least sig. byte of crc
 
    for (int i = 8; i != 0; i--) {    // Loop over each bit
      if ((crc & 0x0001) != 0) {      // If the LSB is set
        crc >>= 1;                    // Shift right and XOR 0xA001
        crc ^= 0xA001;
      }
      else                            // Else LSB is not set
        crc >>= 1;                    // Just shift right
    }
  }
  // Note, this number has low and high bytes swapped, so use it accordingly (or swap bytes)
  return crc; 
}

UInt16 bytesToInt(byte b1, byte b2) {
  return (b1 * 256) + b2;
}

// Read the value of the fuel sensor
int readFuelSensor() {
  adc1_config_width(ADC_WIDTH_BIT_10);   //Range 0-1023 
  adc1_config_channel_atten(ADC1_CHANNEL_3,ADC_ATTEN_DB_11);  //ADC_ATTEN_DB_11 = 0-3,6V
  return adc1_get_raw(ADC1_CHANNEL_3); //Read analog (ADC1 channel 3 is GPIO39)
}

// MODBUS Read Holding Registers data to send to ECU
byte data[] = {
  0x01, 	// Slave ID
  0x03, 	// Function Code 3 (read Analog Output Holding Registers)
  0x10, 0x00, 	// First regsiter address (4096)
  0x00, 0x0a  	// Number of regsiters to read (10)
};

byte dataRead[NUM_DATA_READ];

// Replace with your network credentials
const char* ssid     = "[YOUR SSID]";
const char* password = "[YOUR PASSWORD]";

// Set web server port number to 80
WiFiServer server(80);

// Variable to store the HTTP request
String header;

// Adaptronic e420d ECU values to read
UInt16 RPM = 0;
UInt16 MAP = 0;
UInt16 MAT = 0;   
UInt16 WT = 0;  
UInt16 AUXT = 0;
UInt16 AFR = 0;
UInt16 TPS = 0;
UInt16 BAT = 0;
UInt16 FUEL = 0;

// For CRC
UInt16 crcValue = 0;
UInt16 crcReadValue = 0;
UInt16 crcCalcReadValue = 0; 

// Adafruit Ultimate GPS Breakout values to read
int gpsFix = 0;
float gpsLatitude = 0;
float gpsLongitude = 0;
char gpsLat = '-';
char gpsLon = '-';
float gpsSpeed = 0;
float gpsAngle = 0;
float gpsAlt = 0;
int gpsQual = 0;
int gpsSats = 0;

#include <HardwareSerial.h>
HardwareSerial Serial3(1);

#include <Adafruit_GPS.h>
#define GPSSerial Serial2

// Connect to the GPS on the hardware port
Adafruit_GPS GPS(&GPSSerial);

uint32_t timer = millis();

void setup() {
  // Debug via USB
  DEBUG_BEGIN

  // Connect to ECU via MAX3232 on GIOP5 (pin 29) & GIOP18 (pin 30)
  Serial3.begin(57600, SERIAL_8N1, 5, 18); 

  // MODBUS read registers data always the same, calculate it only once
  crcValue =  ModRTU_CRC((char *)data, 6);
 
  // Connect to Wi-Fi network with SSID and password
  WiFi.softAP(ssid, password, 1, 1, 2);

  IPAddress IP = WiFi.softAPIP();
  DEBUG_PRINT("AP IP address: ");
  DEBUG_PRINT(IP);
  
  server.begin();

  // 9600 NMEA is the default baud rate for Adafruit MTK GPS's- some use 4800
  GPS.begin(9600);
  // uncomment this line to turn on RMC (recommended minimum) and GGA (fix data) including altitude
  GPS.sendCommand(PMTK_SET_NMEA_OUTPUT_RMCGGA);
  // Set the update rate
  GPS.sendCommand(PMTK_SET_NMEA_UPDATE_5HZ); // 5 Hz update rate
  // Request updates on antenna status, comment out to keep quiet
  GPS.sendCommand(PGCMD_ANTENNA);

  delay(1000);  
}

void loop() {
  // Check for new GPS data
  if (GPS.newNMEAreceived()) {
    if (GPS.parse(GPS.lastNMEA()))  {  
     
    DEBUG_PRINT("\nTime: ");
    DEBUG_PRINT(GPS.hour, DEC); 
    DEBUG_PRINT(':');
    DEBUG_PRINT(GPS.minute, DEC); 
    DEBUG_PRINT(':');
    DEBUG_PRINT(GPS.seconds, DEC); 
    DEBUG_PRINT('.');
    DEBUG_PRINTLN(GPS.milliseconds);
    DEBUG_PRINT("Date: ");
    DEBUG_PRINT(GPS.day, DEC); 
    DEBUG_PRINT('/');
    DEBUG_PRINT(GPS.month, DEC); 
    DEBUG_PRINT("/20");
    DEBUG_PRINTLN(GPS.year, DEC);
    DEBUG_PRINT("Fix: "); 
    DEBUG_PRINT((int)GPS.fix);
    DEBUG_PRINT(" quality: "); 
    DEBUG_PRINTLN((int)GPS.fixquality);

      if (GPS.fix) {
        // We have a fix, store data
        DEBUG_PRINT("Location: ");
        DEBUG_PRINT(GPS.latitude, 4); 
        DEBUG_PRINT(GPS.lat);
        DEBUG_PRINT(", ");
        DEBUG_PRINT(GPS.longitude, 4); 
        DEBUG_PRINTLN(GPS.lon);
        DEBUG_PRINT("Speed (knots): "); 
        DEBUG_PRINTLN(GPS.speed);
        DEBUG_PRINT("Angle: "); 
        DEBUG_PRINTLN(GPS.angle);
        DEBUG_PRINT("Altitude: "); 
        DEBUG_PRINTLN(GPS.altitude);
        DEBUG_PRINT("Satellites: "); 
        DEBUG_PRINTLN((int)GPS.satellites);

        gpsFix = 1;
        gpsLatitude = GPS.latitude;
        gpsLongitude = GPS.longitude;
        gpsLat = GPS.lat;
        gpsLon = GPS.lon;
        gpsSpeed = GPS.speed;
        gpsAngle = GPS.angle;
        gpsAlt = GPS.altitude;
        gpsQual = (int)GPS.fixquality;
        gpsSats = (int)GPS.satellites;
      } else {
        gpsFix = 0;
        gpsLatitude = 0;
        gpsLongitude = 0;
        gpsLat = '-';
        gpsLon = '-';
        gpsSpeed = 0;
        gpsAngle = 0;
        gpsAlt = 0;
        gpsQual = 0;
        gpsSats = 0;
      }
    }
  } 

  if (timer > millis()) {
    // Roll over
    timer = millis();
  }

  // Store ECU data and check for incoming WiFi client every 100 ms
  if (millis() - timer > 100) {
    timer = millis(); 

  DEBUG_PRINT("crc = 0x");
  DEBUG_PRINTLN(crcValue, HEX);
//  DEBUG_PRINTLN(crcValue >> 8, HEX); 
//  DEBUG_PRINTLN(crcValue & 0xff, HEX); 

    // Write read registers data
    for (int i = 0; i < 6; i++) {
      Serial3.write(data[i]);
    }
  
    // Write read registers CRC value
    Serial3.write(crcValue & 0xff);
    Serial3.write(crcValue >> 8);
  
    Serial3.flush();
  
    int dataReadIndex = 0;

    // Read MODBUS reply data
    while (Serial3.available() && dataReadIndex < NUM_DATA_READ) {
      dataRead[dataReadIndex++] = (byte)Serial3.read();
    }
  
    crcReadValue = bytesToInt(dataRead[NUM_DATA_READ - 1], dataRead[NUM_DATA_READ - 2]);
    crcCalcReadValue =  ModRTU_CRC((char *)dataRead, NUM_DATA_READ - 2);

    DEBUG_PRINTLN(crcReadValue, HEX);
    DEBUG_PRINTLN(crcCalcReadValue, HEX);

    // Check reply CRC
    if (crcReadValue == crcCalcReadValue) {
      DEBUG_PRINTLN("CRC OK");

      RPM = bytesToInt(dataRead[REG_START], dataRead[REG_START + 1]); 		// Register 4096
      MAP = bytesToInt(dataRead[REG_START + 2], dataRead[REG_START + 3]);	// Register 4097
      MAT = bytesToInt(dataRead[REG_START + 4], dataRead[REG_START + 5]);	// Register 4098
      WT = bytesToInt(dataRead[REG_START + 6], dataRead[REG_START + 7]);	// Register 4099
      AUXT = bytesToInt(dataRead[REG_START + 8], dataRead[REG_START + 9]);	// Register 4100
      AFR = bytesToInt(dataRead[REG_START + 10], dataRead[REG_START + 11]);	// Register 4101
      TPS = bytesToInt(dataRead[REG_START + 14], dataRead[REG_START + 15]);	// Register 4103
      BAT = bytesToInt(dataRead[REG_START + 18], dataRead[REG_START + 19]);	// Register 4105
      FUEL = (UInt16)readFuelSensor();

      DEBUG_PRINTLN(String("FUEL: ") + FUEL);
      DEBUG_PRINTLN(String("BAT: ") + BAT);
    }  
  }

  // Listen for incoming clients
  WiFiClient client = server.available();   

  if (client) {                             
    String currentLine = "";                
    
    while (client.connected()) {            
      if (client.available()) {             
        char c = client.read();             
        DEBUG_PRINT(c);                    
        
        header += c;

        if (c == '\n') {                    
          if (currentLine.length() == 0) {
            // Create JSON header
            client.println("HTTP/1.1 200 OK");
            client.println("Content-type: application/json");
            client.println("Access-Control-Allow-Origin: *"); // Allow XHR requests from anywhere
            client.println("Connection: close");
            client.println();

            // Serve JSON data
            String json = 
              String("{") +
                String("\"temp\":") + String(WT) + String(",") +
                String("\"tps\":") + String(TPS) + String(",") +
                String("\"bat\":") + String(BAT) + String(",") +
                String("\"fuel\":") + String(FUEL) + String(",") +
                String("\"rpm\":") + String(RPM) + String(",") +
                String("\"gpsFix\":") + String(gpsFix) + 
                  (gpsFix ? (
                    String(",") +
                    String("\"gpsLatitude\":") + String(gpsLatitude) + String(",") +
                    String("\"gpsLongitude\":") + String(gpsLongitude) + String(",") +
                    String("\"gpsLat\":\"") + String(gpsLat) + String("\",") +
                    String("\"gpsLon\":\"") + String(gpsLon) + String("\",") +
                    String("\"gpsSpeed\":") + String(gpsSpeed) + String(",") +
                    String("\"gpsAngle\":") + String(gpsAngle) + String(",") +
                    String("\"gpsAlt\":") + String(gpsAlt) + String(",") +
                    String("\"gpsQual\":") + String(gpsQual) + String(",") +
                    String("\"gpsSats\":") + String(gpsSats)
                  ) : String("")) +
              String("}");
              
            client.println(json);      
            client.println();
            
            break;
          } else {
            currentLine = "";
          }
        } else if (c != '\r') {
          currentLine += c; 
        }
      }
    }
    
    header = "";
    client.stop();
  }
}
