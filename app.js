const WebSocketClient = require('websocket').client;
const client = new WebSocketClient();

const channel = 'simulation:GCNm8g==';
const roombaIP = 'roombots.mx.com';

var _ = require('lodash');
var moment = require('moment');

const phxJoin = function(connection) {
    const initMessage = {
        topic: channel,
        event: 'phx_join',
        ref: 1,
        payload: {}
    };

    if (connection.connected) {
        connection.sendUTF(JSON.stringify(initMessage));
    }
};

const heartbeat = function(connection) {
    console.log('Heart Beating');

    const heartbeatMessage = {
        topic: 'phoenix',
        event: 'heartbeat',
        payload: {},
        ref: 10
    };

    setInterval(function() {
        connection.sendUTF(JSON.stringify(heartbeatMessage));
    }, 1000);
};

function checkObj(obj) {
    var newObj = {
        farLeft: obj.light_bumper_left,
        midLeft: obj.light_bumper_left_front,
        centerLeft: obj.light_bumper_left_center,
        centerRight: obj.light_bumper_right_center,
        midRight: obj.light_bumper_right_front,
        farRight: obj.light_bumper_right
    };
    if (!obj.status) {
        var midM = 3;
        var cenM = 6;
        var left = newObj.farLeft + newObj.midLeft * midM + newObj.centerLeft * cenM;
        var right = newObj.farRight + newObj.midRight * midM + newObj.centerRight * cenM;
        return [left, right, left + right];
    }
}

var driveMessage;

function cb(e) {
    driveMessage = {
        topic: channel,
        event: 'drive',
        ref: 15,
        payload: {
            velocity: e[0],
            radius: e[1]
        }
    };
}

function movement(arr) {
    arr[arr.length] = [400, 0, 0];
    for (var i = arr.length - 1; i >= 0; i--) {
        for (var j = i - 1; j >= 0; j--) {
            arr[i][2] += arr[j][2];
        }
    }
    for (var k = arr.length - 1; k > 0; k--) {
        arr[k][2] = arr[k - 1][2];
    }
    arr[0][2] = 0;
    timer(arr);
}

function timer(arr) {
    for (var i = 0, len = arr.length; i < len; i++) {
        _.delay(cb, arr[i][2], arr[i]);
    }
}

function move(hit) {
    var s = hit[2];
    var r = hit[1];
    var l = hit[0];
    var m;
    if (r > l) {
        m = 1;
    } else {
        m = -1;
    }
    var backTime = 75-1.67*s;
    var rad = 45-0.4*s;
    var time = 4.75*s+4;
    movement([
      [-750, 0, backTime],
      [200, rad*m, time]
    ]);
}

const drive = function(connection) {
    connection.on('message', function(message) {
        const response = JSON.parse(message.utf8Data);

        var hit = checkObj(response.payload);

        if (hit) {
            if (hit.length) {
                console.log(hit);
                var sum = hit[2];
                var rt = hit[1];
                var lt = hit[0];
                move(hit);
            }
        }

        if (!driveMessage || _.isUndefined(driveMessage.payload.velocity) || _.isUndefined(driveMessage.payload.radius)) {
            driveMessage = {
                topic: channel,
                event: 'drive',
                ref: 15,
                payload: {
                    velocity: 400,
                    radius: 0
                }
            };
        }

        connection.sendUTF(JSON.stringify(driveMessage));

    });
};

//a stupid comment to test things

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client connected');

    phxJoin(connection);
    heartbeat(connection);
    drive(connection);
});

client.connect('ws://' + roombaIP + '/socket/websocket?vsn=1.0.0');
