
var CompilerError = require('./compiler-error');
var Body = require('./body');

module.exports = function(globalBody, tokens){
	var body = globalBody;
	var bodyStack = [];

	function getIdent(){
		if (tokens[0].kind !== 'ident')
			throw CompilerError(tokens[0].pos, 'Expecting identifier');
		return tokens.shift();
	}

	function getData(d){
		if (!tokens[0].isData(d))
			throw CompilerError(tokens[0].pos, 'Expecting `' + d + '`');
		return tokens.shift();
	}

	function isAssign(t){
		return t.isData('=', '+=', '-=', '*=', '/=', '%=', '^=', '~=', '~+', '+~', '||=');
	}

	function Statements(){
		while (tokens[0].kind !== 'eof' && !tokens[0].isData('end', 'else', 'elseif', 'while'))
			Statement();
	}

	function Statement(){
		var t0 = tokens[0], t1 = tokens[1];
		if      (t0.isData('break'))      return body.stmtBreak(getData('break').pos);
		else if (t0.isData('continue'))   return body.stmtContinue(getData('continue').pos);
		else if (t0.isData('declare'))    return Declare();
		else if (t0.isData('def'))        return Def();
		else if (t0.isData('do'))         return Do();
		else if (t0.isData('for'))        return For();
		else if (t0.isData('goto'))       return Goto();
		else if (t0.isData('if'))         return If();
		else if (t0.kind === 'ident' && t1.isData(':')) return Label();
		else if (t0.isData('return'))     return Return();
		else if (t0.isData('var'))        return Var();
		else if (tokenStartsExpression()) return body.stmtEval(t0.pos, Expr(false).expr);
		else
			throw CompilerError(tokens[0].pos, 'Invalid statement');
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
			var nameVal = getIdent();
			var nameIndex = false;
			if (tokens[0].isData(',')){
				getData(',');
				nameIndex = getIdent();
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

	function Return(){
		var pos = getData('return').pos;
		body.stmtReturn(pos, Expr(false).expr);
	}

	function Var(){
		var pos = getData('var').pos;
		var names = [];
		var init = false;
		while (true){
			var ident = getIdent();
			names.push(ident);
			if (!tokens[0].isData(','))
				break;
			getData(',');
		}
		if (tokens[0].isData('=')){
			getData('=');
			init = Expr(false).expr;
		}
		body.stmtVar(pos, names, init);
	}

	function tokenStartsExpression(){
		return isTokenPre() || isTokenTerm();
	}

	function isTokenPre(){
		return tokens[0].isData('+', '-', '!', 'say', 'ask', 'pick', 'typenum', 'typestr',
			'typelist', 'pop', 'shift');
	}

	function isTokenMid(){
		return tokens[0].isData(
			'+', '+=',
			'-', '-=',
			'%', '%=',
			'*', '*=',
			'/', '/=',
			'^', '^=',
			'<', '<=',
			'>', '>=',
			'!=',
			'=', '==',
			'~', '~=',
			'~+', '+~',
			'&&', '||', '||=', ',');
	}

	function isTokenTerm(){
		return tokens[0].isData('(', '{') ||
			tokens[0].kind === 'ident' ||
			tokens[0].kind === 'str' ||
			tokens[0].kind === 'num';
	}

	function isTokenPost(wasNewline, isCmd){
		return (!wasNewline && (isTokenTerm() || (isCmd && isTokenPre()))) ||
			tokens[0].isData('!', '[');
	}

	function isPreBeforeMid(pre, mid){
		// ask/say/pick behave like commands, so they get executed last
		if (pre.isData('ask', 'say', 'pick'))
			return false;
		// -5^2 is -25, not 25
		if (pre.isData('-') && mid.isData('^'))
			return false;
		// otherwise, apply the Pre first
		return true;
	}

	function midPrecedence(mid){
		var prec = {
			// pow
			'^':     1,
			// multiply operators
			'%':     2,
			'*':     2,
			'/':     2,
			// add operators
			'+':     3,
			'-':     3,
			// misc
			'~':     4,
			// comparison
			'<=':    5,
			'<':     5,
			'>=':    5,
			'>':     5,
			// equality
			'!=':    6,
			'==':    6,
			// logic
			'&&':    7,
			'||':    8,
			// group
			',':     9,
			// mutation
			'=' :   10,
			'+=':   10,
			'%=':   10,
			'-=':   10,
			'*=':   10,
			'/=':   10,
			'^=':   10,
			'~=':   10,
			'~+':   10,
			'+~':   10,
		};
		for (var k in prec){
			if (mid.isData(k))
				return prec[k];
		}
		throw CompilerError(mid.pos, 'Unknown binary operator precedence');
	}

	function isMidBeforeMid(lmid, rmid, partialElse){
		var lp = midPrecedence(lmid);
		var rp = midPrecedence(rmid);
		if (lp < rp)
			return true;
		else if (lp > rp)
			return false;
		// otherwise, same precedence...
		if (lp === 11 || lmid.isData('^')) // mutation and pow are right to left
			return false;
		return true;
	}

	function applyPre(pre, expr){
		return {
			expr: body.exprUnary(pre, expr.expr),
			newline: expr.newline
		};
	}

	function applyPost(wasCmd, expr){
		function checkCall(){
			if (isTokenTerm() || isTokenPre()){
				var pos = tokens[0].pos;
				var params = Expr(false);
				return {
					expr: body.exprCall(pos, expr.expr, params.expr),
					newline: params.newline
				};
			}
			return false;
		}
		function checkSize(){
			if (tokens[0].isData('!')){
				var t = getData('!');
				return {
					expr: body.exprSize(t.pos, expr.expr),
					newline: t.newline
				};
			}
			return false;
		}
		function checkIndex(){
			if (tokens[0].isData('[')){
				var pos = getData('[').pos;
				if (tokens[0].isData(':')){
					getData(':');
					var len = false;
					if (!tokens[0].isData(']'))
						len = Expr(false).expr;
					var t = getData(']');
					return {
						expr: body.exprSlice(pos, expr.expr, false, len),
						newline: t.newline
					};
				}
				else{
					var index = Expr(false).expr;
					if (tokens[0].isData(':')){
						getData(':');
						var len = false;
						if (!tokens[0].isData(']'))
							len = Expr(false).expr;
						var t = getData(']');
						return {
							expr: body.exprSlice(pos, expr.expr, index, len),
							newline: t.newline
						};
					}
					else{
						var t = getData(']');
						return {
							expr: body.exprIndex(pos, expr.expr, index),
							newline: t.newline
						};
					}
				}
			}
			return false;
		}

		// goofiness due to:
		// foo ! bar
		// is this:   foo !bar
		// or:        foo! bar
		// if foo is a cmd, then assume foo !bar, otherwise, foo! bar
		if (wasCmd){
			var res = checkCall();
			if (res !== false) return res;
			res = checkSize();
			if (res !== false) return res;
			res = checkIndex();
			if (res !== false) return res;
		}
		else{
			var res = checkSize();
			if (res !== false) return res;
			res = checkCall();
			if (res !== false) return res;
			res = checkIndex();
			if (res !== false) return res;
		}

		throw CompilerError(tokens[0].pos, 'Invalid post operator');
	}

	function applyMid(mid, l, r){
		return {
			expr: body.exprBinary(mid, l.expr, r.expr),
			newline: r.newline
		};
	}

	function applyTerm(){
		if (tokens[0].kind === 'num'){
			var t = tokens.shift();
			return {
				expr: body.exprNum(t),
				newline: t.newline
			};
		}
		else if (tokens[0].kind === 'str'){
			var t = tokens.shift();
			return {
				expr: body.exprStr(t),
				newline: t.newline
			};
		}
		else if (tokens[0].kind === 'ident'){
			var t = getIdent();
			return {
				expr: body.exprLookup(t),
				newline: t.newline
			};
		}
		else if (tokens[0].isData('{')){
			var t = getData('{');
			var expr;
			if (tokens[0].isData('}'))
				expr = body.exprList(t.pos, []);
			else
				expr = body.exprList(t.pos, Expr(true).expr);
			t = getData('}');
			return {
				expr: expr,
				newline: t.newline
			};
		}
		else if (tokens[0].isData('(')){
			getData('(');
			if (tokens[0].isData(')')){
				var t = getData(')');
				return {
					expr: body.exprNil(),
					newline: t.newline
				};
			}
			var expr = body.exprGroup(tokens[0].pos, Expr(true).expr);
			var t = getData(')');
			return {
				expr: expr,
				newline: t.newline
			};
		}
		throw CompilerError(tokens[0].pos, 'Expecting expression');
	}

	function Expr(trailingComma){
		var preStackStack = [];
		var exprStack = [];
		var midStack = [];
		var thenStack = [];
		while (true){
			var preStack = [];

			// stack up the Pre's
			while (isTokenPre())
				preStack.unshift(tokens.shift());

			// next token MUST be a terminal!
			var term = applyTerm();

			// hackey way to detect things like:
			// add -10, 5    as     add (-10), 5     and not     (add - 10), 5
			var isCmd = term.expr.length === 1 &&
				(term.expr[0].kind === 'cmd-local' || term.expr[0].kind === 'cmd-native');
			// collect Post's
			while (isTokenPost(term.newline, isCmd))
				term = applyPost(isCmd, term);

			// check for trailing commas
			var isTC =
				trailingComma &&
				tokens.length > 1 &&
				tokens[0].isData(',') &&
				tokens[1].isData(')', '}');

			// we've applied all Post's... next, we check to see if we have a Mid
			if (!isTC && isTokenMid()){
				// we have a Mid, so now let's see who wins the fight for term
				var mid = tokens.shift();
				while (true){
					// fight between the Pre and the Mid
					while (preStack.length > 0 && isPreBeforeMid(preStack[0], mid))
						term = applyPre(preStack.shift(), term);
					// all Pre's that should have been applied before this Mid have been applied

					// if we ran out of Pre's, check the Mid stack
					if (preStack.length <= 0 && midStack.length > 0 &&
						isMidBeforeMid(midStack[0], mid, term.partialElse)){
						term = applyMid(midStack.shift(), exprStack.shift(), term);
						preStack = preStackStack.shift();
						// since we have a new preStack, we need to see how it competes against
						// the Mid we're trying to apply... so go back to the top
						continue;
					}
					// otherwise, the new Mid wins, so apply it below...
					break;
				}
				// finally, we're safe to apply the Mid...
				// except instead of applying it, we need to schedule to apply it, in case
				// another operator takes precedence over this one
				preStackStack.unshift(preStack);
				exprStack.unshift(term);
				midStack.unshift(mid);
			}
			else{ // we don't have a Mid... so exit
				if (isTC)
					tokens.shift(); // remove trailing comma
				// flush the Pre's, since we aren't competing anymore
				while (preStack.length > 0)
					term = applyPre(preStack.shift(), term);
				exprStack.unshift(term);
				break;
			}
		}

		// we're all done... let's apply whatever is left
		while (midStack.length > 0){
			// apply the Mid, then apply the Pre's
			// first, grab the two elements on the stack, for the Mid...
			var right = exprStack.shift();
			var left = exprStack.shift();
			// apply the Mid...
			var mterm = applyMid(midStack.shift(), left, right);
			// flush the Pre stack...
			preStack = preStackStack.shift();
			while (preStack.length > 0)
				mterm = applyPre(preStack.shift(), mterm);
			// push the result back on the stack, for the next go-round...
			exprStack.unshift(mterm);
		}

		// all done! -- just return whatever is on the top of the stack!
		return exprStack[0];
	}

	Statements();
	if (tokens[0].kind !== 'eof')
		throw CompilerError(tokens[0].pos, 'Invalid closing body');
};
