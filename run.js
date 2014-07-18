var fs = require("fs"),
	net = require("net"), http = require("http"),
	url = require("url"), path = require("path");

var args = process.argv;
if (args.length < 3) { throw "Must specify folder."; }

fs.exists(args[2], function (exists) {
	if (!exists) { throw "Could not find " + args[2] + "."; }
	else {
		if (args.length === 4) {
			var port = parseInt(args[3], 10);
			if (port.toString() !== args[3]) { throw "Given port must be an integer."; }
			else {
				checkPortOpen(port, function (open) {
					if (!open) { throw "Given port must be open."; }
					else { initHost(port); }
				});
			}
		}
		else {
			useRandomPort();
		}
	}
});

function useRandomPort() {
	var port;
	function isOpen(open) {
		if (open) { initHost(port); }
		else {
			checkPortOpen(port = 80 + (Math.random() * 1000) | 0, isOpen);
		}
	}
	isOpen(false);
}

function checkPortOpen(port, callback) {
	var server = net.createServer().listen(port, function (err) {
		server.once("close", function () {
			callback(true);
		}).close();
	}).on("error", function (err) {
		callback(false);
	});
}

function initHost(port) {
	console.log("Quick-Hosting \"" + args[2] + "\" using port " + port + "... (CTRL+C or close to stop)");

	var mime = {
		".html": "text/html",
		".jpeg": "image/jpeg",
		".jpg": "image/jpeg",
		".png": "image/png",
		".js": "text/javascript",
		".css": "text/css"
	};

	var findPath = /[^?]*/;
	http.createServer(function (request, response) {
		console.log(request.url);

		var filepath = decodeURI(url.parse(request.url).pathname);
		filepath = path.join(path.join(args[2], filepath));
		if (filepath[filepath.length - 1] === "\\") {
			filepath += "index.html";
		}

		fs.exists(filepath, function (exists) {
			if (!exists) {
				console.log("404 " + request.url + " : " + filepath);
				response.writeHead(404, { "Content-Type": "text/html" });
				response.write("<title>404</title><h1>404</h1>");
				response.end();
			}
			else {
				var ext = path.extname(filepath);
				if (ext) { ext = mime[ext]; }

				if (ext) {
					response.writeHead(200, { "Content-Type": ext });
				}
				else {
					response.writeHead(200);
				}

				fs.createReadStream(filepath).pipe(response);
				console.log("200" + (ext ? " [" + ext + "] " : "") + request.url + " : " + filepath);
			}
		});
	}).listen(port);
}
