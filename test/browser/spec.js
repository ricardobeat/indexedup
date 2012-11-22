(function() {
  var chai, db, dbid, defaults, levelup, nextLocation, should, _ref;

  if (typeof process !== "undefined" && process !== null ? (_ref = process.versions) != null ? _ref.node : void 0 : void 0) {
    levelup = require('levelup');
    chai = require('chai');
  } else {
    levelup = window.indexedup;
    chai = window.chai;
  }

  should = chai.Should();

  db = null;

  dbid = 0;

  defaults = {
    createIfMissing: true,
    errorIfExists: false
  };

  nextLocation = function(options, cb) {
    var _ref1;
    if (typeof options === 'function') {
      _ref1 = [options, defaults], cb = _ref1[0], options = _ref1[1];
    }
    return levelup('test/testdb' + Date.now() + dbid++, options, function(err, newdb) {
      if (err) {
        throw err;
      }
      return cb(err, newdb);
    });
  };

  describe('IndexedUp', function() {
    it('should create a database', function(done) {
      return nextLocation(done);
    });
    it('should save and recover a value', function(done) {
      return nextLocation(function(err, db) {
        return db.put('one', 'hello', function(err) {
          should.not.exist(err);
          return db.get('one', function(err, val) {
            val.should.equal('hello');
            return done();
          });
        });
      });
    });
    it('should remove a value', function(done) {
      return nextLocation(function(err, db) {
        return db.put('one', 'hello', function(err) {
          should.not.exist(err);
          return db.del('one', function(err) {
            should.not.exist(err);
            return db.get('one', function(err, val) {
              should.exist(err);
              err.message.should.include('Key not found');
              return done();
            });
          });
        });
      });
    });
    it('should get all values', function(done) {
      return nextLocation(function(err, db) {
        return db.put('one', '1', function() {
          return db.put('two', '2', function() {
            var full_data, s;
            full_data = {};
            s = db.readStream();
            s.on('data', function(data) {
              return full_data[data.key] = data.value;
            });
            return s.on('end', function() {
              full_data.should.eql({
                one: '1',
                two: '2'
              });
              return done();
            });
          });
        });
      });
    });
    return it('should have a writable stream', function(done) {
      return nextLocation(function(err, db) {
        var full_data, w;
        full_data = {};
        w = db.writeStream();
        w.on('close', function() {
          var s;
          s = db.readStream();
          s.on('data', function(data) {
            return full_data[data.key] = data.value;
          });
          return s.on('end', function() {
            full_data.should.eql({
              bacon: 'sizzles',
              coal: 'burns'
            });
            return done();
          });
        });
        w.write({
          key: 'bacon',
          value: 'sizzles'
        });
        w.write({
          key: 'coal',
          value: 'burns'
        });
        return w.end();
      });
    });
  });

}).call(this);
