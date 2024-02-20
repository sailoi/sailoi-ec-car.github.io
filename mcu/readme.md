# the MCU part of the RC car

This doc notes down the commands when it comes to working with ESP32 MCU on the RC car project.

# to tap into python repel or console logs

```
sudo picocom /dev/ttyUSB0 -b115200
```

# to send a script to ESP32

```
sudo ampy --port /dev/ttyUSB0 put main.py
```

# to read or get the existing script from ESP32


```
sudo ampy --port /dev/ttyUSB0 get main.py
```
