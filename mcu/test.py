from motor_speed import MotorSpeed
from time import sleep
import time

dc_motor = MotorSpeed(pin1, pin2, enable)
dc_motor = MotorSpeed(pin1, pin2, enable, 350, 1023)

dc_motor.forward(100)
