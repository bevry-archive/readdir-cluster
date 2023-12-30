// builtin
import { readdir, stat } from 'fs'
import process from 'process'

// local
import { Message, Action } from './index.js'

// listen
process.on('message', function (message: Message) {
	// console.log('worker', message.id)
	const { id, action, path } = message
	if (action === Action.readdir) {
		readdir(path, function (error, files) {
			if (error)
				return process.send!({
					id,
					action,
					path,
					error,
				})
			process.send!({
				id,
				action,
				path,
				data: files,
			})
		})
	} else if (action === Action.stat) {
		stat(path, function (error, stat) {
			if (error)
				return process.send!({
					id,
					action,
					path,
					error,
				})
			process.send!({
				id,
				action,
				path,
				data: Object.assign({ directory: stat.isDirectory() }, stat),
			})
		})
	} else {
		process.send!({
			id,
			action,
			path,
			error: new Error('unknown action'),
		})
	}
})
