var stream = require('stream')
  , errors = require('./errors')
  , util   = require('./util')

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
        err = new errors.InitializationError('Must provide a location for the database')
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
        err = new errors.CloseError('Cannot close unopened database')
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

    req = this.getStore(true).put({ key: key, value: data })
    
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

    req = this.getStore().get(key)

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

    req = this.getStore(true)["delete"](key)

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
        op = arr[i]
        if (op.type == null || op.key == null) continue
        
        switch(op.type) {
            case 'put':
                store.put({ key: op.key, value: op.value })
                break
            case 'get':
                store.delete(op.key)
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

function ReadableStream(idb) {
    this.idb = idb
    this.readable = true
    process.nextTick(this.init.bind(this))
}

util.inherits(ReadableStream, stream.Stream)

ReadableStream.prototype.init = function(options) {

    var self = this
      , transaction = this.idb.getTransaction()
      , store = this.idb.getStore(transaction)
      , keyRange = IDBKeyRange.lowerBound(0)

    this._options = options = util.extend({
        start   : null
      , end     : null
      , reverse : false
      , keys    : true
      , values  : true
      , limit   : -1
    }, options)

    var req = store.openCursor(keyRange)

    req.onsuccess = function(e) {
        var result = e.target.result
        if (!result) return
        self.emit('data', result.value)
        return result['continue']()
    }

    req.onerror = function(err) {
        return self.emit('error', err)
    }

    return transaction.oncomplete = function() {
        return self.end()
    }
}

ReadableStream.prototype.write = function(chunk, encoding) {
    this.emit('data', chunk)
}

ReadableStream.prototype.end = function() {
    this.emit('end')
}

IUDatabase.prototype.readStream = function() {
  return new ReadableStream(this)
}

// Entry point.
// Creates, opens and returns a IUDatabase instance.
function IndexedUp(path, options, cb) {
    if (typeof options === 'function') {
        cb = options
        options = null
    }
    newdb = new IUDatabase(path, options)
    return newdb.open(cb)
}

if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = IndexedUp
} else {
    window.indexedup = IndexedUp
}
