stream = require 'stream'

# Helper for finding prefixed global objects
prefixed = (key) ->
    return res if res = window[key]
    keyUpper = key[0].toUppercase() + key.substring(1)
    for prefix in ['moz', 'webkit', 'ms', 'o']
        res = window[prefix + keyUpper]
        break if res?
    return res

indexedDB      = prefixed 'indexedDB'
IDBTransaction = prefixed 'IDBTransaction'
IDBKeyRange    = prefixed 'IDBKeyRange'

# Implements a readable stream for our
# IndexedDB instance
class ReadableStream extends stream.Stream
    constructor: (@idb) ->
        @readable = true
        process.nextTick @init.bind @

    init: ->
        transaction = @idb.db.transaction [@idb.storename], 'readonly'
        store = transaction.objectStore @idb.storename
        keyRange = IDBKeyRange.lowerBound 0
        req = store.openCursor keyRange

        req.onsuccess = (e) =>
            return unless result = e.target.result
            @emit 'data', result.value
            result.continue()

        req.onerror = (err) =>
            @emit 'error', err

        transaction.oncomplete = =>
            @end()

    write: (chunk, encoding) ->
        @emit 'data', chunk

    end: ->
        @emit 'end'

# Database object, mimics LevelUP's API
class IUDatabase
    constructor: (@path, @options) ->
        # @options =
        #   json: true || false
        #   createIfMissing ?
        #   errorIfExists ?
        @storename = 'indexedup'

    open: (cb) ->
        request = indexedDB.open @path
        request.onsuccess = (e) =>
            @db = request.result
            cb null, @

        request.onerror = (e) =>
            cb new Error "Failed to open IndexedDB (@path)", e

        request.onupgradeneeded = (e) =>
            db = e.target.result
            @store = db.createObjectStore @storename, { keyPath: 'key' }

    getStore: (write) ->
        mode = if write then 'readwrite' else 'readonly'
        transaction = @db.transaction [@storename], mode
        return transaction.objectStore @storename

    put: (key, data, cb) ->
        req = @getStore(true).add { key: key, value: data }
        req.onsuccess = (e) ->
            cb null, req.result
        req.onerror = (e) ->
            cb e

    get: (key, cb) ->
        req = @getStore().get key
        req.onsuccess = (e) ->
            if result = req.result?.value
                cb null, result
            else
                cb new Error "Key not found in database [#{key}]", e
        req.onerror = (err) ->
            cb err

    del: (key, cb) ->
        req = @getStore(true).delete key
        req.onsuccess = (e) ->
            cb null, req.result
        req.onerror = (e) ->
            cb new Error "Key not found in database [#{key}]", e

    readStream: ->
        new ReadableStream @

IndexedUp = (path, options, cb) ->
    newdb = new IUDatabase path, options
    newdb.open cb

window.indexedup = IndexedUp
