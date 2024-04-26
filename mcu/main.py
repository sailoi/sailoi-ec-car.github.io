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
import time

logger = get_logger()
logger.print("newly booting")

# Randomly generated UUIDs.
_RC_SERVICE_UUID = bluetooth.UUID("f85fadf7-00bd-4063-9168-4da8d5232ed1")
_CONTROL_CHARACTERISTIC_UUID = bluetooth.UUID("5c322ef5-5421-4eef-81e9-70be45807310")

# How frequently to send advertising beacons.
_ADV_INTERVAL_US = const(250000)

# Register GATT server.
rc_service = aioble.Service(_RC_SERVICE_UUID)
control_characteristic = aioble.Characteristic(rc_service, _CONTROL_CHARACTERISTIC_UUID, read=True, write=True, notify=True)

aioble.register_services(rc_service)
aioble.core.ble.gatts_set_buffer(control_characteristic._value_handle, 512)

led = machine.Pin(2, machine.Pin.OUT)
speed_motor = MotorSpeed()
turn_motor = MotorTurn()

TURN_BASE = 50


def set_speed_n_direction(payload):
    # control speed and direction
    yai = int(payload["y"])

    if yai == 0:
        speed_motor.stop()
    elif yai > 0:
        speed_motor.forward(yai)
    else:
        speed_motor.backward(abs(yai))


def _get_turn_degree(xai):
    # fitting +-100 to +-30
    return TURN_BASE + int(xai * .3)


def set_turns(payload):
    # control turns
    xai = int(payload["x"])
    turn_motor.move(_get_turn_degree(xai))


def coding_move_forward(seconds, turn_degree):
    turn_motor.move(_get_turn_degree(turn_degree))
    speed_motor.forward(150)
    time.sleep(seconds)


def coding_move_backward(seconds, turn_degree):
    turn_motor.move(_get_turn_degree(turn_degree))
    speed_motor.backward(150)
    time.sleep(seconds)


async def control_task(connection):
    try:
        program_code = None

        with connection.timeout(None):
            while True:
                await control_characteristic.written()
                msg = control_characteristic.read()

                payload = msg.decode('utf-8')
                # logger.print(f'payload: {payload}')

                try:
                    payload_obj = json.loads(payload)

                    if 'code' in payload_obj:
                        program_code = payload_obj['code']
                        logger.print(f'code synced:\n{program_code}')

                    elif 'execute' in payload_obj:
                        exec(program_code)
                        logger.print(f'code executed')
                        control_characteristic.notify(connection, b'exe_done')
                        # control_characteristic.write(b'exe_done')

                    elif 'msg' in payload_obj:
                        logger.print(f'message payload', payload)

                    else:
                        set_speed_n_direction(payload_obj)
                        set_turns(payload_obj)

                except Exception as e:
                    logger.print('error controling the car', e, payload)

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
