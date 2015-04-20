module.exports = (function() {
	var pool = [];
	
	function wrap_callback(callback, state) {
		if (pool.length) {
			var obj = pool.pop();
			obj.callback = callback;
			obj.state = state || {};
			return obj;
		}
		else {
			var cb = function() {
				if (cb.next) {
					cb.next.apply(cb, arguments);
				}
			};
			cb.callback = callback;
			cb.set = function(nextCallback) { cb.next = nextCallback; return cb; };
			cb.end = function() {
				Array.prototype.unshift.call(arguments, null);
				cb.callback.apply(this, arguments);
				cb.destroy();
			}
			cb.error = function(error) {
				cb.callback.apply(cb, arguments);
				cb.destroy();
			};
			cb.destroy = function() {
				cb.callback = cb.next = null;
				cb.state = null;
				if (pool.length < wrap_callback.maxPoolSize) {
					pool.push(cb);
				}
			};
			cb.state = state || {};
			return cb;
		}
	};
	wrap_callback.maxPoolSize = Infinity;
	
	return wrap_callback;
})();