var http = require("http"), quick_host = require("../index.js");

var nonComment = {}, site = __dirname + "/site";
var testRequestOverride = module.exports.run = function testRequestOverride(event, path, expectedPath, toSend, callback, log) {
	if (event) {
		if (!("statusCode" in toSend)) { toSend.statusCode = 200 + Math.random() * 100 | 0; }
		if (!("data" in toSend)) { toSend.data = "data-" + Math.random(); }
		if (!("comment" in toSend)) { toSend.comment = "comment-" + Math.random(); }
	}
	expectedPath = site + ((expectedPath != null) ? expectedPath : path);
	
	var received = { statusCode: 0, data: "", comment: nonComment };
	quick_host(site, null, function(error, host) {
		if (error) { module.exports.throwError(error); }
		else {
			if (event) {
				(log === "log") && console.log("hooking up " + event);
				host.on(event, function(request, response, resume, cancel) {
					(log === "log") && console.log("intercepting");
					response.writeHead(toSend.statusCode); response.end(toSend.data); cancel(toSend.comment);
				});
				
				if (event !== "request-file-found") {
					host.on("request-file-found", function() {
						(log === "log") && console.log("problem");
						module.exports.throwError(new Error("Event 'request-file-found' should not have been triggered while '" + event + "' cancelled the default response."));
					});
				}
			}

			host.on("request-complete", function(request, response, response_comment) {
				(log === "log") && console.log("complete");
				received.comment = response_comment;
			});
			
			(log === "log") && console.log("sending");
			http.request("http://127.0.0.1:" + host.port + (path || "/"), function(response) {
				(log === "log") && console.log("received");
				received.statusCode = response.statusCode;
				response.on("data", function(response_data) {
					received.data += response_data;
				}).on("end", function() {
					if (received.comment === nonComment) {
						try { throw new Error("Event '" + event + "' was not triggered."); } catch(error) { module.exports.throwError(error); }
					}
					else {
						clearTimeout(timeoutError); host.close();
						var passed = ((received.data === toSend.data) && (received.statusCode === toSend.statusCode) && (received.comment === toSend.comment));
						if (!passed) { console.log(event + " sent =", toSend); console.log(event + " received =", received); }
						callback(passed);
					}
				});
			}).end();
			
			var timeout = 2000; var errorMessage = "Overriden response at '" + event + "' stage was not received within " +
					(timeout / 1000) + " second" + (timeout !== 1000 ? "s" : "") + ".";
			var timeoutError = setTimeout(function testIntercept_timeoutError() {
				module.exports.throwError(new Error(errorMessage));
			}, timeout);
		}
	});
}
module.exports.throwError = function(error) { throw error; };