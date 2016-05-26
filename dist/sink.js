(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (Buffer){

var CompilerError = require('./compiler-error');

module.exports = function(settings, lblContinue, lblBreak){
	var scope = settings.scope;
	var nil = settings.nil;
	var nums = settings.nums;
	var strs = settings.strs;
	var ops = [];
	var my;

	function forceReadable(pos, s){
		if (s.kind !== 'var')
			throw CompilerError(pos, 'Cannot read "' + s.get().v.sym + '"');
		return s.get();
	}

	function collapse(pos, expr){
		for (var i = 0; i < expr.length; i++){
			var v = forceReadable(pos, expr[i]);
			if (i < expr.length - 1)
				my.tempClear(v);
			else
				return v;
		}
		return my.exprNil().get();
	}

	function vb(ls, v){
		if (v.v.frameIndex > 255 || v.level > 255)
			throw CompilerError(v.v.pos, 'Too many variables: ' + v.v.sym);
		ls.push(v.level);
		ls.push(v.v.frameIndex);
	}

	function op_v(opcode, v){
		ops.push(opcode);
		vb(ops, v);
	}

	function op_v_v(opcode, v1, v2){
		ops.push(opcode);
		vb(ops, v1);
		vb(ops, v2);
	}

	function op_v_c(opcode, v, c){
		ops.push(opcode);
		vb(ops, v);
		if (c > 65535)
			throw CompilerError(v.v.pos, 'Bad constant');
		ops.push(c % 256);
		ops.push(c >> 8);
	}

	function op_v_v_v(opcode, v1, v2, v3){
		ops.push(opcode);
		vb(ops, v1);
		vb(ops, v2);
		vb(ops, v3);
	}

	function op_v_v_v_v(opcode, v1, v2, v3, v4){
		ops.push(opcode);
		vb(ops, v1);
		vb(ops, v2);
		vb(ops, v3);
		vb(ops, v4);
	}

	my = {
		scope: scope,
		nil: nil,
		nums: nums,
		strs: strs,
		lblContinue: lblContinue,
		lblBreak: lblBreak,
		labels: [],
		ops: function(){
			return ops;
		},
		tempVar: function(){
			if (arguments.length > 0)
				my.tempClear.apply(my, arguments);

			var fv = scope.frameVars();
			// try to find a temp variable
			for (var i = 0; i < fv.length; i++){
				if (fv[i].info.temp === true && fv[i].info.tempUsed === false){
					fv[i].info.tempUsed = true;
					return { v: fv[i], level: 0 };
				}
			}

			// create a temp var
			var name = '%' + scope.frameId + '_' + fv.length;
			var v = scope.addFrameSymbol(false, name, 'var', { temp: true, tempUsed: true });
			return { v: v, level: 0 };
		},
		tempClear: function(){
			var fv = scope.frameVars();
			for (var i = 0; i < arguments.length; i++){
				if (arguments[i].v.info.temp !== true)
					continue;
				for (var j = 0; j < fv.length; j++){
					if (fv[j].frameId === arguments[i].v.frameId &&
						fv[j].frameIndex === arguments[i].v.frameIndex){
						fv[j].info.tempUsed = false;
					}
				}
			}
		},
		addVar: function(pos, name){
			return scope.addSymbol(pos, name, 'var', { temp: false });
		},
		addCmdLocal: function(pos, name, lbl, bodyKnown){
			return scope.addSymbol(pos, name, 'cmd-local', {
				lbl: lbl,
				bodyKnown: bodyKnown
			});
		},
		addCmdNative: function(pos, name, opcode, paramCount){
			return scope.addSymbol(pos, name, 'cmd-native', {
				opcode: opcode,
				paramCount: paramCount
			});
		},
		addLabel: function(pos, name){
			return scope.addSymbolAtFrame(pos, name, 'label', my.newLabel(name));
		},
		newLabel: function(hint){
			var rewires = [];
			var rewirepos = false;
			var lbl = {
				owner: my,
				index: false,
				extra: false,
				hint: hint,
				set: function(pos, extra){
					if (lbl.index !== false){
						throw CompilerError(pos,
							'Cannot set label "' + lbl.hint + '" more than once');
					}
					lbl.index = lbl.owner.ops().length;
					if (typeof extra !== 'undefined')
						lbl.extra = extra;
					rewires.forEach(function(rw){
						rw(lbl.index, lbl.extra);
					});
				},
				setExtra: function(extra){
					lbl.extra = extra;
					rewires.forEach(function(rw){
						rw(lbl.index, lbl.extra);
					});
				},
				add: function(amt){
					if (lbl.index === false)
						return;
					lbl.index += amt;
					rewires.forEach(function(rw){
						rw(lbl.index, lbl.extra);
					});
				},
				use: function(pos, rewire){
					if (rewirepos === false)
						rewirepos = pos;
					rewires.push(rewire);
					if (lbl.index !== false)
						rewire(lbl.index, lbl.extra);
				},
				used: function(){
					return rewirepos;
				}
			};
			my.labels.push(lbl);
			return lbl;
		},
		headerCommand: function(params){
			for (var i = 0; i < params.length; i++)
				my.addVar(params[i].pos, params[i].data);
		},
		stmtBreak: function(pos){
			if (lblBreak === false)
				throw CompilerError(pos, 'Invalid `break`');
			my.Jump(pos, lblBreak);
		},
		stmtContinue: function(pos){
			if (lblContinue === false)
				throw CompilerError(pos, 'Invalid `continue`');
			my.Jump(pos, lblContinue);
		},
		stmtDeclareLocal: function(name){
			my.addCmdLocal(name.pos, name.data, my.newLabel('def_' + name.data), false);
		},
		stmtDeclareNative: function(name, opcode, paramCount){
			my.addCmdNative(name.pos, name.data, opcode, paramCount);
		},
		stmtDef: function(name, params, generate){
			var lblFunc;
			var d = scope.get(name.data);
			if (d !== false){
				if (d.kind !== 'cmd-local' || d.info.bodyKnown !== false)
					throw CompilerError(name.pos, 'Cannot redeclare "' + name.data + '"');
				d.info.bodyKnown = true;
				lblFunc = d.info.lbl;
			}
			else{
				lblFunc = my.newLabel('def_' + name.data);
				my.addCmdLocal(name.pos, name.data, lblFunc, true);
			}

			var lblSkip = my.newLabel('def_skip_' + name.data);
			my.Jump(false, lblSkip);
			lblFunc.set(false, {
				paramCount: params.length,
				frameSize: 0
			});
			my.scope.newFrame(function(){
				var body = generate();
				my.Append(body);
				my.Return(nil);
				lblFunc.setExtra({
					paramCount: params.length,
					frameSize: body.scope.frameVars().length
				});
			});
			lblSkip.set(false);
		},
		stmtDo: function(pos, generate){
			var lblDo    = my.newLabel('do');
			var lblWhile = my.newLabel('do_while');
			var lblEnd   = my.newLabel('do_end');

			lblDo.set(pos);
			scope.newScope(function(){
				var block = generate(lblWhile, lblEnd);
				my.Append(block.block);
				if (block.isWhile){
					lblWhile.set(pos);
					var v = collapse(pos, block.expr());
					my.JumpIfNil(pos, v, lblEnd);
					my.tempClear(v);
					my.Append(block.generate(lblDo, lblEnd));
					my.Jump(pos, lblDo);
				}
				else{
					var wpos = lblWhile.used()
					if (wpos !== false)
						throw CompilerError(wpos, 'Invalid `continue`');
					// remove lblWhile
					var rm = my.labels.indexOf(lblWhile);
					my.labels.splice(rm, 1);
				}
			});
			lblEnd.set(pos);
		},
		stmtFor: function(newVar, nameVal, nameIndex, expr, generate){
			scope.newScope(function(){
				if (newVar){
					my.addVar(nameVal.pos, nameVal.data);
					if (nameIndex !== false)
						my.addVar(nameIndex.pos, nameIndex.data);
				}
				var vn = scope.lookup(nameVal.pos, nameVal.data);
				var vi;
				if (nameIndex !== false)
					vi = scope.lookup(nameIndex.pos, nameIndex.data);
				else
					vi = my.tempVar();
				my.Num(vi, 0);
				var ve = collapse(nameVal.pos, expr);
				var lblNext = my.newLabel('for');
				var lblExit = my.newLabel('for_end');
				lblNext.set(nameVal.pos);
				var vt = my.tempVar();
				my.Size(vt, ve);
				my.Lt(vt, vi, vt);
				my.JumpIfNil(nameVal.pos, vt, lblExit);
				my.GetAt(vn, ve, vi);
				my.tempClear(vt);
				my.Append(generate(lblNext, lblExit));
				vt = my.tempVar();
				my.Num(vt, 1);
				my.Add(vi, vi, vt);
				my.tempClear(vt, ve, vi);
				my.Jump(nameVal.pos, lblNext);
				lblExit.set(nameVal.pos);
			});
		},
		stmtGoto: function(label){
			var lbl = scope.getWithinFrame(label.data);
			if (lbl !== false){
				if (lbl.kind !== 'label')
					throw CompilerError(label.pos, 'Cannot goto non-label');
			}
			else
				lbl = my.addLabel(label.pos, label.data);
			my.Jump(label.pos, lbl.info);
		},
		stmtIf: function(generator){
			var lblNext;
			var lblEnd = my.newLabel('if_end');
			generator(
				function(pos, cond){
					lblNext = my.newLabel('if_fail');
					var ve = collapse(pos, cond);
					my.JumpIfNil(pos, ve, lblNext);
					my.tempClear(ve);
				},
				function(pos, body){
					my.Append(body);
					my.Jump(pos, lblEnd);
					lblNext.set(pos);
				},
				function(pos, elseBody){
					my.Append(elseBody);
				}
			);
			lblEnd.set(false);
		},
		stmtLabel: function(label){
			var lbl = scope.getWithinFrame(label.data);
			if (lbl !== false){
				if (lbl.kind !== 'label')
					throw CompilerError(label.pos, 'Cannot redeclare "' + label.data + '"');
			}
			else
				lbl = my.addLabel(label.pos, label.data);
			lbl.info.set(label.pos);
		},
		stmtLoop: function(pos, generate){
			var lblNext = my.newLabel('loop');
			var lblExit = my.newLabel('loop_end');
			lblNext.set(false);
			my.Append(generate(lblNext, lblExit));
			my.Jump(pos, lblNext);
			lblExit.set(false);
		},
		stmtReturn: function(pos, expr){
			var ve = collapse(pos, expr);
			my.Return(ve);
			my.tempClear(ve);
		},
		stmtEval: function(pos, expr){
			if (expr.length === 1 &&
				(expr[0].kind === 'cmd-local' || expr[0].kind === 'cmd-native'))
				expr = my.exprCall(pos, expr, []);
			var ve = collapse(pos, expr);
			my.tempClear(ve);
		},
		stmtVar: function(pos, names, init){
			if (init === false)
				init = [];
			if (init.length < names.length){
				while (init.length < names.length)
					init = init.concat(my.exprNil());
			}
			for (var i = 0; i < init.length; i++)
				init[i] = forceReadable(pos, init[i]);
			for (var i = 0; i < names.length; i++){
				var name = names[i];
				var v = my.addVar(name.pos, name.data);
				my.Move({ v: v, level: 0 }, init[i]);
			}
			my.tempClear.apply(my, init);
		},
		exprGroup: function(pos, expr){
			if (expr.length === 1 &&
				(expr[0].kind === 'cmd-local' || expr[0].kind === 'cmd-native'))
				expr = my.exprCall(pos, expr, []);
			return expr;
		},
		exprCall: function(pos, cmd, params){
			if (cmd.length !== 1)
				throw CompilerError(pos, 'Command must be a single identifier');
			cmd = cmd[0];

			if (cmd.kind !== 'cmd-local' && cmd.kind !== 'cmd-native')
				throw CompilerError(pos, 'Invalid command');

			return [{
				kind: 'var',
				get: function(){
					for (var i = 0; i < params.length; i++)
						params[i] = forceReadable(pos, params[i]);
					var ev;
					if (cmd.kind === 'cmd-native'){
						ev = my.tempVar();
						my.tempClear(ev);
						my.Str(ev, pos.toString());
					}
					var v = my.tempVar.apply(my, params);

					if (cmd.kind === 'cmd-local'){
						cmd = cmd.get();
						my.CallLocal(pos, v, cmd.level, cmd.v.info.lbl, params);
						return v;
					}
					else if (cmd.kind === 'cmd-native'){
						cmd = cmd.get().v;
						if (cmd.info.paramCount < params.length)
							params = params.slice(0, cmd.info.paramCount);
						else if (cmd.info.paramCount > params.length){
							while (cmd.info.paramCount > params.length)
								params.push({ v: nil.v, level: scope.currentLevel - 1 });
						}
						my.CallNative(v, ev, cmd.info.opcode, params);
						return v;
					}
				}
			}];
		},
		exprBinary: function(tok, left, right){
			if (tok.kind !== 'keyspec')
				throw 'Unknown binary operator: ' + tok;

			if (tok.data === ',')
				return left.concat(right);

			return [{
				kind: 'var',
				get: function(){
					var simp = {
						'+': 'Add', '+=': 'Add',
						'-': 'Sub', '-=': 'Sub',
						'%': 'Mod', '%=': 'Mod',
						'*': 'Mul', '*=': 'Mul',
						'/': 'Div', '/=': 'Div',
						'^': 'Pow', '^=': 'Pow',
						'~': 'Cat', '~=': 'Cat',
						'~+': 'Push',
						'+~': 'Unshift'
					};

					// binary operators that muck with variables
					switch (tok.data){
						case '=':
							if (left.length !== 1)
								throw CompilerError(tok.pos, 'Cannot assign to multiple variables');
							var vl = left[0];
							if (typeof vl.set !== 'function')
								throw CompilerError(tok.pos, 'Invalid assignment');
							return vl.set(tok.pos, right);
						case '+=':
						case '-=':
						case '%=':
						case '*=':
						case '/=':
						case '^=':
						case '~=':
						case '~+':
						case '+~':
							if (left.length !== 1)
								throw CompilerError(tok.pos, 'Cannot mutate multiple variables');
							var vl = left[0];
							if (typeof vl.mut !== 'function')
								throw CompilerError(tok.pos, 'Invalid mutation');
							return vl.mut(tok.pos, simp[tok.data],
								tok.data === '~+' || tok.data === '+~', right);
						case '&&':
							var vl = collapse(tok.pos, left);
							var lblEnd = my.newLabel('and_end');
							my.JumpIfNil(tok.pos, vl, lblEnd);
							var vr = collapse(tok.pos, right);
							my.Move(vl, vr);
							lblEnd.set(tok.pos);
							my.tempClear(vr);
							return vl;
						case '||':
							var vl = collapse(tok.pos, left);
							var lblRight = my.newLabel('or_right');
							var lblEnd = my.newLabel('or_end');
							my.JumpIfNil(tok.pos, vl, lblRight);
							my.Jump(tok.pos, lblEnd);
							lblRight.set(tok.pos);
							var vr = collapse(tok.pos, right);
							my.Move(vl, vr);
							lblEnd.set(tok.pos);
							my.tempClear(vr);
							return vl;
						case '||=':
							if (left.length !== 1)
								throw CompilerError(tok.pos, 'Cannot set multiple variables');
							var vl = left[0];
							if (typeof vl.setif !== 'function')
								throw CompilerError(tok.ps, 'Invalid assignment');
							return vl.setif(tok.pos, right);
					}

					// simple binary operators
					var vl = collapse(tok.pos, left);
					var vr = collapse(tok.pos, right);
					var v = my.tempVar(vl, vr);

					switch (tok.data){
						case '+':
						case '-':
						case '%':
						case '*':
						case '/':
						case '^':
						case '~':
							my[simp[tok.data]](v, vl, vr);
							break;
						case '<' : my.Lt (v, vl, vr); break;
						case '<=': my.Lte(v, vl, vr); break;
						case '>' : my.Lt (v, vr, vl); break;
						case '>=': my.Lte(v, vr, vl); break;
						case '!=': my.Equ(v, vl, vr); my.Not(v, v); break;
						case '==': my.Equ(v, vl, vr); break;
						default:
							throw 'Unknown binary operator: ' + tok;
					}
					return v;
				}
			}];
		},
		exprUnary: function(tok, expr){
			return [{
				kind: 'var',
				get: function(){
					if (tok.isData('say', 'ask')){
						for (var i = 0; i < expr.length; i++)
							expr[i] = forceReadable(tok.pos, expr[i]);
						var v = my.tempVar();
						var vs = my.tempVar();
						my.tempClear(vs);
						if (expr.length > 1)
							my.Str(vs, [32]);
						else
							my.Str(vs, []);
						my.tempClear.apply(my, expr);
						my.Move(v, expr.shift());
						if (expr.length > 0){
							while (expr.length > 0){
								my.Cat(v, v, vs);
								my.Cat(v, v, expr.shift());
							}
						}
						else
							my.Cat(v, v, vs);
						if (tok.isData('say'))
							my.Say(v, v);
						else // ask
							my.Ask(v, v);
						return v;
					}
					else if (tok.isData('pick')){
						if (expr.length !== 3)
							throw CompilerError(tok.pos, 'Expecting 3 arguments for `pick`');
						var cond = collapse(tok.pos, [expr[0]]);
						var lblFalse = my.newLabel('pick_false');
						my.JumpIfNil(tok.pos, cond, lblFalse);
						my.tempClear(cond);
						var vl = collapse(tok.pos, [expr[1]]);
						var lblEnd = my.newLabel('pick_end');
						my.Jump(tok.pos, lblEnd);
						lblFalse.set(tok.pos);
						var vr = collapse(tok.pos, [expr[2]]);
						my.tempClear(vr);
						my.Move(vl, vr);
						lblEnd.set(tok.pos);
						return vl;
					}

					var ve = collapse(tok.pos, expr);
					var v = my.tempVar(ve);
					if (tok.isData('+'))
						my.ToNum(v, ve);
					else if (tok.isData('-'))
						my.Neg(v, ve);
					else if (tok.isData('!'))
						my.Not(v, ve);
					else if (tok.isData('typenum'))
						my.Typenum(v, ve);
					else if (tok.isData('typestr'))
						my.Typestr(v, ve);
					else if (tok.isData('typelist'))
						my.Typelist(v, ve);
					else if (tok.isData('pop'))
						my.Pop(v, ve);
					else if (tok.isData('shift'))
						my.Shift(v, ve);
					else
						throw 'Unknown unary operator: ' + tok.data;
					return v;
				}
			}];
		},
		exprNil: function(){
			return [{
				kind: 'var',
				get: function(){
					return { v: nil.v, level: scope.currentLevel - 1 };
				}
			}];
		},
		exprNum: function(tok){
			return [{
				kind: 'var',
				get: function(){
					var v = my.tempVar();
					my.Num(v, tok.data);
					return v;
				}
			}];
		},
		exprStr: function(tok){
			if (tok.data.length > 65535)
				throw CompilerError(tok.pos, 'String too large (max 65535 bytes)');
			return [{
				kind: 'var',
				get: function(){
					var v = my.tempVar();
					my.Str(v, tok.data);
					return v;
				}
			}];
		},
		exprLookup: function(tok){
			var v = scope.lookup(tok.pos, tok.data);
			var o = {
				kind: v.v.kind,
				get: function(){ return v; }
			};
			if (v.v.kind === 'var'){
				o.set = function(pos, right){
					var ve = collapse(pos, right);
					my.tempClear(ve);
					my.Move(v, ve);
					return v;
				};
				o.setif = function(pos, right){
					var lblSet = my.newLabel('nilc_set');
					var lblEnd = my.newLabel('nilc_end');
					my.JumpIfNil(pos, v, lblSet);
					my.Jump(pos, lblEnd);
					lblSet.set(pos);
					var ve = collapse(pos, right);
					my.tempClear(ve);
					my.Move(v, ve);
					lblEnd.set(pos);
					return v;
				};
				o.mut = function(pos, mutName, mutList, right){
					var ve = collapse(pos, right);
					my.tempClear(ve);
					if (mutList)
						my[mutName](v, ve);
					else
						my[mutName](v, v, ve);
					return v;
				};
			}
			return [o];
		},
		exprList: function(pos, expr){
			return [{
				kind: 'var',
				get: function(){
					var v = my.tempVar();
					my.List(v, expr.length);
					for (var i = 0; i < expr.length; i++){
						var ve = forceReadable(pos, expr[i]);
						my.Push(v, ve);
						my.tempClear(ve);
					}
					return v;
				}
			}];
		},
		exprSlice: function(pos, expr, index, len){
			function performSlice(func){
				var ve = collapse(pos, expr);
				var vi;
				if (index === false){
					vi = my.tempVar();
					my.Num(vi, 0);
				}
				else
					vi = collapse(pos, index);
				var vl;
				if (len === false){
					vl = my.tempVar();
					my.Size(vl, ve);
					if (index !== false)
						my.Sub(vl, vl, vi);
				}
				else
					vl = collapse(pos, len);
				return func(ve, vi, vl);
			}
			return [{
				kind: 'var',
				get: function(){
					return performSlice(function(ve, vi, vl){
						var v = my.tempVar(ve, vi, vl);
						my.Slice(v, ve, vi, vl);
						return v;
					});
				},
				set: function(pos, right){
					return performSlice(function(ve, vi, vl){
						var vr = collapse(pos, right);
						my.Splice(ve, vi, vl, vr);
						my.tempClear(vi, vl, vr);
						return ve;
					});
				}
			}];
		},
		exprIndex: function(pos, expr, index){
			return [{
				kind: 'var',
				get: function(){
					var vl = collapse(pos, expr);
					var vi = collapse(pos, index);
					var v = my.tempVar(vl, vi);
					my.GetAt(v, vl, vi);
					return v;
				},
				set: function(pos, right){
					var vl = collapse(pos, expr);
					var vi = collapse(pos, index);
					var v = collapse(pos, right);
					my.SetAt(vl, vi, v);
					my.tempClear(vl, vi);
					return v;
				},
				setif: function(pos, right){
					var vl = collapse(pos, expr);
					var vi = collapse(pos, index);
					var v = my.tempVar();
					my.GetAt(v, vl, vi);
					var lblSet = my.newLabel('nilc_set');
					var lblEnd = my.newLabel('nilc_end');
					my.JumpIfNil(pos, v, lblSet);
					my.Jump(pos, lblEnd);
					lblSet.set(pos);
					var ve = collapse(pos, right);
					my.Move(v, ve);
					my.SetAt(vl, vi, v);
					my.tempClear(vl, vi, ve);
					lblEnd.set(pos);
					return v;
				},
				mut: function(pos, mutName, mutList, right){
					var vl = collapse(pos, expr);
					var vi = collapse(pos, index);
					var ve = collapse(pos, right);
					var v = my.tempVar();
					my.GetAt(v, vl, vi);
					if (mutList)
						my[mutName](v, ve);
					else{
						my[mutName](v, v, ve);
						my.SetAt(vl, vi, v);
					}
					my.tempClear(vl, vi, ve);
					return v
				}
			}];
		},
		exprSize: function(pos, expr){
			return [{
				kind: 'var',
				get: function(){
					var ve = collapse(pos, expr);
					var v = my.tempVar(ve);
					my.Size(v, ve);
					return v;
				}
			}];
		},

		//
		// ops
		//
		Move: function(v, vs){
			if (v.v.frameId === vs.v.frameId && v.v.frameIndex === vs.v.frameIndex) // same var
				return; // skip the move
			op_v_v(0x00, v, vs);
		},
		Nil: function(v){ op_v(0x01, v); },
		Num: function(v, num){
			var p = nums.indexOf(num);
			if (p < 0){
				p = nums.length;
				nums.push(num);
			}
			op_v_c(0x02, v, p);
		},
		Str: function(v, str){
			if (typeof str === 'string'){
				var s = str;
				str = [];
				for (var i = 0; i < s.length; i++)
					str.push(s.charCodeAt(i));
			}
			function equ(a, b){
				if (a.length !== b.length)
					return false;
				for (var i = 0; i < a.length; i++){
					if (a[i] !== b[i])
						return false;
				}
				return true;
			}
			var p = -1;
			for (var i = 0; i < strs.length; i++){
				if (equ(str, strs[i])){
					p = i;
					break;
				}
			}
			if (p < 0){
				p = strs.length;
				strs.push(str);
			}
			op_v_c(0x03, v, p);
		},
		List: function(v, hintSize){
			op_v_c(0x04, v, hintSize > 65535 ? 65535 : hintSize);
		},
		ToNum   : function(v, ve){ op_v_v(0x05, v, ve); },
		Neg     : function(v, ve){ op_v_v(0x06, v, ve); },
		Not     : function(v, ve){ op_v_v(0x07, v, ve); },
		Say     : function(v, ve){ op_v_v(0x08, v, ve); },
		Ask     : function(v, ve){ op_v_v(0x09, v, ve); },
		Typenum : function(v, ve){ op_v_v(0x0A, v, ve); },
		Typestr : function(v, ve){ op_v_v(0x0B, v, ve); },
		Typelist: function(v, ve){ op_v_v(0x0C, v, ve); },
		Add: function(v, vl, vr){ op_v_v_v(0x0D, v, vl, vr); },
		Sub: function(v, vl, vr){ op_v_v_v(0x0E, v, vl, vr); },
		Mod: function(v, vl, vr){ op_v_v_v(0x0F, v, vl, vr); },
		Mul: function(v, vl, vr){ op_v_v_v(0x10, v, vl, vr); },
		Div: function(v, vl, vr){ op_v_v_v(0x11, v, vl, vr); },
		Pow: function(v, vl, vr){ op_v_v_v(0x12, v, vl, vr); },
		Lt : function(v, vl, vr){ op_v_v_v(0x13, v, vl, vr); },
		Lte: function(v, vl, vr){ op_v_v_v(0x14, v, vl, vr); },
		Equ: function(v, vl, vr){ op_v_v_v(0x15, v, vl, vr); },
		Push   : function(v, ve){ op_v_v(0x16, v, ve); },
		Unshift: function(v, ve){ op_v_v(0x17, v, ve); },
		Pop    : function(v, ve){ op_v_v(0x18, v, ve); },
		Shift  : function(v, ve){ op_v_v(0x19, v, ve); },
		Size   : function(v, ve){ op_v_v(0x1A, v, ve); },
		GetAt: function(v, ve, vi){ op_v_v_v(0x1B, v, ve, vi); },
		SetAt: function(ve, vi, v){ op_v_v_v(0x1C, ve, vi, v); },
		Slice : function(v , ve, vi, vl){ op_v_v_v_v(0x1D, v , ve, vi, vl); },
		Splice: function(ve, vi, vl, vr){ op_v_v_v_v(0x1E, ve, vi, vl, vr); },
		Cat: function(v, vl, vr){ op_v_v_v(0x1F, v, vl, vr); },
		CallLocal: function(pos, v, level, lbl, params){
			var op = { pos: pos, hint: lbl.hint, bytes: false };
			ops.push(op);
			lbl.use(pos, function(index, info){
				var p = params.concat();
				while (p.length > info.paramCount)
					p.pop();
				if (p.length > 255)
					throw CompilerError(pos, 'Too many parameters');
				if (info.frameSize > 255)
					throw CompilerError(pos, 'Too many variables');
				if (index > 0xFFFFFFFF)
					throw CompilerError(pos, 'Too many instructions');
				if (level > 255)
					throw CompilerError(pos, 'Too many levels');
				op.bytes = [
					0x20,
					index,
					0, 0, 0, // reserve for index
					level,
					info.frameSize,
					p.length
				];
				vb(op.bytes, v);
				p.forEach(function(pp){
					vb(op.bytes, pp);
				});
			});
		},
		CallNative: function(v, ev, opcode, params){
			ops.push(0x21);
			ops.push(opcode % 256);
			ops.push(opcode >> 8);
			ops.push(params.length);
			vb(ops, v);
			vb(ops, ev);
			params.forEach(function(p){
				vb(ops, p);
			});
		},
		Return: function(v){ op_v(0x22, v); },
		Jump: function(pos, lbl){
			var op = { pos: pos, hint: lbl.hint, bytes: false };
			ops.push(op);
			lbl.use(pos, function(index){
				if (index > 0xFFFFFFFF)
					throw CompilerError(pos, 'Too many instructions');
				op.bytes = [
					0x23,
					index,
					0, 0, 0 // reserve for index
				];
			});
		},
		JumpIfNil: function(pos, v, lbl){
			var op = { pos: pos, hint: lbl.hint, bytes: false };
			ops.push(op);
			lbl.use(pos, function(index){
				if (index > 0xFFFFFFFF)
					throw CompilerError(pos, 'Too many instructions');
				op.bytes = [
					0x24,
					index,
					0, 0, 0 // reserve for index
				];
				vb(op.bytes, v);
			});
		},
		Append: function(body){
			body.labels.forEach(function(lbl){
				lbl.add(ops.length);
				lbl.owner = my;
			});
			my.labels = my.labels.concat(body.labels);
			ops = ops.concat(body.ops());
		},
		finish: function(){
			var initialFrameSize = my.scope.frameVars().length;
			if (initialFrameSize > 255)
				throw CompilerError(false, 'Too many variables');
			var header = [
				0x73, // 's'
				0x69, // 'i'
				0x6E, // 'n',
				0x6B, // 'k',
				0x00, // major version
				0x00, // minor version
				initialFrameSize,
				0, // reserved
				nums.length % 256, // guaranteed to be 16-bit due to op_v_c
				nums.length >> 8,
				strs.length % 256,
				strs.length >> 8
			];
			for (var i = 0; i < nums.length; i++){
				var b = new Buffer(4);
				b.writeFloatLE(nums[i], 0);
				header.push(b[0]);
				header.push(b[1]);
				header.push(b[2]);
				header.push(b[3]);
			}
			for (var i = 0; i < strs.length; i++){
				header.push(strs[i].length % 256);
				header.push(strs[i].length >> 8);
				header = header.concat(strs[i]);
			}

			var byteoffset = [];
			var bytes = [];
			var rewrites = [];
			var rwpos = [];
			ops.forEach(function(op){
				byteoffset.push(bytes.length);
				if (typeof op === 'number')
					bytes.push(op);
				else{
					if (op.bytes === false)
						throw CompilerError(op.pos, 'Unknown label: ' + op.hint);
					rewrites.push(bytes.length + 1);
					rwpos.push(op.pos);
					bytes = bytes.concat(op.bytes);
				}
			});
			rewrites.forEach(function(rw){
				var index = bytes[rw];
				var bo = byteoffset[index] + header.length + 4;
				if (typeof bo !== 'number' || bo > 0xFFFFFFFF)
					throw CompilerError(rwpos[rw], 'Too many instructions');
				bytes[rw + 0] = (bo >>  0) % 256;
				bytes[rw + 1] = (bo >>  8) % 256;
				bytes[rw + 2] = (bo >> 16) % 256;
				bytes[rw + 3] = (bo >> 24) % 256;
			});

			if (bytes.length > 0xFFFFFFFF)
				throw CompilerError(false, 'Too many instructions');
			header.push((bytes.length >>  0) % 256);
			header.push((bytes.length >>  8) % 256);
			header.push((bytes.length >> 16) % 256);
			header.push((bytes.length >> 24) % 256);
			return header.concat(bytes);
		}
	};

	if (my.nil === false){
		my.nil = my.tempVar();
		delete my.nil.v.info.temp; // hack to ensure nil variable is never released
		my.nil.v.sym = '%nil';
		my.Nil(my.nil);
		nil = my.nil;
	}

	return my;
};

}).call(this,require("buffer").Buffer)
},{"./compiler-error":2,"buffer":10}],2:[function(require,module,exports){

module.exports = function(pos, hint){
	return {
		pos: pos,
		hint: hint,
		toString: function(){
			return this.pos + ': ' + this.hint;
		}
	};
};

},{}],3:[function(require,module,exports){

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

},{"./body":1,"./lexer":4,"./parser":5,"./scope":6}],4:[function(require,module,exports){

var CompilerError = require('./compiler-error');

module.exports = function Lexer(file, source, readFile){
	var txt = (function(){
		var pos = 0;
		var line = 1;
		var chr = 1;
		return {
			peek: function(n){
				if (pos + n >= source.length)
					return false;
				return source.charAt(pos + n);
			},
			next: function(n){
				while (n > 0 && pos < source.length){
					var c = source.charAt(pos);
					pos++;
					n--;
					if ((c === '\r' && source.charAt(pos) !== '\n') || c === '\n'){
						line++;
						chr = 1;
					}
					else
						chr++;
				}
			},
			pos: function(){
				return {
					file: file,
					line: line,
					chr: chr,
					toString: function(){
						return this.file + ':' + this.line + ':' + this.chr;
					}
				};
			},
			eof: function(){
				return pos >= source.length;
			}
		};
	})();

	function isSpace(c){ return c === ' ' || c === '\n' || c === '\r' || c === '\t'; }
	function isAlpha(c){ return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
	function isNum(c){ return c >= '0' && c <= '9'; }
	function isIdentStart(c){ return isAlpha(c) || c === '_'; }
	function isIdentBody(c){ return isIdentStart(c) || isNum(c); }
	function isNumBody(c){ return isIdentBody(c) || c === '.'; }
	function is2PowNum(s){ return s === '0b' || s === '0c' || s === '0x'; }
	function isHex(c){ return isNum(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

	var specials = [
		'+', '+=',
		'-', '-=',
		'%', '%=',
		'*', '*=',
		'/', '/=',
		'^', '^=',
		'<', '<=',
		'>', '>=',
		'!', '!=',
		'=', '==',
		'~', '~=',
		'~+', '+~',
		'&&', '||', '||=',
		':', ',', '(', ')', '[', ']', '{', '}'
	];
	var keywords = [
		'ask',
		'break',
		'continue',
		'declare',
		'def',
		'do',
		'else',
		'elseif',
		'end',
		'for',
		'goto',
		'if',
		'pick',
		'pop',
		'return',
		'say',
		'shift',
		'typenum',
		'typestr',
		'typelist',
		'var',
		'while'
	];

	var tokens = [];
	function PushToken(kind, data){
		tokens.push({
			kind: kind,
			data: data,
			newline: false,
			isData: function(){
				if (this.kind !== 'keyspec')
					return false;
				for (var i = 0; i < arguments.length; i++){
					if (this.data === arguments[i])
						return true;
				}
				return false;
			},
			pos: txt.pos()
		});
	}

	function Keyspec(data){ PushToken('keyspec', data); }
	function Str(str){ PushToken('str', str); }
	function Num(s){
		var data;
		if (s.substr(0, 2) === '0b')
			data = parseInt(s.substr(2), 2);
		else if (s.substr(0, 2) === '0c')
			data = parseInt(s.substr(2), 8);
		else if (s.substr(0, 2) === '0x')
			data = parseInt(s.substr(2), 16);
		else
			data = parseFloat(s);
		PushToken('num', data);
	}
	function IdentOrKeyword(data){
		if (keywords.indexOf(data) >= 0)
			Keyspec(data);
		else
			PushToken('ident', data);
	}
	function Ident(data){
		if (keywords.indexOf(data) >= 0)
			throw CompilerError(txt.pos(), 'Invalid identifier');
		else
			PushToken('ident', data);
	}
	function MarkNewline(){
		if (tokens.length > 0)
			tokens[tokens.length - 1].newline = true;
	}

	function checkPreprocessor(str){
		var inc = str.match(/^\s*include\s+<([^>]+)>\s*$/);
		if (inc === null)
			return;
		var fi = readFile(inc[1], file);
		// TODO: deal with readFile returning a Promise
		if (fi === false)
			throw CompilerError(txt.pos(), 'Invalid include: ' + inc[1]);
		var tk = Lexer(fi.file.replace(/^\s+|\s+$/g, ''), fi.source, readFile);
		tk.pop(); // remove eof
		tokens = tokens.concat(tk);
	}

	var state = 'Start';
	var str;
	var blob;
	var cats;
	var next_cnt = 1;

	while (!txt.eof()){
		var ch = txt.peek(0);
		var nch = txt.peek(1);
		var nnch = txt.peek(2);

		switch (state){
			case 'Start':
				if (ch === '#'){
					if (txt.pos().chr === 1){
						str = '';
						state = 'Preprocessor';
					}
					else
						state = 'LineComment';
					MarkNewline();
				}
				else if (ch === '/' && nch === '*')
					state = 'BlockComment';
				else if (specials.indexOf(ch + nch + nnch) >= 0){
					Keyspec(ch + nch + nnch);
					next_cnt = 3;
				}
				else if (specials.indexOf(ch + nch) >= 0){
					Keyspec(ch + nch);
					next_cnt = 2;
				}
				else if (specials.indexOf(ch) >= 0)
					Keyspec(ch);
				else if (isIdentStart(ch)){
					if (isIdentBody(nch)){
						str = ch;
						state = 'Ident';
					}
					else
						IdentOrKeyword(ch);
				}
				else if (isNum(ch)){
					if (isNumBody(nch)){
						str = ch;
						state = 'Number';
					}
					else
						Num(ch);
				}
				else if (ch === '\''){
					blob = [];
					state = 'BasicString';
				}
				else if (ch === '"'){
					Keyspec('(');
					blob = false;
					cats = [];
					state = 'InterpString';
				}
				else if (ch === '\\')
					state = 'Backslash';
				else if (isSpace(ch) || ch === ';'){
					if (ch === '\r' || ch === '\n' || ch === ';')
						MarkNewline();
				}
				else
					throw CompilerError(txt.pos(), 'Unexpected character: ' + ch);
				break;
			case 'LineComment':
				if (ch === '\r' && nch === '\n'){
					next_cnt = 2;
					state = 'Start';
				}
				else if (ch === '\r' || ch === '\n')
					state = 'Start';
				break;
			case 'Preprocessor':
				if (ch === '\r' && nch === '\n'){
					checkPreprocessor(str);
					next_cnt = 2;
					state = 'Start';
				}
				else if (ch === '\r' || ch === '\n'){
					checkPreprocessor(str);
					state = 'Start';
				}
				else
					str += ch;
				break;
			case 'BlockComment':
				if (ch === '*' && nch === '/'){
					next_cnt = 2;
					state = 'Start';
				}
				break;
			case 'Ident':
				str += ch;
				if (!isIdentBody(nch)){
					IdentOrKeyword(str);
					state = 'Start';
				}
				break;
			case 'Number':
				str += ch;
				if (!isNumBody(nch)){
					Num(str);
					state = 'Start';
				}
				break;
			case 'BasicString':
				if (ch === '\r' || ch === '\n')
					throw CompilerError(txt.pos(), 'String missing end quote');
				else if (ch === '\\')
					state = 'BasicStringEscape';
				else if (ch === '\''){
					Str(blob);
					state = 'Start';
				}
				else
					blob.push(ch.charCodeAt(0));
				break;
			case 'BasicStringEscape':
				state = 'BasicString';
				if (ch === '\'' || ch === '\\')
					blob.push(ch.charCodeAt(0));
				else
					throw CompilerError(txt.pos(), 'Invalid escape sequence: \\' + ch);
			case 'InterpString':
				if (ch === '\r' || ch === '\n')
					throw CompilerError(txt.pos(), 'String missing end quote');
				else if (ch === '\\'){
					if (blob === false){
						blob = [];
						cats.push({ kind: Str, data: blob });
					}
					state = 'InterpStringEscape';
				}
				else if (ch === '$'){
					if (!isIdentStart(nch))
						throw CompilerError(txt.pos(), 'Invalid variable');
					blob = false;
					cats.push({ kind: Ident, data: '' });
					state = 'InterpStringIdent';
				}
				else if (ch === '"'){
					if (cats.length <= 0)
						Str([]);
					else{
						for (var i = 0; i < cats.length; i++){
							if (i > 0)
								Keyspec('~');
							cats[i].kind(cats[i].data);
						}
					}
					Keyspec(')');
					state = 'Start';
				}
				else{
					if (blob === false){
						blob = [];
						cats.push({ kind: Str, data: blob });
					}
					blob.push(ch.charCodeAt(0));
				}
				break;
			case 'InterpStringEscape':
				state = 'InterpString';
				switch (ch){
					case '"':
					case '\\':
					case '$':
						blob.push(ch.charCodeAt(0));
						break;
					case '0': blob.push(0); break;
					case 'b': blob.push('\b'.charCodeAt(0)); break;
					case 'f': blob.push('\f'.charCodeAt(0)); break;
					case 'n': blob.push('\n'.charCodeAt(0)); break;
					case 'r': blob.push('\r'.charCodeAt(0)); break;
					case 't': blob.push('\t'.charCodeAt(0)); break;
					case 'x':
						if (!isHex(nch) || !isHex(nnch)){
							throw CompilerError(txt.pos(),
								'Invalid escape sequence: \\' + ch + nch + nnch);
						}
						blob.push(parseInt(nch + nnch, 16));
						next_cnt = 3;
						break;
					default:
						throw CompileError(txt.pos(), 'Invalid escape sequence: \\' + ch);
				}
				break;
			case 'InterpStringIdent':
				cats[cats.length - 1].data += ch;
				if (!isIdentBody(nch))
					state = 'InterpString';
				break;
			case 'Backslash':
				if (ch === '#')
					state = 'LineComment';
				else if (ch === '\r' && nch === '\n'){
					next_cnt = 2;
					state = 'Start';
				}
				else if (ch === '\r' || ch === '\n')
					state = 'Start';
				else if (!isSpace(ch))
					throw CompilerError(txt.pos(), 'Invalid backslash');
				break;
		}

		txt.next(next_cnt);
		next_cnt = 1;
	}

	switch (state){
		case 'Start':
		case 'LineComment':
		case 'Preprocessor':
		case 'BlockComment':
		case 'Backslash':
			break;
		case 'Ident':
			IdentOrKeyword(str);
			break;
		case 'Number':
			Num(str);
			break;
		case 'BasicString':
		case 'BasicStringEscape':
		case 'InterpString':
		case 'InterpStringEscape':
		case 'InterpStringIdent':
			throw CompilerError(txt.pos(), 'String missing end quote');
	}

	PushToken('eof');
	return tokens;
};

},{"./compiler-error":2}],5:[function(require,module,exports){

var CompilerError = require('./compiler-error');
var Body = require('./body');

module.exports = function(globalBody, tokens){
	var body = globalBody;
	var bodyStack = [];

	function getIdent(){
		if (tokens[0].kind !== 'ident')
			throw CompilerError(tokens[0].pos, 'Expecting identifier');
		return tokens.shift();
	}

	function getData(d){
		if (!tokens[0].isData(d))
			throw CompilerError(tokens[0].pos, 'Expecting `' + d + '`');
		return tokens.shift();
	}

	function isAssign(t){
		return t.isData('=', '+=', '-=', '*=', '/=', '%=', '^=', '~=', '~+', '+~', '||=');
	}

	function Statements(){
		while (tokens[0].kind !== 'eof' && !tokens[0].isData('end', 'else', 'elseif', 'while'))
			Statement();
	}

	function Statement(){
		var t0 = tokens[0], t1 = tokens[1];
		if      (t0.isData('break'))      return body.stmtBreak(getData('break').pos);
		else if (t0.isData('continue'))   return body.stmtContinue(getData('continue').pos);
		else if (t0.isData('declare'))    return Declare();
		else if (t0.isData('def'))        return Def();
		else if (t0.isData('do'))         return Do();
		else if (t0.isData('for'))        return For();
		else if (t0.isData('goto'))       return Goto();
		else if (t0.isData('if'))         return If();
		else if (t0.kind === 'ident' && t1.isData(':')) return Label();
		else if (t0.isData('return'))     return Return();
		else if (t0.isData('var'))        return Var();
		else if (tokenStartsExpression()) return body.stmtEval(t0.pos, Expr(false).expr);
		else
			throw CompilerError(tokens[0].pos, 'Invalid statement');
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
			var nameVal = getIdent();
			var nameIndex = false;
			if (tokens[0].isData(',')){
				getData(',');
				nameIndex = getIdent();
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

	function Return(){
		var pos = getData('return').pos;
		body.stmtReturn(pos, Expr(false).expr);
	}

	function Var(){
		var pos = getData('var').pos;
		var names = [];
		var init = false;
		while (true){
			var ident = getIdent();
			names.push(ident);
			if (!tokens[0].isData(','))
				break;
			getData(',');
		}
		if (tokens[0].isData('=')){
			getData('=');
			init = Expr(false).expr;
		}
		body.stmtVar(pos, names, init);
	}

	function tokenStartsExpression(){
		return isTokenPre() || isTokenTerm();
	}

	function isTokenPre(){
		return tokens[0].isData('+', '-', '!', 'say', 'ask', 'pick', 'typenum', 'typestr',
			'typelist', 'pop', 'shift');
	}

	function isTokenMid(){
		return tokens[0].isData(
			'+', '+=',
			'-', '-=',
			'%', '%=',
			'*', '*=',
			'/', '/=',
			'^', '^=',
			'<', '<=',
			'>', '>=',
			'!=',
			'=', '==',
			'~', '~=',
			'~+', '+~',
			'&&', '||', '||=', ',');
	}

	function isTokenTerm(){
		return tokens[0].isData('(', '{') ||
			tokens[0].kind === 'ident' ||
			tokens[0].kind === 'str' ||
			tokens[0].kind === 'num';
	}

	function isTokenPost(wasNewline, isCmd){
		return (!wasNewline && (isTokenTerm() || (isCmd && isTokenPre()))) ||
			tokens[0].isData('!', '[');
	}

	function isPreBeforeMid(pre, mid){
		// ask/say/pick behave like commands, so they get executed last
		if (pre.isData('ask', 'say', 'pick'))
			return false;
		// -5^2 is -25, not 25
		if (pre.isData('-') && mid.isData('^'))
			return false;
		// otherwise, apply the Pre first
		return true;
	}

	function midPrecedence(mid){
		var prec = {
			// pow
			'^':     1,
			// multiply operators
			'%':     2,
			'*':     2,
			'/':     2,
			// add operators
			'+':     3,
			'-':     3,
			// misc
			'~':     4,
			// comparison
			'<=':    5,
			'<':     5,
			'>=':    5,
			'>':     5,
			// equality
			'!=':    6,
			'==':    6,
			// logic
			'&&':    7,
			'||':    8,
			// group
			',':     9,
			// mutation
			'=' :   10,
			'+=':   10,
			'%=':   10,
			'-=':   10,
			'*=':   10,
			'/=':   10,
			'^=':   10,
			'~=':   10,
			'~+':   10,
			'+~':   10,
		};
		for (var k in prec){
			if (mid.isData(k))
				return prec[k];
		}
		throw CompilerError(mid.pos, 'Unknown binary operator precedence');
	}

	function isMidBeforeMid(lmid, rmid, partialElse){
		var lp = midPrecedence(lmid);
		var rp = midPrecedence(rmid);
		if (lp < rp)
			return true;
		else if (lp > rp)
			return false;
		// otherwise, same precedence...
		if (lp === 11 || lmid.isData('^')) // mutation and pow are right to left
			return false;
		return true;
	}

	function applyPre(pre, expr){
		return {
			expr: body.exprUnary(pre, expr.expr),
			newline: expr.newline
		};
	}

	function applyPost(wasCmd, expr){
		function checkCall(){
			if (isTokenTerm() || isTokenPre()){
				var pos = tokens[0].pos;
				var params = Expr(false);
				return {
					expr: body.exprCall(pos, expr.expr, params.expr),
					newline: params.newline
				};
			}
			return false;
		}
		function checkSize(){
			if (tokens[0].isData('!')){
				var t = getData('!');
				return {
					expr: body.exprSize(t.pos, expr.expr),
					newline: t.newline
				};
			}
			return false;
		}
		function checkIndex(){
			if (tokens[0].isData('[')){
				var pos = getData('[').pos;
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
			}
			return false;
		}

		// goofiness due to:
		// foo ! bar
		// is this:   foo !bar
		// or:        foo! bar
		// if foo is a cmd, then assume foo !bar, otherwise, foo! bar
		if (wasCmd){
			var res = checkCall();
			if (res !== false) return res;
			res = checkSize();
			if (res !== false) return res;
			res = checkIndex();
			if (res !== false) return res;
		}
		else{
			var res = checkSize();
			if (res !== false) return res;
			res = checkCall();
			if (res !== false) return res;
			res = checkIndex();
			if (res !== false) return res;
		}

		throw CompilerError(tokens[0].pos, 'Invalid post operator');
	}

	function applyMid(mid, l, r){
		return {
			expr: body.exprBinary(mid, l.expr, r.expr),
			newline: r.newline
		};
	}

	function applyTerm(){
		if (tokens[0].kind === 'num'){
			var t = tokens.shift();
			return {
				expr: body.exprNum(t),
				newline: t.newline
			};
		}
		else if (tokens[0].kind === 'str'){
			var t = tokens.shift();
			return {
				expr: body.exprStr(t),
				newline: t.newline
			};
		}
		else if (tokens[0].kind === 'ident'){
			var t = getIdent();
			return {
				expr: body.exprLookup(t),
				newline: t.newline
			};
		}
		else if (tokens[0].isData('{')){
			var t = getData('{');
			var expr;
			if (tokens[0].isData('}'))
				expr = body.exprList(t.pos, []);
			else
				expr = body.exprList(t.pos, Expr(true).expr);
			t = getData('}');
			return {
				expr: expr,
				newline: t.newline
			};
		}
		else if (tokens[0].isData('(')){
			getData('(');
			if (tokens[0].isData(')')){
				var t = getData(')');
				return {
					expr: body.exprNil(),
					newline: t.newline
				};
			}
			var expr = body.exprGroup(tokens[0].pos, Expr(true).expr);
			var t = getData(')');
			return {
				expr: expr,
				newline: t.newline
			};
		}
		throw CompilerError(tokens[0].pos, 'Expecting expression');
	}

	function Expr(trailingComma){
		var preStackStack = [];
		var exprStack = [];
		var midStack = [];
		var thenStack = [];
		while (true){
			var preStack = [];

			// stack up the Pre's
			while (isTokenPre())
				preStack.unshift(tokens.shift());

			// next token MUST be a terminal!
			var term = applyTerm();

			// hackey way to detect things like:
			// add -10, 5    as     add (-10), 5     and not     (add - 10), 5
			var isCmd = term.expr.length === 1 &&
				(term.expr[0].kind === 'cmd-local' || term.expr[0].kind === 'cmd-native');
			// collect Post's
			while (isTokenPost(term.newline, isCmd))
				term = applyPost(isCmd, term);

			// check for trailing commas
			var isTC =
				trailingComma &&
				tokens.length > 1 &&
				tokens[0].isData(',') &&
				tokens[1].isData(')', '}');

			// we've applied all Post's... next, we check to see if we have a Mid
			if (!isTC && isTokenMid()){
				// we have a Mid, so now let's see who wins the fight for term
				var mid = tokens.shift();
				while (true){
					// fight between the Pre and the Mid
					while (preStack.length > 0 && isPreBeforeMid(preStack[0], mid))
						term = applyPre(preStack.shift(), term);
					// all Pre's that should have been applied before this Mid have been applied

					// if we ran out of Pre's, check the Mid stack
					if (preStack.length <= 0 && midStack.length > 0 &&
						isMidBeforeMid(midStack[0], mid, term.partialElse)){
						term = applyMid(midStack.shift(), exprStack.shift(), term);
						preStack = preStackStack.shift();
						// since we have a new preStack, we need to see how it competes against
						// the Mid we're trying to apply... so go back to the top
						continue;
					}
					// otherwise, the new Mid wins, so apply it below...
					break;
				}
				// finally, we're safe to apply the Mid...
				// except instead of applying it, we need to schedule to apply it, in case
				// another operator takes precedence over this one
				preStackStack.unshift(preStack);
				exprStack.unshift(term);
				midStack.unshift(mid);
			}
			else{ // we don't have a Mid... so exit
				if (isTC)
					tokens.shift(); // remove trailing comma
				// flush the Pre's, since we aren't competing anymore
				while (preStack.length > 0)
					term = applyPre(preStack.shift(), term);
				exprStack.unshift(term);
				break;
			}
		}

		// we're all done... let's apply whatever is left
		while (midStack.length > 0){
			// apply the Mid, then apply the Pre's
			// first, grab the two elements on the stack, for the Mid...
			var right = exprStack.shift();
			var left = exprStack.shift();
			// apply the Mid...
			var mterm = applyMid(midStack.shift(), left, right);
			// flush the Pre stack...
			preStack = preStackStack.shift();
			while (preStack.length > 0)
				mterm = applyPre(preStack.shift(), mterm);
			// push the result back on the stack, for the next go-round...
			exprStack.unshift(mterm);
		}

		// all done! -- just return whatever is on the top of the stack!
		return exprStack[0];
	}

	Statements();
	if (tokens[0].kind !== 'eof')
		throw CompilerError(tokens[0].pos, 'Invalid closing body');
};

},{"./body":1,"./compiler-error":2}],6:[function(require,module,exports){

var CompilerError = require('./compiler-error');

module.exports = function(){
	var scope = false;
	var nextFrameId = 0;
	var frameVars = [];
	var my;

	function makeVar(frameId, frameIndex, pos, sym, kind, info){
		return {
			frameId: frameId,
			frameIndex: frameIndex,
			pos: pos,
			sym: sym,
			kind: kind,
			info: info,
			toString: function(){
				if (this.info.temp === true)
					return this.sym;
				return '$' + this.frameId + '_' + this.frameIndex + '_' + this.sym;
			}
		};
	}

	function addSymbol(s, pos, sym, kind, info){
		if (typeof s.vars[sym] !== 'undefined')
			throw CompilerError(pos, 'Cannot redeclare: "' + sym + '"');
		var v;
		if (kind === 'var')
			v = my.addFrameSymbol(pos, sym, kind, info);
		else
			v = makeVar(my.frameId, false, pos, sym, kind, info);
		s.vars[sym] = v;
		return v;
	}

	my = {
		frameId: false,
		currentLevel: 0,
		frameVars: function(){
			return frameVars[my.frameId];
		},
		pushNewScope: function(){
			scope = {
				frameId: my.frameId,
				vars: {},
				parent: scope
			};
			return function(){
				scope = scope.parent;
			};
		},
		newScope: function(func){
			var popScope = my.pushNewScope();
			var ret = func();
			popScope();
			return ret;
		},
		pushNewFrame: function(){
			var old_fid = my.frameId;
			my.frameId = nextFrameId++;
			frameVars[my.frameId] = [];
			var popScope = my.pushNewScope();
			my.currentLevel++;
			return function(){
				popScope();
				my.frameId = old_fid;
				my.currentLevel--;
			};
		},
		newFrame: function(func){
			var popFrame = my.pushNewFrame();
			var ret = func();
			popFrame();
			return ret;
		},
		addSymbol: function(pos, sym, kind, info){
			return addSymbol(scope, pos, sym, kind, info);
		},
		addSymbolAtFrame: function(pos, sym, kind, info){
			var s = scope;
			while (true){
				if (s.parent === false || s.frameId !== s.parent.frameId)
					break;
				s = s.parent;
			}
			return addSymbol(s, pos, sym, kind, info);
		},
		addFrameSymbol: function(pos, sym, kind, info){
			var v = makeVar(my.frameId, frameVars[my.frameId].length, pos, sym, kind, info);
			frameVars[my.frameId].push(v);
			return v;
		},
		get: function(sym){
			return typeof scope.vars[sym] === 'undefined' ? false : scope.vars[sym];
		},
		getWithinFrame: function(sym){
			var s = scope;
			while (true){
				var v = s.vars[sym];
				if (typeof v !== 'undefined')
					return v;
				if (s.parent === false || s.frameId !== s.parent.frameId)
					return false;
				s = s.parent;
			}
		},
		lookup: function(pos, sym){
			var s = scope;
			var level = 0;
			while (true){
				var v = s.vars[sym];
				if (typeof v !== 'undefined')
					return { v: v, level: level };
				if (s.parent === false)
					throw CompilerError(pos, 'Unknown symbol: ' + sym);
				if (s.frameId !== s.parent.frameId)
					level++;
				s = s.parent;
			}
		}
	};
	return my;
};

},{"./compiler-error":2}],7:[function(require,module,exports){

var ex = {
	// main modules
	Compiler: require('./compiler/index'),
	Interpreter: require('./interpreter/index'),

	// helper functions
	newCompiler: function(say, ask, natives){
		var nats = [];
		var natfuncs = [];
		say = say || ex.Interpreter.defaultSay;
		ask = ask || ex.Interpreter.defaultAsk;
		if (natives){
			if (Object.keys(natives).length > 65535)
				throw new Error('Too many native functions');
			for (var n in natives){
				nats.push({
					name: n,
					opcode: nats.length,
					params: natives[n].length
				});
				natfuncs.push(natives[n]);
			}
		}
		return {
			compile: function(file, resolveFile, readFile){
				var bytecode = ex.Compiler(
					file,
					function(file, fromFile){
						// TODO: handle Promise
						var f = resolveFile(file, fromFile);
						var s = readFile(f);
						return {
							file: f,
							source: s
						};
					},
					nats
				);
				return function(maxTicks){
					return ex.Interpreter.Run(bytecode, say, ask, natfuncs, maxTicks);
				};
			},
			run: function(source, maxTicks){
				var bytecode = ex.Compiler(
					'main',
					function(file, fromFile){
						if (file === 'main')
							return { file: 'main', source: source };
						throw new Error('Cannot include any files');
					},
					nats
				);
				return ex.Interpreter.Run(bytecode, say, ask, natfuncs, maxTicks);
			}
		};
	}
};
module.exports = ex;

},{"./compiler/index":3,"./interpreter/index":8}],8:[function(require,module,exports){

var run = require('./run');

module.exports = {
	Run: function(bytecode, say, ask, natives, maxTicks){
		return run(bytecode, {
			say: say,
			ask: ask
		}, natives, maxTicks);
	},
	defaultSay: function(s){
		console.log(s);
	},
	defaultAsk: function(s){
		return window.prompt(s);
	}
};

},{"./run":9}],9:[function(require,module,exports){
(function (Buffer){

module.exports = function(bytecode, stdlib, natives, maxTicks){
	if (typeof maxTicks === 'undefined')
		maxTicks = Infinity;

	var pc = 0;

	function read8(){
		var r = bytecode[pc];
		pc++;
		return r;
	}

	function read16(){
		var r1 = bytecode[pc];
		var r2 = bytecode[pc + 1];
		pc += 2;
		return r1 | (r2 << 8);
	}

	function read32(){
		var r1 = bytecode[pc];
		var r2 = bytecode[pc + 1];
		var r3 = bytecode[pc + 2];
		var r4 = bytecode[pc + 3];
		pc += 4;
		return r1 | (r2 << 8) | (r3 << 16) | (r4 << 24);
	}

	function readFloat(){
		var b = new Buffer(4);
		b[0] = bytecode[pc];
		b[1] = bytecode[pc + 1];
		b[2] = bytecode[pc + 2];
		b[3] = bytecode[pc + 3];
		var r = b.readFloatLE(0);
		pc += 4;
		return r;
	}

	function err(msg){
		throw new Error('Invalid bytecode (' + msg + ')');
	}

	function skval(v){ // convert sink value to javascript value
		if (typeof v === 'undefined')
			return null;
		if (v instanceof Uint8Array)
			return String.fromCharCode.apply(void 0, v);
		if (v instanceof Array){
			var r = [];
			for (var i = 0; i < v.length; i++)
				r.push(skval(v[i]));
			return r;
		}
		// otherwise, v should be number
		return v;
	}

	function skstr(v, enc){ // convert sink value to javascript string
		if (typeof v === 'undefined')
			return '()';
		if (v instanceof Uint8Array){
			var s = String.fromCharCode.apply(void 0, v);
			if (enc)
				return JSON.stringify(s);
			return s;
		}
		if (v instanceof Array){
			var out = '';
			for (var i = 0; i < v.length; i++)
				out += (i == 0 ? '' : ', ') + skstr(v[i], true);
			return '{' + out + '}';
		}
		// otherwise, v should be number
		return '' + v;
	}

	function jsval(v){ // convert javascript value to sink value
		if (typeof v === 'undefined' || v === null || v === false)
			return void 0;
		if (v === true)
			return 1;
		if (typeof v === 'string'){
			var r = new Uint8Array(v.length);
			for (var i = 0; i < v.length; i++)
				r[i] = v.charCodeAt(i);
			return r;
		}
		if (v instanceof Array){
			var r = [];
			for (var i = 0; i < v.length; i++)
				r.push(jsval(v[i]));
			return r;
		}
		// otherwise, r, should be a number
		if (typeof v !== 'number')
			throw new Error('Cannot convert JavaScript value to Sink');
		return v;
	}

	function equ(a, b){
		if (a instanceof Uint8Array){
			if (b instanceof Uint8Array){
				if (a.length === b.length){
					for (var i = 0; i < a.length; i++){
						if (a[i] !== b[i])
							return false;
					}
					return true;
				}
			}
			return false;
		}
		return a === b;
	}

	if (read32() !== 0x6B6E6973)
		throw err('bad signature');

	if (read16() !== 0x0000)
		throw err('bad version');

	var initialFrameSize = read8();
	read8(); // reserved
	var numsLen = read16();
	var strsLen = read16();
	var nums = [];
	var strs = [];
	for (var i = 0; i < numsLen; i++)
		nums.push(readFloat());
	for (var i = 0; i < strsLen; i++){
		var sz = read16();
		strs.push(new Uint8Array(bytecode.slice(pc, pc + sz)));
		pc += sz;
	}
	var bytesLen = read32();

	var call_stack = [];
	var lex_stack = [];
	lex_stack.push([new Array(initialFrameSize)]);
	var lex_index = 0;

	function var_get(level, index){
		return lex_stack[lex_index - level][0][index];
	}

	function var_set(level, index, val){
		lex_stack[lex_index - level][0][index] = val;
	}

	var va_f, va_i, vb_f, vb_i, vc_f, vc_i, vd_f, vd_i;

	function decomp(){
		var old_pc = pc;
		var opcode = read8();
		var peek = [];
		function readVar(p){
			var f = read8();
			var i = read8();
			var s = '%' + f + '_' + i;
			if (p)
				peek.push(skstr(var_get(f, i), true));
			return s;
		}
		function v_op(name){
			console.log(readVar(false) + ' = ' + name);
		}
		function v_op_v(name){
			console.log(readVar(false) + ' = ' + name + ' ' + readVar(true) +
				' #' + peek.join(', '));
		}
		function v_op_v_v(name){
			console.log(readVar(false) + ' = ' + name + ' ' + readVar(true) + ', ' + readVar(true) +
				' #' + peek.join(', '));
		}
		function v_op_v_v_v(name){
			console.log(readVar(false) + ' = ' + name + ' ' + readVar(true) + ', ' + readVar(true) +
				', ' + readVar(true) + ' #' + peek.join(', '));
		}
		function v_op_c(name){
			console.log(readVar(false) + ' = ' + name + ' ' + read16());
		}
		function op_v(name){
			console.log(name + ' ' + readVar(true) + ' #' + peek.join(', '));
		}
		function op_v_v(name){
			console.log(name + ' ' + readVar(true) + ', ' + readVar(true) + ' #' + peek.join(', '));
		}
		function op_v_v_v(name){
			console.log(name + ' ' + readVar(true) + ', ' + readVar(true) + ', ' + readVar(true) +
				' #' + peek.join(', '));
		}
		function op_v_v_v_v(name){
			console.log(name + ' ' + readVar(true) + ', ' + readVar(true) + ', ' + readVar(true) +
				', ' + readVar(true) + ' #' + peek.join(', '));
		}
		switch (opcode){
			case 0x00: v_op_v('Move'      ); break;
			case 0x01: v_op  ('Nil'       ); break;
			case 0x02: v_op_c('Num'       ); break;
			case 0x03: v_op_c('Str'       ); break;
			case 0x04: v_op_c('List'      ); break;
			case 0x05: v_op_v('ToNum'     ); break;
			case 0x06: v_op_v('Neg'       ); break;
			case 0x07: v_op_v('Not'       ); break;
			case 0x08: v_op_v('Say'       ); break;
			case 0x09: v_op_v('Ask'       ); break;
			case 0x0A: v_op_v('Typenum'   ); break;
			case 0x0B: v_op_v('Typestr'   ); break;
			case 0x0C: v_op_v('Typelist'  ); break;
			case 0x0D: v_op_v_v('Add'     ); break;
			case 0x0E: v_op_v_v('Sub'     ); break;
			case 0x0F: v_op_v_v('Mod'     ); break;
			case 0x10: v_op_v_v('Mul'     ); break;
			case 0x11: v_op_v_v('Div'     ); break;
			case 0x12: v_op_v_v('Pow'     ); break;
			case 0x13: v_op_v_v('Lt'      ); break;
			case 0x14: v_op_v_v('Lte'     ); break;
			case 0x15: v_op_v_v('Equ'     ); break;
			case 0x16: op_v_v('Push'      ); break;
			case 0x17: op_v_v('Unshift'   ); break;
			case 0x18: v_op_v('Pop'       ); break;
			case 0x19: v_op_v('Shift'     ); break;
			case 0x1A: v_op_v('Size'      ); break;
			case 0x1B: v_op_v_v('GetAt'   ); break;
			case 0x1C: op_v_v_v('SetAt'   ); break;
			case 0x1D: v_op_v_v_v('Slice' ); break;
			case 0x1E: op_v_v_v_v('Splice'); break;
			case 0x1F: v_op_v_v('Cat'     ); break;
			case 0x20: console.log('CallLocal'); break;
			case 0x21:
				var opcode = read16();
				var parLen = read8();
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var pars = [];
				for (var i = 0; i < parLen; i++){
					vc_f = read8(); vc_i = read8();
					pars.push(skval(var_get(vc_f, vc_i)));
				}
				console.log('CallNative ' + opcode + ', ' + JSON.stringify(pars));
				break;
			case 0x22: op_v('Return'); break;
			case 0x23:
				console.log('Jump ' + read32());
				break;
			case 0x24:
				console.log('JumpIfNil ' + read32() + ', ' + readVar(true) + ' #' + peek);
				break;
			default:
				console.log('Unknown op');
		}
		pc = old_pc;
	}

	function apply_binop(a, b, op){
		if (a instanceof Array){
			if (b instanceof Array){
				var ret = [];
				if (a.length > b.length){
					for (var i = 0; i < a.length; i++)
						ret.push(op(a[i], i >= b.length ? 0 : b[i]));
				}
				else{
					for (var i = 0; i < b.length; i++)
						ret.push(op(i >= a.length ? 0 : a[i], b[i]));
				}
				return ret;
			}
			else{
				var ret = [];
				for (var i = 0; i < a.length; i++)
					ret.push(op(a[i], b));
				return ret;
			}
		}
		else if (b instanceof Array){
			var ret = [];
			for (var i = 0; i < b.length; i++)
				ret.push(op(a, b[i]));
			return ret;
		}
		else
			return op(a, b);
	}

	var mt = Infinity;
	if (typeof maxTicks === 'number')
		mt = maxTicks;
	else if (typeof maxTicks === 'function')
		mt = maxTicks();
	var curTick = 0;
	while (true){
		curTick++;
		if (curTick > mt){
			if (typeof maxTicks === 'function')
				mt = maxTicks();
			if (curTick > mt)
				break;
		}
		//decomp();
		var opcode = read8();
		switch (opcode){
			case 0x00: // Move va, vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, var_get(vb_f, vb_i));
				break;
			case 0x01: // va = Nil
				va_f = read8(); va_i = read8();
				var_set(va_f, va_i, void 0);
				break;
			case 0x02: // va = Num numberTable[cb]
				va_f = read8(); va_i = read8();
				var_set(va_f, va_i, nums[read16()]);
				break;
			case 0x03: // va = Str stringTable[cb]
				va_f = read8(); va_i = read8();
				var_set(va_f, va_i, strs[read16()]);
				break;
			case 0x04: // va = List cb
				va_f = read8(); va_i = read8();
				read16(); // ignore hint
				var_set(va_f, va_i, new Array());
				break;
			case 0x05: // va = ToNum vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, parseFloat(skval(var_get(vb_f, vb_i))));
				break;
			case 0x06: // va = Neg vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, -var_get(vb_f, vb_i));
				break;
			case 0x07: // va = Not vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, typeof var_get(vb_f, vb_i) === 'undefined' ? 1 : void 0);
				break;
			case 0x08: // va = Say vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				// TODO: handle say returns Promise
				stdlib.say(skstr(var_get(vb_f, vb_i)));
				var_set(va_f, va_i, var_get(vb_f, vb_i));
				break;
			case 0x09: // va = Ask vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				// TODO: handle ask returns Promise
				var_set(va_f, va_i, jsval(stdlib.ask(skval(var_get(vb_f, vb_i)))));
				break;
			case 0x0A: // va = Typenum vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, jsval(typeof var_get(vb_f, vb_i) === 'number'));
				break;				
			case 0x0B: // va = Typestr vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, jsval(var_get(vb_f, vb_i) instanceof Uint8Array));
				break;				
			case 0x0C: // va = Typelist vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, jsval(var_get(vb_f, vb_i) instanceof Array));
				break;				
			case 0x0D: // va = Add vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return a + b; }));
				break;
			case 0x0E: // va = Sub vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return a - b; }));
				break;
			case 0x0F: // va = Mod vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return a % b; }));
				break;
			case 0x10: // va = Mul vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return a * b; }));
				break;
			case 0x11: // va = Div vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return a / b; }));
				break;
			case 0x12: // va = Pow vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return Math.pow(a, b); }));
				break;
			case 0x13: // va = Lt vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return jsval(a < b); }));
				break;
			case 0x14: // va = Lte vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return jsval(a <= b); }));
				break;
			case 0x15: // va = Equ vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return jsval(equ(a, b)); }));
				break;
			case 0x16: // Push va, vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_get(va_f, va_i).push(var_get(vb_f, vb_i));
				break;
			case 0x17: // Unshift va, vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_get(va_f, va_i).unshift(var_get(vb_f, vb_i));
				break;
			case 0x18: // va = Pop vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, var_get(vb_f, vb_i).pop());
				break;
			case 0x19: // va = Shift vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, var_get(vb_f, vb_i).shift());
				break;
			case 0x1A: // va = Size vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, var_get(vb_f, vb_i).length);
				break;
			case 0x1B: // va = GetAt vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, var_get(vb_f, vb_i)[var_get(vc_f, vc_i)]);
				break;
			case 0x1C: // SetAt va, vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_get(va_f, va_i)[var_get(vb_f, vb_i)] = var_get(vc_f, vc_i);
				break;
			case 0x1D: // va = Slice vb, vc, vd
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				vd_f = read8(); vd_i = read8();
				var c = var_get(vc_f, vc_i);
				var_set(va_f, va_i, var_get(vb_f, vb_i).slice(c, c + var_get(vd_f, vd_i)));
				break;
			case 0x1E: // Splice va, vb, vc, vd
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				vd_f = read8(); vd_i = read8();
				var args = [var_get(vb_f, vb_i), var_get(vc_f, vc_i)].concat(var_get(vd_f, vd_i));
				var a = var_get(va_f, va_i);
				a.splice.apply(a, args);
				break;
			case 0x1F: // va = Cat vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var a1 = var_get(vb_f, vb_i);
				var a2 = var_get(vc_f, vc_i);
				if (a1 instanceof Array && a2 instanceof Array)
					var_set(va_f, va_i, a1.concat(a2));
				else
					var_set(va_f, va_i, jsval(skstr(a1) + skstr(a2)));
				break;
			case 0x20: // CallLocal
				var jpc = read32();
				var level = read8();
				var frameSize = read8();
				var parLen = read8();
				va_f = read8(); va_i = read8();
				var pars = [];
				for (var i = 0; i < parLen; i++){
					vb_f = read8(); vb_i = read8();
					pars.push(var_get(vb_f, vb_i));
				}
				call_stack.push({ pc: pc, va_f: va_f, va_i: va_i, lex_index: lex_index });
				lex_index = lex_index - level + 1;
				while (lex_index >= lex_stack.length)
					lex_stack.push([]);
				lex_stack[lex_index].unshift(new Array(frameSize));
				for (var i = 0; i < pars.length; i++)
					var_set(0, i, pars[i]);
				pc = jpc;
				break;
			case 0x21: // CallNative
				var opcode = read16();
				var parLen = read8();
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var pars = [];
				for (var i = 0; i < parLen; i++){
					vc_f = read8(); vc_i = read8();
					pars.push(skval(var_get(vc_f, vc_i)));
				}
				var res;
				try{
					res = natives[opcode].apply(void 0, pars);
				}
				catch (e){
					var pos = skval(var_get(vb_f, vb_i)) + ': ';
					if (typeof e === 'string')
						e = pos + e;
					else if (typeof e === 'object' && typeof e.message === 'string')
						e.message = pos + e;
					throw e;
				}
				var_set(va_f, va_i, jsval(res));
				break;
			case 0x22: // Return va
				va_f = read8(); va_i = read8();
				if (call_stack.length === 0)
					return skval(var_get(va_f, va_i));
				var s = call_stack.pop();
				var res = var_get(va_f, va_i);
				lex_stack[lex_index].shift();
				lex_index = s.lex_index;
				var_set(s.va_f, s.va_i, res);
				pc = s.pc;
				break;
			case 0x23: // Jump
				pc = read32();
				break;
			case 0x24: // JumpIfNil
				var jpc = read32();
				va_f = read8(); va_i = read8();
				if (typeof var_get(va_f, va_i) === 'undefined')
					pc = jpc;
				break;
			default:
				throw err('bad operator 0x' + opcode.toString(16).toUpperCase());
		}
	}
	throw err('max ticks');
};

}).call(this,require("buffer").Buffer)
},{"buffer":10}],10:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(array)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":11,"ieee754":12,"isarray":13}],11:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var i
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  var len = code.length

  for (i = 0; i < len; i++) {
    lookup[i] = code[i]
  }

  for (i = 0; i < len; ++i) {
    revLookup[code.charCodeAt(i)] = i
  }
  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp & 0xFF0000) >> 16
    arr[L++] = (tmp & 0xFF00) >> 8
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],12:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],13:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}]},{},[7]);
