
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

			case 0x05: // va = ToNum vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, parseFloat(skval(var_get(vb_f, vb_i))));
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

			case 0x2E: // va = NumAtan2 vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, apply_binop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i),
					function(a, b){ return Math.atan2(a, b); }));
				break;

			case 0x33: // va = NumPi
				va_f = read8(); va_i = read8();
				var_set(va_f, va_i, Math.PI);
				break;
			case 0x34: // va = NumTau
				va_f = read8(); va_i = read8();
				var_set(va_f, va_i, Math.PI * 2);
				break;
			case 0x35: // va = NumLerp vb, vc, vd
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				vd_f = read8(); vd_i = read8();
				var_set(va_f, va_i, apply_triop(
					var_get(vb_f, vb_i), var_get(vc_f, vc_i), var_get(vd_f, vd_i),
					function(a, b, c){ return a + (b - a) * c; }));
				break;
			case 0x36: // va = NumMax vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, Math.max.apply(Math, var_get(vb_f, vb_i)));
				break;
			case 0x37: // va = NumMin vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				var_set(va_f, va_i, Math.min.apply(Math, var_get(vb_f, vb_i)));
				break;
			case 0x38: // PushList va, vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				Array.prototype.push.apply(var_get(va_f, va_i), var_get(vb_f, vb_i));
				break;
			case 0x39: // UnshiftList va, vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				Array.prototype.unshift.apply(var_get(va_f, va_i), var_get(vb_f, vb_i));
				break;
			case 0x3A: // va = ListNew vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				vb_f = var_get(vb_f, vb_i);
				vc_f = var_get(vc_f, vc_i);
				vd_f = [];
				for (vd_i = 0; vd_i < vb_f; vd_i++)
					vd_f.push(vc_f);
				var_set(va_f, va_i, vd_f);
				break;
			case 0x3B: // va = ListFind vb, vc, vd
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				vd_f = read8(); vd_i = read8();
				vd_f = var_get(vd_f, vd_i);
				vb_f = var_get(vb_f, vb_i).indexOf(var_get(vc_f, vc_i), vd_f === void 0 ? 0 : vd_f);
				var_set(va_f, va_i, vb_f < 0 ? void 0 : vb_f);
				break;
			case 0x3C: // va = ListFindRev vb, vc, vd
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				vd_f = read8(); vd_i = read8();
				vd_f = var_get(vd_f, vd_i);
				vb_f = var_get(vb_f, vb_i).lastIndexOf(
					var_get(vc_f, vc_i),
					vd_f === void 0 ? 0 : vd_f
				);
				var_set(va_f, va_i, vb_f < 0 ? void 0 : vb_f);
				break;
			case 0x3D: // va = ListRev vb
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vb_f = var_get(vb_f, vb_i);
				vb_f.reverse();
				var_set(va_f, va_i, vb_f);
				break;
			case 0x3E: // va = ListJoin vb, vc
				va_f = read8(); va_i = read8();
				vb_f = read8(); vb_i = read8();
				vc_f = read8(); vc_i = read8();
				var_set(va_f, va_i, jsval(var_get(vb_f, vb_i).join(skval(var_get(vc_f, vc_i)))));
				break;

			default:
				throw err('bad operator 0x' + opcode.toString(16).toUpperCase());
		}
	}
	throw err('max ticks');
};
