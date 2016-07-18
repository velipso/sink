// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

module.exports = function(body){
	// load command operators

	function processToken(){
		//console.log('   ' + st.st);


			default:
				throw 'TODO: ' + st.st;

		}
	}


/*

function isAssign(t){
	return t.isData('=', '+=', '-=', '*=', '/=', '%=', '^=', '~=', '||=');
}

function Declare(){
	getData('declare');
	while (true){
		var name = getIdent();
		if (tokens[0].kind === 'num'){
			var parcnt = tokens.shift();
			if (parcnt.data % 1 !== 0 || parcnt.data < 0 || parcnt.data > 0xFF){
				throw CompilerError(parcnt.pos,
					'Native declaration\'s parameter count must be a 8-bit unsigned integer');
			}
			if (tokens[0].kind !== 'num')
				throw CompilerError(tokens[0].pos, 'Expecting native opcode (16-bit uint)');
			var opcode = tokens.shift();
			if (opcode.data % 1 !== 0 || opcode.data < 0 || opcode.data > 0xFFFF){
				throw CompilerError(opcode.pos,
					'Native declaration\'s opcode must be a 16-bit unsigned integer');
			}
			body.stmtDeclareNative(name, opcode.data, parcnt.data);
		}
		else
			body.stmtDeclareLocal(name);
		if (!tokens[0].isData(','))
			return;
		getData(',');
	}
}

function Def(){
	var pos = getData('def').pos;
	var name = getIdent();
	var params = [];
	if (!name.newline){
		while (true){
			var p = getIdent();
			params.push(p);
			if (p.newline)
				break;
			getData(',');
		}
	}
	bodyStack.push(body);
	body.stmtDef(name, params, function(){
		var cmdBody = Body(body, false, false);
		body = cmdBody;
		body.headerCommand(params);
		Statements();
		getData('end');
		body = bodyStack.pop();
		return cmdBody;
	});
}

function Block(newScope, lblCnt, lblBrk){
	bodyStack.push(body);
	var block = Body(body, lblCnt, lblBrk);
	body = block;
	if (newScope){
		body.scope.newScope(function(){
			Statements();
		});
	}
	else
		Statements();
	body = bodyStack.pop();
	return block;
}

function Do(){
	var pos = getData('do').pos;
	body.stmtDo(pos, function(lblWhile, lblEnd){
		var doBlock = Block(false, lblWhile, lblEnd);
		if (tokens[0].isData('while')){
			getData('while');
			return {
				isWhile: true,
				block: doBlock,
				expr: function(){
					return Expr(false).expr;
				},
				generate: function(lblDo, lblEnd){
					return Block(false, lblDo, lblEnd);
				}
			};
		}
		else if (tokens[0].isData('end')){
			return {
				isWhile: false,
				block: doBlock
			};
		}
		else
			throw CompilerError(tokens[0].pos, 'Expecting `while` or `end`');
	});
	getData('end');
}

function For(){
	var t = getData('for');
	if (t.newline){
		body.stmtLoop(t.pos, function(lblCnt, lblBrk){
			return Block(true, lblCnt, lblBrk);
		});
	}
	else{
		var newVar = false;
		if (tokens[0].isData('var')){
			newVar = true;
			getData('var');
		}
		var nameVal = getNamespaceIdent();
		var nameIndex = false;
		if (tokens[0].isData(',')){
			getData(',');
			nameIndex = getNamespaceIdent();
		}
		getData(':');
		var expr = Expr(false).expr;
		body.stmtFor(newVar, nameVal, nameIndex, expr, function(lblCnt, lblBrk){
			return Block(true, lblCnt, lblBrk);
		});
	}
	getData('end');
}

function Goto(){
	getData('goto');
	body.stmtGoto(getIdent());
}

function If(){
	var pos = getData('if').pos;
	body.stmtIf(function(addCond, addBody, addElse){
		while (true){
			addCond(pos, Expr(false).expr);
			addBody(pos, Block(true, body.lblContinue, body.lblBreak));
			if (tokens[0].isData('end'))
				break;
			else if (tokens[0].isData('elseif')){
				pos = getData('elseif').pos;
				continue;
			}
			else if (tokens[0].isData('else')){
				pos = getData('else').pos;
				addElse(pos, Block(true, body.lblContinue, body.lblBreak));
				break;
			}
		}
		getData('end');
	});
}

function Label(){
	var label = getIdent();
	getData(':');
	body.stmtLabel(label);
}

function Namespace(){
	getData('namespace');
	var ns = getIdent();
	body.stmtNamespace(ns, function(){
		return Block(false, body.lblContinue, body.lblBreak);
	});
	getData('end');
}

function Return(){
	var pos = getData('return').pos;
	body.stmtReturn(pos, Expr(false).expr);
}

*/
