var wrap_callback = require("./callback.js"),
	get_port = require("./getPort.js"),
	fs = require("fs"), util = require("util"), events = require("events"), http = require("http"), url = require("url"), path = require("path");

var mime = quick_host.mime = {
	".html": "text/html",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".js": "text/javascript",
	".css": "text/css",
	".mp3": "audio/mpeg"
};

function quick_host(root, port, callback) {
	/*
	if (!callback) {
		callback = function(error, host) {
			if (error) { log("ERROR: " + error); }
			else { log(host.port); }
		};
	}
	*/
	
	if ((typeof root !== "string") || !root) {
		callback("Root string not provided. " + util.inspect(root));
	}
	else {
		fs.exists(root, wrap_callback(callback, { root: root, port: port }).set(rootExists));
	}
}

function rootExists(exists) {
	if (exists) {
		get_port(this.state.port, this.set(handlePort));
	}
	else {
		this.error("Root does not exist. " + util.inspect(this.state.root));
	}
}

function handlePort(error, port) {
	if (error) { this.error(error); }
	else {
		this.state.port = port;
		startServer.call(this);
	}
}

function sendEvent(callback, event, next) {
	callback.set(next);
	callback.state.host.emit(event, callback.state.request, callback.state.response, callback.state.resume, callback.state.cancel) || callback();
}

function startServer() {
	var host = new events.EventEmitter();
	host.root = this.state.root;
	host.port = this.state.port;
	host.close = function() { host.server.close(); };
	
	var server = host.server = http.createServer(function(request, response) {
		var callback = wrap_callback(response_complete, {
			host: host,
			request: request, response: response,
			resume: function() { callback(); },
			cancel: function() { callback.end.apply(callback, arguments); }
		});
		request.path = decodeURI(url.parse(request.url).pathname);
		response.path = path.join(host.root, request.path);
		
		sendEvent(callback, "request", tryFileExists);
	}).on("error", function(error) {
		console.log("host error");
	}).listen(host.port);
	
	this.end(host);
}

function response_complete(error, comment) {
	this.state.host.emit("request-complete", this.state.request, this.state.response, comment);
}

function tryFileExists() {
	fs.exists(this.state.response.path, this.set(checkFileExists));
} {
	function checkFileExists(exists) {
		if (exists) {
			fs.stat(this.state.response.path, this.set(checkStat));
		}
		else {
			sendEvent(this, "request-file-missing", render404);
		}
	} {
		function checkStat(error, stat) {
			if (stat.isFile()) {
				sendEvent(this, "request-file-found", sendFile);
			}
			else if (stat.isDirectory()) {
				sendEvent(this, "request-directory-found", tryIndexExists);
			}
		} {
			function sendFile() {
				var callback = this;
				this.state.response.writeHead(200);
				fs.createReadStream(this.state.response.path)
					.on("end", function() { callback.end("\\" + path.relative(callback.state.host.root, callback.state.response.path)); })
					.pipe(this.state.response);
			}
			function tryIndexExists() {
				if (this.state.request.path[this.state.request.path.length - 1] === "/") {
					this.state.response.indexPath = path.join(this.state.response.path, "index.html");
					fs.exists(this.state.response.indexPath, this.set(checkIndexExists));
				}
				else {
					sendEvent(this, "request-directory-redirect", directoryRedirect);
				}
			} {
				function checkIndexExists(exists) {
					if (exists) {
						this.state.response.path = this.state.response.indexPath;
						delete this.state.response.indexPath;
						sendEvent(this, "request-directory-index-found", sendFile);
					}
					else {
						sendEvent(this, "request-directory-index-missing", renderIndex);
					}
				} {
					function renderIndex() {
						fs.readdir(this.state.response.path, this.set(readDirectory));
					}
					function readDirectory(error, files) {
						if (error) { this.error(error); }
						else {
							var response = this.state.response;
							response.writeHead(200, { "Content-Type": quick_host.mime[".html"] });
							response.write(
								'<h1>Index of ' + this.state.request.path + '</h1>\n' +
								'<ul>\n' + 
								'<li><a href="..">.. (up one level)</a></li>\n'
							);
							for (var i = 0, l = files.length; i < l; i++) {
								response.write('<li><a href="' + files[i] + '">' + files[i] + '</a></li>\n');
							}
							response.end('</ul>');
							this.end("rendered index");
						}
					}
				}
				
				function directoryRedirect() {
					this.state.response.writeHead(301, { location: this.state.request.url + "/" });
					this.state.response.end();
					this.end("redirected to " + this.state.request.url + "/");
				}
			}
		}

		function render404() {
			this.state.response.writeHead(404);
			this.state.response.end("<h1>404</h1>");
		}
	}
}

function log() { return quick_host.log.apply(this, arguments); }
quick_host.log = function() { console.log.apply(console, arguments); };

module.exports = quick_host;



