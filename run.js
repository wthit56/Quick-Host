var fs = require("fs"),
	net = require("net"), http = require("http"),
	url = require("url"), path = require("path");

var args = process.argv;
if (args.length < 3) { throw "Must specify folder."; }

var CreateCallback = require("./CreateCallback.js");

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
	
	http.createServer(function(request, response) {
		console.log(request.url);

		var filepath = decodeURI(url.parse(request.url).pathname);
		filepath = path.join(path.join(args[2], filepath));
		if (filepath[filepath.length - 1] === "\\") {
			filepath += "index.html";
		}
		
		var callback = CreateCallback();
		callback.filepath = filepath;
		callback.request = request;
		callback.response = response;
		callback.onDispose = function(callback) {
			delete callback.filepath;
			delete callback.request;
			delete callback.response;
		};

		fs.exists(filepath, callback.setAction(exists));
	}).listen(port);
	
	function _404(callback) {
		console.log("404 " + callback.request.url + " : " + callback.filepath);
		callback.response.writeHead(404, { "Content-Type": "text/html" });
		callback.response.write("<title>404</title><h1>404: File not found</h1>")
		callback.response.end();
		//callback.response.end();
		
		callback.dispose();
	}

	function exists(exists, callback) {
		if (!exists) {
			_404(callback);
		}
		else {
			fs.stat(callback.filepath, callback.setAction(stat));
		}
	}

	function stat(error, stats, callback) {
		if(stats.isFile()) {
			var ext = path.extname(callback.filepath);
			if (ext && (ext in mime)) {
				ext = mime[ext];
				callback.response.writeHead(200, { "Content-Type": ext });
			}
			else {
				callback.response.writeHead(200);
			}

			fs.createReadStream(callback.filepath).on("end", callback.dispose).pipe(callback.response);
			console.log("200 " + (ext ? "[" + ext + "] " : "") + callback.request.url + " : " + callback.filepath);
		}
		else if(stats.isDirectory()) {
			callback.filepath = path.join(callback.filepath, "index.html");
			fs.exists(callback.filepath, callback.setAction(exists));
		}
	}

	/*
	http.createServer(function (request, response) {
		console.log(request.url);

		var filepath = decodeURI(url.parse(request.url).pathname);
		filepath = path.join(path.join(args[2], filepath));
		if (filepath[filepath.length - 1] === "\\") {
			filepath += "index.html";
		}

		fs.exists(filepath, function (e) {
			exists(request, response, filepath, e);
		});
	}).listen(port);
	
	function _404(request, response, filepath) {
		console.log("404 " + request.url + " : " + filepath);
		response.writeHead(404, { "Content-Type": "text/html" });
		response.write("<title>404</title><h1>404</h1>");
		response.end();		
	}
	function exists(request, response, filepath, exists) {
		if (!exists) {
			_404(request, response, filepath);
		}
		else {
			fs.stat(filepath, function(error, s){
				stat(request, response, filepath, error, s);
			});
		}
	}
	function stat(request, response, filepath, error, stats) {
		if(stats.isFile()) {
			var ext = path.extname(filepath);
			if (ext && (ext in mime)) {
				ext = mime[ext];
				response.writeHead(200, { "Content-Type": ext });
			}
			else {
				response.writeHead(200);
			}

			fs.createReadStream(filepath).pipe(response);
			console.log("200 " + (ext ? "[" + ext + "] " : "") + request.url + " : " + filepath);
		}
		else if(stats.isDirectory()) {
			filepath = path.join(filepath, "index.html");
			fs.exists(filepath, function (e) {
				exists(request, response, filepath, e);
			});
		}
	}
	*/
}
