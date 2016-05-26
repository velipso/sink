
var Lexer = require('./lexer');
var Scope = require('./scope');
var Body = require('./body');
var Parser = require('./parser');

module.exports = function(file, readFile, natives){
	var f = readFile(file, '.');
	if (f === false)
		throw new Error('Failed to load file: ' + file);
	// TODO: handle readFile returning a Promise
	var tokens = Lexer(f.file, f.source, readFile);
	var scope = Scope();
	return scope.newFrame(function(){
		var body = Body({ scope: scope, nil: false, nums: [], strs: [] }, false, false);
		if (typeof natives !== 'undefined' && natives !== false){
			natives.forEach(function(nat){
				body.stmtDeclareNative({ pos: false, data: nat.name }, nat.opcode, nat.params);
			});
		}
		Parser(body, tokens);
		body.stmtReturn(false, body.exprNil());
		return body.finish();
	});
};
