#!/usr/bin/env node

var sink = require('./index');
var buildId = require('./build-id');
var fs = require('fs');
var path = require('path');

function printHelp(){
	console.log(
		'Sink ' + buildId + '\n' +
		'(c) Copyright 2016 Sean Connelly (@voidqk, web: syntheti.cc), MIT License\n\n' +
		'./sink [options] [-e \'script\' | script.sink | script.sb] [arguments]\n\n' +
		'Options:\n' +
		'  -v          Print verison information                   \n' +
		'  -e script   Script specified by command line            \n' +
		'  -c          Compile script to bytecode                  \n' +
		'  -j          Transpile script to JavaScript              \n' +
		'  -o output   Output file for compilation (default stdout)\n' +
		'\n' +
		'If -c or -j isn\'t specified, then the script will run immediately with\n' +
		'the specified [arguments] passed in.'
	);
}

var args = process.argv.slice(2);

if (args.length <= 0)
	return printHelp();

var source = false;
var output = false;
var mode = 'run';

(function(){

function readFile(fn){
	try {
		return fs.readFileSync(fn);
	}
	catch (e){
		console.error('Failed to open file: ' + fn + '\n');
		console.error(e);
		process.exit(1);
	}
}

while (args.length > 0){
	var cmd = args.shift();
	switch (cmd){
		case '-v':
			console.log(buildId);
			process.exit(0);
			return;
		case '-e':
			source = args.shift();
			return;
		case '-c':
			mode = 'compile';
			break;
		case '-j':
			mode = 'transpile';
			break;
		case '-o':
			output = args.shift();
			break;
		case '--':
			source = readFile(args.shift());
			return;
		default:
			source = readFile(cmd);
			return;
	}
}

})();

if (source === false)
	return printHelp();

function isBytecode(){
	// TODO: detect whether source is bytecode or not
	return false;
}

switch (mode){
	case 'run':
		if (isBytecode())
			throw 'TODO';
		return sink.newCompiler(false, false, false).run(source.toString());

	case 'compile':
		throw 'TODO';
	case 'transpile':
		throw 'TODO';
}
