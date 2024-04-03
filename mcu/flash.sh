set -e

# erase the esp32
esptool.py --chip esp32 --port /dev/ttyUSB0 erase_flash

# flash the esp32 with the base image
esptool.py --chip esp32 --port /dev/ttyUSB0 --baud 460800 write_flash -z 0x1000 'ESP32_GENERIC-20240105-v1.22.1.bin'

sleep 8

# install python dependencies
mpremote mip install aioble

# add in the local scripts 
ampy --port /dev/ttyUSB0 put boot.py
ampy --port /dev/ttyUSB0 put main.py
ampy --port /dev/ttyUSB0 put motor_speed.py
ampy --port /dev/ttyUSB0 put motor_turn.py
ampy --port /dev/ttyUSB0 put logger.py

echo "all good. local files are:"
ampy --port /dev/ttyUSB0 ls

echo "please reboot the board before use"
