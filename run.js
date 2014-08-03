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

		var callback = CreateCallback();
		
		callback.path = url.parse(request.url).pathname;
		callback.filepath = path.join(path.join(args[2], decodeURI(callback.path)));
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
			console.log(error, files);
			
			if (error) {
				console.log(callback.tryFile + ": ERROR: " + error);
				render_404(callback);
			}
			else {
				console.log(files);
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
	function stat(error, stat, callback) {
		if(error){
			console.log(callback.tryFile + ": ERROR: " + error);
		}
		else {
			if(stat.isFile()){
				var ext = path.extname(callback.tryFile);
				if (ext && (ext in mime)) {
					ext = mime[ext];
					callback.response.writeHead(200, { "Content-Type": ext });
				}
				else {
					callback.response.writeHead(200);
				}

				fs.createReadStream(callback.tryFile)
					.on("end", callback.dispose)
					.pipe(callback.response);
				
				console.log(
					"200 " + (ext ? "[" + ext + "] " : "") +
					callback.request.url + " : " + callback.filepath
				);
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
}
