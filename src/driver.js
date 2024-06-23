#!/usr/bin/env node
//
// sink - Minimal programming language for embedding small scripts in larger programs
// by Sean Connelly (@velipso), https://sean.fun
// Project Home: https://github.com/velipso/sink
// SPDX-License-Identifier: 0BSD
//

require('./cmd.js').main().then(
	function(res){ process.exit(res ? 0 : 1); },
	function(err){ console.error(err); process.exit(1); }
);
