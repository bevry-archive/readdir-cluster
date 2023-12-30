// external
import filedirname from 'filedirname'

// builtin
import { join } from 'path'
import * as os from 'os' // { availableParallelism } not available on node.js <18
import cluster, { Worker } from 'cluster'
import { Stats } from 'fs'

// prepare
const [file, dir] = filedirname()
const workerPath = join(dir, 'worker.js')

export enum Action {
	readdir = 'readdir',
	stat = 'stat',
}

export type Paths = Array<string>
export type Stat = Omit<
	Stats,
	| 'isFile'
	| 'isDirectory'
	| 'isBlockDevice'
	| 'isCharacterDevice'
	| 'isSymbolicLink'
	| 'isFIFO'
	| 'isSocket'
> & { directory: boolean }

export interface MessageRequest {
	id: number
	action: Action
	path: string
	error?: undefined
	data?: undefined
}
export interface MessageFailure {
	id: number
	action: Action
	path: string
	error: Error
	data: undefined
}
export interface MessageReaddir {
	id: number
	action: Action.readdir
	path: string
	error: undefined
	data: Paths
}
export interface MessageStat {
	id: number
	action: Action.stat
	path: string
	error: undefined
	data: Stat
}
export type Message =
	| MessageRequest
	| MessageFailure
	| MessageReaddir
	| MessageStat

export type Iterator = (
	path: string,
	filename: string,
	stat: Stat
) => boolean | void

export interface Options {
	/** The directory to read */
	directory: string

	/** A custom iterator, return false to ignore the path. */
	iterator?: Iterator

	/** How long in milliseconds until we try the path again? Defaults to 10 */
	retryDelay?: number
}

export default async function readdirCluster({
	directory,
	iterator,
	retryDelay,
}: Options): Promise<Paths> {
	// handle the messages
	const resolvers = new Map<number, Function>()
	let resolverCursor = 0
	function sendMessageAndWait(
		action: Action.readdir,
		path: string
	): Promise<MessageFailure | MessageReaddir>
	function sendMessageAndWait(
		action: Action.stat,
		path: string
	): Promise<MessageFailure | MessageStat>
	function sendMessageAndWait(
		action: Action,
		path: string
	): Promise<MessageFailure | MessageReaddir | MessageStat> {
		return new Promise(function (resolve, reject) {
			++resolverCursor
			resolvers.set(resolverCursor, resolve)
			const message: MessageRequest = { id: resolverCursor, action, path }
			function sendAndTimeout() {
				const worker = nextWorker()
				if (!worker) {
					reject(new Error('no workers available'))
					return
				}
				worker.send(message)
				setTimeout(function () {
					const resolver = resolvers.has(message.id)
					// console.log('yo', message.id, resolver)
					if (resolver) {
						// console.log('trying again', message.id, worker)
						sendAndTimeout()
					}
				}, retryDelay ?? 10)
			}
			sendAndTimeout()
		})
	}
	function receiveMessageAndResume(message: Message) {
		const resolver = resolvers.get(message.id)
		// console.log('resolve', message.id, resolver, resolvers.keys())
		if (!resolver) {
			// console.log('already completed', message.id)
		} else {
			resolvers.delete(message.id)
			resolver(message)
		}
	}
	// handle the workers
	const workersCount = os.availableParallelism
		? os.availableParallelism()
		: os.cpus().length || 4
	const workers: Array<Worker> = []
	function openWorker() {
		return new Promise(function (resolve, reject) {
			const worker = cluster.fork()
			workers.push(worker)
			worker.on('online', resolve)
			worker.on('message', receiveMessageAndResume)
			// worker.on('error', () => {}) // ignore, as it is likely just a complaint about a retry sending a message once we have disconnected
			// worker.on('disconnect', console.error.bind(console, 'worker disconnect'))
			// worker.on('exit', console.error.bind(console, 'worker exit'))
		})
	}
	async function openWorkers() {
		;(cluster.setupPrimary || cluster.setupMaster)({ exec: workerPath })
		for (let i = 0; i < workersCount; i++) await openWorker()
	}
	function closeWorkers() {
		// console.log('closing workers')
		for (const worker of workers) {
			worker.destroy()
		}
	}
	function nextWorker(): Worker | null {
		const worker = workers.shift()
		if (!worker) {
			// ignore, we are shutting down
		} else if (worker.isConnected()) {
			// re-add the worker to make it available
			workers.push(worker)
		} else {
			// the worker died, don't re-add it
		}
		return worker || null
	}
	// readdir
	async function readdir(directory: string): Promise<Paths> {
		// prepare
		const results: Paths = []
		const message: MessageReaddir | MessageFailure = await sendMessageAndWait(
			Action.readdir,
			directory
		)
		if (message.error) return Promise.reject(message.error)
		await Promise.all(
			message.data.map(async (file) => {
				const path = join(directory, file)
				const stat: MessageStat | MessageFailure = await sendMessageAndWait(
					Action.stat,
					path
				)
				if (stat.error) return Promise.reject(stat.error)
				const iterate = iterator && iterator(path, file, stat.data)
				if (iterate === false) return
				results.push(path)
				if (stat.data.directory) {
					const subpaths = await readdir(path)
					results.push(...subpaths)
				}
			})
		)
		return results
	}
	// process
	try {
		await openWorkers()
		const results = await readdir(directory)
		closeWorkers()
		return results
	} catch (error) {
		closeWorkers()
		return Promise.reject(error)
	}
}
