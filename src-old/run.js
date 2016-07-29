
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

	var call_stack = [];
	var lex_stack = [];
	lex_stack.push([new Array(initialFrameSize)]);
	var lex_index = 0;

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
