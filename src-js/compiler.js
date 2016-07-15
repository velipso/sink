// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var Lexer = require('./lexer');
var Parser = require('./parser');
var Body = require('./body');
var UTF8 = require('./utf8');

function res_more(levels){
	return { err: false, levels: levels };
}

function res_error(file, line, chr, msg){
	return { err: true, msg: (file === false ? '' : file + ':') + line + ':' + chr + ': ' + msg };
}

function processLex(parser, file, line, chr, rls){
	for (var i = 0; i < rls.length; i++){
		var rl = rls[i];
		if (rl.type == 'TOK_ERROR')
			return res_error(file, line, chr, rl.data);
		console.log(rl);
		var rp = parser.add(rl);
		switch (rp.type){
			case 'more':
				break;
			case 'error':
				return res_error(file, line, chr, rp.msg);
		}
	}
	return res_more(parser.level());
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
		popFile: function(){
			var rls = state.lex.close();
			var res = processLex(parser, state.file, state.line, state.chr, rls);
			state = state.next;
			return res;
		},
		add: function(str){
			return my.addBytes(UTF8.encode(str));
		},
		addBytes: function(bytes){
			var res = res_more(parser.level());
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
				res = processLex(parser, state.file, line, chr, rls);
				if (res.err)
					return res;
			}
			return res;
		}
	};
	return my;
};
