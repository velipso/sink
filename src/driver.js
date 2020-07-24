#!/usr/bin/env node
// (c) Copyright 2018, Sean Connelly (@velipso), sean.cm
// MIT License
// Project Home: https://github.com/velipso/sink

require('./cmd.js').main().then(
	function(res){ process.exit(res ? 0 : 1); },
	function(err){ console.error(err); process.exit(1); }
);
