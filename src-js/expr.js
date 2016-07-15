// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

var Expr = {
	nil: function(){
		return {
			type: 'EXPR_NIL',
			isCmd: false
		};
	},
	num: function(num){
		return {
			type: 'EXPR_NUM',
			isCmd: false,
			num: num
		};
	},
	str: function(str){
		return {
			type: 'EXPR_STR',
			isCmd: false,
			str: str
		};
	},
	lookup: function(fdiff, index){
		return {
			type: 'EXPR_LOOKUP',
			isCmd: false,
			fdiff: fdiff,
			index: index
		};
	},
	cmdLocal: function(lbl){
		return {
			type: 'EXPR_CMD_LOCAL',
			isCmd: true,
			lbl: lbl
		};
	},
	cmdNative: function(cmd){
		return {
			type: 'EXPR_CMD_NATIVE',
			isCmd: true,
			cmd: cmd
		};
	},
	postfix: function(tk, expr){
		return {
			type: 'EXPR_POSTFIX',
			isCmd: false,
			tk: tk,
			expr: expr
		};
	},
	prefix: function(tk, expr){
		return {
			type: 'EXPR_PREFIX',
			isCmd: false,
			tk: tk,
			expr: expr
		};
	},
	infix: function(tk, left, right){
		if (tk.type == 'TOK_KEYSPEC' && tk.data == ',')
			return Expr.group(left, right);
		return {
			type: 'EXPR_INFIX',
			isCmd: false,
			tk: tk,
			left: left,
			right: right
		};
	},
	group: function(left, right){
		if (left.type == 'EXPR_GROUP'){
			if (right.type == 'EXPR_GROUP'){
				return {
					type: 'EXPR_GROUP',
					isCmd: false,
					group: left.group.concat(right.group)
				};
			}
			var g = left.group.concat();
			g.push(right);
			return {
				type: 'EXPR_GROUP',
				isCmd: false,
				group: g
			};
		}
		else if (right.type == 'EXPR_GROUP'){
			var g = right.group.concat();
			g.unshift(left);
			return {
				type: 'EXPR_GROUP',
				isCmd: false,
				group: g
			};
		}
		return {
			type: 'EXPR_GROUP',
			isCmd: false,
			group: [left, right]
		};
	},
	groupAmount: function(expr, amount){
		var g;
		if (expr.type == 'EXPR_GROUP')
			g = expr.group.slice(0, amount);
		else
			g = ([expr]).slice(0, amount);
		while (g.length < amount)
			g.push(Expr.nil());
		return {
			type: 'EXPR_GROUP',
			isCmd: false,
			group: g
		};
	}
};

module.exports = Expr;
