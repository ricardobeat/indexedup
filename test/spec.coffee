if process?.versions?.node
    levelup = require 'levelup'
    chai    = require 'chai'
else
    levelup = window.indexedup
    chai    = window.chai

should = chai.Should()

db = null

describe 'IndexedUp', ->

    it 'should create a database', (done) ->
        options = {
            createIfMissing : true
            errorIfExists   : false
        }
        levelup './testdb', options, (err, newdb) ->
            throw err if err
            db = newdb
            done()

    it 'should save and recover a value', (done) ->
        db.put 'one', 'hello', (err) ->
            should.not.exist err
            db.get 'one', (err, val) ->
                val.should.equal 'hello'
                done()

    it 'should remove a value', (done) ->
        db.del 'one', (err) ->
            should.not.exist err
            db.get 'one', (err, val) ->
                should.exist err
                err.message.should.include 'Key not found'
                done()

    it 'should get all values', (done) ->
        db.put 'one', '1', ->
            db.put 'two', '2', ->
                full_data = {}
                s = db.readStream()
                s.on 'data', (data) ->
                    full_data[data.key] = data.value
                s.on 'end', (data) ->
                    full_data.should.eql { one: '1', two: '2' }
                    done()
