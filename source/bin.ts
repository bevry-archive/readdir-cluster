// builtin
import { argv, stdout, exit } from 'process'
import { resolve } from 'path'

// local
import readdirCluster from './index.js'

// for each path, readdir
for (const path of argv.slice(2)) {
	readdirCluster({ directory: path })
		.then((paths) => {
			if (paths.length) {
				stdout.write(paths.join('\n') + '\n')
			}
		})
		.catch((error) => {
			console.error(error)
			exit(1)
		})
}
