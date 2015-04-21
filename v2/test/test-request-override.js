var http = require("http"), quick_host = require("../index.js");

var nonComment = {}, site = __dirname + "/site";
module.exports = function testRequestOverride(event, path, expectedPath, toSend, callback) {
	if (event) {
		if (!("statusCode" in toSend)) { toSend.statusCode = 200 + Math.random() * 100 | 0; }
		if (!("data" in toSend)) { toSend.data = "data-" + Math.random(); }
		if (!("comment" in toSend)) { toSend.comment = "comment-" + Math.random(); }
	}
	expectedPath = site + ((expectedPath != null) ? expectedPath : path);
	
	var received = { statusCode: 0, data: "", comment: nonComment };
	quick_host(site, null, function(error, host) {
		if (error) { throwError(error); }
		else {
			if (event) {
				host.on(event, function(request, response, resume, cancel) {
					response.writeHead(toSend.statusCode); response.end(toSend.data); cancel(toSend.comment);
				});
				
				if (event !== "request-file-found") {
					host.on("request-file-found", function() {
						throwError(new Error("Event 'request-file-found' should not have been triggered while '" + event + "' cancelled the default response."));
					});
				}
			}

			host.on("request-complete", function(request, response, response_comment) {
				received.comment = response_comment;
			});
			
			http.request("http://localhost:" + host.port + (path || "/"), function(response) {
				received.statusCode = response.statusCode;
				response.on("data", function(response_data) {
					received.data += response_data;
				}).on("end", function() {
					if (received.comment === nonComment) {
						try { throw new Error("Event '" + event + "' was not triggered."); } catch(error) { throwError(error); }
					}
					else {
						clearTimeout(timeoutError); host.close();
						var passed = ((received.data === toSend.data) && (received.statusCode === toSend.statusCode) && (received.comment === toSend.comment));
						if (!passed) { console.log(event + " sent =", sent); console.log(event + " received =", received); }
						callback(passed);
					}
				});
			}).end();
			
			var timeout = 1000;
			var timeoutError = setTimeout(function testIntercept_timeoutError() {
				throwError(new Error(
					"Overriden response at '" + event + "' stage was not received within " +
					(timeout / 1000) + " second" + (timeout !== 1000 ? "s" : "") + "."
				));
			}, timeout);
		}
	});
}