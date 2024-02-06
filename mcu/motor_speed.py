from machine import UART
from machine import Pin, PWM

frequency = 15000

class MotorSpeed:      
    def __init__(self, pin1=None, pin2=None, enable_pin=None, min_duty=750, max_duty=1023):
        if pin1:
            self.pin1 = pin1
        else:
            self.pin1 = Pin(5, Pin.OUT)

        if pin2:
            self.pin2 = pin2
        else:
            self.pin2 = Pin(4, Pin.OUT)

        if enable_pin:
            self.enable_pin = enable_pin
        else:
            self.enable = PWM(Pin(18), frequency)

        self.min_duty = min_duty
        self.max_duty = max_duty

    def forward(self, speed):
        self.speed = speed
        self.enable_pin.duty(self.duty_cycle(self.speed))
        self.pin1.value(1)
        self.pin2.value(0)

    def backwards(self, speed):
        self.speed = speed
        self.enable_pin.duty(self.duty_cycle(self.speed))
        self.pin1.value(0)
        self.pin2.value(1)

    def stop(self):
        self.enable_pin.duty(0)
        self.pin1.value(0)
        self.pin2.value(0)

    def duty_cycle(self, speed):
        if self.speed <= 0 or self.speed > 100:
            duty_cycle = 0
        else:
            duty_cycle = int(self.min_duty + (self.max_duty - self.min_duty)*((self.speed-1)/(100-1)))
            return duty_cycle
