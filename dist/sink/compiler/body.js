
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
