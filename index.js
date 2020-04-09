const config = require('./config.json');

const uuid = require('uuid');
const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const path = require("path");

const stream = fs.createWriteStream(config.logFile, {flags:'a'});

const server = https.createServer({
  cert: fs.readFileSync(path.resolve(config.certFile)),
	key: fs.readFileSync(path.resolve(config.keyFile)),
	host: config.host,
});
const wss = new WebSocket.Server({ server });

console.log('Server Running on Port ' + config.port);

let timer = 0;
let current = null;
let auto = false;
let autoCounter = -1;
let interval = null;

const broadcast = (type, except, data) => {
	const message = {type};
	if (data) message.data = data;
	const messageStr = JSON.stringify(message);
	wss.clients.forEach(function(client) {
		if (client.readyState === WebSocket.OPEN && client.userId !== except) {
			client.send(messageStr);
		}
	});
}

wss.on('connection', function(ws) {
	ws.userId = uuid.v4();
	addLog('Client ' + ws.userId + ' Connected.');
	if (current) {
		const paused = interval ? true : false;
		const message = { type: 'startInProgress', data: { timer, current, auto, autoCounter, paused }};
		const messageStr = JSON.stringify(message);
		ws.send(messageStr);
	}
	ws.on('message', function(message) {
		const jsonData = JSON.parse(message);
		const type = jsonData.type;
		const data = jsonData.data;
		switch (type) {
			case 'pause':
				broadcast('pause', ws.userId);
				pause();
				break;
			case 'resume':
				broadcast('resume', ws.userId);
				unpause();
				break;
			case 'autoMode':
				if (data) {
					broadcast('autoMode', ws.userId, data);
					if (data.autoMode) {
						if (current === 1500) {
							enableAuto(true);
						} else {
							enableAuto();
						}
					} else {
						disableAuto();
					}
				}
				break;
			case 'startTimer':
				if (data) {
					broadcast('startTimer', ws.userId, data);
					setupTimer(data.timer);
				}
				break;
			case 'resetTimers':
				broadcast('resetTimers', ws.userId);
				resetTimers();
				break;
		}
	});
});

const resetTimers = () => {
	current = null;
	timer = 0;
};

const setupTimer = time => {
	resetTimers();
	current = time;
	timer = time;

	clearInterval(interval);
	interval = setInterval(() => {
		updateTimer();
	}, 1000);

	addLog('Started ' + (time / 60) + ' Minute Timer');
}

const addLog = message => {
	const now = new Date();
	const text = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + (now.getDate() + 1)).slice(-2) + ' ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ' - ' + message;
	console.log(text);
	stream.write(text + '\n');
}

const updateTimer = () => {
	timer -= 1;
	if (timer === 0) {
		addLog('Completed Timer');
		if (auto) {
			clearInterval(interval);
			let nextDuration;
			let target;
			switch (autoCounter) {
				case 0:
				case 2:
				case 4:
					nextDuration = 300;
					break;
				case -1:
				case 1:
				case 3:
				case 5:
				case 7:
					nextDuration = 1500;
					break;
				case 6:
					nextDuration = 900;
					break;
			};
			if (autoCounter === 7) {
				autoCounter = 0;
			} else {
				autoCounter++;
			}
			broadcast('startTimer', false, { timer: nextDuration });
			setupTimer(nextDuration);
		} else {
			pause();
			resetTimers();
		}
	}
}

const pause = () => {
	if (interval) {
		addLog('Paused');
		clearInterval(interval);
		interval = null;
	}
}

const unpause = () => {
	if (!interval) {
		addLog('Resumed');
		interval = setInterval(() => {
			updateTimer();
		}, 1000);
	}
}

const enableAuto = startAtPomodoro => {
	auto = true;
	addLog('Auto Mode Turned On');
	autoCounter = startAtPomodoro ? 0 : -1;
}

const disableAuto = () => {
	auto = false;
	addLog('Auto Mode Turned Off');
}

server.listen(config.port);
