$(document).ready(function($) {
    $("#joyTable").hide();

    const encoder = new TextEncoder('utf-8');
    let activeCharacteristic;
    let latestControlSingal = +new Date();

    let joy1IinputPosX = document.getElementById("joy1PosizioneX");
    let joy1InputPosY = document.getElementById("joy1PosizioneY");
    let joy1Direzione = document.getElementById("joy1Direzione");
    let joy1X = document.getElementById("joy1X");
    let joy1Y = document.getElementById("joy1Y");

    let controlPayload = {x: 0, y: 0};
    let speedPressedTime = null;
    let direction = 0;
         
    // Create JoyStick object into the DIV 'joy1Div'
    let Joy1 = new JoyStick('joy1Div', {}, function(stickData) {
        joy1IinputPosX.value = stickData.xPosition;
        joy1InputPosY.value = stickData.yPosition;
        joy1Direzione.value = stickData.cardinalDirection;
        joy1X.value = stickData.x;
        joy1Y.value = stickData.y;

        // only update the turn controls
        controlPayload.x = stickData.x;
    });

    // disable mobile selection code
    document.getElementById('joy1Div').oncontextmenu = function(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    };

    function sendControls() {
        const now = +new Date();

        // calculate the speed and direction
        if (speedPressedTime != null) {
            var dif = Math.abs(now - speedPressedTime) / 1000;

            if (dif > 2) {
                // long pressing longer than 2 secs, go full speed
                controlPayload.y = direction * 100;
            } else {
                controlPayload.y = direction * 85;
            }
        } else {
            controlPayload.y = direction * 85;
        }

        if (activeCharacteristic) {
            if (now - latestControlSingal > 100) { // 0.1 second
                latestControlSingal = now;
                let payload = JSON.stringify(controlPayload);
                // console.log(payload);
                let encodedPayload = encoder.encode(payload);

                activeCharacteristic.writeValue(encodedPayload).catch((e) =>  {
                    console.error("not able to send control over");
                    console.error(e);
                });
            }
        }

        // schedule for the next control delivery
        setTimeout(() => {
            sendControls();
        }, 200);
    }

    function onforward(event) {
        console.log('forward');
        direction = 1;
        speedPressedTime = +new Date();
    }

    function onbackward(event) {
        console.log('backward');
        direction = -1;
        speedPressedTime = +new Date();
    }

    function onstop(event) {
        console.log('stopped');
        direction = 0;
        speedPressedTime = null;
    }

    // configure forward and backward
    // Check if the device support the touch or not
    let forward = document.getElementById("forward");
    let backward = document.getElementById("backward");

    // disable mobile selection code
    forward.oncontextmenu = function(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    };

    // disable mobile selection code
    backward.oncontextmenu = function(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    };

    if("ontouchstart" in document.documentElement)
    {
        forward.addEventListener("touchstart", onforward, false);
        backward.addEventListener("touchstart", onbackward, false);

        forward.addEventListener("touchend", onstop, false);
        backward.addEventListener("touchend", onstop, false);
    }
    else
    {
        forward.addEventListener("mousedown", onforward, false);
        backward.addEventListener("mousedown", onbackward, false);

        forward.addEventListener("mouseup", onstop, false);
        backward.addEventListener("mouseup", onstop, false);
    }

    // disable contextmenu because long press on muse will trigger the mose right button
    document.addEventListener('contextmenu', event => event.preventDefault());


    // BLE related code
    function connect_ble_off() {
        $('#connect-ble').bootstrapToggle('off');
    }

    function onDisconnected(event) {
        const device = event.target;
        console.log(`Device ${device.name} is disconnected.`);
      
        activeCharacteristic = null;
        connect_ble_off();
    }

    // Check if browser supports Web Bluetooth API.
    if (navigator.bluetooth == undefined) {
        $('#no-bluetooth').modal('toggle');
        connect_ble_off();
        $('#connect-ble').bootstrapToggle('disable');
        return;
    }

    // Check if browser supports Web Bluetooth API.
    $("#connect-ble").change(function() {
        if(this.checked) {
            //start to connect to the car
            navigator.bluetooth.requestDevice({ 
                "filters":[{"namePrefix":"sailoi"}],
                "optionalServices": ['f85fadf7-00bd-4063-9168-4da8d5232ed1']
            })
            .then(device => {
                device.addEventListener('gattserverdisconnected', onDisconnected);
                console.log('connected');

                // reigster BLE to disconnect as soon as the toggle is off
                $("#connect-ble").change(function() {
                    if(!this.checked) {
                        device.gatt.disconnect();
                    }
                });

                // start the control signal sending
                sendControls();

                return device.gatt.connect();
            })
            .then(server => {
                console.log('> Found GATT server');
                return server.getPrimaryService('f85fadf7-00bd-4063-9168-4da8d5232ed1');
            })
            .then(service => {
                console.log('> Found car service');
                return service.getCharacteristic('5c322ef5-5421-4eef-81e9-70be45807310');
            })
            .then(characteristic => {
                console.log('> Found write characteristic');
                activeCharacteristic = characteristic;
                return characteristic.writeValue(encoder.encode('web joystick connected'));
            })
            .catch(error => {
                // not connected. backing off
                connect_ble_off();
                console.log(error);
            });
        }
    });
});
