console.log(require("test")(function() {
var testRequestOverride = require(process.cwd() + "/test-request-override.js");
var quick_host = require(process.cwd() + "/../index.js"), http = require("http");

((typeof quick_host !== "undefined") && (quick_host instanceof Function));
	/// module loaded

/* invalid root */
/* ------------ */ {
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

	quick_host(__dirname + "/non-existent", null, function(error, host) {
		error && (host == null); /// errors when root does not exist
	});
}

/* override requests */
/* ----------------- */ {
	testRequestOverride("request", "/", null, {}, function(passed) {
		passed; /// request intercepted
	}); {
		testRequestOverride("request-file-missing", "/non-existent-path", null, {}, function(passed) {
			passed; /// request-file-missing intercepted
		});
		testRequestOverride("request-file-found", "/file", null, {}, function(passed) {
			passed; /// request-file-found intercepted
		}); {
			testRequestOverride("request-directory-found", "/directory", null, {}, function(passed) {
				passed; /// request-directory-found intercepted
			}); {
				testRequestOverride("request-directory-redirect", "/directory", null, {}, function(passed) {
					passed; /// request-directory-redirect intercepted
				});
				testRequestOverride("request-directory-index-found", "/directory/", null, {}, function(passed) {
					passed; /// request-directory-index-found intercepted
				});
				testRequestOverride("request-directory-index-missing", "/directory-no-index/", null, {}, function(passed) {
					passed; /// request-directory-index-render intercepted
				});
			}
		}
	}
}

/* default behaviour */
/* ----------------- */ {
	testRequestOverride(null, "/file", null, { statusCode: 200, data: "\\file contents", comment: undefined }, function(passed) {
		passed; /// file piped
	});
	testRequestOverride(null, "/directory", null, { statusCode: 301, data: "", comment: "redirected to /directory/" }, function(passed) {
		passed; /// request redirected
	});
	testRequestOverride(null, "/directory/", null, { statusCode: 200, data: "\\directory\\index.html contents", comment: undefined }, function(passed) {
		passed; /// index piped
	});
	testRequestOverride(null, "/directory-no-index/", null, {
		statusCode: 200,
		data: '<h1>Index of /directory-no-index/</h1>\n<ul>\n<li><a href="..">.. (up one level)</a></li>\n<li><a href="file">file</a></li>\n</ul>',
		comment: "rendered index"
	}, function(passed) {
		passed; /// index rendered
	});

	testRequestOverride(null, "", "index.html", { statusCode: 200, data: "\\index.html contents", comment: undefined }, function(passed) {
		passed; /// index piped (no path)
	});
	
	/* 404 */
	/* --- */ {
		testRequestOverride(null, "/non-existent", null, { statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// no extension, 404 rendered
		});
		//*
		testRequestOverride(null, "/non-existent", null, { statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// no extension, 404 rendered
		});
		testRequestOverride(null, "/non-existent.html", null, { statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// html extension, 404 rendered
		});
		testRequestOverride(null, "/non-existent.ext", null, { statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// unrecognised extension, 404 sent
		});
		testRequestOverride(null, "/non-existent.ico", null, { statusCode: 404, data: "", comment: undefined }, function(passed) {
			passed; /// recognised, non-html extension, 404 sent
		});
	}
}
}, __dirname, __filename).renderFull);
