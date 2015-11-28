if ( process.argv.indexOf('cluster') !== -1 ) {
	console.log('using cluster method')
	var results = []
	require('./')(__dirname, results.push.bind(results), console.log.bind(console.log, 'done', results))
}
else {
	console.log('using old method')
	require('scandirectory')(__dirname, console.log)
}
