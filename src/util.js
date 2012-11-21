
util = {
    encode: function(data, encoding) {
        if (encoding === 'json'){
            return JSON.stringify(data)
        } else {
            return data
        }
    }
  , decode: function(data, encoding) {
        if (encoding === 'json'){
            return JSON.parse(data.toString())
        } else {
            return data
        }
    }
  , extend: function(dest, src) {
        for (var key in src){
            if (Object.prototype.hasOwnProperty.call(parent, key)){
                dest[key] = src[key]
            }
        }
        return dest
  }
  , inherits = function(child, parent) {
        util.extend(child, parent)
        function ctor() {
            this.constructor = child
        }
        ctor.prototype = parent.prototype
        child.prototype = new ctor()
        child.__super__ = parent.prototype
        return child
    }
  , handleError = function(err, cb) {
        if (cb) return cb(err)
        throw err
    }
}

module.exports = util