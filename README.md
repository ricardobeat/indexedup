IndexedUp
=========

IndexedUp is a port of [node-levelup](https://github.com/rvagg/node-levelup) (LevelDB driver) for the browser, backed by IndexedDB. The API should be 100% compatible with node-levelup's, allowing you to share database code between the server and client.

#### Usage

    var indexedup = require('indexedup')

    indexedup('./mydb', function(err, db){
        db.put('key', 'some value', function(err){
            if (err) throw err
            db.get('key', function(err, value){
                console.log(value)
            })
        })
    })

#### Implemented API

* <a href="https://github.com/rvagg/node-levelup#ctor"><code><b>indexedup()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#open"><code>db.<b>open()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#close"><code>db.<b>close()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#put"><code>db.<b>put()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#get"><code>db.<b>get()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#del"><code>db.<b>del()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#batch"><code>db.<b>batch()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#isOpen"><code>db.<b>isOpen()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#isClosed"><code>db.<b>isClosed()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#readStream"><code>db.<b>readStream()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#keyStream"><code>db.<b>keyStream()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#valueStream"><code>db.<b>valueStream()</b></code></a>
* <a href="https://github.com/rvagg/node-levelup#writeStream"><code>db.<b>writeStream()</b></code></a>

#### Tests

Passes levelup's test/simple-test.js (http://ricardobeat.github.com/indexedup/test/levelup/) with a few changes.

The basic test suite (`test/spec.coffee`) is 100% interchangeable with either node-levelup (run `mocha`) or indexedup [in the browser](http://ricardobeat.github.com/indexedup/test/browser/).

#### Missing features / TODO

- deal with `options.encoding`
- buffering / sync constructor
- events
