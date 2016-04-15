const WebSocketClient = require('websocket').client;
const client = new WebSocketClient();

const channel = 'simulation:TScbQg==';
const roombaIP = 'roombots.mx.com';

var _ = require('lodash');

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

//pass in response.payload and will log only full hit events
function checkObj(obj) {
  if (obj.bumper_right) {
    console.log(obj.bumper_right);
  } else if (obj.bumper_left) {
    console.log(obj.bumper_left);
  }
    var newObj = {
        farLeft: obj.light_bumper_left,
        midLeft: obj.light_bumper_left_front,
        centerLeft: obj.light_bumper_left_center,
        centerRight: obj.light_bumper_right_center,
        midRight: obj.light_bumper_right_front,
        farRight: obj.light_bumper_right
    };
    var ret = false;
    if (!obj.status) {
        var midM = 3;
        var cenM = 6;
        var left = newObj.farLeft + newObj.midLeft * midM + newObj.centerLeft * cenM;
        var right = newObj.farRight + newObj.midRight * midM + newObj.centerRight * cenM;
        return [left, right];
    }
}

var count1, count2, count3;

function turn(obj) {
    var vel, rad;
    var check = checkObj(obj);
    if (check) {
        console.log(check);
        if (check[0] === check[1]) {
            vel = -500;
            rad = 300;
            count1 = 200;
        } else if (check[0] > check[1]) {
            vel = -500;
            rad = 290;
            count1 = 250/(check[0] - check[1]);
        } else if (check[0] < check[1]) {
            vel = 500;
            rad = 290;
            count1 = 250/(check[1] - check[0]);
        }
    } else if (!check) {
        if (count1) {
            vel = -500;
            rad = 300;
            count1--;
        } else if (count2) {
            vel = -500;
            rad = 290;
            count2--;
        } else if (count3) {
            vel = 500;
            rad = 290;
            count3--;
        } else {
            vel = 200;
            rad = 0;
        }
    }
    var driveMessage = {
        topic: channel,
        event: 'drive',
        ref: 15,
        payload: {
            velocity: vel,
            radius: rad
        }
    };
    return driveMessage;
}

//smaller the difference between arr0 and arr1 the  bigger the correction we want to make
//increased radius slows turning
//velocity 100 and radius 50 is an ok start
const drive = function(connection) {
    connection.on('message', function(message) {
        const response = JSON.parse(message.utf8Data);

        var driveMessage = turn(response.payload);

        connection.sendUTF(JSON.stringify(driveMessage));

    });
};

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
