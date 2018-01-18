// (c) Copyright 2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

import sink = require('./sink.js');
import sink_shell = require('./sink_shell.js');
import fs = require('fs');
import path = require('path');
import readline = require('readline');

function io_say(ctx: sink.ctx, str: sink.str, iouser: any): void {
	console.log(str);
}

function io_warn(ctx: sink.ctx, str: sink.str, iouser: any): void {
	console.error(str);
}

function io_ask(ctx: sink.ctx, str: sink.str, iouser: any): Promise<sink.val> {
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return new Promise(function(resolve, reject){
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

function fstype(file: string): Promise<sink.fstype> {
	return new Promise(function(resolve, reject){
		fs.stat(file, function(err, st){
			if (err){
				if (err.code == 'ENOENT')
					return resolve(sink.fstype.NONE);
				return reject(err);
			}
			if (st.isFile())
				return resolve(sink.fstype.FILE);
			else if (st.isDirectory())
				return resolve(sink.fstype.DIR);
			resolve(sink.fstype.NONE);
		});
	});
}

function fsread(scr: sink.scr, file: string): Promise<boolean> {
	return new Promise(function(resolve, reject){
		fs.readFile(file, 'binary', function(err, data){
			if (err){
				console.error(err);
				resolve(false); // `false` indicates there was an error reading file
			}
			else{
				sink.checkPromise<boolean, void>(
					sink.scr_write(scr, data),
					function(err: boolean): void {
						resolve(true); // `true` indicates that the file was read
					}
				);
			}
		});
	});
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

function main_repl(scr: sink.scr, argv: string[]): Promise<boolean> {
	return new Promise(function(resolve){
		let ctx = newctx(scr, argv);
		let line = 1;
		nextLine();
		function nextLine(){
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			let levels = sink.scr_level(scr);
			var p = ': ';
			if (levels > 0)
				p = (new Array(levels + 1)).join('..') + '. ';
			if (line < 10)
				p = ' ' + line + p;
			else
				p = line + p;
			rl.question(p, function(ans){
				line++;
				rl.close();
				let buf = ans + '\n';
				sink.checkPromise<boolean, void>(
					sink.scr_write(scr, buf),
					function(written: boolean){
						if (!written)
							printscrerr(scr);
						if (sink.scr_level(scr) <= 0){
							sink.ctx_run(ctx, function(ctx: sink.ctx, res: sink.run): void {
								switch (res){
									case sink.run.PASS:
										resolve(true);
										return;
									case sink.run.FAIL:
										printctxerr(ctx);
										break;
									case sink.run.ASYNC:
										console.error('REPL invoked async function');
										resolve(false);
										return;
									case sink.run.TIMEOUT:
										console.error('REPL returned timeout (impossible)');
										resolve(false);
										return;
									case sink.run.REPLMORE:
										// do nothing
										break;
								}
								nextLine();
							});
						}
						else
							nextLine();
					}
				);
			});
		}
	});
}

function main_run(scr: sink.scr, file: string, argv: string[]): boolean | Promise<boolean> {
	return sink.checkPromise<boolean, boolean>(
		sink.scr_loadfile(scr, file),
		function(loaded: boolean): boolean | Promise<boolean> {
			if (!loaded){
				printscrerr(scr);
				return false;
			}
			let ctx = newctx(scr, argv);
			return new Promise<boolean>(function(resolve, reject): void {
				sink.ctx_run(ctx, function(ctx: sink.ctx, res: sink.run): void {
					if (res == sink.run.FAIL)
						printctxerr(ctx);
					resolve(res == sink.run.PASS);
				});
			});
		}
	);
}

function main_eval(scr: sink.scr, ev: string, argv: string[]): boolean | Promise<boolean> {
	return sink.checkPromise<boolean, boolean>(
		sink.scr_write(scr, ev),
		function(written: boolean): boolean | Promise<boolean> {
			if (!written){
				printscrerr(scr);
				return false;
			}
			let ctx = newctx(scr, argv);
			return new Promise<boolean>(function(resolve, reject): void {
				sink.ctx_run(ctx, function(ctx: sink.ctx, res: sink.run): void {
					if (res == sink.run.FAIL)
						printctxerr(ctx);
					resolve(res == sink.run.PASS);
				});
			});
		}
	);
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

function main_compile_file(scr: sink.scr, file: string,
	debug: boolean): boolean | Promise<boolean> {
	return sink.checkPromise<boolean, boolean>(
		sink.scr_loadfile(scr, file),
		function(loaded: boolean): boolean {
			if (!loaded){
				printscrerr(scr);
				return false;
			}
			perform_dump(scr, debug);
			return true;
		}
	);
}

function main_compile_eval(scr: sink.scr, ev: string, debug: boolean): boolean | Promise<boolean> {
	return sink.checkPromise<boolean, boolean>(
		sink.scr_write(scr, ev),
		function(written: boolean): boolean {
			if (!written){
				printscrerr(scr);
				return false;
			}
			perform_dump(scr, debug);
			return true;
		}
	);
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

export function main(): boolean | Promise<boolean> {
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
