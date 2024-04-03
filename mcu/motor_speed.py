from machine import UART
from machine import Pin, PWM

import time

frequency = 15000
min_duty = 100
max_duty = 1023

class MotorSpeed:
    # these defaults work for the standard L298N
    # borrowed from the post here at: https://randomnerdtutorials.com/esp32-dc-motor-l298n-motor-driver-control-speed-direction/
    def __init__(self, pin1=None, pin2=None, enable_pin=None):
        if pin1:
            self.pin1 = pin1
        else:
            self.pin1 = Pin(26, Pin.OUT)

        if pin2:
            self.pin2 = pin2
        else:
            self.pin2 = Pin(27, Pin.OUT)

        if enable_pin:
            self.enable_pin = enable_pin
        else:
            self.enable_pin = PWM(Pin(14), frequency)

        self.last_driven = time.time()

    def forward(self, speed):
        self.speed = speed
        self.enable_pin.duty(self.duty_cycle(self.speed))
        self.pin1.value(1)
        self.pin2.value(0)

        self.last_driven = time.time()

    def backward(self, speed):
        self.speed = speed
        self.enable_pin.duty(self.duty_cycle(self.speed))
        self.pin1.value(0)
        self.pin2.value(1)

        self.last_driven = time.time()

    def stop(self):
        self.enable_pin.duty(0)
        self.pin1.value(0)
        self.pin2.value(0)

        self.last_driven = time.time()

    def duty_cycle(self, speed):
        if self.speed <= 0 or self.speed > 100:
            duty_cycle = 0
        else:
            duty_cycle = int(min_duty + (max_duty - min_duty)*((self.speed - 1)/(100 - 1)))

        return duty_cycle

    def check_missing_signal(self):
        now = time.time()

        if now - self.last_driven >= 0.5 and (self.pin2.value() != 0 and self.pin1.value() != 0):
            print('stopping for no driving signal')
            self.stop()
