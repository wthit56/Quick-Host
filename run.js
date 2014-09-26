var args = process.argv;
if (args.length < 3) { throw "Must specify folder."; }

var QuickHost = require("Quick-Host");

QuickHost(args[2], args[3], function(error, port) {
	if (error) { throw error; }
	else {
		console.log("Quick-Hosting \"" + args[2] + "\" using port " + port + "... (CTRL+C or close to stop)");
	}
});
