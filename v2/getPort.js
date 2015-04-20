var isPortOpen = require("./isPortOpen.js"),
	wrap_callback = require("./callback.js");

var getPort = module.exports = function(preferred, from, callback) {
	if (arguments.length === 2) {
		callback = arguments[1];
		from = null;
	}
	
	if (from == null) { from = 8000; }

	callback = wrap_callback(callback, {
		port: preferred || undefined,
		preferred: preferred,
		from: from,
		tried: { length: 0 }
	});
	
	if (preferred != null) {
		callback.port = preferred;
		isPortOpen(preferred, callback.set(handlePreferredPort));
	}
	else {
		tryRandomPort.call(callback);
	}
}

function handlePreferredPort(isOpen) {
	if (isOpen) {
		this.end(this.state.port);
	}
	else {
		if (this.state.from == null) { this.state.from = 8000; }
		this.state.tried[this.state.port] = true;
		tryRandomPort.call(this);
	}
}

function tryRandomPort() {
	if (this.state.tried.length === 100) {
		this.error("Could not find open port.");
	}
	else {
		var port;
		do { // find random port that has not been tried yet
			port = this.state.from + Math.random() * 100 | 0;
		}
		while ((this.state.tried.length < 100) && this.state.tried[port]);
		
		this.state.tried.length++;
		isPortOpen(this.state.port = port, this.set(handleRandomPort));
	}
}
function handleRandomPort(isOpen) {
	if (isOpen) { this.end(this.state.port); }
	else {
		this.state.tried[this.state.port] = true;
		tryRandomPort.call(this);
	}
}

/*
getPort(8005, function(error, port) {
	if (error) {
		console.log("Could not find open port.");
	}
	else {
		console.log("Port " + port + " open.");
	}
});
*/