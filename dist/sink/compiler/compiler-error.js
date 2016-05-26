
module.exports = function(pos, hint){
	return {
		pos: pos,
		hint: hint,
		toString: function(){
			return this.pos + ': ' + this.hint;
		}
	};
};
