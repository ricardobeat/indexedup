flour      = require 'flour'
cp         = require 'child_process'
fs         = require 'fs'
browserify = require 'browserify'

task 'build', ->
    fs.writeFileSync 'lib/indexedup.js', browserify('src/indexedup.coffee').bundle()

task 'build:tests', ->

    flour.minifiers.js = null

    invoke 'build'
    compile 'lib/indexedup.js'            , 'test/browser/indexedup.js'
    compile 'test/spec.coffee'            , 'test/browser/spec.js'
    compile 'node_modules/chai/chai.js'   , 'test/browser/chai.js'
    compile 'node_modules/mocha/mocha.css', 'test/browser/mocha.css'
    compile 'node_modules/mocha/mocha.js' , 'test/browser/mocha.js'

task 'watch:tests', ->
    do (build = -> invoke 'build:tests')
    watch [
        'test/spec.coffee'
        'src/indexedup.coffee'
    ], build

task 'test:browser', ->
    invoke 'build:tests'
    cp.exec 'open test/browser/index.html'