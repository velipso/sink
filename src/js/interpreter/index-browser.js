
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
