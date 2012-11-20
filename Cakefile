flour      = require 'flour'
cp         = require 'child_process'
fs         = require 'fs'
browserify = require 'browserify'

task 'build:coffee', ->
    compile 'src/indexedup.coffee', 'lib/indexedup.js'

task 'build:dist', ->
    minify 'lib/indexedup.js', 'dist/indexedup.min.js'

task 'build:tests', ->
    flour.minifiers.js = null

    invoke 'build:coffee'
    compile 'test/spec.coffee'            , 'test/browser/spec.js'
    compile 'node_modules/chai/chai.js'   , 'test/browser/chai.js'
    compile 'node_modules/mocha/mocha.css', 'test/browser/mocha.css'
    compile 'node_modules/mocha/mocha.js' , 'test/browser/mocha.js'

    fs.writeFileSync 'test/levelup/build.js', browserify('test/levelup/simple-test.js').bundle()

task 'build', ->
    invoke 'build:coffee'
    invoke 'build:dist'

task 'watch:tests', ->
    do (build = -> invoke 'build:tests')
    watch [
        'test/spec.coffee'
        'test/levelup/simple-test.js'
        'test/levelup/common.js'
        'src/indexedup.coffee'
    ], build


task 'clean', ->
    cp.exec 'rm -rf test/testdb*'

task 'test:browser', ->
    invoke 'build:tests'
    cp.exec 'open test/browser/index.html'
    cp.exec 'open test/browser/levelup/index.html'