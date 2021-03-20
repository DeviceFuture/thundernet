#!/usr/bin/env node

var config = require("./config");
var state = require("./state");
var server = require("./server");

config.init();
state.init();

server.start(config.data.port);