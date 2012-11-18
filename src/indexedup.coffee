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
    constructor: (@db) ->
        @readable = true
        process.nextTick @init.bind @

    init: ->
        for key, value of @db.values
            @emit 'data', { key, value }
        @end()

    write: (chunk, encoding) ->
        @emit 'data', chunk

    end: ->
        @emit 'end'

# Database object, mimics LevelUP's API
class IUDatabase
    constructor: (@path, options) ->
        @values = {}

    put: (key, val, cb) ->
        @values[key] = val
        cb()

    get: (key, cb) ->
        if val = @values[key]
            cb null, val
        else
            cb new Error 'Key not found', null

    del: (key, cb) ->
        delete @values[key]
        cb null, null

    readStream: ->
        new ReadableStream @

IndexedUp = (path, options, cb) ->
    cb null, new IUDatabase path, options

window.indexedup = IndexedUp