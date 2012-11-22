if process?.versions?.node
    levelup = require 'levelup'
    chai    = require 'chai'
else
    levelup = window.indexedup
    chai    = window.chai

should = chai.Should()

db = null
dbid = 0

defaults = {
    createIfMissing : true
    errorIfExists   : false
}

nextLocation = (options, cb) ->

    if typeof options is 'function'
        [cb, options] = [options, defaults]

    levelup 'test/testdb' + Date.now() + dbid++, options, (err, newdb) ->
        throw err if err
        cb err, newdb

describe 'IndexedUp', ->

    it 'should create a database', (done) ->
        nextLocation done

    it 'should save and recover a value', (done) ->
        nextLocation (err, db) ->
            db.put 'one', 'hello', (err) ->
                should.not.exist err
                db.get 'one', (err, val) ->
                    val.should.equal 'hello'
                    done()

    it 'should remove a value', (done) ->
        nextLocation (err, db) ->
            db.put 'one', 'hello', (err) ->
                should.not.exist err
                db.del 'one', (err) ->
                    should.not.exist err
                    db.get 'one', (err, val) ->
                        should.exist err
                        err.message.should.include 'Key not found'
                        done()

    it 'should get all values', (done) ->
        nextLocation (err, db) ->
            db.put 'one', '1', ->
                db.put 'two', '2', ->
                    full_data = {}
                    s = db.readStream()
                    s.on 'data', (data) ->
                        full_data[data.key] = data.value
                    s.on 'end', (data) ->
                        full_data.should.eql { one: '1', two: '2' }
                        done()

    it 'should have a writable stream', (done) ->
        nextLocation (err, db) ->
            full_data = {}
            w = db.writeStream()
            w.on 'close', ->
                s = db.readStream()
                s.on 'data', (data) ->
                    full_data[data.key] = data.value
                s.on 'end', ->
                    full_data.should.eql { bacon: 'sizzles', coal: 'burns' }
                    done()
            w.write({ key: 'bacon', value: 'sizzles' })
            w.write({ key: 'coal', value: 'burns' })
            w.end()
