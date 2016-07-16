// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var Expr = require('./expr');
var OP = require('./op');

function lval_newLookup(fdiff, index){
	return {
		type: 'LVAL_LOOKUP',
		fdiff: fdiff,
		index: index,
		next: null
	};
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

	function op3(a, b, c){
		console.log('##', hex(a), hex(b), hex(c));
		ops.push(a, b, c);
	}

	function op5(a, b, c, d, e){
		console.log('##', hex(a), hex(b), hex(c), hex(d), hex(e));
		ops.push(a, b, c, d, e);
	}

	function lvalsFromExpr(expr){
		var lvals = null;
		var last = null;
		if (expr.type == 'EXPR_GROUP'){
			for (var i = 0; i < expr.group.length; i++){
				var eg = expr.group[i];
				if (eg.type == 'EXPR_LOOKUP'){
					var lv = lval_newLookup(eg.fdiff, eg.index)
					if (lvals == null)
						lvals = last = lv;
					else{
						last.next = lv;
						last = lv;
					}
				}
				else
					return { type: 'error' };
			}
		}
		else if (expr.type == 'EXPR_LOOKUP')
			lvals = lval_newLookup(expr.fdiff, expr.index);
		else
			return { type: 'error' };
		return { type: 'success', lvals: lvals };
	}

	var my = {
		jump: function(lbl){
		},
		eval: function(fr, expr){
			// if we're doing an assignment, then instead of evaluating into a temp, evaluate into
			// the actual assignment location
			if (expr.type == 'EXPR_INFIX' && expr.tk.type == 'TOK_KEYSPEC' && expr.tk.data == '='){
				var lvt = lvalsFromExpr(expr.left);
				if (lvt.type == 'error')
					return ev_error('Bad assignment');
				var lvals = lvt.lvals;
				var temps = null;
				var tempsLast = null;
				var throughTemp = lvals != null && lvals.next != null;
				if (expr.right.type == 'EXPR_GROUP'){
					for (var i = 0; i < expr.right.group.length; i++){
						var ex = expr.right.group[i];
						if (lvals != null){
							if (throughTemp){
								var temp_index = fr.newTemp(my);
								var tlv = lval_newLookup(0, temp_index);
								if (temps == null)
									temps = tempsLast = tlv;
								else{
									tempsLast.next = tlv;
									tempsLast = tlv;
								}
								my.evalIntoLval(fr, tlv, ex);
							}
							else
								my.evalIntoLval(fr, lvals, ex);
							lvals = lvals.next;
						}
						else
							my.eval(fr, ex);
					}
					if (throughTemp){
						lvals = lvt.lvals;
						while (lvals != null){
							my.evalIntoLval(fr, lvals, Expr.lookup(0, temps.index));
							fr.tempClear(temps.index);
							lvals = lvals.next;
							temps = temps.next;
						}
					}
				}
				else{
					if (lvals != null){
						my.evalIntoLval(fr, lvals, expr.right);
						lvals = lvals.next;
					}
					else
						my.eval(fr, expr.right);
				}
				while (lvals != null){
					my.evalIntoLval(fr, lvals, Expr.nil());
					lvals = lvals.next;
				}
				return ev_success();
			}
			// otherwise, just evaluate into a temp
			var idx = fr.newTemp(my);
			var res = my.evalInto(fr, 0, idx, expr);
			fr.tempClear(idx);
			return res;
		},
		evalIntoLval: function(fr, lval, expr){
			if (lval.type == 'LVAL_LOOKUP')
				return my.evalInto(fr, lval.fdiff, lval.index, expr);
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
								throw 'TODO: cat all params';
							}

							throw 'TODO: call with params';
						} break;
						default:
							throw new Error('Unknown command type: ' + expr.cmd.type);
					}
					break;

				default:
					throw 'TODO: how to evalInto ' + expr.type + '?';
			}
			return ev_success();
		},
		newVar: function(fdiff, index){
			console.log('newVar', {
				fdiff: fdiff,
				index: index
			});
		}
	};
	return my;
};
