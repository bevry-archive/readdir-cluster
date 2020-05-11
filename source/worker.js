'use strict'

// Import
const fsUtil = require('fs')

// Handle incoming work
process.on('message', function (message) {
	// console.log('WORKER:', process.pid, message)
	if (message.action === 'readdir') {
		fsUtil.readdir(message.path, function (err, files) {
			if (err)
				return process.send({
					action: 'readdir',
					path: message.path,
					error: err,
				})
			process.send({ action: 'readdir', path: message.path, data: files })
		})
	} else if (message.action === 'stat') {
		fsUtil.stat(message.path, function (err, stat) {
			if (err)
				return process.send({ action: 'stat', path: message.path, error: err })
			stat.directory = stat.isDirectory()
			process.send({ action: 'stat', path: message.path, data: stat })
		})
	}
})
