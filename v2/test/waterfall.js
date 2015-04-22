module.exports = function waterfall() {
	var args = arguments, callback;
	var i = 0; function then(_callback) {
		if (_callback) { callback = _callback; }
		
		var next = args[i++];
		if (next) { next(then); }
		else if (callback) { callback(); }
	}
	return then;
};