console.log(require("test")(function() {
var http = require("http");

// blah //

var waterfall = require(process.cwd() + "/waterfall.js");

var testRequestOverride = require(process.cwd() + "/test-request-override.js");
testRequestOverride.throwError = throwError;
testRequestOverride = testRequestOverride.run;

var quick_host = require(process.cwd() + "/../index.js");

((typeof quick_host !== "undefined") && (quick_host instanceof Function));
	/// module loaded

/* invalid root */ {
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

waterfall(
	/* override requests */
	waterfall(function(then) { testRequestOverride("request", "/", null, {}, function(passed) {
		passed; /// request intercepted
		then();
	}); }, function(then) { testRequestOverride("request-file-missing", "/non-existent-path", null, {}, function(passed) {
		passed; /// request-file-missing intercepted
		then();
	}); }, function(then) { testRequestOverride("request-file-found", "/file", null, {}, function(passed) {
		passed; /// request-file-found intercepted
		then();
	}); }, function(then) { testRequestOverride("request-directory-found", "/directory", null, {}, function(passed) {
		passed; /// request-directory-found intercepted
		then();
	}); }, function(then) { testRequestOverride("request-directory-redirect", "/directory", null, {}, function(passed) {
		passed; /// request-directory-redirect intercepted
		then();
	}); }, function(then) { testRequestOverride("request-directory-index-found", "/directory/", null, {}, function(passed) {
		passed; /// request-directory-index-found intercepted
		then();
	}); }, function(then) { testRequestOverride("request-directory-index-missing", "/directory-no-index/", null, {}, function(passed) {
		passed; /// request-directory-index-render intercepted
		then();
	}); }),
	
	/* default behaviour */
	waterfall(function(then) { testRequestOverride(null, "/file", null,
		{ statusCode: 200, data: "\\file contents", comment: undefined }, function(passed) {
		passed; /// file piped
		then();
	}); }, function(then) { testRequestOverride(null, "/directory", null,
		{ statusCode: 301, data: "", comment: "redirected to /directory/" }, function(passed) {
		passed; /// request redirected
		then();
	}); }, function(then) { testRequestOverride(null, "/directory/", null, { statusCode: 200, data: "\\directory\\index.html contents", comment: undefined }, function(passed) {
		passed; /// index piped
		then();
	}); }, function(then) { testRequestOverride(null, "/directory-no-index/", null,
		{ statusCode: 200, comment: "rendered index", 
			data: '<h1>Index of /directory-no-index/</h1>\n<ul>\n<li><a href="..">.. (up one level)</a></li>\n<li><a href="file">file</a></li>\n</ul>'
		}, function(passed) {
		passed; /// index rendered
		then();
	}); }, function(then) { testRequestOverride(null, "", "index.html",
		{ statusCode: 200, data: "\\index.html contents", comment: undefined }, function(passed) {
		passed; /// index piped (no path)
		then();
	}); },
		/* 404 */
		waterfall(function(then) { testRequestOverride(null, "/non-existent", null,
			{ statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// no extension, 404 rendered
			then();
		}); }, function(then) { testRequestOverride(null, "/non-existent", null,
			{ statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// no extension, 404 rendered
			then();
		}); }, function(then) { testRequestOverride(null, "/non-existent.html", null,
			{ statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// html extension, 404 rendered
			then();
		}); }, function(then) { testRequestOverride(null, "/non-existent.ext", null,
			{ statusCode: 404, data: quick_host["404"], comment: "rendered 404" }, function(passed) {
			passed; /// unrecognised extension, 404 sent
			then();
		}); }, function(then) { testRequestOverride(null, "/non-existent.ico", null,
			{ statusCode: 404, data: "", comment: undefined }, function(passed) {
			passed; /// recognised, non-html extension, 404 sent
			then();
		}); })
	)
)();

}, __dirname, __filename).renderFull);
