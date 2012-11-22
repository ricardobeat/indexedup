
function encode (data, encoding) {
    if (encoding === 'json'){
        return JSON.stringify(data)
    } else {
        return data
    }
}

function decode (data, encoding) {
    if (encoding === 'json'){
        return JSON.parse(data.toString())
    } else {
        return data
    }
}

function extend (dest, src) {
    for (var key in src){
        if (Object.prototype.hasOwnProperty.call(src, key)){
            dest[key] = src[key]
        }
    }
    return dest
}

function inherits (child, parent) {
    extend(child, parent)
    function ctor() {
        this.constructor = child
    }
    ctor.prototype = parent.prototype
    child.prototype = new ctor()
    child.__super__ = parent.prototype
    return child
}

function handleError (err, cb) {
    if (cb) return cb(err)
    throw err
}

module.exports = {
    encode: encode
  , decode: decode
  , extend: extend
  , inherits: inherits
  , handleError: handleError
}
