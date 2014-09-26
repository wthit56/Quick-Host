var fs = require("fs"),
	net = require("net"), http = require("http"),
	url = require("url"), path = require("path");

var CreateCallback = require("create-callback");

function QuickHost(directory, port, callback) {
	fs.exists(directory, function (exists) {
		if (!exists) { returnError(new Error("Could not find " + directory + "."), callback); }
		else { // exists
			if(port != null) {
				port = parseInt(port, 10);
				if (port.toString() != port) { returnError(new Error("Given port must be an integer."), callback); }
				else {
					checkPortOpen(port, function (open) {
						if (!open) { returnError(new Error("Given port must be open."), callback); }
						else { initHost(directory, port, callback); }
					});
				}
			}
			else {
				useRandomPort(directory, callback);
			}
		}
	});
};

module.exports = QuickHost;

function returnError(error, callback) {
	if (callback instanceof Function) {
		callback(error);
	}
	else {
		throw error;
	}
}

function useRandomPort(directory, callback) {
	var port;
	function isOpen(open) {
		if (open) { initHost(directory, port, callback); }
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

var mime = QuickHost.mime = {
	".html": "text/html",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".js": "text/javascript",
	".css": "text/css",
	".mp3": "audio/mpeg"
};

function initHost(directory, port, callback) {
	var findPath = /[^?]*/;
	
	http.createServer(function(request, response) {
		console.log(request.url);

		var callback = CreateCallback();
		
		callback.path = url.parse(request.url).pathname;
		callback.filepath = path.join(path.join(directory, decodeURI(callback.path)));
		callback.tryFile = callback.filepath;
		callback.index = false;
		
		callback.request = request;
		callback.response = response;
		callback.onDispose = function(callback) {
			delete callback.index;
			delete callback.filepath;
			delete callback.request;
			delete callback.response;
		};

		fs.exists(callback.tryFile, callback.setAction(exists));
	}).listen(port);
	
	callback(null, port);
}

function render_404(callback) {
	console.log("404 " + callback.request.url + " : " + callback.tryFile);
	callback.response.writeHead(404, { "Content-Type": "text/html" });
	callback.response.write("<title>404</title><h1>404: Not Found</h1>")
	callback.response.end();
	callback.dispose();
}

var render_dir = (function() {
	function render_dir(callback){
		fs.readdir(callback.filepath, callback.setAction(readdir));
	}

	function readdir(error, files, callback) {
		if (error) {
			console.log(callback.tryFile + ": ERROR: " + error);
			render_404(callback);
		}
		else {
			console.log(
				"200 (directory listing) [text/html] " +
				callback.request.url + " : " + callback.filepath
			);

			var response = callback.response;
			response.writeHead(200, {"Content-type": "text/html" });
			response.write(
				"<title>" + callback.path + "</title>" +
				"<h1>"+callback.path+"</h1>"
			);
			response.write(
				(files.length>0)
					? "<ul>"+files.map(linkFiles, callback).join("")+"</ul>"
					: "<p>No files found</p>"
			);
			response.end();

			callback.dispose();
		}
	}
	function linkFiles(file) {
		return "<li><a href=\""+path.join(this.path,file)+"\">"+file+"</a></li>";
	}

	return render_dir;
})();

function exists(exists, callback) {
	if (exists) {
		fs.stat(callback.tryFile, callback.setAction(stat));
	}
	else if (callback.index) {
		render_dir(callback);
	}
	else {
		console.log("404 " + callback.request.url + " : " + callback.filepath);
		render_404(callback);
	}
}
var findRange = /bytes=(\d+)-(\d+)?/, range, from, to;
function stat(error, stat, callback) {
	if(error){
		console.log(callback.tryFile + ": ERROR: " + error);
	}
	else {
		if(stat.isFile()){
			var ext = path.extname(callback.tryFile);
			if (ext && (ext in mime)) { ext = mime[ext]; }
			else { ext = null; }

			if(callback.request.headers.range){
				range = callback.request.headers.range.match(findRange);
				from = +range[1], to = range[2] ? +range[2] : stat.size - 1;

				callback.response.writeHead(206, {
					"Content-Range": "bytes "+from+"-"+to+"/"+stat.size,
					"Accept-Ranges": "bytes",
					"Content-Length": to - from + 1, "Content-Type": ext
				});
				fs.createReadStream(callback.tryFile, { start: from, end: to })
					.on("end", callback.dispose)
					.pipe(callback.response);

				console.log(
					"206 (" + from+" - " + to + ") " + (ext ? "[" + ext + "] " : "") +
					callback.request.url + " : " + callback.filepath
				);

				range = null;
			}
			else {
				if (ext) {
					callback.response.writeHead(200, { "Content-Type": ext });
				}
				else {
					callback.response.writeHead(200);
				}

				console.log(
					"200 " + (ext ? "[" + ext + "] " : "") +
					callback.request.url + " : " + callback.filepath
				);

				fs.createReadStream(callback.tryFile)
					.on("end", callback.dispose)
					.pipe(callback.response);
			}
		}
		else if (stat.isDirectory() && !callback.index) {
			if(callback.path[callback.path.length-1]!=="/"){
				console.log("301 premanent redirect to " + callback.request.url + "/");
				callback.response.writeHead(301, {location:callback.request.url+"/"});
				callback.response.end();
				callback.dispose();
			}
			else {
				callback.index = true;
				fs.exists(
					callback.tryFile = path.join(callback.filepath, "index.html"),
					callback.setAction(exists)
				);
			}
		}
		else {
			render_404(callback);
		}
	}
}
