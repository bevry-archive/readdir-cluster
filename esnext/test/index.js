// Import
const joe = require('joe')
const readdir = require('../..')
const assert = require('assert-helpers')

// Prepare
const path = require('path').join(__dirname, '..', '..', 'esnext')

// Test
joe.suite('readdir-cluster', function (suite, test) {
	test('works on esnext directory with test filter', function (done) {
		const actualPaths = []
		const expectedPaths = ['lib', 'index.js', 'worker.js'].sort()
		function iterator (fpath, rpath, stat) {
			if ( stat.directory && rpath === 'test' ) {
				return false
			}
			actualPaths.push(rpath)
		}
		function complete (err) {
			if (err)  return done(err)
			assert.deepEqual(actualPaths.sort(), expectedPaths, 'paths were as expected')
			done(err)
		}
		readdir(path, iterator, complete)
	})
})
