import sys

sys.path.append("")

from micropython import const
from motor_speed import MotorSpeed

import uasyncio as asyncio
import aioble
import bluetooth
import machine

import struct
import os
import json

# Randomly generated UUIDs.
_RC_SERVICE_UUID = bluetooth.UUID("f85fadf7-00bd-4063-9168-4da8d5232ed1")
_CONTROL_CHARACTERISTIC_UUID = bluetooth.UUID("5c322ef5-5421-4eef-81e9-70be45807310")

# How frequently to send advertising beacons.
_ADV_INTERVAL_US = const(250000)

# Register GATT server.
rc_service = aioble.Service(_RC_SERVICE_UUID)
control_characteristic = aioble.Characteristic(rc_service, _CONTROL_CHARACTERISTIC_UUID, write=True)

aioble.register_services(rc_service)
aioble.core.ble.gatts_set_buffer(control_characteristic._value_handle, 512)

led = machine.Pin(2, machine.Pin.OUT)
speed_motor = MotorSpeed()


async def control_task(connection):
    try:
        with connection.timeout(None):
            while True:
                print("Waiting for write")
                await control_characteristic.written()
                msg = control_characteristic.read()
                # control_characteristic.write(b"")

                payload = msg.decode('utf-8')
                print(f'payload: {payload}')

    except aioble.DeviceDisconnectedError:
        return


# Serially wait for connections. Don't advertise while a central is
# connected.
async def peripheral_task():
    while True:
        print("Waiting for connection")
        led.on()

        connection = await aioble.advertise(
            _ADV_INTERVAL_US,
            name='sailoi-labs-rc-car',
            services=[_RC_SERVICE_UUID],
            # 963 = Joystick at org.bluetooth.characteristic.gap.appearance.xml
            appearance=963,
            manufacturer=(0x0000, b"Sailoi"),
        )

        led.off()
        print("Connection from", connection.device)
        await control_task(connection)
        await connection.disconnected()


# Run both tasks.
async def main():
    await peripheral_task()


asyncio.run(main())
