# testing MotorSpeed here
from motor_speed import MotorSpeed
from time import sleep
import time

dc_motor = MotorSpeed()
dc_motor.forward(100)

# testing MotorTurn here
from motor_turn import MotorTurn
import time

servo_motor = MotorTurn()
servo_motor.move(50) # turn the servo to 0°

time.sleep(0.3)
servo_motor.move(80) # turn the servo to 90°

time.sleep(0.3)
servo_motor.move(20) # turn the servo to 180°

counter = 20
direction = 1

# turn test
while True:
    servo_motor.move(counter)
    time.sleep(0.2)
    counter += (3 * direction)
    if direction == 1 and counter > 77:
        direction = -1
    if direction == -1 and counter < 23:
        direction = 1
