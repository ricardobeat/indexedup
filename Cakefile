flour      = require 'flour'
cp         = require 'child_process'
fs         = require 'fs'
browserify = require 'browserify'

task 'build:main', ->
    fs.writeFileSync 'lib/indexedup.js', browserify('src/indexedup.js').bundle()

task 'build:dist', ->
    minify 'lib/indexedup.js', 'dist/indexedup.min.js'

task 'build:tests', ->
    invoke 'lint'
    flour.minifiers.js = null

    compile 'test/spec.coffee'            , 'test/browser/spec.js'
    compile 'node_modules/chai/chai.js'   , 'test/browser/chai.js'
    compile 'node_modules/mocha/mocha.css', 'test/browser/mocha.css'
    compile 'node_modules/mocha/mocha.js' , 'test/browser/mocha.js'

    compile 'node_modules/buster/resources/buster-test.js' , 'test/levelup/buster-test.js'
    compile 'node_modules/buster/resources/buster-test.css', 'test/levelup/buster-test.css'
    
    fs.writeFileSync 'test/levelup/build.js', browserify('test/levelup/simple-test.js').bundle()

task 'build', ->
    invoke 'lint'
    invoke 'build:main'
    invoke 'build:dist'

task 'watch', ->
    watch 'src/*.js', -> invoke 'build:main'

task 'watch:tests', ->
    invoke 'watch'
    do (build = -> invoke 'build:tests')
    watch [
        'src/indexedup.js'
        'test/spec.coffee'
        'test/levelup/simple-test.js'
        'test/levelup/common.js'
    ], build

task 'lint', ->

    flour.linters.js.options =
        forin    : true
        immed    : true
        latedef  : true
        newcap   : true
        nonew    : true
        undef    : true
        unused   : true
        asi      : true
        boss     : true
        eqnull   : true
        laxbreak : true
        laxcomma : true
        shadow   : true
        sub      : true
        strict   : false
        unused   : false
        browser  : true
        node     : true

    lint 'src/indexedup.js', (passed) ->
        if not passed
            process.exit()
            throw 'Stop!' 

task 'clean', ->
    cp.exec 'rm -rf test/testdb*'

task 'test:browser', ->
    invoke 'build:tests'
    cp.exec 'open test/browser/index.html'
    cp.exec 'open test/browser/levelup/index.html'
