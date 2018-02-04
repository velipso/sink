// (c) Copyright 2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

import sink = require('./sink.js');
import sink_shell = require('./sink_shell.js');
import fs = require('fs');
import path = require('path');
import readline = require('readline');

async function io_say(ctx: sink.ctx, str: sink.str, iouser: any): Promise<void> {
	console.log(str);
}

async function io_warn(ctx: sink.ctx, str: sink.str, iouser: any): Promise<void> {
	console.error(str);
}

async function io_ask(ctx: sink.ctx, str: sink.str, iouser: any): Promise<sink.val> {
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return new Promise<sink.val>(function(resolve, reject){
		rl.question(str, function(ans){
			rl.close();
			resolve(ans);
		});
	});
}

let io: sink.io_st = {
	f_say: io_say,
	f_warn: io_warn,
	f_ask: io_ask
};

async function nodeStat(file: string): Promise<fs.Stats | null> {
	return new Promise<fs.Stats | null>(function(resolve, reject){
		fs.stat(file, function(err, st: fs.Stats){
			if (err){
				if (err.code == 'ENOENT')
					resolve(null);
				else
					reject(err);
			}
			else
				resolve(st);
		});
	});
}

async function fstype(file: string): Promise<sink.fstype> {
	let st = await nodeStat(file);
	if (st !== null){
		if (st.isFile())
			return sink.fstype.FILE;
		else if (st.isDirectory())
			return sink.fstype.DIR;
	}
	return sink.fstype.NONE;
}

async function nodeRead(file: string): Promise<string | null> {
	return new Promise<string | null>(function(resolve, reject){
		fs.readFile(file, 'binary', function(err, data){
			if (err){
				console.error(err);
				resolve(null);
			}
			else
				resolve(data);
		});
	});
}

async function fsread(scr: sink.scr, file: string): Promise<boolean> {
	let data = await nodeRead(file);
	if (data === null)
		return false; // `false` indicates the file couldn't be read
	await sink.scr_write(scr, data);
	return true; // `true` indicates the file was read
}

let inc: sink.inc_st = {
	f_fstype: fstype,
	f_fsread: fsread
};

function newctx(scr: sink.scr, argv: string[]): sink.ctx {
	let ctx = sink.ctx_new(scr, io);
	sink_shell.ctx(ctx, argv);
	return ctx;
}

function printscrerr(scr: sink.scr): void {
	console.error(sink.scr_geterr(scr));
}

function printctxerr(ctx: sink.ctx): void {
	let err = sink.ctx_geterr(ctx);
	if (err === null) // context can error without an error message if script contains `abort`
		return;       // without any parameters
	console.error(err);
}

async function readPrompt(p: string): Promise<string> {
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return new Promise<string>(function(resolve){
		rl.question(p, function(ans){
			rl.close();
			resolve(ans);
		});
	});
}

async function main_repl(scr: sink.scr, argv: string[]): Promise<boolean> {
	let ctx = newctx(scr, argv);
	let line = 1;
	while (true){
		let levels = sink.scr_level(scr);
		var p = ': ';
		if (levels > 0)
			p = (new Array(levels + 1)).join('..') + '. ';
		if (line < 10)
			p = ' ' + line + p;
		else
			p = line + p;
		let ans = await readPrompt(p);
		line++;
		let buf = ans + '\n';
		if (!await sink.scr_write(scr, buf))
			printscrerr(scr);
		if (sink.scr_level(scr) <= 0){
			switch (await sink.ctx_run(ctx)){
				case sink.run.PASS:
					return true;
				case sink.run.FAIL:
					printctxerr(ctx);
					break;
				case sink.run.ASYNC:
					console.error('REPL returned async (impossible)');
					return false;
				case sink.run.TIMEOUT:
					console.error('REPL returned timeout (impossible)');
					return false;
				case sink.run.REPLMORE:
					// do nothing
					break;
			}
		}
	}
}

async function main_run(scr: sink.scr, file: string, argv: string[]): Promise<boolean> {
	if (!await sink.scr_loadfile(scr, file)){
		printscrerr(scr);
		return false;
	}
	let ctx = newctx(scr, argv);
	let res = await sink.ctx_run(ctx);
	if (res == sink.run.FAIL)
		printctxerr(ctx);
	return res == sink.run.PASS;
}

async function main_eval(scr: sink.scr, ev: string, argv: string[]): Promise<boolean> {
	if (!await sink.scr_write(scr, ev)){
		printscrerr(scr);
		return false;
	}
	let ctx = newctx(scr, argv);
	let res = await sink.ctx_run(ctx);
	if (res == sink.run.FAIL)
		printctxerr(ctx);
	return res == sink.run.PASS;
}

function perform_dump(scr: sink.scr, debug: boolean): void {
	// process.stdout.write isn't guaranteed to have synchronous writes (!!)
	let dump_data = '';
	function dump(data: string): void {
		dump_data += data;
	}
	sink.scr_dump(scr, debug, null, dump);
	process.stdout.write(dump_data, 'binary');
}

async function main_compile_file(scr: sink.scr, file: string, debug: boolean): Promise<boolean> {
	if (!await sink.scr_loadfile(scr, file)){
		printscrerr(scr);
		return false;
	}
	perform_dump(scr, debug);
	return true;
}

async function main_compile_eval(scr: sink.scr, ev: string, debug: boolean): Promise<boolean> {
	if (!await sink.scr_write(scr, ev)){
		printscrerr(scr);
		return false;
	}
	perform_dump(scr, debug);
	return true;
}

function print_version(): void {
	console.log(
		'Sink v1.0\n' +
		'Copyright (c) 2016-2018 Sean Connelly (@voidqk), MIT License\n' +
		'https://github.com/voidqk/sink  http://sean.cm');
}

function print_help(): void {
	print_version();
	console.log(
		'\nUsage:\n' +
		'  sink [options] [ -e \'<code>\' | <file> ] [arguments]\n' +
		'\n' +
		'With no arguments, sink will enter interactive mode (REPL).\n' +
		'\n' +
		'Option           Description\n' +
		'  -v               Display version information and exit\n' +
		'  -h, --help       Display help information and exit\n' +
		'  -I <path>        Add <path> to the include search path\n' +
		'  -c               Compile input and output bytecode to stdout\n' +
		'  -d               If compiling, output bytecode with debug info\n' +
		'  -D <key> <file>  If compiling, add <file> declarations when including <key>\n' +
		'\n' +
		'  The -D option is useful for providing declarations so that compilation can\n' +
		'  succeed for other host environments.\n' +
		'\n' +
		'  For example, a host might provide declarations for native commands via:\n' +
		'\n' +
		'    include \'shapes\'\n' +
		'\n' +
		'  The host could provide a declaration file, which can be used during\n' +
		'  compilation using a `-D shapes shapes_decl.sink` option.  This means when the\n' +
		'  script executes `include \'shapes\'`, the compiler will load `shapes_decl.sink`.\n' +
		'  Even though the compiler doesn\'t know how to execute the host commands, it can\n' +
		'  still compile the file for use in the host environment.');
}

export async function main(): Promise<boolean> {
	let argv = process.argv.splice(1);
	let argc = argv.length;
	let compile = false;
	let compile_debug = false;
	let input_type = 'repl';
	let input_content = '';

	// first pass, just figure out what we're doing and validate arguments
	let i = 1;
	for ( ; i < argc; i++){
		let a = argv[i];
		if (a === '-v'){
			if (i + 1 < argc){
				print_help();
				return false;
			}
			print_version();
			return true;
		}
		else if (a === '-h' || a === '--help'){
			print_help();
			return i + 1 < argc ? false : true;
		}
		else if (a === '-I'){
			if (i + 1 >= argc){
				print_help();
				return false;
			}
			i++; // skip include path
		}
		else if (a === '-c')
			compile = true;
		else if (a === '-d')
			compile_debug = true;
		else if (a === '-D'){
			if (i + 2 >= argc){
				print_help();
				return false;
			}
			i += 2; // skip declaration key/file
		}
		else if (a === '-e'){
			if (i + 1 >= argc){
				print_help();
				return false;
			}
			input_content = argv[i + 1];
			i += 2; // skip over script
			input_type = 'eval';
			break;
		}
		else if (a === '--'){
			i++;
			break;
		}
		else{
			if (a.charAt(0) === '-'){
				// some unknown option
				print_help();
				return false;
			}
			input_content = a;
			i++; // skip over file
			input_type = 'file';
			break;
		}
	}

	if (compile && input_type == 'repl'){
		print_help();
		return false;
	}

	// grab sink arguments
	let s_argv = argv.slice(i);

	// create the script with the current working directory
	let cwd = process.cwd();
	let scr = sink.scr_new(inc, cwd, path.sep === '/', input_type === 'repl');

	// add the appropriate paths
	sink.scr_addpath(scr, '.');
	/*
	TODO: this
	const char *sp = getenv("SINK_PATH");
	if (sp == NULL){
		// if no environment variable, then add a default path of the current directory
		sink_scr_addpath(scr, ".");
	}
	else{
		fprintf(stderr, "TODO: process SINK_PATH\n");
		abort();
	}
	*/

	// add any libraries
	sink_shell.scr(scr);

	// load include paths and declaration key/files
	for (i = 1; argv[i] !== input_content && i < argv.length; i++){
		let a = argv[i];
		if (a === '-I'){
			sink.scr_addpath(scr, argv[i + 1]);
			i++;
		}
		else if (a === '-D'){
			sink.scr_incfile(scr, argv[i + 1], argv[i + 2]);
			i += 2;
		}
	}

	if (input_type === 'file'){
		if (compile)
			return main_compile_file(scr, input_content, compile_debug);
		return main_run(scr, input_content, s_argv);
	}
	else if (input_type === 'repl')
		return main_repl(scr, s_argv);
	else if (input_type === 'eval'){
		if (compile)
			return main_compile_eval(scr, input_content, compile_debug);
		return main_eval(scr, input_content, s_argv);
	}
	// shouldn't happen
	throw new Error('Bad input type');
}
