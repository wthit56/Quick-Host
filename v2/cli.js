var util = require("util"), path = require("path");
var quick_host = require("./index.js");

var root, port;
for (var i = 2, l = process.argv.length; i < l; i++) {
	if (!isNaN(process.argv[i])) {
		if (process.argv[i].indexOf(".") !== -1) {
			throw new Error("Invalid port detected: " + util.inspect(process.argv[i]) + "; must be an integer");
		}
		else if (port !== undefined) {
			throw new Error("Port already found: " + util.inspect(port) + "; cannot override with " + util.inspect(process.argv[i]) + ".");
		}
		else {
			port = process.argv[i] | 0;
		}
	}
	else {
		if (root !== undefined) {
			throw new Error("Root already found: " + util.inspect(root) + "; cannot override with " + util.inspect(process.argv[i]) + ".");
		}
		else {
			root = process.argv[i];
		}
	}
}

function statusColour(statusCode) {
	// http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
	if (statusCode < 200) { return "\x1b[46m"; } // Info
	else if (statusCode < 300) { return "\x1b[1m\x1b[32m"; } // Successful
	else if (statusCode < 400) { return "\x1b[36m"; } // Redirect
	else if (statusCode < 500) { return "\x1b[31m"; } // Client Error
	else if (statusCode < 600) { return "\x1b[1m\x1b[31m"; } // Server Error
}

quick_host(root, port, function(error, host) {
	if (error) {
		console.log("ERROR:\n" + error.stack || error);
	}
	else {
		console.log("Quick Hosting '" + host.root + "', listening on port " + host.port + " (http://localhost:" + host.port + "/)...");
		host.on("request-complete", function(request, response, comment) {
			console.log(
				request.path + " -> " +
				statusColour(response.statusCode) + "[" + response.statusCode + "]\x1b[0m " +
				(comment || (response.path ? path.sep + path.relative(host.root, response.path) : "response sent"))
			);
		}).on("host-error", function(error) {
			console.log("ERROR:\n" + (error.stack || error));
		});
	}
});
