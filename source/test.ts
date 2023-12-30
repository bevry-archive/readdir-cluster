// external
import kava from 'kava'
import { deepEqual } from 'assert-helpers'
import filedirname from 'filedirname'

// builtin
import { resolve, join } from 'path'

// local
import readdirCluster, { Paths, Stat } from './index.js'

// prepare
const [file, dir] = filedirname()
const rootPath = resolve(dir, '..')
const sourcePath = resolve(dir, '..', 'source')

// Test
kava.suite('readdir-cluster', function (suite, test) {
	test('works on source directory with test filter', function (done) {
		const filteredPathsActual: Paths = []
		const filteredPathsExpected: Paths = [
			sourcePath,
			join(sourcePath, 'bin.ts'),
			join(sourcePath, 'index.ts'),
			join(sourcePath, 'worker.ts'),
		].sort()
		function iterator(
			path: string,
			filename: string,
			stat: Stat
		): boolean | void {
			let iterate = false
			if (stat.directory) {
				if (path === sourcePath && filename === 'source') iterate = true
			} else if (path.startsWith(sourcePath) && filename !== 'test.ts')
				iterate = true
			if (iterate) filteredPathsActual.push(path)
			return iterate
		}
		readdirCluster({ directory: rootPath, iterator })
			.then(function (filteredPaths) {
				deepEqual(
					filteredPaths.sort(),
					filteredPathsExpected,
					'filtered paths result was as expected'
				)
				deepEqual(
					filteredPaths.sort(),
					filteredPathsActual.sort(),
					'filtered paths result was as actual'
				)
				done()
			})
			.catch(function (error) {
				done(error)
			})
	})
})
