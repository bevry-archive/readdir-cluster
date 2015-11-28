// Import
const joe = require('joe')
const lib = require('../..')

// Test
joe.suite('directory-overseer', function (suite, test) {
	test('avatars', function (done) {
		const iterator = function (fpath, rpath, stat) {
			console.log('FILE:', fpath)
			if ( rpath[0] === '.' ) {
				return false
			}
		}
		const complete = function (err) {
			console.log('ALL DONE', err)
			done(err)
		}
		lib('/Users/balupton/Documents', iterator, complete)
	})
})
