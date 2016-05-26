
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
