console.log(require("test")(function() {
var quick_host = require(process.cwd() + "/../index.js"), http = require("http");

(
	(typeof quick_host !== "undefined") &&
	(quick_host instanceof Function)
); /// module loaded

var error, host;

{ // invalid root
	quick_host(null, null, function(error, host) {
		error && (host == null); /// errors when root is not a primitive string
	});

	quick_host([], null, function(error, host) {
		error && (host == null); /// errors when root is not a primitive string
	});
	
	quick_host(new String(__dirname + "/site"), null, function(error, host) {
		error && (host == null); /// errors when root is not a primitive string
	});
	
	quick_host("", null, function(error, host) {
		error && (host == null); /// errors when root is an empty string
	});
}

quick_host(__dirname + "/non-existent", null, function(error, host) {
	error && (host == null); /// errors when root does not exist
});

var site = __dirname + "/site";

var nonComment = {};
function testRequest(event, path, toSend, callback) {
	if (!("statusCode" in toSend)) { toSend.statusCode = 200 + Math.random() * 100 | 0; }
	if (!("data" in toSend)) { toSend.data = "data-" + Math.random(); }
	if (!("comment" in toSend)) { toSend.comment = "comment-" + Math.random(); }
	
	var recieved = { statusCode: 0, data: "", comment: nonComment };
	quick_host(site, null, function(error, host) {
		if (error) { throwError(error); }
		
		if (event) {
			host.on(event, function(request, response, resume, cancel) {
				response.writeHead(toSend.statusCode); response.end(toSend.data); cancel(toSend.comment);
			});
			
			if (event !== "request-file-found") {
				host.on("request-file-found", function() {
					throwError(new Error("Event 'request-file-found' should not have been triggered while '" + event + "' cancelled the default response."));
					//clearTimeout(timeout); host.close();
				});
			}
		}

		host.on("request-complete", function(request, response, response_comment) {
			recieved.comment = response_comment;
		});
		
		http.request("http://localhost:" + host.port + (path || "/"), function(response) {
			recieved.statusCode = response.statusCode;
			response.on("data", function(response_data) {
				recieved.data += response_data;
			}).on("end", function() {
				if (recieved.comment === nonComment) {
					try { throw new Error("Event '" + event + "' was not triggered."); } catch(error) { throwError(error); }
				}
				else {
					clearTimeout(timeoutError); host.close();
					callback(toSend, recieved);
				}
			});
		}).end();
		
		var timeout = 1000;
		var timeoutError = setTimeout(function testIntercept_timeoutError() {
			throwError(new Error("Overriden response at '" + event + "' stage was not recieved within " + (timeout / 1000) + " second" + (timeout !== 1000 ? "s" : "") + "."));
		}, timeout);
	});
}

{ // override requests
	testRequest("request", "/", {}, function(sent, recieved) {
		((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
		/// request intercepted
	}); {
		testRequest("request-file-missing", "/non-existent-path", {}, function(sent, recieved) {
			((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
			/// request-file-missing intercepted
		});
		testRequest("request-file-found", "/file", {}, function(sent, recieved) {
			((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
			/// request-file-found intercepted
		}); {
			testRequest("request-directory-found", "/directory", {}, function(sent, recieved) {
				((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
				/// request-directory-found intercepted
			}); {
				testRequest("request-directory-redirect", "/directory", {}, function(sent, recieved) {
					((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
					/// request-directory-redirect intercepted
				});
				testRequest("request-directory-index-found", "/directory/", {}, function(sent, recieved) {
					((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
					/// request-directory-index-found intercepted
				});
				testRequest("request-directory-index-missing", "/directory-no-index/", {}, function(sent, recieved) {
					((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
					/// request-directory-index-render intercepted
				});
			}
		}
	}
}

{ // default behaviour
	testRequest(null, "/file", { statusCode: 200, data: "\\file contents", comment: "\\file" }, function(sent, recieved) {
		((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
		/// file piped
	});
	testRequest(null, "/directory", { statusCode: 301, data: "", comment: "redirected to /directory/" }, function(sent, recieved) {
		((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
		/// request redirected
	});
	testRequest(null, "/directory/", { statusCode: 200, data: "\\directory\\index.html contents", comment: "\\directory\\index.html" }, function(sent, recieved) {
		((recieved.data === sent.data) && (recieved.statusCode === sent.statusCode) && (recieved.comment === sent.comment));
		/// index piped
	});
	testRequest(null, "/directory-no-index/", {
		statusCode: 200,
		data: '<h1>Index of /directory-no-index/</h1>\n<ul>\n<li><a href="..">.. (up one level)</a></li>\n<li><a href="file">file</a></li>\n</ul>',
		comment: "rendered index"
	},
	function(sent, recieved) {
		(recieved.statusCode === sent.statusCode) && (recieved.data === sent.data) && (recieved.comment === sent.comment);
		/// index rendered
	});
}








}, __dirname, __filename).renderFull);


/*
quick_host("c:/users/thomas giles/websites/writing/v2.1/build", 8000, function(error, host) {
	console.log("spawned");
	if (error) { console.log("error"); throw error; }
	else {
		var requested_path, received_path;
		console.log("locahost:" + host.port);
		host.on("request", function(response) {
			console.log("request recieved");
			//console.dir(response);
			received_path = this.requestpath;
			console.log(this.requestpath);
		});
		
		console.log("sending GET request to port " + host.port);
		//console.log(request);
		//*
		http.request({ host: "localhost", port: host.port, method: "GET", path: "/index.html" }, function(response) {
			console.log("response recieved");
			response.on("data", function(chunk) {
				console.log(chunk + "");
			}).on("end", function() {
				host.close();
			});
		}).on("error", function(error) {
			console.log("error", error);
		}).end();
		//*\/
		
		// file-not-found
		// file-found
		// directory-found
		// index-found
		// index-not-found
	}
});
*/
