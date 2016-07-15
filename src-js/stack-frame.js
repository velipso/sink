// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

module.exports = function(parent){
	var vars = [];
	var my = {
		tempClear: function(i){
			vars[i] = 'FVR_TEMP_AVAIL';
		},
		newTemp: function(body){
			for (var i = 0; i < vars.length; i++){
				if (vars[i] == 'FVR_TEMP_AVAIL'){
					vars[i] = 'FVR_TEMP_INUSE';
					return i;
				}
			}
			vars.push('FVR_TEMP_INUSE');
			body.newVar(0, vars.length - 1);
			return vars.length - 1;
		},
		newVar: function(){
			vars.push('FVR_VAR');
			return vars.length - 1;
		},
		diff: function(child){
			var dist = 0;
			while (child != my){
				child = child.parent;
				dist++;
			}
			return dist;
		}
	};
	return my;
};
