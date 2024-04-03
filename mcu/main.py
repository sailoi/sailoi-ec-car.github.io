import sys

sys.path.append("")

from micropython import const
from motor_speed import MotorSpeed
from motor_turn import MotorTurn
from logger import get_logger

import uasyncio as asyncio
import aioble
import bluetooth
import machine

import struct
import os
import json

logger = get_logger()
logger.print("newly booting")

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
turn_motor = MotorTurn()

TURN_RANGE = 30
TURN_BASE = 50

def set_speed_n_direction(payload):
    # control speed and direction
    yai = int(payload["y"])

    if yai == 0:
        action = speed_motor.stop()
    elif yai > 0:
        action = speed_motor.forward(yai)
    else:
        action = speed_motor.backward(abs(yai))


def set_turns(payload):
    # control turns
    xai = int(payload["x"])

    # fitting +-100 to +-30
    diff = int(xai * .3)
    turn_motor.move(TURN_BASE + diff)


def coding_move_forward(seconds, turn_degree):
    pass


def coding_move_backward(seconds, turn_degree):
    pass


async def control_task(connection):
    try:
        with connection.timeout(None):
            while True:
                await control_characteristic.written()
                msg = control_characteristic.read()
                # control_characteristic.write(b"")

                payload = msg.decode('utf-8')
                # logger.print(f'payload: {payload}')

                try:
                    payload_obj = json.loads(payload)
                    set_speed_n_direction(payload_obj)
                    set_turns(payload_obj)
                except Exception as e:
                    logger.print('BLE connection error', e)

    except aioble.DeviceDisconnectedError:
        return


# Serially wait for connections. Don't advertise while a central is
# connected.
async def peripheral_task():
    while True:
        logger.print("Waiting for connection")
        led.on()
        # center the turns
        turn_motor.move(TURN_BASE)

        connection = await aioble.advertise(
            _ADV_INTERVAL_US,
            name='sailoi-labs-rc-car',
            services=[_RC_SERVICE_UUID],
            # 963 = Joystick at org.bluetooth.characteristic.gap.appearance.xml
            appearance=963,
            manufacturer=(0x0000, b"Sailoi"),
        )

        led.off()
        logger.print("Connection from", connection.device)
        await control_task(connection)
        await connection.disconnected()


async def speed_motor_task():
    while True:
        await asyncio.sleep(.2)
        speed_motor.check_missing_signal()


# Run both tasks.
async def main():
    await asyncio.gather(peripheral_task(), speed_motor_task())

asyncio.run(main())
