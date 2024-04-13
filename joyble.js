$(document).ready(function($) {
    $("#jobTable").hide();

    const encoder = new TextEncoder('utf-8');
    let activeCharacteristic;
    let latestControlSingal = +new Date();

    let joy1IinputPosX = document.getElementById("joy1PosizioneX");
    let joy1InputPosY = document.getElementById("joy1PosizioneY");
    let joy1Direzione = document.getElementById("joy1Direzione");
    let joy1X = document.getElementById("joy1X");
    let joy1Y = document.getElementById("joy1Y");
         
    // Create JoyStick object into the DIV 'joy1Div'
    let Joy1 = new JoyStick('joy1Div', {}, function(stickData) {
        joy1IinputPosX.value = stickData.xPosition;
        joy1InputPosY.value = stickData.yPosition;
        joy1Direzione.value = stickData.cardinalDirection;
        joy1X.value = stickData.x;
        joy1Y.value = stickData.y;

        const now = +new Date();
        if (activeCharacteristic) {
            if ((stickData.x == "0" && stickData.y == "0")
                || now - latestControlSingal > 100) { // 0.1 second
                latestControlSingal = now;
                let payload = JSON.stringify(stickData);
                console.log(payload);
                let encodedPayload = encoder.encode(payload);

                activeCharacteristic.writeValue(encodedPayload).catch(() =>  {
                    backoff_retry_ble_payload(activeCharacteristic, encodedPayload, 1);
                });
            }
        }
    });

    function backoff_retry_ble_payload(activeCharacteristic, encodedPayload, retry_count) {
        if (retry_count >= 3) {
            console.log("maxing out retry");
        } else {
            setTimeout(() => {
                console.log("resending payload");
                activeCharacteristic.writeValue(encodedPayload).catch(() =>  {
                    console.log("-> DOMException: GATT operation already in progress.");
                    backoff_retry_ble_payload(activeCharacteristic, encodedPayload, retry_count + 1);
                });
            }, 100 * retry_count);
        }
    }

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
