
var CompilerError = require('./compiler-error');

module.exports = function(){
	var scope = false;
	var namespace = false;
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
				namespaces: {},
				parent: scope,
				namespace: false
			};
			var old_ns = namespace;
			namespace = scope;
			return function(){
				scope = scope.parent;
				namespace = old_ns;
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
		pushNamespace: function(pos, sym){
			addSymbol(namespace, pos, sym, 'namespace', false);
			var ns = {
				vars: {},
				namespaces: {},
				parent: namespace,
				namespace: true
			};
			namespace.namespaces[sym] = ns;
			namespace = ns;
		},
		popNamespace: function(){
			namespace = namespace.parent;
		},
		addSymbol: function(pos, sym, kind, info){
			return addSymbol(namespace, pos, sym, kind, info);
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
		lookup: function(syms){
			var s = namespace;
			var sym_i = 0;
			var level = 0;
			while (true){
				var v = s.vars[syms[sym_i].data];
				if (typeof v !== 'undefined'){
					if (v.kind === 'namespace'){
						if (sym_i >= syms.length - 1){
							throw CompilerError(syms[sym_i].pos,
								'Cannot use namespace as a variable: ' + syms[sym_i].data);
						}
						s = s.namespaces[syms[sym_i].data];
						sym_i++;
						continue;
					}
					else
						return { v: v, level: level };
				}
				if (s.parent === false)
					throw CompilerError(syms[sym_i].pos, 'Unknown symbol: ' + syms[sym_i].data);
				if (s.frameId !== s.parent.frameId && s.namespace === false)
					level++;
				s = s.parent;
			}
		}
	};
	return my;
};
