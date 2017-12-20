// (c) Copyright 2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

import sink = require('./sink.js');

var isBrowser = typeof window === 'object';

function L_pwd__b(): sink.val {
	return window.location.href
		.replace(/^.*:/, '')  // remove protocol
		.replace(/\?.*$/, '') // remove query params
		.replace(/\/[^\/]*$/, ''); // remove trailing file and slash
}

function L_pwd__n(): sink.val {
	return process.cwd();
}

export function scr(scr: sink.scr): void {
	sink.scr_incbody(scr, 'shell',
		"declare args  'sink.shell.args' ;" +
		"declare cat   'sink.shell.cat'  ;" +
		"declare cd    'sink.shell.cd'   ;" +
		"declare cp    'sink.shell.cp'   ;" +
		"declare env   'sink.shell.env'  ;" +
		"declare exec  'sink.shell.exec' ;" +
		"declare glob  'sink.shell.glob' ;" +
		"declare head  'sink.shell.head' ;" +
		"declare ls    'sink.shell.ls'   ;" +
		"declare mv    'sink.shell.mv'   ;" +
		"declare mkdir 'sink.shell.mkdir';" +
		"declare pushd 'sink.shell.pushd';" +
		"declare popd  'sink.shell.popd' ;" +
		"declare pwd   'sink.shell.pwd'  ;" +
		"declare rm    'sink.shell.rm'   ;" +
		"declare tail  'sink.shell.tail' ;" +
		"declare test  'sink.shell.test' ;" +
		"declare which 'sink.shell.which';");
}

export function ctx(ctx: sink.ctx): void {
	sink.ctx_native(ctx, 'sink.shell.pwd', null, L_pwd__n);
}
