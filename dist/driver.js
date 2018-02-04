#!/usr/bin/env node
// (c) Copyright 2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

require('./cmd.js').main().then(
	function(res){ process.exit(res ? 0 : 1); },
	function(err){ console.error(err); process.exit(1); }
);
