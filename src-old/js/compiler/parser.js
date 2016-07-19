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
