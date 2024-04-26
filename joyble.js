$(document).ready(function($) {
    $("#joyTable").hide();

    const encoder = new TextEncoder('utf-8');
    let activeCharacteristic;

    let joy1IinputPosX = document.getElementById("joy1PosizioneX");
    let joy1InputPosY = document.getElementById("joy1PosizioneY");
    let joy1Direzione = document.getElementById("joy1Direzione");
    let joy1X = document.getElementById("joy1X");
    let joy1Y = document.getElementById("joy1Y");

    let controlPayload = {x: 0, y: 0};
    let speedPressedTime = null;

    let direction = 0;
    let turning = 0;
    let pressedInterval = null;

    $('#execute_code').prop("disabled", true);
    $('#sync_code').prop("disabled", true);
         
    // Create JoyStick object into the DIV 'joy1Div'
    let Joy1 = new JoyStick(
        'joy1Div', 
        {externalStrokeColor: '#007cc4', internalStrokeColor: '#007cc4', internalFillColor: '#007cc4'}, 
        function(stickData) {
            joy1IinputPosX.value = stickData.xPosition;
            joy1InputPosY.value = stickData.yPosition;
            joy1Direzione.value = stickData.cardinalDirection;
            joy1X.value = stickData.x;
            joy1Y.value = stickData.y;

            // only update the turn controls
            controlPayload.x = stickData.x;

            if (parseInt(stickData.x) == 0 && parseInt(stickData.y) == 0) {
                // console.log("stopping turns");
                turning = 0;
                checkToStopControls();
            } else {
                turning = 1;
                checkToStartSendingControls();
            }
        });

    // disable mobile selection code
    document.getElementById('joy1Div').oncontextmenu = function(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    };

    let controlSent = null;

    function checkToStartSendingControls() {
        if (pressedInterval == null) {
            pressedInterval = setInterval(sendControls, 150);
        }
    }

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
            let payload = JSON.stringify(controlPayload);
            // console.log(payload);
            let encodedPayload = encoder.encode(payload);

            activeCharacteristic.writeValue(encodedPayload).catch((e) =>  {
                console.error("not able to send control over.");
                console.error(e);

                if (parseInt(controlPayload.x) == 0 && parseInt(controlPayload.y) == 0) {
                    setTimeout(() => {
                        console.log("resending stop controls...");
                        activeCharacteristic.writeValue(encodedPayload).catch((e2) =>  {
                            console.error("retry failed");
                            console.error(e2);
                        });
                    }, 200);
                }
            });
        }
    }

    let stopTriggeredTime = null;

    function checkToStopControls() {
        const now = +new Date();

        if (stopTriggeredTime != null) {
            var dif = Math.abs(now - stopTriggeredTime);

            if (dif < 100) {
                // onstop was just triggered, ignoring...
                return;
            }
        }

        stopTriggeredTime = now;

        if (direction == 0 && turning == 0) {
            // console.log("stopping all");
            clearInterval(pressedInterval);
            pressedInterval = null;

            // sending reset control
            setTimeout(sendControls, 200);
        }
    }

    function onforward(event) {
        console.log('forward');
        direction = 1;
        speedPressedTime = +new Date();
        checkToStartSendingControls();
    }

    function onbackward(event) {
        console.log('backward');
        direction = -1;
        speedPressedTime = +new Date();
        checkToStartSendingControls();
    }

    function onstop(event) {
        console.log('stopped');
        direction = 0;
        speedPressedTime = null;
        checkToStopControls();
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
        $('#execute_code').prop("disabled", true);
        $('#sync_code').prop("disabled", true);
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

        $('#joy1Div').prop("disabled", true);
        $('#forward').prop("disabled", true);
        $('#backward').prop("disabled", true);
        return;
    }

    function handleCharacteristicValueChanged(event) {
        var value = event.target.value;
        var enc = new TextDecoder("utf-8");
        var chat = enc.decode(value.buffer);
        // console.log('Received: ' + chat);

        if (chat == 'exe_done') {
            $("#execute_code").html('Execute!');
            $('#execute_code').prop("disabled", false);
            $('#sync_code').prop("disabled", false);
            $('#connect-ble').bootstrapToggle('enable');
        }
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

                $('#execute_code').prop("disabled", false);
                $('#sync_code').prop("disabled", false);

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
                console.log(characteristic.properties);
                console.log('> Found write characteristic');
                activeCharacteristic = characteristic;

                return activeCharacteristic.startNotifications().then(_ => {
                    console.log('> Notifications started');
                    activeCharacteristic.addEventListener('characteristicvaluechanged',
                        handleCharacteristicValueChanged);
                });
            })
            .catch(error => {
                // not connected. backing off
                connect_ble_off();
                console.log(error);
            });
        }
    });

    // manage user tabs
    let programmingInitialized = false;

    $("#Programming").click(function(){
        $('#Programming').attr("class", "nav-link active");
        $('#Controller').attr("class", "nav-link");
        $('#controller-div').hide();
        $('#programming-div').show();

        if (programmingInitialized != true) {
            // getting notification data back from the car
            // activeCharacteristic.startNotifications();
            // activeCharacteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
            // console.log('Notifications have been started.');

            Blockly.Theme.defineTheme('dark', {
              base: Blockly.Themes.Classic,
              componentStyles: {
                workspaceBackgroundColour: '#1e1e1e',
                toolboxBackgroundColour: 'blackBackground',
                toolboxForegroundColour: '#ffff',
                flyoutBackgroundColour: '#252526',
                flyoutForegroundColour: '#ccc',
                flyoutOpacity: 0.6,
                scrollbarColour: '#797979',
                insertionMarkerColour: '#fff',
                insertionMarkerOpacity: 0.3,
                scrollbarOpacity: 0.4,
                cursorColour: '#d0d0d0',
                blackBackground: '#333',
              },
            });

            Blockly.defineBlocksWithJsonArray([
              {
                'type': 'move_forward',
                'message0': 'move forward for %1 secs\nwith %2 turn degree',
                'args0': [
                  {
                    'type': 'field_number',
                    'name': 'seconds',
                    "min": 0,
                    "max": 10,
                  },
                  {
                    'type': 'field_number',
                    'name': 'turn_degree',
                    "min": -100,
                    "max": 100,
                  },
                ],
                'previousStatement': null,
                'nextStatement': null,
              },
              {
                'type': 'move_backward',
                'message0': 'move backward for %1 secs\nwith %2 turn degree',
                'args0': [
                  {
                    'type': 'field_number',
                    'name': 'seconds',
                    "min": 0,
                    "max": 10,
                  },
                  {
                    'type': 'field_number',
                    'name': 'turn_degree',
                    "min": -100,
                    "max": 100,
                  },
                ],
                'previousStatement': null,
                'nextStatement': null,
              }
            ]);

            // define the code gens
            Blockly.Python.forBlock['move_forward'] = function(block, generator) {
                let seconds = block.getFieldValue('seconds');
                let turn_degree = block.getFieldValue('turn_degree');
                return "".concat(...["coding_move_forward(", seconds, ", ", turn_degree, ")", "\n"]);
            };

            Blockly.Python.forBlock['move_backward'] = function(block, generator) {
                let seconds = block.getFieldValue('seconds');
                let turn_degree = block.getFieldValue('turn_degree');
                return "".concat(...["coding_move_backward(", seconds, ", ", turn_degree, ")", "\n"]);
            };

            const toolbox = {
              "kind": "flyoutToolbox",
              "contents": [
                {
                  "kind": "block",
                  "type":"move_forward"
                },
                {
                  "kind": "block",
                  "type":"move_backward"
                },
                {
                  "kind": "block",
                  "type": "controls_if"
                },
                {
                  "kind": "block",
                  "type": "controls_repeat_ext"
                },
                {
                  "kind": "block",
                  "type": "logic_compare"
                },
                {
                  "kind": "block",
                  "type": "controls_whileUntil"
                },
                {
                  "kind": "block",
                  "type":"math_number"
                },
                {
                  "kind": "block",
                  "type":"variables_get"
                },
                {
                  "kind": "block",
                  "type":"variables_set"
                },
                {
                  "kind": "block",
                  "type":"math_arithmetic"
                },
              ]
            }

            const workspace = Blockly.inject('blocklyDiv', {
                toolbox: toolbox,
                theme: 'dark',
            });

            $('#sync_code').on( "click", function() {
                $('#sync_code').prop("disabled", true);
                $('#execute_code').prop("disabled", true);

                let pythonCode = Blockly.Python.workspaceToCode(workspace);
                console.log(pythonCode);

                let payload = JSON.stringify({code: pythonCode});
                let encodedPayload = encoder.encode(payload);
                let successMsg = 'your programming is synced to the car';

                activeCharacteristic.writeValue(encodedPayload).then((data) => {
                    alert(successMsg);

                }).catch((e) =>  {
                    console.error("not able to send code over, retrying");
                    console.error(e);

                    setTimeout(() => {
                        console.log("resending code...");
                        activeCharacteristic.writeValue(encodedPayload).then((data) => {
                            alert(successMsg);
                        }).catch((e2) =>  {
                            console.error("retry failed");
                            console.error(e2);
                        });
                    }, 200);
                });

                $('#sync_code').prop("disabled", false);
                $('#execute_code').prop("disabled", false);
            });

            $('#execute_code').on( "click", function() {
                $('#execute_code').prop("disabled", true);
                $('#sync_code').prop("disabled", true);
                $('#connect-ble').bootstrapToggle('disable');

                let payload = JSON.stringify({execute: 'dah!'});
                let encodedPayload = encoder.encode(payload);
                let successMsg = 'executing...';

                activeCharacteristic.writeValue(encodedPayload).then((data) => {
                    $("#execute_code").html(successMsg);

                }).catch((e) =>  {
                    console.error("not able to send execute command over, retrying");
                    console.error(e);

                    setTimeout(() => {
                        console.log("re-trying running code...");
                        activeCharacteristic.writeValue(encodedPayload).then((data) => {
                            $("#execute_code").html(successMsg);
                        }).catch((e2) =>  {
                            console.error("retry failed");
                            console.error(e2);
                            $('#execute_code').prop("disabled", false);
                            $('#sync_code').prop("disabled", false);
                        });
                    }, 200);
                });
            });

            programmingInitialized = true;
        }
    });

    $("#Controller").click(function(){
        $('#Programming').attr("class", "nav-link");
        $('#Controller').attr("class", "nav-link active");
        $('#controller-div').show();
        $('#programming-div').hide();
    });

    $('#programming-div').hide();

});
