// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var Lexer = require('./lexer');
var Parser = require('./parser');
var Body = require('./body');
var UTF8 = require('./utf8');

function make_error(file, line, chr, msg){
	return (file === null ? '' : file + ':') + line + ':' + chr + ': ' + msg
}

function processLex(parser, file, line, chr, rls, err){
	for (var i = 0; i < rls.length; i++){
		var rl = rls[i];
		if (rl.type == 'TOK_ERROR'){
			err[0] = make_error(file, line, chr, rl.data);
			return false;
		}
		//console.log(rl);
		var rp = parser.add(rl);
		switch (rp.type){
			case 'PRR_MORE':
				break;
			case 'PRR_ERROR':
				err[0] = make_error(file, line, chr, rp.msg);
				return false;
			default:
				throw 'TODO: parser result ' + rp.type;
		}
	}
	return true;
}

module.exports = function(immediate){
	var body = Body();
	var parser = Parser(body);
	var state = null;
	var my = {
		pushFile: function(f){
			state = {
				file: f,
				line: 1,
				chr: 1,
				lastret: false,
				lex: Lexer(f),
				next: state
			};
		},
		popFile: function(err){
			var rls = state.lex.close();
			var res = processLex(parser, state.file, state.line, state.chr, rls, err);
			state = state.next;
			return res;
		},
		add: function(str, err){
			return my.addBytes(UTF8.encode(str), err);
		},
		addBytes: function(bytes, err){
			for (var i = 0; i < bytes.length; i++){
				var line = state.line;
				var chr = state.chr;

				var ch = String.fromCharCode(bytes[i]);

				// calculate future line/chr
				if (ch == '\r'){
					state.lastret = true;
					state.line++;
					state.chr = 1;
				}
				else{
					if (ch == '\n'){
						if (!state.lastret){
							state.line++;
							state.chr = 1;
						}
					}
					else
						state.chr++;
					state.lastret = false;
				}

				var rls = state.lex.add(ch);
				res = processLex(parser, state.file, line, chr, rls, err);
				if (!res)
					return false;
			}
			return true;
		},
		reset: function(){
			parser.reset();
		}
	};
	return my;
};
