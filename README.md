# Quick-Host

Quick-Host allows quick and easy local hosting, requiring only the path to an existing directory. It will set up a simple HTTP server using the specified directory as its root.

There are three ways of using Quick-Host:

## 1. Drag-and-Drop
The easiest way to start up a new quick host is to drag a directory into the included run.bat file, or a shortcut to it. This will run the node module with the given directory, and use a random open port.

## 2. Command Line
Using `node run.js...`, or `run.bat...`, you can specify two parameters: directory (path string), and port (optional integer). If the port was specified and is open, it will be used. Otherwise, a random open port will be used.

## 3. Module Require
Requiring the module (`index.js`, or simply `Quick-Host`) will give you the QuickHost function. You can then pass in a directory and an optional port to produce behaviour much like the command-line usage.

You must also provide a callback as the third argument to the function. Once a host has been set up, it will be called with the port number used by the new server as the second argument. If an error occured, it will be called with the generated error object.

Here's an example of the module in use:
```js
var QuickHost = require("Quick-Host");

var directory = "directory/path", port = 8000;
QuickHost(directory, port, function(error, port) {
	if (error) {
		console.log("ERROR: " + error.message);
	}
	else {
		console.log("Quick-Hosting \"" + directory + "\" using port " + port + "... (CTRL+C or close to stop)");
	}
});
```
