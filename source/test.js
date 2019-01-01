'use strict'

// Import
const kava = require('kava')
const readdir = require('../')
const assert = require('assert-helpers')

// Prepare
const path = __dirname

// Test
kava.suite('readdir-cluster', function(suite, test) {
	test('works on source directory with test filter', function(done) {
		const actualPaths = []
		const expectedPaths = ['index.js', 'test.js', 'worker.js'].sort()
		function iterator(fpath, rpath, stat) {
			if (stat.directory && rpath === 'test') {
				return false
			}
			actualPaths.push(rpath)
		}
		function complete(err) {
			if (err) return done(err)
			assert.deepEqual(
				actualPaths.sort(),
				expectedPaths,
				'paths were as expected'
			)
			done(err)
		}
		readdir(path, iterator, complete)
	})
})
