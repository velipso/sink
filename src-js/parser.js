// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var Expr = require('./expr');
var StackFrame = require('./stack-frame');
var OP = require('./op');

function isKeyspec(tk, str){
	return tk.type == 'TOK_KEYSPEC' && tk.data == str;
}

function isPre(tk){
	return false ||
		isKeyspec(tk, '+'       ) ||
		isKeyspec(tk, '-'       ) ||
		isKeyspec(tk, '!'       ) ||
		isKeyspec(tk, '-~'      ) ||
		isKeyspec(tk, '~-'      ) ||
		isKeyspec(tk, 'typenum' ) ||
		isKeyspec(tk, 'typestr' ) ||
		isKeyspec(tk, 'typelist') ;
}

function isMid(tk){
	return false ||
		isKeyspec(tk, '+'  ) ||
		isKeyspec(tk, '+=' ) ||
		isKeyspec(tk, '-'  ) ||
		isKeyspec(tk, '-=' ) ||
		isKeyspec(tk, '%'  ) ||
		isKeyspec(tk, '%=' ) ||
		isKeyspec(tk, '*'  ) ||
		isKeyspec(tk, '*=' ) ||
		isKeyspec(tk, '/'  ) ||
		isKeyspec(tk, '/=' ) ||
		isKeyspec(tk, '^'  ) ||
		isKeyspec(tk, '^=' ) ||
		isKeyspec(tk, '<'  ) ||
		isKeyspec(tk, '<=' ) ||
		isKeyspec(tk, '>'  ) ||
		isKeyspec(tk, '>=' ) ||
		isKeyspec(tk, '!=' ) ||
		isKeyspec(tk, '='  ) ||
		isKeyspec(tk, '==' ) ||
		isKeyspec(tk, '~'  ) ||
		isKeyspec(tk, '~=' ) ||
		isKeyspec(tk, '~+' ) ||
		isKeyspec(tk, '+~' ) ||
		isKeyspec(tk, '~~+') ||
		isKeyspec(tk, '+~~') ||
		isKeyspec(tk, '&&' ) ||
		isKeyspec(tk, '||' ) ||
		isKeyspec(tk, '||=') ||
		isKeyspec(tk, ','  ) ;
}

function isTerm(tk){
	return false ||
		isKeyspec(tk, '(')     ||
		isKeyspec(tk, '{')     ||
		tk.type == 'TOK_IDENT' ||
		tk.type == 'TOK_STR'   ||
		tk.type == 'TOK_NUM'   ;
}

function isPreBeforeMid(pre, mid){
	// -5^2 is -25, not 25
	if (isKeyspec(pre, '-') && isKeyspec(mid, '^'))
		return false;
	// otherwise, apply the Pre first
	return true;
}

function midPrecedence(tk){
	if      (tk.data == '^'  ) return  1;
	else if (tk.data == '%'  ) return  2;
	else if (tk.data == '*'  ) return  2;
	else if (tk.data == '/'  ) return  2;
	else if (tk.data == '+'  ) return  3;
	else if (tk.data == '-'  ) return  3;
	else if (tk.data == '~+' ) return  4;
	else if (tk.data == '+~' ) return  4;
	else if (tk.data == '~~+') return  5;
	else if (tk.data == '+~~') return  5;
	else if (tk.data == '~'  ) return  6;
	else if (tk.data == '<=' ) return  7;
	else if (tk.data == '<'  ) return  7;
	else if (tk.data == '>=' ) return  7;
	else if (tk.data == '>'  ) return  7;
	else if (tk.data == '!=' ) return  8;
	else if (tk.data == '==' ) return  8;
	else if (tk.data == '&&' ) return  9;
	else if (tk.data == '||' ) return 10;
	else if (tk.data == ','  ) return 11;
	else if (tk.data == '='  ) return 20;
	else if (tk.data == '+=' ) return 20;
	else if (tk.data == '%=' ) return 20;
	else if (tk.data == '-=' ) return 20;
	else if (tk.data == '*=' ) return 20;
	else if (tk.data == '/=' ) return 20;
	else if (tk.data == '^=' ) return 20;
	else if (tk.data == '~=' ) return 20;
	throw new Error('Invalid operator: ' + tk.data);
}

function isMidBeforeMid(lmid, rmid){
	var lp = midPrecedence(lmid);
	var rp = midPrecedence(rmid);
	if (lp < rp)
		return true;
	else if (lp > rp)
		return false;
	// otherwise, same precedence...
	if (lp === 20 || isKeyspec(lmid, '^')) // mutation and pow are right to left
		return false;
	return true;
}

function isCmd(type){
	return type == 'EXPR_CMD_LOCAL' || type == 'EXPR_CMD_NATIVE' || type == 'EXPR_CMD_OPCODE';
}

function ets_new(tk, next){ // exprPreStack, exprMidStack
	return {
		tk: tk,
		next: next
	};
}

function exs_new(expr, next){ // exprStack
	return {
		expr: expr,
		next: next
	};
}

function eps_new(ets, next){ // exprPreStackStack
	return {
		ets: ets,
		next: next
	};
}

function vn_new(fdiff, index, ns, name){
	return {
		fdiff: fdiff,
		index: index,
		ns: ns,
		name: name
	};
}

function state_new(st, lblBreak, lblContinue, next){
	return {
		st: st,
		lblBreak: null,
		lblContinue: null,
		exprComma: false,
		exprPreStackStack: null, // linked list of eps_new's
		exprPreStack: null, // linked list of ets_new's
		exprMidStack: null, // linked list of ets_new's
		exprStack: null, // linked list of exs_new's
		exprTerm: null,
		exprTerm2: null,
		lookupNames: null, // list of names
		varNames: null, // list of vn_new's
		next: next
	};
}

function state_newPush(st, next){
	return state_new(st, next.lblBreak, next.lblContinue, next);
}

function using_new(ns, next){
	return {
		ns: ns,
		next: next
	};
}

function nsname_newVar(name, fr, index, next){
	return {
		name: name,
		type: 'NSN_VAR',
		fr: fr,
		index: index,
		next: next
	};
}

function nsname_newNamespace(name, ns, next){
	return {
		name: name,
		type: 'NSN_NAMESPACE',
		ns: ns,
		next: next
	};
}

function nsname_newCmdLocal(name, label, next){
	return {
		name: name,
		type: 'NSN_CMD_LOCAL',
		label: label,
		next: next
	};
}

function nsname_newCmdNative(name, cmd, next){
	return {
		name: name,
		type: 'NSN_CMD_NATIVE',
		cmd: cmd,
		next: next
	};
}

function nsname_newCmdOpcode(name, opcode, params, next){
	return {
		name: name,
		type: 'NSN_CMD_OPCODE',
		opcode: opcode,
		params: params,
		next: next
	};
}

function namespace_new(fr, next){
	return {
		fr: fr, // frame that the namespace is in
		usings: null, // linked list of using's
		names: null, // linked list of nsname's
		next: next // next namespace in the scope list
	};
}

function namespace_has(ns, name){
	var here = ns.names;
	while (here != null){
		if (here.name == name)
			return true;
		here = here.next;
	}
	return false;
}

function lkup_nsname(nsn){
	return { type: 'LKUP_NSNAME', nsn: nsn };
}

function lkup_error(msg){
	return { type: 'LKUP_ERROR', msg: msg };
}

function lkup_notfound(){
	return { type: 'LKUP_NOTFOUND' };
}

function namespace_lookup(ns, names, idx, err){
	// first try name's defined within this namespace
	var here = ns.names;
	while (here != null){
		if (here.name == names[idx]){
			if (idx == names.length - 1)
				return lkup_nsname(here);
			switch (here.type){
				case 'NSN_VAR':
					if (err[0] == null)
						err[0] = 'Variable "' + here.name + '" is not a namespace';
					break;
				case 'NSN_CMD_LOCAL':
				case 'NSN_CMD_NATIVE':
					if (err[0] == null)
						err[0] = 'Function "' + here.name + '" is not a namespace';
					break;
				case 'NSN_NAMESPACE': {
					var lk = namespace_lookup(here.ns, names, idx + 1, err);
					if (lk.type == 'LKUP_NSNAME')
						return lk;
				} break;
			}
		}
		here = here.next;
	}

	// failed to find result in namespace's names... check using's
	var usi = ns.usings;
	while (usi != null){
		var lk = namespace_lookup(usi.ns, names, idx, err);
		if (lk.type == 'LKUP_NSNAME')
			return lk;
		usi = usi.next;
	}

	// failed entirely
	return lkup_notfound();
}

function scope_new(fr, parent){
	var ns = namespace_new(fr, null);
	return {
		ns: ns, // linked list of namespace's, via ns.next
		parent: parent
	};
}

function scope_tryLookup(sc, names, err){
	// first try the current scope's namespaces
	var here = sc.ns;
	while (here != null){
		var lk = namespace_lookup(here, names, 0, err);
		if (lk.type == 'LKUP_NSNAME')
			return lk;
		here = here.next;
	}

	// failed, try parent scope
	if (sc.parent == null)
		return lkup_notfound();
	return scope_lookup(sc.parent, names);
}

function scope_lookup(sc, names){
	var err = [null];
	var lk = scope_tryLookup(sc, names, err);
	if (lk == 'LKUP_NOTFOUND' && err[0] != null)
		return lkup_error(err[0]);
	return lk;
}

function res_error(msg){
	return { type: 'PRR_ERROR', msg: msg };
}

function res_more(){
	return { type: 'PRR_MORE' };
}

module.exports = function(body){
	var st = state_new('PRS_STATEMENT', null, null, null);
	var fr = StackFrame(null);
	var sc = scope_new(fr, null);
	var level = 0;
	var tkR, tk1, tk2;

	// load command operators
	([
		{ name: 'say'        , opcode: OP.SAY         , params: -1 },
		{ name: 'ask'        , opcode: OP.ASK         , params: -1 },
		{ name: 'pick'       , opcode: -1             , params:  3 },
		{ namespace: 'num' },
			{ name: 'floor'  , opcode: OP.NUM_FLOOR   , params:  1 },
			{ name: 'ceil'   , opcode: OP.NUM_CEIL    , params:  1 },
			{ name: 'round'  , opcode: OP.NUM_ROUND   , params:  1 },
			{ name: 'sin'    , opcode: OP.NUM_SIN     , params:  1 },
			{ name: 'cos'    , opcode: OP.NUM_COS     , params:  1 },
			{ name: 'tan'    , opcode: OP.NUM_TAN     , params:  1 },
			{ name: 'asin'   , opcode: OP.NUM_ASIN    , params:  1 },
			{ name: 'acos'   , opcode: OP.NUM_ACOS    , params:  1 },
			{ name: 'atan'   , opcode: OP.NUM_ATAN    , params:  1 },
			{ name: 'atan2'  , opcode: OP.NUM_ATAN2   , params:  2 },
			{ name: 'log'    , opcode: OP.NUM_LOG     , params:  1 },
			{ name: 'log2'   , opcode: OP.NUM_LOG2    , params:  1 },
			{ name: 'log10'  , opcode: OP.NUM_LOG10   , params:  1 },
			{ name: 'abs'    , opcode: OP.NUM_ABS     , params:  1 },
			{ name: 'pi'     , opcode: OP.NUM_PI      , params:  0 },
			{ name: 'tau'    , opcode: OP.NUM_TAU     , params:  0 },
			{ name: 'lerp'   , opcode: OP.NUM_LERP    , params:  3 },
			{ name: 'max'    , opcode: OP.NUM_MAX     , params:  1 },
			{ name: 'min'    , opcode: OP.NUM_MIN     , params:  1 },
		{ endnamespace: true },
		{ namespace: 'list' },
			{ name: 'new'    , opcode: OP.LIST_NEW    , params:  2 },
			{ name: 'find'   , opcode: OP.LIST_FIND   , params:  3 },
			{ name: 'findRev', opcode: OP.LIST_FINDREV, params:  3 },
			{ name: 'rev'    , opcode: OP.LIST_REV    , params:  1 },
			{ name: 'join'   , opcode: OP.LIST_JOIN   , params:  2 },
		{ endnamespace: true }
	]).forEach(function(std){
		if (std.namespace){
			var ns = namespace_new(fr, sc.ns);
			sc.ns.names = nsname_newNamespace(std.namespace, ns, sc.ns.names);
			sc.ns = ns;
		}
		else if (std.endnamespace)
			sc.ns = sc.ns.next;
		else
			sc.ns.names = nsname_newCmdOpcode(std.name, std.opcode, std.params, sc.ns.names);
	});

	function fwd(tk){
		tk2 = tk1;
		tk1 = tk;
	}

	function rewind(){
		tkR = tk1;
		tk1 = tk2;
		tk2 = false;
	}

	function processToken(){
		//console.log('   ' + st.st);
		switch (st.st){
			case 'PRS_STATEMENT':
				if (tk1.type == 'TOK_NEWLINE')
					return res_more();
				else if (isKeyspec(tk1, 'break')){
					if (st.lblBreak == null)
						return res_error('Invalid `break`');
					body.jump(st.lblBreak);
				}
				else if (isKeyspec(tk1, 'continue')){
					if (st.lblContinue == null)
						return res_error('Invalid `continue`');
					body.jump(st.lblContinue);
				}
				else if (isKeyspec(tk1, 'declare')){
					level++;
					st = state_newPush('PRS_DECLARE', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'def')){
					level++;
					st = state_newPush('PRS_DEF', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'do')){
					level++;
					st = state_newPush('PRS_DO', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'for')){
					level++;
					st = state_newPush('PRS_FOR', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'goto')){
					level++;
					st = state_newPush('PRS_GOTO', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'if')){
					level++;
					st = state_newPush('PRS_IF', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'namespace')){
					level++;
					st = state_newPush('PRS_NAMESPACE', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'return')){
					level++;
					st = state_newPush('PRS_RETURN', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'using')){
					level++;
					st = state_newPush('PRS_USING', st);
					return res_more();
				}
				else if (isKeyspec(tk1, 'var')){
					st = state_newPush('PRS_VAR', st);
					st.varNames = [];
					return res_more();
				}
				else if (tk1.type == 'TOK_IDENT'){
					st = state_newPush('PRS_IDENT', st);
					return res_more();
				}
				else if (isPre(tk1) || isTerm(tk1)){
					st = state_newPush('PRS_EVAL', st);
					return processToken();
				}
				return res_error('Invalid statement');

			case 'PRS_IDENT':
				if (isKeyspec(tk1, ':')){
					throw 'TODO: define label';
					st = st.next;
					return res_more();
				}
				st.st = 'PRS_EVAL';
				rewind();
				var t = processToken();
				if (t.type == 'error')
					return t;
				fwd(tkR);
				return processToken();

			case 'PRS_LOOKUP':
				if (!isKeyspec(tk1, '.')){
					var s = st;
					st = st.next;
					st.lookupNames = s.lookupNames;
					return processToken();
				}
				st.st = 'PRS_LOOKUP_IDENT';
				return res_more();

			case 'PRS_LOOKUP_IDENT':
				if (tk1.type != 'TOK_IDENT')
					return res_error('Expecting identifier');
				st.lookupNames.push(tk1.data);
				st.st = 'PRS_LOOKUP';
				return res_more();

			case 'PRS_VAR':
				if (tk1.type == 'TOK_IDENT'){
					st.st = 'PRS_VAR_NAME';
					st = state_newPush('PRS_LOOKUP', st);
					st.lookupNames = [tk1.data];
					return res_more();
				}
				st.varNames = null; // free varNames
				return res_error('Expecting identifier');

			case 'PRS_VAR_NAME': {
				var ns = sc.ns;
				var nm = st.lookupNames.pop();
				if (st.lookupNames.length > 0){
					var nsn = scope_lookup(sc, st.lookupNames);
					if (nsn.type == 'NSN_ERROR')
						return res_error(nsn.msg);
					else if (nsn.type != 'NSN_NAMESPACE')
						return res_error('Bad declaration; invalid namespace');
					ns = nsn.ns;
				}

				var fdiff = ns.fr.diff(fr);
				var index = ns.fr.newVar();
				body.newVar(fdiff, index);
				st.varNames.push(vn_new(fdiff, index, ns, nm));

				if (isKeyspec(tk1, ',')){
					st.st = 'PRS_VAR';
					return res_more();
				}
				else if (isKeyspec(tk1, '=')){
					st.st = 'PRS_VAR_INIT';
					st = state_newPush('PRS_EXPR', st);
					return res_more();
				}

				st.exprTerm = Expr.nil();
				st.st = 'PRS_VAR_INIT';
				return processToken();
			} break;

			case 'PRS_VAR_INIT': {
				// evaluate init expression into storage locations
				if (st.exprTerm.type == 'EXPR_GROUP'){
					for (var i = 0; i < st.exprTerm.group.length; i++){
						var r;
						if (i < st.varNames.length){
							r = body.evalInto(
								fr,
								st.varNames[i].fdiff,
								st.varNames[i].index,
								st.exprTerm.group[i]
							);
						}
						else
							r = body.eval(fr, st.exprTerm.group[i], null);
						if (r.type == 'error')
							return res_error(r.msg);
					}
				}
				else{
					for (var i = 0; i < st.varNames.length; i++){
						var r = body.evalInto(
							fr,
							st.varNames[i].fdiff,
							st.varNames[i].index,
							i == 0 ? st.exprTerm : Expr.nil()
						);
						if (r.type == 'error')
							return res_error(r.msg);
					}
				}
				// insert symbols into namespace
				for (var i = 0; i < st.varNames.length; i++){
					var vn = st.varNames[i];
					if (namespace_has(vn.ns, vn.name))
						return res_error('Cannot redeclare: ' + vn.name);
					vn.ns.names = nsname_newVar(vn.name, vn.ns.fr, vn.index, vn.ns.names);
				}
				st = st.next;
				level--;
				return processToken();
			} break;

			case 'PRS_EVAL':
				st.st = 'PRS_EVAL_EXPR';
				st = state_newPush('PRS_EXPR', st);
				return processToken();

			case 'PRS_EVAL_EXPR': {
				var r = body.eval(fr, st.exprTerm, null);
				if (r.type == 'error')
					return res_error(r.msg);
				st = st.next;
				return processToken();
			} break;

			case 'PRS_EXPR':
				if (tk1.type == 'TOK_NEWLINE')
					return res_more();
				if (isPre(tk1)){
					st.exprPreStack = ets_new(tk1, st.exprPreStack);
					return res_more();
				}
				st.st = 'PRS_EXPR_TERM';
				return processToken();

			case 'PRS_EXPR_TERM':
				if (tk1.type == 'TOK_NUM'){
					st.st = 'PRS_EXPR_POST';
					st.exprTerm = Expr.num(tk1.data);
					return res_more();
				}
				else if (tk1.type == 'TOK_STR'){
					st.st = 'PRS_EXPR_POST';
					st.exprTerm = Expr.str(tk1.data);
					return res_more();
				}
				else if (tk1.type == 'TOK_IDENT'){
					st.st = 'PRS_EXPR_TERM_LOOKUP';
					st = state_newPush('PRS_LOOKUP', st);
					st.lookupNames = [tk1.data];
					return res_more();
				}
				else if (isKeyspec(tk1, '{')){
					st.st = 'PRS_EXPR_TERM_ISEMPTYLIST';
					// TODO: needs to check for '}', and put empty list in exprTerm
					// otherwise, needs to call PRS_EXPR and set exprComma to true, then put result
					// in exprTerm (ending in PRS_EXPR_POST)
					return res_more();
				}
				else if (isKeyspec(tk1, '(')){
					st.st = 'PRS_EXPR_TERM_ISNIL';
					return res_more();
				}
				return res_error('Invalid expression');

			case 'PRS_EXPR_TERM_ISNIL':
				if (isKeyspec(tk1, ')')){
					st.st = 'PRS_EXPR_POST';
					st.exprTerm = Expr.nil();
					return res_more();
				}
				st.st = 'PRS_EXPR_TERM_CLOSEPAREN';
				st = state_newPush('PRS_EXPR', st);
				st.exprComma = true;
				level++;
				return processToken();

			case 'PRS_EXPR_TERM_CLOSEPAREN':
				if (tk1.type == 'TOK_NEWLINE')
					return res_more();
				if (!isKeyspec(tk1, ')'))
					return res_error('Expecting close parenthesis');
				st.st = 'PRS_EXPR_POST';
				level--;
				return res_more();

			case 'PRS_EXPR_TERM_LOOKUP': {
				var lk = scope_lookup(sc, st.lookupNames);
				if (lk.type == 'LKUP_NOTFOUND'){
					var msg = 'Variable not defined: ' + st.lookupNames.join('.');
					st.lookupNames = null; // free lookup names
					return res_error(msg);
				}
				else if (lk.type == 'LKUP_ERROR'){
					st.lookupNames = null; // free lookup names
					return res_error(lk.msg);
				}
				else if (lk.nsn.type == 'NSN_NAMESPACE'){
					var msg = 'Cannot use namespace as variable: ' + st.lookupNames.join('.');
					st.lookupNames = null; // free lookup names
					return res_error(msg);
				}
				// lk.nsn.type == 'NSN_VAR', 'NSN_CMD_LOCAL', 'NSN_CMD_NATIVE', 'NSN_CMD_OPCODE'
				st.lookupNames = null; // free lookup names
				if (lk.nsn.type == 'NSN_VAR')
					st.exprTerm = Expr.lookup(lk.nsn.fr.diff(fr), lk.nsn.index);
				else if (lk.nsn.type == 'NSN_CMD_LOCAL')
					st.exprTerm = Expr.cmdLocal(lk.nsn.label);
				else if (lk.nsn.type == 'NSN_CMD_NATIVE')
					st.exprTerm = Expr.cmdNative(lk.nsn.cmd);
				else // NSN_CMD_OPCODE
					st.exprTerm = Expr.cmdOpcode(lk.nsn.opcode, lk.nsn.params);
				st.st = 'PRS_EXPR_POST';
				return processToken();
			} break;

			case 'PRS_EXPR_POST':
				if (tk1.type == 'TOK_NEWLINE'){
					st.st = 'PRS_EXPR_FINISH';
					return processToken();
				}
				else if (isCmd(st.exprTerm.type)){
					st.st = 'PRS_EXPR_POST_CALL';
					st.exprTerm2 = st.exprTerm;
					st = state_newPush('PRS_EXPR', st);
					return processToken();
				}
				else if (isKeyspec(tk1, '!')){
					st.exprTerm = Expr.postfix(tk1, st.exprTerm);
					return res_more();
				}
				else if (isKeyspec(tk1, '[')){
					throw 'TODO: collect index';
					/*
					if (tokens[0].isData(':')){
						getData(':');
						var len = false;
						if (!tokens[0].isData(']'))
							len = Expr(false).expr;
						var t = getData(']');
						return {
							expr: body.exprSlice(pos, expr.expr, false, len),
							newline: t.newline
						};
					}
					else{
						var index = Expr(false).expr;
						if (tokens[0].isData(':')){
							getData(':');
							var len = false;
							if (!tokens[0].isData(']'))
								len = Expr(false).expr;
							var t = getData(']');
							return {
								expr: body.exprSlice(pos, expr.expr, index, len),
								newline: t.newline
							};
						}
						else{
							var t = getData(']');
							return {
								expr: body.exprIndex(pos, expr.expr, index),
								newline: t.newline
							};
						}
					}
					*/
					return res_more();
				}
				if (st.exprComma)
					st.st = 'PRS_EXPR_COMMA';
				else
					st.st = 'PRS_EXPR_MID';
				return processToken();

			case 'PRS_EXPR_POST_CALL':
				st.exprTerm = Expr.call(st.exprTerm2, st.exprTerm);
				st.st = 'PRS_EXPR_POST';
				return processToken();

			case 'PRS_EXPR_COMMA':
				if (isKeyspec(tk1, ',')){
					st.st = 'PRS_EXPR_COMMA2';
					return res_more();
				}
				st.st = 'PRS_EXPR_MID';
				return processToken();

			case 'PRS_EXPR_COMMA2':
				if (tk1.type == 'TOK_NEWLINE'){
					rewind(); // keep the comma in tk1
					return res_more();
				}
				if (!isKeyspec(tk1, ')') && !isKeyspec(tk1, '}')){
					st.st = 'PRS_EXPR_MID';
					rewind();
					var t = processToken();
					if (t.type == 'error')
						return t;
					fwd(tkR);
					return processToken();
				}
				// found a trailing comma
				st.st = 'PRS_EXPR_FINISH';
				return processToken();

			case 'PRS_EXPR_MID':
				if (!isMid(tk1)){
					st.st = 'PRS_EXPR_FINISH';
					return processToken();
				}
				while (true){
					// fight between the Pre and the Mid
					while (st.exprPreStack != null && isPreBeforeMid(st.exprPreStack.tk, tk1)){
						// apply the Pre
						st.exprTerm = Expr.prefix(st.exprPreStack.tk, st.exprTerm);
						st.exprPreStack = st.exprPreStack.next;
					}

					// if we've exhaused the exprPreStack, then check against the exprMidStack
					if (st.exprPreStack == null && st.exprMidStack != null &&
						isMidBeforeMid(st.exprMidStack.tk, tk1)){
						// apply the previous mMid
						st.exprTerm = Expr.infix(st.exprMidStack.tk, st.exprStack.expr,
							st.exprTerm);
						st.exprPreStack = st.exprPreStackStack.ets;
						st.exprPreStackStack = st.exprPreStackStack.next;
						st.exprMidStack = st.exprMidStack.next;
						level--;
					}
					else // otherwise, the current Mid wins
						break;
				}
				// finally, we're safe to apply the Mid...
				// except instead of applying it, we need to schedule to apply it, in case another
				// operator takes precedence over this one
				st.exprPreStackStack = eps_new(st.exprPreStack, st.exprPreStackStack);
				st.exprPreStack = null;
				st.exprStack = exs_new(st.exprTerm, st.exprStack);
				st.exprMidStack = ets_new(tk1, st.exprMidStack);
				st.st = 'PRS_EXPR';
				level++;
				return res_more();

			case 'PRS_EXPR_FINISH':
				while (true){
					// fight between the Pre and the Mid
					while (st.exprPreStack != null &&
						(st.exprMidStack == null ||
							isPreBeforeMid(st.exprPreStack.tk, st.exprMidStack.tk))){
						// apply the Pre
						st.exprTerm = Expr.prefix(st.exprPreStack.tk, st.exprTerm);
						st.exprPreStack = st.exprPreStack.next;
					}

					if (st.exprMidStack == null)
						break;

					// apply the Mid
					st.exprTerm = Expr.infix(st.exprMidStack.tk, st.exprStack.expr,
						st.exprTerm);
					st.exprStack = st.exprStack.next;
					st.exprPreStack = st.exprPreStackStack.ets;
					st.exprPreStackStack = st.exprPreStackStack.next;
					st.exprMidStack = st.exprMidStack.next;
					level--;
				}
				// everything has been applied, and exprTerm has been set!
				st.next.exprTerm = st.exprTerm;
				st = st.next;
				return processToken();

			default:
				throw 'TODO: ' + st.st;

		}
	}

	return {
		level: function(){
			return level;
		},
		add: function(tk){
			fwd(tk);
			return processToken();
		},
		reset: function(){
			while (st.st != 'PRS_STATEMENT')
				st = st.next;
		}
	};
};

/*

function isAssign(t){
	return t.isData('=', '+=', '-=', '*=', '/=', '%=', '^=', '~=', '||=');
}

function Declare(){
	getData('declare');
	while (true){
		var name = getIdent();
		if (tokens[0].kind === 'num'){
			var parcnt = tokens.shift();
			if (parcnt.data % 1 !== 0 || parcnt.data < 0 || parcnt.data > 0xFF){
				throw CompilerError(parcnt.pos,
					'Native declaration\'s parameter count must be a 8-bit unsigned integer');
			}
			if (tokens[0].kind !== 'num')
				throw CompilerError(tokens[0].pos, 'Expecting native opcode (16-bit uint)');
			var opcode = tokens.shift();
			if (opcode.data % 1 !== 0 || opcode.data < 0 || opcode.data > 0xFFFF){
				throw CompilerError(opcode.pos,
					'Native declaration\'s opcode must be a 16-bit unsigned integer');
			}
			body.stmtDeclareNative(name, opcode.data, parcnt.data);
		}
		else
			body.stmtDeclareLocal(name);
		if (!tokens[0].isData(','))
			return;
		getData(',');
	}
}

function Def(){
	var pos = getData('def').pos;
	var name = getIdent();
	var params = [];
	if (!name.newline){
		while (true){
			var p = getIdent();
			params.push(p);
			if (p.newline)
				break;
			getData(',');
		}
	}
	bodyStack.push(body);
	body.stmtDef(name, params, function(){
		var cmdBody = Body(body, false, false);
		body = cmdBody;
		body.headerCommand(params);
		Statements();
		getData('end');
		body = bodyStack.pop();
		return cmdBody;
	});
}

function Block(newScope, lblCnt, lblBrk){
	bodyStack.push(body);
	var block = Body(body, lblCnt, lblBrk);
	body = block;
	if (newScope){
		body.scope.newScope(function(){
			Statements();
		});
	}
	else
		Statements();
	body = bodyStack.pop();
	return block;
}

function Do(){
	var pos = getData('do').pos;
	body.stmtDo(pos, function(lblWhile, lblEnd){
		var doBlock = Block(false, lblWhile, lblEnd);
		if (tokens[0].isData('while')){
			getData('while');
			return {
				isWhile: true,
				block: doBlock,
				expr: function(){
					return Expr(false).expr;
				},
				generate: function(lblDo, lblEnd){
					return Block(false, lblDo, lblEnd);
				}
			};
		}
		else if (tokens[0].isData('end')){
			return {
				isWhile: false,
				block: doBlock
			};
		}
		else
			throw CompilerError(tokens[0].pos, 'Expecting `while` or `end`');
	});
	getData('end');
}

function For(){
	var t = getData('for');
	if (t.newline){
		body.stmtLoop(t.pos, function(lblCnt, lblBrk){
			return Block(true, lblCnt, lblBrk);
		});
	}
	else{
		var newVar = false;
		if (tokens[0].isData('var')){
			newVar = true;
			getData('var');
		}
		var nameVal = getNamespaceIdent();
		var nameIndex = false;
		if (tokens[0].isData(',')){
			getData(',');
			nameIndex = getNamespaceIdent();
		}
		getData(':');
		var expr = Expr(false).expr;
		body.stmtFor(newVar, nameVal, nameIndex, expr, function(lblCnt, lblBrk){
			return Block(true, lblCnt, lblBrk);
		});
	}
	getData('end');
}

function Goto(){
	getData('goto');
	body.stmtGoto(getIdent());
}

function If(){
	var pos = getData('if').pos;
	body.stmtIf(function(addCond, addBody, addElse){
		while (true){
			addCond(pos, Expr(false).expr);
			addBody(pos, Block(true, body.lblContinue, body.lblBreak));
			if (tokens[0].isData('end'))
				break;
			else if (tokens[0].isData('elseif')){
				pos = getData('elseif').pos;
				continue;
			}
			else if (tokens[0].isData('else')){
				pos = getData('else').pos;
				addElse(pos, Block(true, body.lblContinue, body.lblBreak));
				break;
			}
		}
		getData('end');
	});
}

function Label(){
	var label = getIdent();
	getData(':');
	body.stmtLabel(label);
}

function Namespace(){
	getData('namespace');
	var ns = getIdent();
	body.stmtNamespace(ns, function(){
		return Block(false, body.lblContinue, body.lblBreak);
	});
	getData('end');
}

function Return(){
	var pos = getData('return').pos;
	body.stmtReturn(pos, Expr(false).expr);
}

*/
