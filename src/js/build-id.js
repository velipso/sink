
try{
	module.exports = require('./build-id-data');
}
catch (e){
	var msg =
		'Failed to require the build-id-data.js file\n\n' +
		'You are probably getting this error because you are attempting to\n' +
		'run the files under: ./src/js/* \n\n' +
		'Instead, you should be using the files in: ./dist/sink/*';
	console.error(msg);
	process.exit(1);
}
