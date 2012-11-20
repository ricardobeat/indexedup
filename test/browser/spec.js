(function() {
  var DB_PATH, chai, db, levelup, should, _ref;

  if (typeof process !== "undefined" && process !== null ? (_ref = process.versions) != null ? _ref.node : void 0 : void 0) {
    levelup = require('levelup');
    chai = require('chai');
  } else {
    levelup = window.indexedup;
    chai = window.chai;
  }

  should = chai.Should();

  db = null;

  DB_PATH = 'test/testdb' + Date.now();

  describe('IndexedUp', function() {
    it('should create a database', function(done) {
      var options;
      options = {
        createIfMissing: true,
        errorIfExists: false
      };
      return levelup(DB_PATH, options, function(err, newdb) {
        if (err) {
          throw err;
        }
        db = newdb;
        return done();
      });
    });
    it('should save and recover a value', function(done) {
      return db.put('one', 'hello', function(err) {
        should.not.exist(err);
        return db.get('one', function(err, val) {
          val.should.equal('hello');
          return done();
        });
      });
    });
    it('should remove a value', function(done) {
      return db.del('one', function(err) {
        should.not.exist(err);
        return db.get('one', function(err, val) {
          should.exist(err);
          err.message.should.include('Key not found');
          return done();
        });
      });
    });
    return it('should get all values', function(done) {
      return db.put('one', '1', function() {
        return db.put('two', '2', function() {
          var full_data, s;
          full_data = {};
          s = db.readStream();
          s.on('data', function(data) {
            return full_data[data.key] = data.value;
          });
          return s.on('end', function(data) {
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

}).call(this);
