var stream = require('stream')
  , errors = require('./errors')
  , util   = require('./utils')

// IndexedDB fallbacks
// -------------------

var indexedDB = window.indexedDB
    || window.mozIndexedDB
    || window.webkitIndexedDB
    || window.msIndexedDB
    || window.oIndexedDB

var IDBTransaction = window.IDBTransaction
    || window.mozIDBTransaction
    || window.webkitIDBTransaction
    || window.msIDBTransaction
    || window.oIndexedDB

var IDBKeyRange = window.IDBKeyRange
    || window.mozIDBKeyRange
    || window.webkitIDBKeyRange
    || window.msIDBKeyRange
    || window.oIDBKeyRange

// IUDatabase
// ----------------
// This is what you get from an indexedup() call.
// It should mirror node-levelup's API.
function IUDatabase(path, options) {

    if (options == null) {
        options = {}
    }

    if (typeof path !== 'string') {
        var err = new errors.InitializationError('Must provide a location for the database')
        return util.handleError(err)
    }

    this._options = util.extend({
        createIfMissing: false
      , errorIfExists: false
      , encoding: 'utf8'
      , sync: false
    }, options)

    this._storename = 'indexedup'
    this._location = path
    this._status = 'new'
}

IUDatabase.prototype.open = function(cb) {
  
    var self = this
      , request = indexedDB.open(this._location)
      , optionsChecked = false

    function checkOptions() {

        var store = null
        try {
            store = self.getStore(true)
        } catch (e) {}

        if (optionsChecked) {
            return
        }

        if (self._options.errorIfExists && (store != null)) {
            return new errors.OpenError("Database already exists (errorIfExists: true)")
        } else if (!self._options.createIfMissing && !store) {
            return new errors.OpenError("Database doesn't exist (createIfMissing: false)")
        }

        optionsChecked = true
        return false
    }

    request.onsuccess = function(e) {
        self.db = request.result
        self._status = 'open'
        var err
        if (err = checkOptions()) {
            return util.handleError(err, cb)
        }
        if (typeof cb === 'function') {
            cb(null, self)
        }
    }

    request.onupgradeneeded = function(e) {
        var err
        if (err = checkOptions()) {
            return util.handleError(err, cb)
        }
        var db = e.target.result
        self.store = db.createObjectStore(self._storename, { keyPath: 'key' })
    }

    request.onerror = function(e) {
        var err = new errors.OpenError(e)
        return util.handleError(err, cb)
    }
}

IUDatabase.prototype.close = function(cb) {
    if (this.isOpen()) {
        this.db = null
        this._status = 'closed'
        return cb()
    } else {
        var err = new errors.CloseError('Cannot close unopened database')
        return util.handleError(err, cb)
    }
}

IUDatabase.prototype.isOpen = function() {
  return this._status === 'open'
}

IUDatabase.prototype.isClosed = function() {
  return this._status === 'closed'
}

IUDatabase.prototype.getTransaction = function(write) {
  var mode = write ? 'readwrite' : 'readonly'
  return this.db.transaction([this._storename], mode)
}

IUDatabase.prototype.getStore = function(write, transaction) {
  if (transaction == null) {
    transaction = this.getTransaction(write)
  }
  return transaction.objectStore(this._storename)
}

IUDatabase.prototype.put = function(key, data, options, cb) {
    if (typeof options === 'function') {
        cb = options
        options = null
    }
    if (!this.isOpen()) {
        var err = new errors.WriteError('Database has not been opened')
        return util.handleError(err, cb)
    }
    if (key == null) {
        var err = new errors.WriteError('Invalid key')
        return util.handleError(err, cb)
    }
    if (data == null) {
        var err = new errors.WriteError('Invalid data')
        return util.handleError(err, cb)
    }

    var req = this.getStore(true).put({ key: key, value: data })
    
    req.onsuccess = function(e) {
        return typeof cb === "function" ? cb(null, req.result) : void 0
    }

    req.onerror = function(e) {
        err = new errors.WriteError(e)
        return util.handleError(err, cb)
    }
}

IUDatabase.prototype.get = function(key, options, cb) {
    if (typeof options === 'function') {
        cb = options
        options = cb
    }
    if (!this.isOpen()) {
        var err = new errors.ReadError('Database has not been opened')
        return util.handleError(err, cb)
    }
    if (key == null) {
        var err = new errors.ReadError('Invalid key')
        return util.handleError(err, cb)
    }

    var req = this.getStore().get(key)

    req.onsuccess = function(e) {
        var result = req.result
        if (typeof req.result !== 'undefined' && typeof cb === 'function') {
            cb(null, req.result.value)
        } else {
            req.onerror()
        }
    }

    req.onerror = function(err) {
        var err = new errors.NotFoundError("Key not found in database [" + key + "]")
        return util.handleError(err, cb)
    }
}

IUDatabase.prototype.del = function(key, options, cb) {
    if (typeof options === 'function') {
        cb = options
        options = cb
    }
    if (!this.isOpen()) {
        var err = new errors.WriteError('Database has not been opened')
        return util.handleError(err, cb)
    }
    if (key == null) {
        var err = new errors.WriteError('Invalid key')
        return util.handleError(err, cb)
    }

    var req = this.getStore(true)["delete"](key)

    req.onsuccess = function(e) {
        if (typeof cb === "function") {
            cb(null, req.result)
        }
    }
    req.onerror = function(e) {
        var err = new errors.WriteError(e)
        if (typeof cb === 'function'){
            return cb(err)
        }
        throw err
    }
}

IUDatabase.prototype.batch = function(arr, cb) {
    if (!this.isOpen()) {
        var err = new errors.WriteError('Database has not been opened')
        return util.handleError(err, cb)
    }

    var transaction = this.getTransaction(true)
      , store = this.getStore(null, transaction)

    for (var i = 0, ln = arr.length; i < ln; i++) {
        var op = arr[i]
        if (op.type == null || op.key == null) continue
        
        switch(op.type) {
            case 'put':
                store.put({ key: op.key, value: op.value })
                break
            case 'del':
                store['delete'](op.key)
                break
        }
    }

    transaction.oncomplete = function(e) {
        if (typeof cb === 'function') cb()
    }

    transaction.onerror = function(e) {
        var err = new errors.WriteError(e)
        return util.handleError(err, cb)
    }
}

// Readable/Writable streams
// -------------------------

function ReadableStream(idb, options) {
    this.idb = idb
    this.readable = true
    process.nextTick(this.init.bind(this))

    this._options = util.extend({
        start   : null
      , end     : null
      , reverse : false
      , keys    : true
      , values  : true
      , limit   : -1
    }, options)
}

util.inherits(ReadableStream, stream.Stream)

ReadableStream.prototype.init = function(options) {
    var self = this
      , transaction = this.idb.getTransaction()
      , store = this.idb.getStore(transaction)
      , keyRange = IDBKeyRange.lowerBound(0)
      , req = store.openCursor(keyRange)
      , options = this._options

    req.onsuccess = function(e) {
        var cursor = e.target.result
          , data = null

        if (!cursor) {
            self.end()
            return
        }

        if (options.keys && options.values) {
            data = cursor.value
        } else if (options.keys && !options.values) {
            data = cursor.value.key
        } else if (options.values) {
            data = cursor.value.value
        }

        self.emit('data', data)
        cursor['continue']()
    }

    req.onerror = function(err) {
        self.emit('error', err)
    }
}

ReadableStream.prototype.end = function() {
    this.emit('end')
}

function WritableStream(idb, options) {
    this.idb = idb
    this.writable = true
    this.buffer = []
    this._end = false
    this.scheduled = false
    this.flushWrites = this.flushWrites.bind(this)
}

util.inherits(WritableStream, stream.Stream)

WritableStream.prototype.write = function(data) {
    if (!this.writable) {
        return false
    }
    if (this.buffer.length === 0) {
        process.nextTick(this.flushWrites)
        this.scheduled = true
    }

    this.buffer.push(data)

    return true
}

WritableStream.prototype.flushWrites = function() {

    this.scheduled = false

    if (!this.writable) {
        return
    }

    var self = this

    if (this.buffer.length === 1) {
        var data = this.buffer.shift()
        this.idb.put(data.key, data.value, function(err) {
            if (err) self.emit('error', err)
        })
    } else if (this.buffer.length > 1) {
        var ops = this.buffer.map(function(o){
            o.type = 'put'
        })
        this.idb.batch(this.buffer, function(err) {
            if (err) self.emit('error', err)
        }) 
    }

    if (this._end) {
        this.writable = false
        this.emit('close')
    }
}

WritableStream.prototype.destroy = function() {
    this.writable = false
    this.end()
}

WritableStream.prototype.end = function(){
    this._end = true
    if (!this.scheduled) {
        process.nextTick(this.flushWrites)
    }
}

IUDatabase.prototype.readStream = function() {
    return new ReadableStream(this)
}

IUDatabase.prototype.keyStream = function() {
    return new ReadableStream(this, { keys: true, values: false })
}

IUDatabase.prototype.valueStream = function() {
    return new ReadableStream(this, { keys: false, values: true })
}

IUDatabase.prototype.writeStream = function() {
    return new WritableStream(this)
}

// Entry point.
// Creates, opens and returns a IUDatabase instance.
function IndexedUp(path, options, cb) {
    if (typeof options === 'function') {
        cb = options
        options = null
    }
    var newdb = new IUDatabase(path, options)
    return newdb.open(cb)
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = IndexedUp
}
if (typeof window !== 'undefined') {
    window['indexedup'] = IndexedUp
}
