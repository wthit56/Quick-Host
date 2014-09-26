var CreateCallback = (function() {
	var pool = [];
	
	function CreateCallback() {
		if(pool.length){
			var callback = pool.pop();
		}
		else {
			function callback() {
				if(callback.action){
					Array.prototype.push.call(arguments, callback);
					callback.action.apply(this, arguments);
				}
			}
			callback.action = null;
			callback.dispose = _dispose.bind(callback);
			callback.dispose.disposed = false;
			callback.setAction = _setAction;
		}
		
		return callback;
	}
	CreateCallback.pool = pool;
	CreateCallback.maxPoolSize = Infinity;
	
	function _setAction(action){
		this.action = action;
		return this;
	}
	function _dispose(){
		if (!this.dispose.disposed) {
			if (pool.length < CreateCallback.maxPoolSize) {
				pool.push(this);
			}
			this.action = null;

			if (this.ondispose) { this.ondispose(this); }

			this.dispose.disposed = true;
		}
		
		return this;		
	}
	
	return CreateCallback;
})();

if (undefined !== module) { module.exports = CreateCallback; }
