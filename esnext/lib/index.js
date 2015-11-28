'use strict'

// Import
const cluster = require('cluster')
const pathUtil = require('path')

// Export
module.exports = function (directory, iterator, next) {
	const cpus = require('os').cpus().length
	const workers = []
	const callbacks = {
		stat: {},
		readdir: {}
	}
	let _cursor = 0
	function nextworker () {
		if ( _cursor === cpus - 1 ) {
			_cursor = 0
		}
		else {
			++_cursor
		}
		return workers[_cursor]
	}

	// Spawn Workers
	cluster.setupMaster({
		exec: pathUtil.join(__dirname, 'worker.js')
	})
	for (let i = 0; i < cpus; i++) {
		let worker = cluster.fork()
		workers.push(worker)
		worker.on('error', function (err) {
			// console.log('MASTER', 'error from', process.pid, err)
		})
		worker.on('message', function (message) {
			// console.log('master', 'message from', process.pid, message)
			callbacks[message.action][message.path](message.error, message.data)
		})
	}
	const close = function () {
		workers.forEach((worker) => worker.disconnect())
	}

	//
	const stat = function (file) {
		return new Promise(function (resolve, reject) {
			callbacks.stat[file] = function (err, data) {
				if (err)  return reject(err)
				return resolve(data)
			}
			nextworker().send({action: 'stat', path: file})
		})
	}
	const readdir = function (directory) {
		return new Promise(function (resolve, reject) {
			callbacks.readdir[directory] = function (err, files) {
				if (err)  return reject(err)
				Promise.all(
					files.map((file) => {
						const path = pathUtil.join(directory, file)
						return stat(path).then(function (stat) {
							if ( iterator(path, file, stat) !== false && stat.directory ) {
								return readdir(path)
							}
						})
					})
				).then(resolve).catch(reject)
			}
			nextworker().send({action: 'readdir', path: directory})
		})
	}

	return new Promise(function (resolve, reject) {
		return stat(directory).then(function (stat) {
			if ( stat.directory ) {
				readdir(directory).then(resolve).catch(reject)
			}
			else {
				reject(new Error('path was not a directory, unable to readdir on it'))
			}
		})
	}).then(function () {
		// console.log('MASTER passed')
		close()
		next()
	}).catch(function (err) {
		// console.log('MASTER failed', err)
		close()
		next(err)
	})
}
