// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

(function(){

if (typeof window === 'object'){
	// browser version
	function L_pwd(){
		return window.location.href
			.replace(/^.*:/, '')  // remove protocol
			.replace(/\?.*$/, '') // remove query params
			.replace(/\/[^\/]*$/, ''); // remove trailing file and slash
	}
}
else{
	// node.js version
	function L_pwd(){
		return process.cwd();
	}
}

function lib(args){
	return {
		includes: {
			'shell':
				"declare args  'sink.shell.args' ;" +
				"declare cat   'sink.shell.cat'  ;" +
				"declare cd    'sink.shell.cd'   ;" +
				"declare cp    'sink.shell.cp'   ;" +
				"declare env   'sink.shell.env'  ;" +
				"declare exec  'sink.shell.exec' ;" +
				"declare glob  'sink.shell.glob' ;" +
				"declare head  'sink.shell.head' ;" +
				"declare ls    'sink.shell.ls'   ;" +
				"declare mv    'sink.shell.mv'   ;" +
				"declare mkdir 'sink.shell.mkdir';" +
				"declare pushd 'sink.shell.pushd';" +
				"declare popd  'sink.shell.popd' ;" +
				"declare pwd   'sink.shell.pwd'  ;" +
				"declare rm    'sink.shell.rm'   ;" +
				"declare tail  'sink.shell.tail' ;" +
				"declare test  'sink.shell.test' ;" +
				"declare which 'sink.shell.which';"
		},
		natives: {
			'sink.shell.args': function(){
				return args.concat();
			},
			'sink.shell.pwd': L_pwd
		}
	};
}

if (typeof window === 'object')
	window.SinkShell = lib;
else
	module.exports = lib;

})();
