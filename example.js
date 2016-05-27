var path = __dirname
if ( process.argv.indexOf('old') === -1 ) {
	console.log('using cluster method')
	require('./')(path, console.log, console.log)
}
else {
	console.log('using old method')
	require('scandirectory')(path, console.log)
}
