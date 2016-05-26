
var readline = require('readline');

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
		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		var pr_resolve;
		var pr = new Promise(function(resolve, reject){
			pr_resolve = resolve;
		});

		rl.question(s, function(answer){
			rl.close();
			pr_resolve(answer);
		});

		return pr;
	}
};
