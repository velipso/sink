#!/usr/bin/env node
// (c) Copyright 2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

var cmd = require('./cmd.js');
var res = cmd.main();
if (typeof res === 'boolean')
	process.exit(res ? 0 : 1);
else
	res.then(function(res){ process.exit(res ? 0 : 1); });
