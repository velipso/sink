// (c) Copyright 2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

import sink = require('./sink.js');

const VERSION_MAJ = 1;
const VERSION_MIN = 0;
const VERSION_PAT = 0;

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

async function L_version(ctx: sink.ctx, args: sink.val[]): Promise<sink.val> {
	let reqmaj = 0, reqmin = 0, reqpat = 0;
	if (args.length >= 1){
		if (!sink.isnum(args[0]))
			return sink.abortstr(ctx, 'Expecting number');
		reqmaj = (args[0] as number) | 0;
	}
	if (args.length >= 2){
		if (!sink.isnum(args[1]))
			return sink.abortstr(ctx, 'Expecting number');
		reqmin = (args[1] as number) | 0;
	}
	if (args.length >= 3){
		if (!sink.isnum(args[2]))
			return sink.abortstr(ctx, 'Expecting number');
		reqpat = (args[2] as number) | 0;
	}
	while (true){
		if (reqmaj > VERSION_MAJ)
			break;
		else if (reqmaj == VERSION_MAJ){
			if (reqmin > VERSION_MIN)
				break;
			else if (reqmin == VERSION_MIN){
				if (reqpat > VERSION_PAT)
					break;
			}
		}
		return new sink.list(VERSION_MAJ, VERSION_MIN, VERSION_PAT);
	}
	return sink.abortstr(ctx,
		'Script requires version ' + reqmaj + '.' + reqmin + '.' + reqpat + ', but sink is ' +
		'version ' + VERSION_MAJ + '.' + VERSION_MIN + '.' + VERSION_PAT);
}

async function L_args(ctx: sink.ctx, args: sink.val[], pargs: string[]): Promise<sink.val> {
	let v = new sink.list();
	for (let i = 0; i < pargs.length; i++)
		v.push(pargs[i]);
	return v;
}

export function scr(scr: sink.scr): void {
	sink.scr_incbody(scr, 'shell',
		"declare version 'sink.shell.version';" +
		"declare args    'sink.shell.args'   ;");
}

export function ctx(ctx: sink.ctx, args: string[]): void {
	sink.ctx_native(ctx, 'sink.shell.version', null, L_version);
	sink.ctx_native(ctx, 'sink.shell.args', args, L_args);
}
