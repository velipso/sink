// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var Expr = require('./expr');
var OP = require('./op');

function toMutateOp(tk){
	if (tk.type == 'TOK_KEYSPEC'){
		if      (tk.data == '~+' ) return OP.PUSH;
		else if (tk.data == '+~' ) return OP.UNSHIFT;
		else if (tk.data == '~~+') return OP.APPEND;
		else if (tk.data == '+~~') return OP.PREPEND;
		else if (tk.data == '='  ) return -1;
		else if (tk.data == '+=' ) return OP.ADD;
		else if (tk.data == '%=' ) return OP.MOD;
		else if (tk.data == '-=' ) return OP.SUB;
		else if (tk.data == '*=' ) return OP.MUL;
		else if (tk.data == '/=' ) return OP.DIV;
		else if (tk.data == '^=' ) return OP.POW;
		else if (tk.data == '~=' ) return OP.CAT;
		// does not include &&= and ||= because those are tested specifically for short circuit
	}
	return -2;
}

function intoloc_new(fdiff, index){
	return {
		fdiff: fdiff,
		index: index
	};
}

function str_equ(a, b){
	if (a.length != b.length)
		return false;
	for (var i = 0; i < a.length; i++){
		if (a[i] != b[i])
			return false;
	}
	return true;
}

function ev_success(){
	return { type: 'success' };
}

function ev_error(msg){
	return { type: 'error', msg: msg };
}

module.exports = function(){
	var numTable = [];
	var strTable = [];
	var ops = [];

	function hex(a){
		a = a.toString(16);
		return (a.length < 2 ? '0x0' : '0x') + a;
	}

	function decomp(){
		var out = [];
		for (var i = 0; i < arguments.length; i++)
			out.push(i == 0 ? OP.decomp(arguments[i]) : hex(arguments[i]));
		//console.log('##', out.join(' '));
	}

	function op3(a, b, c){
		decomp(a, b, c);
		ops.push(a, b, c);
	}

	function op5(a, b, c, d, e){
		decomp(a, b, c, d, e);
		ops.push(a, b, c, d, e);
	}

	function op7(a, b, c, d, e, f, g){
		decomp(a, b, c, d, e, f, g);
		ops.push(a, b, c, d, e, f, g);
	}

	function op9(a, b, c, d, e, f, g, h, i){
		decomp(a, b, c, d, e, f, g, h, i);
		ops.push(a, b, c, d, e, f, g, h, i);
	}

	function lval_newLookup(fdiff, index){
		return {
			type: 'LVAL_LOOKUP',
			fdiff: fdiff,
			index: index
		};
	}

	function lval_newExpr(expr){
		if (expr.type == 'EXPR_LOOKUP')
			return { type: 'success', lval: lval_newLookup(expr.fdiff, expr.index) };
		return { type: 'error' };
	}

	function lval_read(lval){
		switch (lval.type){
			case 'LVAL_LOOKUP':
				return intoloc_new(lval.fdiff, lval.index);
		}
		throw 'TODO: lval_read ' + lval.type;
	}

	function lval_free(lval){
		// TODO: check if lvals has temps that need to be cleared
	}

	function lvals_push(lvals, lval, read){
		lvals.push(lval);
		if (read != null){
			switch (lval.type){
				case 'LVAL_LOOKUP':
					read.push(intoloc_new(lval.fdiff, lval.index));
					break;
				default:
					throw 'TODO: handle reading lval ' + lval.type;
			}
		}
	}

	function lvals_new(expr, read){
		var lvals = [];
		if (expr.type == 'EXPR_GROUP'){
			for (var i = 0; i < expr.group.length; i++){
				var res = lval_newExpr(expr.group[i]);
				if (res.type == 'error')
					return res;
				lvals_push(lvals, res.lval, read);
			}
		}
		else{
			var res = lval_newExpr(expr);
			if (res.type == 'error')
				return res;
			lvals_push(lvals, res.lval, read);
		}
		return { type: 'success', lvals: lvals };
	}

	function tempsClear(fr, out){
		for (var i = 0; i < out.length; i++){
			if (out[i].fdiff == 0)
				fr.tempClear(out[i].index);
		}
	}

	var my = {
		jump: function(lbl){
		},
		eval: function(fr, expr, out){
			// if `out` is a list, then `intoloc_new`'s are pushed into it that are the resulting
			// variables... if they are temps, *they are not cleared*, and the caller must clear
			//
			// however, if `out` is null, then this function is responsible for clearing any temps

			// if we're doing an assignment, then instead of evaluating into a temp, evaluate into
			// the actual assignment location
			if (expr.type == 'EXPR_INFIX' && expr.tk.type == 'TOK_KEYSPEC'){
				var mut_op = toMutateOp(expr.tk);
				if (mut_op >= -1){
					var read = mut_op < 0 ? null : [];
					var lvt = lvals_new(expr.left, read);
					if (lvt.type == 'error')
						return ev_error('Bad assignment');
					var lvals = lvt.lvals;
					var lvals_nil = 0;
					var throughTemp = lvals.length > 1;
					var temps = throughTemp ? [] : null;

					if (expr.right.type == 'EXPR_GROUP'){
						lvals_nil = expr.right.group.length;
						for (var i = 0; i < expr.right.group.length; i++){
							var ex = expr.right.group[i];
							if (i < lvals.length){
								if (throughTemp){
									var temp_index = fr.newTemp(my);
									temps.push(temp_index);
									my.evalInto(fr, 0, temp_index, ex);
								}
								else{
									if (mut_op == -1) // if assignment
										my.evalIntoLval(fr, lvals[i], ex, out);
									else{ // otherwise, we have an operator that mutates
										var rest = [];
										my.eval(fr, ex, rest);
										tempsClear(fr, rest);
										op7(mut_op,
											read[i].fdiff, read[i].index,
											read[i].fdiff, read[i].index,
											rest[rest.length - 1].fdiff,
											rest[rest.length - 1].index);
										my.evalIntoLval(fr, lvals[i],
											Expr.lookup(read[i].fdiff, read[i].index), null);
									}
								}
							}
							else
								my.eval(fr, ex, null);
						}
						if (throughTemp){
							for (var i = 0; i < temps.length; i++){
								if (mut_op == -1)
									my.evalIntoLval(fr, lvals[i], Expr.lookup(0, temps[i]), out);
								else{
									op7(mut_op,
										read[i].fdiff, read[i].index,
										read[i].fdiff, read[i].index,
										0, temps[i]);
									my.evalIntoLval(fr, lvals[i],
										Expr.lookup(read[i].fdiff, read[i].index), out);
								}
								fr.tempClear(temps[i]);
							}
						}
					}
					else{
						if (mut_op == -1){ // assignment
							var rest = [];
							my.evalIntoLval(fr, lvals[0], expr.right, rest);
							out.push(rest[rest.length - 1]);
						}
						else{ // mutation
							var rest = [];
							my.eval(fr, expr.right, rest);
							tempsClear(fr, rest);
							op7(mut_op,
								read[0].fdiff, read[0].index,
								read[0].fdiff, read[0].index,
								rest[rest.length - 1].fdiff,
								rest[rest.length - 1].index);
							my.evalIntoLval(fr, lvals[0],
								Expr.lookup(read[0].fdiff, read[0].index), null);
						}
						lvals_nil = 1;
					}
					if (mut_op >= 0)
						tempsClear(fr, read);
					if (lvals_nil > lvals.length){
						var tn = fr.newTemp(my);
						my.evalInto(fr, 0, tn, Expr.nil());
						for (var i = lvals_nil; i < lvals.length; i++)
							my.evalIntoLval(fr, lvals[i], Expr.lookup(0, tn), out);
						fr.tempClear(tn);
					}
					for (var i = 0; i < lvals.length; i++)
						lval_free(lvals[i]);
					return ev_success();
				}
				else if (expr.tk.data == '&&='){
					throw 'TODO: &&=';
				}
				else if (expr.tk.data == '||='){
					throw 'TODO: ||=';
				}
			}

			// otherwise, just evaluate into temps
			if (expr.type == 'EXPR_GROUP'){
				for (var i = 0; i < expr.group.length; i++){
					var out2 = out == null ? null : [];
					var res = my.eval(fr, expr.group[i], out2);
					if (res.type == 'error')
						return res;
					if (out != null)
						out.push(out2[out2.length - 1]);
				}
				return ev_success();
			}

			var idx = fr.newTemp(my);
			// TODO: can I prove I can do this here instead of after the evalInto?
			// if (out == null) fr.tempClear(idx);
			var res = my.evalInto(fr, 0, idx, expr);
			if (res.type == 'error')
				return res;
			if (out != null)
				out.push(intoloc_new(0, idx));
			else
				fr.tempClear(idx); // remove this and do above instead..?
			return ev_success();
		},
		evalIntoLval: function(fr, lval, expr, out){
			if (lval.type == 'LVAL_LOOKUP'){
				var res = my.evalInto(fr, lval.fdiff, lval.index, expr);
				if (res.type != 'error' && out != null)
					out.push(intoloc_new(lval.fdiff, lval.index));
				return res;
			}
			throw 'TODO: more lvalues';
		},
		evalInto: function(fr, fdiff, index, expr){
			if (fdiff > 255)
				return ev_error('Variable too far away');
			if (index > 255)
				return ev_error('Too many variables in frame');

			switch (expr.type){
				case 'EXPR_NIL':
					op3(OP.NIL, fdiff, index);
					break;

				case 'EXPR_NUM': {
					if (Math.floor(expr.num) == expr.num){
						var n = expr.num;
						if (n >= -65536 && n < 0){
							n += 65536;
							op5(OP.NUM_NEG, fdiff, index, n % 256, Math.floor(n / 256));
							break;
						}
						else if (n >= 0 && n < 65536){
							op5(OP.NUM_POS, fdiff, index, n % 256, Math.floor(n / 256));
							break;
						}
					}

					var idx = -1;
					for (var i = 0; i < numTable.length; i++){
						if (numTable[i] == expr.num){
							idx = i;
							break;
						}
					}
					if (idx < 0){
						idx = numTable.length;
						numTable.push(expr.num);
					}
					if (idx > 65535)
						return ev_error('Too many number constants');
					op5(OP.NUM_TBL, fdiff, index, idx % 256, Math.floor(idx / 256));
				} break;

				case 'EXPR_STR': {
					var idx = -1;
					for (var i = 0; i < strTable.length; i++){
						if (str_equ(strTable[i], expr.str)){
							idx = i;
							break;
						}
					}
					if (idx < 0){
						idx = strTable.length;
						strTable.push(expr.str);
						var ch = '';
						for (var i = 0; i < expr.str.length; i++)
							ch += String.fromCharCode(expr.str[i]);
						//console.log('STR[' + idx + '] = "' + ch + '"');
					}
					if (idx > 65535)
						return ev_error('Too many string constants');
					op5(OP.STR, fdiff, index, idx % 256, Math.floor(idx / 256));
				} break;

				case 'EXPR_LOOKUP':
					if (expr.fdiff == fdiff && expr.index == index)
						break;
					op5(OP.MOVE, fdiff, index, expr.fdiff, expr.index);
					break;

				case 'EXPR_CALL':
					switch (expr.cmd.type){
						case 'EXPR_CMD_LOCAL':
						case 'EXPR_CMD_NATIVE':
							throw 'TODO: exprInto EXPR_CALL ' + expr.cmd.type;
						case 'EXPR_CMD_OPCODE': {
							if (expr.cmd.opcode == -1){ // pick
								throw 'TODO: pick';
							}

							if (expr.cmd.params < 0){
								var res = fr.newTemp(my);
								if (expr.params.type == 'EXPR_GROUP'){
									var div = fr.newTemp(my);
									my.evalInto(fr, 0, div, Expr.str([ 32 ]));
									for (var i = 0; i < expr.params.group.length; i++){
										if (i == 0)
											my.evalInto(fr, 0, res, expr.params.group[i]);
										else{
											var t = fr.newTemp(my);
											my.evalInto(fr, 0, t, expr.params.group[i]);
											my.evalInto(fr, 0, t, Expr.infix({
												type: 'TOK_KEYSPEC',
												data: '~'
											}, Expr.lookup(0, div), Expr.lookup(0, t)));
											my.evalInto(fr, 0, res, Expr.infix({
												type: 'TOK_KEYSPEC',
												data: '~'
											}, Expr.lookup(0, res), Expr.lookup(0, t)));
											fr.tempClear(t);
										}
									}
									fr.tempClear(div);
								}
								else{
									if (expr.params.type == 'EXPR_STR')
										my.evalInto(fr, 0, res, expr.params);
									else{
										var div = fr.newTemp(my);
										my.evalInto(fr, 0, div, Expr.str([]));
										my.evalInto(fr, 0, res, Expr.infix({
											type: 'TOK_KEYSPEC',
											data: '~'
										}, Expr.lookup(0, div), expr.params));
										fr.tempClear(div);
									}
								}
								op5(expr.cmd.opcode, fdiff, index, 0, res);
								fr.tempClear(res);
							}
							else{
								switch (expr.cmd.params){
									case 0:
										my.eval(fr, expr.cmd.params, null);
										op3(expr.cmd.opcode, fdiff, index);
										break;
									case 1: {
										var out = [];
										if (expr.params.type == 'EXPR_GROUP'){
											my.eval(fr, expr.params.group[0], out);
											for (var i = 1; i < expr.params.group.length; i++)
												my.eval(fr, expr.params.group[i], null);
										}
										else
											my.eval(fr, expr.params, out);
										op5(expr.cmd.opcode,
											fdiff, index, out[0].fdiff, out[0].index);
										tempsClear(fr, out);
									} break;
									case 2: {
										var out = [];
										if (expr.params.type == 'EXPR_GROUP'){
											my.eval(fr, expr.params.group[0], out);
											my.eval(fr, expr.params.group[1], out);
											for (var i = 2; i < expr.params.group.length; i++)
												my.eval(fr, expr.params.group[i], null);
										}
										else{
											my.eval(fr, expr.params, out);
											my.eval(fr, Expr.nil(), out);
										}
										op7(expr.cmd.opcode,
											fdiff, index,
											out[0].fdiff, out[0].index,
											out[1].fdiff, out[1].index);
										tempsClear(fr, out);
									} break;
									case 3: {
										var out = [];
										if (expr.params.type == 'EXPR_GROUP'){
											my.eval(fr, expr.params.group[0], out);
											my.eval(fr, expr.params.group[1], out);
											if (expr.params.group.length == 2)
												my.eval(fr, Expr.nil(), out);
											else{
												my.eval(fr, expr.params.group[2], out);
												for (var i = 3; i < expr.params.group.length; i++)
													my.eval(fr, expr.params.group[i], null);
											}
										}
										else{
											my.eval(fr, expr.params, out);
											my.eval(fr, Expr.nil(), out);
											out.push(out[1]); // duplicate nil
										}
										op9(expr.cmd.opcode,
											fdiff, index,
											out[0].fdiff, out[0].index,
											out[1].fdiff, out[1].index,
											out[2].fdiff, out[2].index);
										tempsClear(fr, out);
									} break;
									default:
										throw new Error('Bad params for cmd opcode');
								}
							}
						} break;
						default:
							throw new Error('Unknown command type: ' + expr.cmd.type);
					}
					break;

				case 'EXPR_INFIX': {
					var infix_op;
					if      (expr.tk.data == '^'  ) infix_op = OP.POW;
					else if (expr.tk.data == '%'  ) infix_op = OP.MOD;
					else if (expr.tk.data == '*'  ) infix_op = OP.MUL;
					else if (expr.tk.data == '/'  ) infix_op = OP.DIV;
					else if (expr.tk.data == '+'  ) infix_op = OP.ADD;
					else if (expr.tk.data == '-'  ) infix_op = OP.SUB;
					else if (expr.tk.data == '~'  ) infix_op = OP.CAT;
					else if (expr.tk.data == '<=' ) infix_op = OP.LTE;
					else if (expr.tk.data == '<'  ) infix_op = OP.LT;
					else if (expr.tk.data == '>=' ) infix_op = OP.GTE;
					else if (expr.tk.data == '>'  ) infix_op = OP.GT;
					else if (expr.tk.data == '!=' ) infix_op = OP.NEQ;
					else if (expr.tk.data == '==' ) infix_op = OP.EQU;
					else{
						if (expr.tk.data == '&&' ){
							throw 'TODO: short circuit AND';
						}
						else if (expr.tk.data == '||' ){
							throw 'TODO: short circuit OR';
						}
						throw 'TODO: how to evalInto ' + expr.tk.data;
					}
					var lv = [];
					var rv = [];
					my.eval(fr, expr.left, lv);
					my.eval(fr, expr.right, rv);
					op7(infix_op,
						fdiff, index,
						lv[lv.length - 1].fdiff, lv[lv.length - 1].index,
						rv[rv.length - 1].fdiff, rv[rv.length - 1].index);
					tempsClear(fr, lv);
					tempsClear(fr, rv);
				} break;

				default:
					throw 'TODO: how to evalInto ' + expr.type + '?';
			}
			return ev_success();
		},
		newVar: function(fdiff, index){
			// TODO: do I even need this?
		}
	};
	return my;
};
