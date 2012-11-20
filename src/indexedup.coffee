stream = require 'stream'
errors = require './errors'

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

# Error helper
handleError = (err, cb) ->
    return cb err if cb
    throw err

# Database object, mimics LevelUP's API
class IUDatabase
    constructor: (path, @_options) ->
        unless typeof path is 'string'
            err = new errors.InitializationError 'Must provide a location for the database'
            return handleError err

        # @options =
        #   json: true || false
        #   createIfMissing ?
        #   errorIfExists ?
        @storename = 'indexedup'
        @_location = path
        @_status = 'new'

    open: (cb) ->
        request = indexedDB.open @_location
        request.onsuccess = (e) =>
            @db = request.result
            @_status = 'open'
            cb? null, @

        request.onerror = (e) =>
            err = new errors.OpenError e
            return handleError err, cb

        request.onupgradeneeded = (e) =>
            db = e.target.result
            @store = db.createObjectStore @storename, { keyPath: 'key' }

    close: (cb) ->
        if @isOpen()
            @db = null
            @_status = 'closed'
            cb()
        else
            err = new errors.CloseError 'Cannot close unopened database'
            return handleError err, cb

    isOpen: -> @_status is 'open'

    isClosed: -> @_status is 'closed'

    getTransaction: (write) ->
        mode = if write then 'readwrite' else 'readonly'
        return @db.transaction [@storename], mode

    getStore: (write, transaction) ->
        transaction ?= @getTransaction write
        return transaction.objectStore @storename

    put: (key, data, options, cb) ->
        if typeof options is 'function'
            [options, cb] = [cb, options]

        unless @isOpen()
            err = new errors.WriteError 'Database has not been opened'
            return handleError err, cb

        unless key?
            err = new errors.WriteError 'Invalid key'
            return handleError err, cb

        unless data?
            err = new errors.WriteError 'Invalid data'
            return handleError err, cb

        req = @getStore(true).put { key: key, value: data }

        req.onsuccess = (e) ->
            cb? null, req.result

        req.onerror = (e) ->
            err = new errors.WriteError e
            return handleError err, cb

    get: (key, options, cb) ->
        if typeof options is 'function'
            [options, cb] = [cb, options]

        unless @isOpen()
            err = new errors.ReadError 'Database has not been opened'
            return handleError err, cb

        unless key?
            err = new errors.ReadError 'Invalid key'
            return handleError err, cb

        req = @getStore().get key

        req.onsuccess = (e) ->
            if result = req.result?.value
                cb? null, result
            else
                req.onerror()

        req.onerror = (err) ->
            err = new errors.NotFoundError "Key not found in database [#{key}]"
            return handleError err, cb

    del: (key, options, cb) ->
        if typeof options is 'function'
            [options, cb] = [cb, options]
            
        unless @isOpen()
            err = new errors.WriteError 'Database has not been opened'
            return handleError err, cb

        unless key?
            err = new errors.WriteError 'Invalid key'
            return handleError err, cb

        req = @getStore(true).delete key

        req.onsuccess = (e) ->
            cb? null, req.result

        req.onerror = (e) ->
            err = new errors.WriteError e
            return cb err if cb
            throw err

    batch: (arr, cb) ->
        unless @isOpen()
            err = new errors.WriteError 'Database has not been opened'
            return handleError err, cb

        transaction = @getTransaction true
        store = @getStore null, transaction
        
        for op in arr when op.type? and op.key?
            switch op.type
                when 'put'
                    store.put { key: op.key, value: op.value }
                when 'del'
                    store.delete op.key

        transaction.oncomplete = (e) ->
            cb()

        transaction.onerror = (e) ->
            err = new errors.WriteError e
            handleError err, cb

    readStream: ->
        new ReadableStream @

IndexedUp = (path, options, cb) ->
    newdb = new IUDatabase path, options
    newdb.open cb

if module?.exports
    module.exports = IndexedUp
else
    window.indexedup = IndexedUp
