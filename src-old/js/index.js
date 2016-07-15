
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
