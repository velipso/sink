// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

module.exports = function(){
	var my = {
		jump: function(lbl){
		},
		eval: function(expr){
			console.log('eval', expr);
			return { type: 'success' }; // { type: 'error', msg: 'message' }
		},
		newVar: function(fdiff, index, expr){
			console.log('assign', {
				fdiff: fdiff,
				index: index
			}, expr);
		}
	};
	return my;
}
