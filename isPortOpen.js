var net = require("net");
module.exports = function isPortOpen(port, callback) {
	var server = net.createServer().listen(port, function (err) {
		if (err) { return callback(false); }
		else {
			server.once("close", function () {
				callback(true);
			}).close();
		}
	}).on("error", function (err) {
		callback(false);
	});
};