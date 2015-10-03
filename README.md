# Quick-Host — _version 2.0_

Quick-Host is a simple way of creating a http server with as much or as little configuration you require.

There are three ways of using Quick-Host:

## Drag-and-Drop
The quickest and easiest way to start up a new quick-host is to drag a directory into the included cli.bat file, or a shortcut to it. (CLI stands for Command Line Interface.)

This will run the node module targetted at the given directory, and use a random open port. It will give you some nice, friendly logs you can use to monitor what's going on under the hood. For most projects, this will be enough.

## Command Line
Using `node ...\cli.js`, or `...\cli.bat`, you can specify two parameters: directory (path string), and port (optional integer). If the port was specified and is open, it will be used. Otherwise, a random open port will be used.

This can be useful if you want to keep the same port, or make shortcuts to start up quick-hosts of directories you'll use more than once.

## Module Require
Requiring the module (`...\run.js`, or simply `Quick-Host`) will give you the `quick_host` function. This function takes a number of arguments:

`Root` is a string pointing to any directory on disk. This will be considered the root of the site, and will be used as the basis for all the default file-serving behaviour. The given directory _must_ exist.

`Port` is an integer, or a _falsy_ value. If it is an integer, this will be the _preferred_ local port number, meaning if that port number is already in use, a new one will be found randomly. Once a suitable port has been found (or confirmed as free), it will be set on the produced `host` object. If it is a _falsy_ value, quick-host will skip to finding a randomly-generated port.

`Callback` is a function that accepts two arguments: `error`, a string message describing any error encountered while trying to set up the host, and `host`, the created quick-host object (more details below).

> NOTE: This is a breaking change. Version 1 gave `error` and `port` arguments. You can fix this by adding `var port = host.port;` to the top of your `callback` function.

Your server-side code can end there, if you wish. You can just call this function and walk away. Any files will requested will be sent to the response, and any missing files will produce a 404 error.

If you want to further develop the back-end of your project you can, again, opt in to pick up from any point in the pipeline and take over, on a request-by-request basis.

### Host
As we saw above, the callback will receive a `host` object once it's all been set up. It has a number of properties:

`Root` is the full directory path to the root folder.

`Port` is the integer of the final port the server is listening on.

`Close` is a method that will close the server completely when called.

The `host` itself is an [EventEmitter](http://https://nodejs.org/api/events.html#events_emitter_on_event_listener) object. This means it has the usual _node.js_ EventEmitter properties and methods. The main one you need to know about is `.on(event, listener)`. This allows you to listen for certain events and to do things whenever they are called. The events host uses are detailed below.

## Events
All events can be listened for by calling `host.on(event, listenerCallback)`. Whenever appropriate, `ListenerCallback` will be called with a number of arguments.

### Request Pipeline Events

`Request` is the _node.js_ [http.IncomingMessage](https://nodejs.org/api/http.html#http_http_incomingmessage) object produced by the current request. With it, you can see all the details of the request made by an outside client (usually a web browser).

It does have one additional property, however: `path`. `Path` contains the assumed file path based on the root directory of the quick-host configuration and the path of the url. As quick-host's default behaviour progresses, it may be changed, reflecting what file path will be tried next in the process, or is currently being tried.

Don't worry, though. You can always figure out your own path using `response.url` and `host.root` if you need to.

`Response` is the _node.js_ [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) object produced by the current request. With it, you can send data back to the outside client that made the request (usually a web browser).

`Resume` is a function that, when called, lets quick-host continue with its default pipeline (sending the file, 404 message, etc).

`Cancel` is a function that, when called, stops quick-host from handling the request. You'd use this if you want to handle the request yourself, instead of letting quick-host's default pipeline handle it.

The only thing that separates the events is when they are fired. They all work the same way with `listenerCallback`, passing the same arguments and so on. The following list simply details at what point each event will trigger in the request handling process.

When registering the callback using the `.on` method, send the name of an event as a string, followed by the callback.

1. `request` is triggered at the start of the request handling pipeline. Nothing has been done apart from setting this up to be able to handle the new request. `Path` set to `root + request path` (pseudocode). Default behaviour: checks existence and type of assumed file path.
	1. `request-file-missing`: assumed path doesn't exist. Default behaviour: sends 404. **Ends request.**
	2. `request-file-found`: assumed path exists, and is a file. Default: sends file. **Ends request.**
	3. `request-directory-found`: assumed path exists, and is a directory. Default: checks if `request path` ends in a forward-slash (/). If so, : slash was found. Default: `root + request path + index.html` (pseudocode) is added to `request` object as an `indexPath` property. This path is checked for existence.
		1. `request-directory-redirect`: no trailing slash was found. Default: redrects the client (browser) to the same path with the added slash. This makes sure the browser sees the resulting page as _within_ that folder, fixing a lot of pathing bugs that can arise. **Ends request.**
		2. `request-directory-index-found`: index found. `Request` property `path` changed to `indexPath`, `indexPath` removed. Default: sends index file to client (browser). **Ends request.**
		3. `request-directory-index-missing`: no index found. Default: renders an index page with links to all files and folders within the requested directory.

### Global Events

There are a few other "global" events. That work a little differently.

1. `host-error`: the http server errored for whatever reason. Arguments: `error`.
3. `request-complete`: the response was successfully handled. Arguments: `request`, `response`, `comment` sent by quick-host.