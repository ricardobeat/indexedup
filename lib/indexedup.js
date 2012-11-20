(function() {
  var IDBKeyRange, IDBTransaction, IUDatabase, IndexedUp, ReadableStream, errors, handleError, indexedDB, prefixed, stream,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  stream = require('stream');

  errors = require('./errors');

  prefixed = function(key) {
    var keyUpper, prefix, res, _i, _len, _ref;
    if (res = window[key]) {
      return res;
    }
    keyUpper = key[0].toUppercase() + key.substring(1);
    _ref = ['moz', 'webkit', 'ms', 'o'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      prefix = _ref[_i];
      res = window[prefix + keyUpper];
      if (res != null) {
        break;
      }
    }
    return res;
  };

  indexedDB = prefixed('indexedDB');

  IDBTransaction = prefixed('IDBTransaction');

  IDBKeyRange = prefixed('IDBKeyRange');

  ReadableStream = (function(_super) {

    __extends(ReadableStream, _super);

    function ReadableStream(idb) {
      this.idb = idb;
      this.readable = true;
      process.nextTick(this.init.bind(this));
    }

    ReadableStream.prototype.init = function() {
      var keyRange, req, store, transaction,
        _this = this;
      transaction = this.idb.db.transaction([this.idb.storename], 'readonly');
      store = transaction.objectStore(this.idb.storename);
      keyRange = IDBKeyRange.lowerBound(0);
      req = store.openCursor(keyRange);
      req.onsuccess = function(e) {
        var result;
        if (!(result = e.target.result)) {
          return;
        }
        _this.emit('data', result.value);
        return result["continue"]();
      };
      req.onerror = function(err) {
        return _this.emit('error', err);
      };
      return transaction.oncomplete = function() {
        return _this.end();
      };
    };

    ReadableStream.prototype.write = function(chunk, encoding) {
      return this.emit('data', chunk);
    };

    ReadableStream.prototype.end = function() {
      return this.emit('end');
    };

    return ReadableStream;

  })(stream.Stream);

  handleError = function(err, cb) {
    if (cb) {
      return cb(err);
    }
    throw err;
  };

  IUDatabase = (function() {

    function IUDatabase(path, options) {
      var err;
      if (options == null) {
        options = {};
      }
      if (typeof path !== 'string') {
        err = new errors.InitializationError('Must provide a location for the database');
        return handleError(err);
      }
      this._options = {
        createIfMissing: options.createIfMissing || false,
        errorIfExists: options.errorIfExists || false,
        encoding: options.encoding || 'json',
        sync: false
      };
      this.storename = 'indexedup';
      this._location = path;
      this._status = 'new';
    }

    IUDatabase.prototype.open = function(cb) {
      var checkOptions, request,
        _this = this;
      request = indexedDB.open(this._location);
      checkOptions = function(store) {
        var err;
        try {
          store = this.getStore(true);
        } catch (_error) {}
        if (this._options.errorIfExists === true && (store != null)) {
          err = new errors.OpenError("Database already exists (errorIfExists: true)");
          handleError(err, cb);
          return true;
        }
        if (this._options.createIfMissing === false && !store) {
          err = new errors.OpenError("Database doesn't exist (createIfMissing: false)");
          handleError(err, cb);
          return true;
        }
        checkOptions = function() {};
        return false;
      };
      request.onsuccess = function(e) {
        _this.db = request.result;
        if (checkOptions.call(_this)) {
          return;
        }
        _this._status = 'open';
        return typeof cb === "function" ? cb(null, _this) : void 0;
      };
      request.onerror = function(e) {
        var err;
        err = new errors.OpenError(e);
        return handleError(err, cb);
      };
      return request.onupgradeneeded = function(e) {
        var db;
        if (checkOptions.call(_this)) {
          return;
        }
        db = e.target.result;
        return _this.store = db.createObjectStore(_this.storename, {
          keyPath: 'key'
        });
      };
    };

    IUDatabase.prototype.close = function(cb) {
      var err;
      if (this.isOpen()) {
        this.db = null;
        this._status = 'closed';
        return cb();
      } else {
        err = new errors.CloseError('Cannot close unopened database');
        return handleError(err, cb);
      }
    };

    IUDatabase.prototype.isOpen = function() {
      return this._status === 'open';
    };

    IUDatabase.prototype.isClosed = function() {
      return this._status === 'closed';
    };

    IUDatabase.prototype.getTransaction = function(write) {
      var mode;
      mode = write ? 'readwrite' : 'readonly';
      return this.db.transaction([this.storename], mode);
    };

    IUDatabase.prototype.getStore = function(write, transaction) {
      if (transaction == null) {
        transaction = this.getTransaction(write);
      }
      return transaction.objectStore(this.storename);
    };

    IUDatabase.prototype.put = function(key, data, options, cb) {
      var err, req, _ref;
      if (typeof options === 'function') {
        _ref = [cb, options], options = _ref[0], cb = _ref[1];
      }
      if (!this.isOpen()) {
        err = new errors.WriteError('Database has not been opened');
        return handleError(err, cb);
      }
      if (key == null) {
        err = new errors.WriteError('Invalid key');
        return handleError(err, cb);
      }
      if (data == null) {
        err = new errors.WriteError('Invalid data');
        return handleError(err, cb);
      }
      req = this.getStore(true).put({
        key: key,
        value: data
      });
      req.onsuccess = function(e) {
        return typeof cb === "function" ? cb(null, req.result) : void 0;
      };
      req.onerror = function(e) {
        err = new errors.WriteError(e);
        return handleError(err, cb);
      };
    };

    IUDatabase.prototype.get = function(key, options, cb) {
      var err, req, _ref;
      if (typeof options === 'function') {
        _ref = [cb, options], options = _ref[0], cb = _ref[1];
      }
      if (!this.isOpen()) {
        err = new errors.ReadError('Database has not been opened');
        return handleError(err, cb);
      }
      if (key == null) {
        err = new errors.ReadError('Invalid key');
        return handleError(err, cb);
      }
      req = this.getStore().get(key);
      req.onsuccess = function(e) {
        var result, _ref1;
        if (result = (_ref1 = req.result) != null ? _ref1.value : void 0) {
          return typeof cb === "function" ? cb(null, result) : void 0;
        } else {
          return req.onerror();
        }
      };
      req.onerror = function(err) {
        err = new errors.NotFoundError("Key not found in database [" + key + "]");
        return handleError(err, cb);
      };
    };

    IUDatabase.prototype.del = function(key, options, cb) {
      var err, req, _ref;
      if (typeof options === 'function') {
        _ref = [cb, options], options = _ref[0], cb = _ref[1];
      }
      if (!this.isOpen()) {
        err = new errors.WriteError('Database has not been opened');
        return handleError(err, cb);
      }
      if (key == null) {
        err = new errors.WriteError('Invalid key');
        return handleError(err, cb);
      }
      req = this.getStore(true)["delete"](key);
      req.onsuccess = function(e) {
        return typeof cb === "function" ? cb(null, req.result) : void 0;
      };
      req.onerror = function(e) {
        err = new errors.WriteError(e);
        if (cb) {
          return cb(err);
        }
        throw err;
      };
    };

    IUDatabase.prototype.batch = function(arr, cb) {
      var err, op, store, transaction, _i, _len;
      if (!this.isOpen()) {
        err = new errors.WriteError('Database has not been opened');
        return handleError(err, cb);
      }
      transaction = this.getTransaction(true);
      store = this.getStore(null, transaction);
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        op = arr[_i];
        if ((op.type != null) && (op.key != null)) {
          switch (op.type) {
            case 'put':
              store.put({
                key: op.key,
                value: op.value
              });
              break;
            case 'del':
              store["delete"](op.key);
          }
        }
      }
      transaction.oncomplete = function(e) {
        return cb();
      };
      transaction.onerror = function(e) {
        err = new errors.WriteError(e);
        return handleError(err, cb);
      };
    };

    IUDatabase.prototype.readStream = function() {
      return new ReadableStream(this);
    };

    return IUDatabase;

  })();

  IndexedUp = function(path, options, cb) {
    var newdb, _ref;
    if (typeof options === 'function') {
      _ref = [cb, options], options = _ref[0], cb = _ref[1];
    }
    newdb = new IUDatabase(path, options);
    return newdb.open(cb);
  };

  if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = IndexedUp;
  } else {
    window.indexedup = IndexedUp;
  }

}).call(this);
