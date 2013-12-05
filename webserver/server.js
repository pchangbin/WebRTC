#!/usr/bin/node

var connect = require('connect');

const listenPort=8000;
var wwwRoot=__dirname + "/..";

connect.createServer(
	connect.static(wwwRoot)
).listen(listenPort);

console.log("Simple Webserver is listening");
console.log("Home Directory : " + wwwRoot);
console.log("Port           : " + listenPort);
