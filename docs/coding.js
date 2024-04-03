$(document).ready(function($) {
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
          },
          {
            'type': 'field_number',
            'name': 'turn_degree',
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
          },
          {
            'type': 'field_number',
            'name': 'turn_degree',
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
            // {
            //   "kind": "block",
            //   "type": "controls_if"
            // },
            {
              "kind": "block",
              "type": "controls_repeat_ext"
            },
            // {
            //   "kind": "block",
            //   "type": "logic_compare"
            // },
            // {
            //   "kind": "block",
            //   "type": "controls_whileUntil"
            // },
            {
              "kind": "block",
              "type":"math_number"
            },
            {
              "kind": "block",
              "type":"move_forward"
            },
            {
              "kind": "block",
              "type":"move_backward"
            },
            
          ]
        }

    const workspace = Blockly.inject('blocklyDiv', {
        toolbox: toolbox,
        theme: 'dark',
    });

    $('#sync_code').on( "click", function() {
       let pythonCode = Blockly.Python.workspaceToCode(workspace);
        console.log(pythonCode); 
    });

    // Blockly.getMainWorkspace().setTheme(Blockly.Themes.HighContrast);
});
