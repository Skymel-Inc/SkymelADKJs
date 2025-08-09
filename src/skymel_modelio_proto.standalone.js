(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.skymel = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
module.exports = asPromise;

/**
 * Callback as used by {@link util.asPromise}.
 * @typedef asPromiseCallback
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {...*} params Additional arguments
 * @returns {undefined}
 */

/**
 * Returns a promise from a node-style callback function.
 * @memberof util
 * @param {asPromiseCallback} fn Function to call
 * @param {*} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
function asPromise(fn, ctx/*, varargs */) {
    var params  = new Array(arguments.length - 1),
        offset  = 0,
        index   = 2,
        pending = true;
    while (index < arguments.length)
        params[offset++] = arguments[index++];
    return new Promise(function executor(resolve, reject) {
        params[offset] = function callback(err/*, varargs */) {
            if (pending) {
                pending = false;
                if (err)
                    reject(err);
                else {
                    var params = new Array(arguments.length - 1),
                        offset = 0;
                    while (offset < params.length)
                        params[offset++] = arguments[offset];
                    resolve.apply(null, params);
                }
            }
        };
        try {
            fn.apply(ctx || null, params);
        } catch (err) {
            if (pending) {
                pending = false;
                reject(err);
            }
        }
    });
}

},{}],2:[function(require,module,exports){
"use strict";

/**
 * A minimal base64 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var base64 = exports;

/**
 * Calculates the byte length of a base64 encoded string.
 * @param {string} string Base64 encoded string
 * @returns {number} Byte length
 */
base64.length = function length(string) {
    var p = string.length;
    if (!p)
        return 0;
    var n = 0;
    while (--p % 4 > 1 && string.charAt(p) === "=")
        ++n;
    return Math.ceil(string.length * 3) / 4 - n;
};

// Base64 encoding table
var b64 = new Array(64);

// Base64 decoding table
var s64 = new Array(123);

// 65..90, 97..122, 48..57, 43, 47
for (var i = 0; i < 64;)
    s64[b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i - 59 | 43] = i++;

/**
 * Encodes a buffer to a base64 encoded string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} Base64 encoded string
 */
base64.encode = function encode(buffer, start, end) {
    var parts = null,
        chunk = [];
    var i = 0, // output index
        j = 0, // goto index
        t;     // temporary
    while (start < end) {
        var b = buffer[start++];
        switch (j) {
            case 0:
                chunk[i++] = b64[b >> 2];
                t = (b & 3) << 4;
                j = 1;
                break;
            case 1:
                chunk[i++] = b64[t | b >> 4];
                t = (b & 15) << 2;
                j = 2;
                break;
            case 2:
                chunk[i++] = b64[t | b >> 6];
                chunk[i++] = b64[b & 63];
                j = 0;
                break;
        }
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (j) {
        chunk[i++] = b64[t];
        chunk[i++] = 61;
        if (j === 1)
            chunk[i++] = 61;
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

var invalidEncoding = "invalid encoding";

/**
 * Decodes a base64 encoded string to a buffer.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Number of bytes written
 * @throws {Error} If encoding is invalid
 */
base64.decode = function decode(string, buffer, offset) {
    var start = offset;
    var j = 0, // goto index
        t;     // temporary
    for (var i = 0; i < string.length;) {
        var c = string.charCodeAt(i++);
        if (c === 61 && j > 1)
            break;
        if ((c = s64[c]) === undefined)
            throw Error(invalidEncoding);
        switch (j) {
            case 0:
                t = c;
                j = 1;
                break;
            case 1:
                buffer[offset++] = t << 2 | (c & 48) >> 4;
                t = c;
                j = 2;
                break;
            case 2:
                buffer[offset++] = (t & 15) << 4 | (c & 60) >> 2;
                t = c;
                j = 3;
                break;
            case 3:
                buffer[offset++] = (t & 3) << 6 | c;
                j = 0;
                break;
        }
    }
    if (j === 1)
        throw Error(invalidEncoding);
    return offset - start;
};

/**
 * Tests if the specified string appears to be base64 encoded.
 * @param {string} string String to test
 * @returns {boolean} `true` if probably base64 encoded, otherwise false
 */
base64.test = function test(string) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string);
};

},{}],3:[function(require,module,exports){
"use strict";
module.exports = EventEmitter;

/**
 * Constructs a new event emitter instance.
 * @classdesc A minimal event emitter.
 * @memberof util
 * @constructor
 */
function EventEmitter() {

    /**
     * Registered listeners.
     * @type {Object.<string,*>}
     * @private
     */
    this._listeners = {};
}

/**
 * Registers an event listener.
 * @param {string} evt Event name
 * @param {function} fn Listener
 * @param {*} [ctx] Listener context
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.on = function on(evt, fn, ctx) {
    (this._listeners[evt] || (this._listeners[evt] = [])).push({
        fn  : fn,
        ctx : ctx || this
    });
    return this;
};

/**
 * Removes an event listener or any matching listeners if arguments are omitted.
 * @param {string} [evt] Event name. Removes all listeners if omitted.
 * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.off = function off(evt, fn) {
    if (evt === undefined)
        this._listeners = {};
    else {
        if (fn === undefined)
            this._listeners[evt] = [];
        else {
            var listeners = this._listeners[evt];
            for (var i = 0; i < listeners.length;)
                if (listeners[i].fn === fn)
                    listeners.splice(i, 1);
                else
                    ++i;
        }
    }
    return this;
};

/**
 * Emits an event by calling its listeners with the specified arguments.
 * @param {string} evt Event name
 * @param {...*} args Arguments
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.emit = function emit(evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
        var args = [],
            i = 1;
        for (; i < arguments.length;)
            args.push(arguments[i++]);
        for (i = 0; i < listeners.length;)
            listeners[i].fn.apply(listeners[i++].ctx, args);
    }
    return this;
};

},{}],4:[function(require,module,exports){
"use strict";

module.exports = factory(factory);

/**
 * Reads / writes floats / doubles from / to buffers.
 * @name util.float
 * @namespace
 */

/**
 * Writes a 32 bit float to a buffer using little endian byte order.
 * @name util.float.writeFloatLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 32 bit float to a buffer using big endian byte order.
 * @name util.float.writeFloatBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 32 bit float from a buffer using little endian byte order.
 * @name util.float.readFloatLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 32 bit float from a buffer using big endian byte order.
 * @name util.float.readFloatBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Writes a 64 bit double to a buffer using little endian byte order.
 * @name util.float.writeDoubleLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 64 bit double to a buffer using big endian byte order.
 * @name util.float.writeDoubleBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 64 bit double from a buffer using little endian byte order.
 * @name util.float.readDoubleLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 64 bit double from a buffer using big endian byte order.
 * @name util.float.readDoubleBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

// Factory function for the purpose of node-based testing in modified global environments
function factory(exports) {

    // float: typed array
    if (typeof Float32Array !== "undefined") (function() {

        var f32 = new Float32Array([ -0 ]),
            f8b = new Uint8Array(f32.buffer),
            le  = f8b[3] === 128;

        function writeFloat_f32_cpy(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
        }

        function writeFloat_f32_rev(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[3];
            buf[pos + 1] = f8b[2];
            buf[pos + 2] = f8b[1];
            buf[pos + 3] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        /* istanbul ignore next */
        exports.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;

        function readFloat_f32_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            return f32[0];
        }

        function readFloat_f32_rev(buf, pos) {
            f8b[3] = buf[pos    ];
            f8b[2] = buf[pos + 1];
            f8b[1] = buf[pos + 2];
            f8b[0] = buf[pos + 3];
            return f32[0];
        }

        /* istanbul ignore next */
        exports.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        /* istanbul ignore next */
        exports.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;

    // float: ieee754
    })(); else (function() {

        function writeFloat_ieee754(writeUint, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0)
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos);
            else if (isNaN(val))
                writeUint(2143289344, buf, pos);
            else if (val > 3.4028234663852886e+38) // +-Infinity
                writeUint((sign << 31 | 2139095040) >>> 0, buf, pos);
            else if (val < 1.1754943508222875e-38) // denormal
                writeUint((sign << 31 | Math.round(val / 1.401298464324817e-45)) >>> 0, buf, pos);
            else {
                var exponent = Math.floor(Math.log(val) / Math.LN2),
                    mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
                writeUint((sign << 31 | exponent + 127 << 23 | mantissa) >>> 0, buf, pos);
            }
        }

        exports.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        exports.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);

        function readFloat_ieee754(readUint, buf, pos) {
            var uint = readUint(buf, pos),
                sign = (uint >> 31) * 2 + 1,
                exponent = uint >>> 23 & 255,
                mantissa = uint & 8388607;
            return exponent === 255
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 1.401298464324817e-45 * mantissa
                : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }

        exports.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        exports.readFloatBE = readFloat_ieee754.bind(null, readUintBE);

    })();

    // double: typed array
    if (typeof Float64Array !== "undefined") (function() {

        var f64 = new Float64Array([-0]),
            f8b = new Uint8Array(f64.buffer),
            le  = f8b[7] === 128;

        function writeDouble_f64_cpy(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
            buf[pos + 4] = f8b[4];
            buf[pos + 5] = f8b[5];
            buf[pos + 6] = f8b[6];
            buf[pos + 7] = f8b[7];
        }

        function writeDouble_f64_rev(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[7];
            buf[pos + 1] = f8b[6];
            buf[pos + 2] = f8b[5];
            buf[pos + 3] = f8b[4];
            buf[pos + 4] = f8b[3];
            buf[pos + 5] = f8b[2];
            buf[pos + 6] = f8b[1];
            buf[pos + 7] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        /* istanbul ignore next */
        exports.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;

        function readDouble_f64_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            f8b[4] = buf[pos + 4];
            f8b[5] = buf[pos + 5];
            f8b[6] = buf[pos + 6];
            f8b[7] = buf[pos + 7];
            return f64[0];
        }

        function readDouble_f64_rev(buf, pos) {
            f8b[7] = buf[pos    ];
            f8b[6] = buf[pos + 1];
            f8b[5] = buf[pos + 2];
            f8b[4] = buf[pos + 3];
            f8b[3] = buf[pos + 4];
            f8b[2] = buf[pos + 5];
            f8b[1] = buf[pos + 6];
            f8b[0] = buf[pos + 7];
            return f64[0];
        }

        /* istanbul ignore next */
        exports.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        /* istanbul ignore next */
        exports.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;

    // double: ieee754
    })(); else (function() {

        function writeDouble_ieee754(writeUint, off0, off1, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0) {
                writeUint(0, buf, pos + off0);
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos + off1);
            } else if (isNaN(val)) {
                writeUint(0, buf, pos + off0);
                writeUint(2146959360, buf, pos + off1);
            } else if (val > 1.7976931348623157e+308) { // +-Infinity
                writeUint(0, buf, pos + off0);
                writeUint((sign << 31 | 2146435072) >>> 0, buf, pos + off1);
            } else {
                var mantissa;
                if (val < 2.2250738585072014e-308) { // denormal
                    mantissa = val / 5e-324;
                    writeUint(mantissa >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | mantissa / 4294967296) >>> 0, buf, pos + off1);
                } else {
                    var exponent = Math.floor(Math.log(val) / Math.LN2);
                    if (exponent === 1024)
                        exponent = 1023;
                    mantissa = val * Math.pow(2, -exponent);
                    writeUint(mantissa * 4503599627370496 >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | exponent + 1023 << 20 | mantissa * 1048576 & 1048575) >>> 0, buf, pos + off1);
                }
            }
        }

        exports.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        exports.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);

        function readDouble_ieee754(readUint, off0, off1, buf, pos) {
            var lo = readUint(buf, pos + off0),
                hi = readUint(buf, pos + off1);
            var sign = (hi >> 31) * 2 + 1,
                exponent = hi >>> 20 & 2047,
                mantissa = 4294967296 * (hi & 1048575) + lo;
            return exponent === 2047
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 5e-324 * mantissa
                : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }

        exports.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        exports.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);

    })();

    return exports;
}

// uint helpers

function writeUintLE(val, buf, pos) {
    buf[pos    ] =  val        & 255;
    buf[pos + 1] =  val >>> 8  & 255;
    buf[pos + 2] =  val >>> 16 & 255;
    buf[pos + 3] =  val >>> 24;
}

function writeUintBE(val, buf, pos) {
    buf[pos    ] =  val >>> 24;
    buf[pos + 1] =  val >>> 16 & 255;
    buf[pos + 2] =  val >>> 8  & 255;
    buf[pos + 3] =  val        & 255;
}

function readUintLE(buf, pos) {
    return (buf[pos    ]
          | buf[pos + 1] << 8
          | buf[pos + 2] << 16
          | buf[pos + 3] << 24) >>> 0;
}

function readUintBE(buf, pos) {
    return (buf[pos    ] << 24
          | buf[pos + 1] << 16
          | buf[pos + 2] << 8
          | buf[pos + 3]) >>> 0;
}

},{}],5:[function(require,module,exports){
"use strict";
module.exports = inquire;

/**
 * Requires a module only if available.
 * @memberof util
 * @param {string} moduleName Module to require
 * @returns {?Object} Required module if available and not empty, otherwise `null`
 */
function inquire(moduleName) {
    try {
        var mod = eval("quire".replace(/^/,"re"))(moduleName); // eslint-disable-line no-eval
        if (mod && (mod.length || Object.keys(mod).length))
            return mod;
    } catch (e) {} // eslint-disable-line no-empty
    return null;
}

},{}],6:[function(require,module,exports){
"use strict";
module.exports = pool;

/**
 * An allocator as used by {@link util.pool}.
 * @typedef PoolAllocator
 * @type {function}
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */

/**
 * A slicer as used by {@link util.pool}.
 * @typedef PoolSlicer
 * @type {function}
 * @param {number} start Start offset
 * @param {number} end End offset
 * @returns {Uint8Array} Buffer slice
 * @this {Uint8Array}
 */

/**
 * A general purpose buffer pool.
 * @memberof util
 * @function
 * @param {PoolAllocator} alloc Allocator
 * @param {PoolSlicer} slice Slicer
 * @param {number} [size=8192] Slab size
 * @returns {PoolAllocator} Pooled allocator
 */
function pool(alloc, slice, size) {
    var SIZE   = size || 8192;
    var MAX    = SIZE >>> 1;
    var slab   = null;
    var offset = SIZE;
    return function pool_alloc(size) {
        if (size < 1 || size > MAX)
            return alloc(size);
        if (offset + size > SIZE) {
            slab = alloc(SIZE);
            offset = 0;
        }
        var buf = slice.call(slab, offset, offset += size);
        if (offset & 7) // align to 32 bit
            offset = (offset | 7) + 1;
        return buf;
    };
}

},{}],7:[function(require,module,exports){
"use strict";

/**
 * A minimal UTF8 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var utf8 = exports;

/**
 * Calculates the UTF8 byte length of a string.
 * @param {string} string String
 * @returns {number} Byte length
 */
utf8.length = function utf8_length(string) {
    var len = 0,
        c = 0;
    for (var i = 0; i < string.length; ++i) {
        c = string.charCodeAt(i);
        if (c < 128)
            len += 1;
        else if (c < 2048)
            len += 2;
        else if ((c & 0xFC00) === 0xD800 && (string.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
            ++i;
            len += 4;
        } else
            len += 3;
    }
    return len;
};

/**
 * Reads UTF8 bytes as a string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} String read
 */
utf8.read = function utf8_read(buffer, start, end) {
    var len = end - start;
    if (len < 1)
        return "";
    var parts = null,
        chunk = [],
        i = 0, // char offset
        t;     // temporary
    while (start < end) {
        t = buffer[start++];
        if (t < 128)
            chunk[i++] = t;
        else if (t > 191 && t < 224)
            chunk[i++] = (t & 31) << 6 | buffer[start++] & 63;
        else if (t > 239 && t < 365) {
            t = ((t & 7) << 18 | (buffer[start++] & 63) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63) - 0x10000;
            chunk[i++] = 0xD800 + (t >> 10);
            chunk[i++] = 0xDC00 + (t & 1023);
        } else
            chunk[i++] = (t & 15) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63;
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

/**
 * Writes a string as UTF8 bytes.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Bytes written
 */
utf8.write = function utf8_write(string, buffer, offset) {
    var start = offset,
        c1, // character 1
        c2; // character 2
    for (var i = 0; i < string.length; ++i) {
        c1 = string.charCodeAt(i);
        if (c1 < 128) {
            buffer[offset++] = c1;
        } else if (c1 < 2048) {
            buffer[offset++] = c1 >> 6       | 192;
            buffer[offset++] = c1       & 63 | 128;
        } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = string.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buffer[offset++] = c1 >> 18      | 240;
            buffer[offset++] = c1 >> 12 & 63 | 128;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        } else {
            buffer[offset++] = c1 >> 12      | 224;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        }
    }
    return offset - start;
};

},{}],8:[function(require,module,exports){
// minimal library entry point.

"use strict";
module.exports = require("./src/index-minimal");

},{"./src/index-minimal":9}],9:[function(require,module,exports){
"use strict";
var protobuf = exports;

/**
 * Build type, one of `"full"`, `"light"` or `"minimal"`.
 * @name build
 * @type {string}
 * @const
 */
protobuf.build = "minimal";

// Serialization
protobuf.Writer       = require("./writer");
protobuf.BufferWriter = require("./writer_buffer");
protobuf.Reader       = require("./reader");
protobuf.BufferReader = require("./reader_buffer");

// Utility
protobuf.util         = require("./util/minimal");
protobuf.rpc          = require("./rpc");
protobuf.roots        = require("./roots");
protobuf.configure    = configure;

/* istanbul ignore next */
/**
 * Reconfigures the library according to the environment.
 * @returns {undefined}
 */
function configure() {
    protobuf.util._configure();
    protobuf.Writer._configure(protobuf.BufferWriter);
    protobuf.Reader._configure(protobuf.BufferReader);
}

// Set up buffer utility according to the environment
configure();

},{"./reader":10,"./reader_buffer":11,"./roots":12,"./rpc":13,"./util/minimal":16,"./writer":17,"./writer_buffer":18}],10:[function(require,module,exports){
"use strict";
module.exports = Reader;

var util      = require("./util/minimal");

var BufferReader; // cyclic

var LongBits  = util.LongBits,
    utf8      = util.utf8;

/* istanbul ignore next */
function indexOutOfRange(reader, writeLength) {
    return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
}

/**
 * Constructs a new reader instance using the specified buffer.
 * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 * @param {Uint8Array} buffer Buffer to read from
 */
function Reader(buffer) {

    /**
     * Read buffer.
     * @type {Uint8Array}
     */
    this.buf = buffer;

    /**
     * Read buffer position.
     * @type {number}
     */
    this.pos = 0;

    /**
     * Read buffer length.
     * @type {number}
     */
    this.len = buffer.length;
}

var create_array = typeof Uint8Array !== "undefined"
    ? function create_typed_array(buffer) {
        if (buffer instanceof Uint8Array || Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    }
    /* istanbul ignore next */
    : function create_array(buffer) {
        if (Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    };

var create = function create() {
    return util.Buffer
        ? function create_buffer_setup(buffer) {
            return (Reader.create = function create_buffer(buffer) {
                return util.Buffer.isBuffer(buffer)
                    ? new BufferReader(buffer)
                    /* istanbul ignore next */
                    : create_array(buffer);
            })(buffer);
        }
        /* istanbul ignore next */
        : create_array;
};

/**
 * Creates a new reader using the specified buffer.
 * @function
 * @param {Uint8Array|Buffer} buffer Buffer to read from
 * @returns {Reader|BufferReader} A {@link BufferReader} if `buffer` is a Buffer, otherwise a {@link Reader}
 * @throws {Error} If `buffer` is not a valid buffer
 */
Reader.create = create();

Reader.prototype._slice = util.Array.prototype.subarray || /* istanbul ignore next */ util.Array.prototype.slice;

/**
 * Reads a varint as an unsigned 32 bit value.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.uint32 = (function read_uint32_setup() {
    var value = 4294967295; // optimizer type-hint, tends to deopt otherwise (?!)
    return function read_uint32() {
        value = (         this.buf[this.pos] & 127       ) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) <<  7) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 14) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 21) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] &  15) << 28) >>> 0; if (this.buf[this.pos++] < 128) return value;

        /* istanbul ignore if */
        if ((this.pos += 5) > this.len) {
            this.pos = this.len;
            throw indexOutOfRange(this, 10);
        }
        return value;
    };
})();

/**
 * Reads a varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.int32 = function read_int32() {
    return this.uint32() | 0;
};

/**
 * Reads a zig-zag encoded varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.sint32 = function read_sint32() {
    var value = this.uint32();
    return value >>> 1 ^ -(value & 1) | 0;
};

/* eslint-disable no-invalid-this */

function readLongVarint() {
    // tends to deopt with local vars for octet etc.
    var bits = new LongBits(0, 0);
    var i = 0;
    if (this.len - this.pos > 4) { // fast route (lo)
        for (; i < 4; ++i) {
            // 1st..4th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 5th
        bits.lo = (bits.lo | (this.buf[this.pos] & 127) << 28) >>> 0;
        bits.hi = (bits.hi | (this.buf[this.pos] & 127) >>  4) >>> 0;
        if (this.buf[this.pos++] < 128)
            return bits;
        i = 0;
    } else {
        for (; i < 3; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 1st..3th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 4th
        bits.lo = (bits.lo | (this.buf[this.pos++] & 127) << i * 7) >>> 0;
        return bits;
    }
    if (this.len - this.pos > 4) { // fast route (hi)
        for (; i < 5; ++i) {
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    } else {
        for (; i < 5; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    }
    /* istanbul ignore next */
    throw Error("invalid varint encoding");
}

/* eslint-enable no-invalid-this */

/**
 * Reads a varint as a signed 64 bit value.
 * @name Reader#int64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as an unsigned 64 bit value.
 * @name Reader#uint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a zig-zag encoded varint as a signed 64 bit value.
 * @name Reader#sint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as a boolean.
 * @returns {boolean} Value read
 */
Reader.prototype.bool = function read_bool() {
    return this.uint32() !== 0;
};

function readFixed32_end(buf, end) { // note that this uses `end`, not `pos`
    return (buf[end - 4]
          | buf[end - 3] << 8
          | buf[end - 2] << 16
          | buf[end - 1] << 24) >>> 0;
}

/**
 * Reads fixed 32 bits as an unsigned 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.fixed32 = function read_fixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4);
};

/**
 * Reads fixed 32 bits as a signed 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.sfixed32 = function read_sfixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4) | 0;
};

/* eslint-disable no-invalid-this */

function readFixed64(/* this: Reader */) {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 8);

    return new LongBits(readFixed32_end(this.buf, this.pos += 4), readFixed32_end(this.buf, this.pos += 4));
}

/* eslint-enable no-invalid-this */

/**
 * Reads fixed 64 bits.
 * @name Reader#fixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads zig-zag encoded fixed 64 bits.
 * @name Reader#sfixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a float (32 bit) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.float = function read_float() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readFloatLE(this.buf, this.pos);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.double = function read_double() {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readDoubleLE(this.buf, this.pos);
    this.pos += 8;
    return value;
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @returns {Uint8Array} Value read
 */
Reader.prototype.bytes = function read_bytes() {
    var length = this.uint32(),
        start  = this.pos,
        end    = this.pos + length;

    /* istanbul ignore if */
    if (end > this.len)
        throw indexOutOfRange(this, length);

    this.pos += length;
    if (Array.isArray(this.buf)) // plain array
        return this.buf.slice(start, end);

    if (start === end) { // fix for IE 10/Win8 and others' subarray returning array of size 1
        var nativeBuffer = util.Buffer;
        return nativeBuffer
            ? nativeBuffer.alloc(0)
            : new this.buf.constructor(0);
    }
    return this._slice.call(this.buf, start, end);
};

/**
 * Reads a string preceeded by its byte length as a varint.
 * @returns {string} Value read
 */
Reader.prototype.string = function read_string() {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
};

/**
 * Skips the specified number of bytes if specified, otherwise skips a varint.
 * @param {number} [length] Length if known, otherwise a varint is assumed
 * @returns {Reader} `this`
 */
Reader.prototype.skip = function skip(length) {
    if (typeof length === "number") {
        /* istanbul ignore if */
        if (this.pos + length > this.len)
            throw indexOutOfRange(this, length);
        this.pos += length;
    } else {
        do {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
        } while (this.buf[this.pos++] & 128);
    }
    return this;
};

/**
 * Skips the next element of the specified wire type.
 * @param {number} wireType Wire type received
 * @returns {Reader} `this`
 */
Reader.prototype.skipType = function(wireType) {
    switch (wireType) {
        case 0:
            this.skip();
            break;
        case 1:
            this.skip(8);
            break;
        case 2:
            this.skip(this.uint32());
            break;
        case 3:
            while ((wireType = this.uint32() & 7) !== 4) {
                this.skipType(wireType);
            }
            break;
        case 5:
            this.skip(4);
            break;

        /* istanbul ignore next */
        default:
            throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
};

Reader._configure = function(BufferReader_) {
    BufferReader = BufferReader_;
    Reader.create = create();
    BufferReader._configure();

    var fn = util.Long ? "toLong" : /* istanbul ignore next */ "toNumber";
    util.merge(Reader.prototype, {

        int64: function read_int64() {
            return readLongVarint.call(this)[fn](false);
        },

        uint64: function read_uint64() {
            return readLongVarint.call(this)[fn](true);
        },

        sint64: function read_sint64() {
            return readLongVarint.call(this).zzDecode()[fn](false);
        },

        fixed64: function read_fixed64() {
            return readFixed64.call(this)[fn](true);
        },

        sfixed64: function read_sfixed64() {
            return readFixed64.call(this)[fn](false);
        }

    });
};

},{"./util/minimal":16}],11:[function(require,module,exports){
"use strict";
module.exports = BufferReader;

// extends Reader
var Reader = require("./reader");
(BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;

var util = require("./util/minimal");

/**
 * Constructs a new buffer reader instance.
 * @classdesc Wire format reader using node buffers.
 * @extends Reader
 * @constructor
 * @param {Buffer} buffer Buffer to read from
 */
function BufferReader(buffer) {
    Reader.call(this, buffer);

    /**
     * Read buffer.
     * @name BufferReader#buf
     * @type {Buffer}
     */
}

BufferReader._configure = function () {
    /* istanbul ignore else */
    if (util.Buffer)
        BufferReader.prototype._slice = util.Buffer.prototype.slice;
};


/**
 * @override
 */
BufferReader.prototype.string = function read_string_buffer() {
    var len = this.uint32(); // modifies pos
    return this.buf.utf8Slice
        ? this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + len, this.len))
        : this.buf.toString("utf-8", this.pos, this.pos = Math.min(this.pos + len, this.len));
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @name BufferReader#bytes
 * @function
 * @returns {Buffer} Value read
 */

BufferReader._configure();

},{"./reader":10,"./util/minimal":16}],12:[function(require,module,exports){
"use strict";
module.exports = {};

/**
 * Named roots.
 * This is where pbjs stores generated structures (the option `-r, --root` specifies a name).
 * Can also be used manually to make roots available across modules.
 * @name roots
 * @type {Object.<string,Root>}
 * @example
 * // pbjs -r myroot -o compiled.js ...
 *
 * // in another module:
 * require("./compiled.js");
 *
 * // in any subsequent module:
 * var root = protobuf.roots["myroot"];
 */

},{}],13:[function(require,module,exports){
"use strict";

/**
 * Streaming RPC helpers.
 * @namespace
 */
var rpc = exports;

/**
 * RPC implementation passed to {@link Service#create} performing a service request on network level, i.e. by utilizing http requests or websockets.
 * @typedef RPCImpl
 * @type {function}
 * @param {Method|rpc.ServiceMethod<Message<{}>,Message<{}>>} method Reflected or static method being called
 * @param {Uint8Array} requestData Request data
 * @param {RPCImplCallback} callback Callback function
 * @returns {undefined}
 * @example
 * function rpcImpl(method, requestData, callback) {
 *     if (protobuf.util.lcFirst(method.name) !== "myMethod") // compatible with static code
 *         throw Error("no such method");
 *     asynchronouslyObtainAResponse(requestData, function(err, responseData) {
 *         callback(err, responseData);
 *     });
 * }
 */

/**
 * Node-style callback as used by {@link RPCImpl}.
 * @typedef RPCImplCallback
 * @type {function}
 * @param {Error|null} error Error, if any, otherwise `null`
 * @param {Uint8Array|null} [response] Response data or `null` to signal end of stream, if there hasn't been an error
 * @returns {undefined}
 */

rpc.Service = require("./rpc/service");

},{"./rpc/service":14}],14:[function(require,module,exports){
"use strict";
module.exports = Service;

var util = require("../util/minimal");

// Extends EventEmitter
(Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;

/**
 * A service method callback as used by {@link rpc.ServiceMethod|ServiceMethod}.
 *
 * Differs from {@link RPCImplCallback} in that it is an actual callback of a service method which may not return `response = null`.
 * @typedef rpc.ServiceMethodCallback
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {TRes} [response] Response message
 * @returns {undefined}
 */

/**
 * A service method part of a {@link rpc.Service} as created by {@link Service.create}.
 * @typedef rpc.ServiceMethod
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} [callback] Node-style callback called with the error, if any, and the response message
 * @returns {Promise<Message<TRes>>} Promise if `callback` has been omitted, otherwise `undefined`
 */

/**
 * Constructs a new RPC service instance.
 * @classdesc An RPC service as returned by {@link Service#create}.
 * @exports rpc.Service
 * @extends util.EventEmitter
 * @constructor
 * @param {RPCImpl} rpcImpl RPC implementation
 * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
 * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
 */
function Service(rpcImpl, requestDelimited, responseDelimited) {

    if (typeof rpcImpl !== "function")
        throw TypeError("rpcImpl must be a function");

    util.EventEmitter.call(this);

    /**
     * RPC implementation. Becomes `null` once the service is ended.
     * @type {RPCImpl|null}
     */
    this.rpcImpl = rpcImpl;

    /**
     * Whether requests are length-delimited.
     * @type {boolean}
     */
    this.requestDelimited = Boolean(requestDelimited);

    /**
     * Whether responses are length-delimited.
     * @type {boolean}
     */
    this.responseDelimited = Boolean(responseDelimited);
}

/**
 * Calls a service method through {@link rpc.Service#rpcImpl|rpcImpl}.
 * @param {Method|rpc.ServiceMethod<TReq,TRes>} method Reflected or static method
 * @param {Constructor<TReq>} requestCtor Request constructor
 * @param {Constructor<TRes>} responseCtor Response constructor
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} callback Service callback
 * @returns {undefined}
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 */
Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {

    if (!request)
        throw TypeError("request must be specified");

    var self = this;
    if (!callback)
        return util.asPromise(rpcCall, self, method, requestCtor, responseCtor, request);

    if (!self.rpcImpl) {
        setTimeout(function() { callback(Error("already ended")); }, 0);
        return undefined;
    }

    try {
        return self.rpcImpl(
            method,
            requestCtor[self.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
            function rpcCallback(err, response) {

                if (err) {
                    self.emit("error", err, method);
                    return callback(err);
                }

                if (response === null) {
                    self.end(/* endedByRPC */ true);
                    return undefined;
                }

                if (!(response instanceof responseCtor)) {
                    try {
                        response = responseCtor[self.responseDelimited ? "decodeDelimited" : "decode"](response);
                    } catch (err) {
                        self.emit("error", err, method);
                        return callback(err);
                    }
                }

                self.emit("data", response, method);
                return callback(null, response);
            }
        );
    } catch (err) {
        self.emit("error", err, method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};

/**
 * Ends this service and emits the `end` event.
 * @param {boolean} [endedByRPC=false] Whether the service has been ended by the RPC implementation.
 * @returns {rpc.Service} `this`
 */
Service.prototype.end = function end(endedByRPC) {
    if (this.rpcImpl) {
        if (!endedByRPC) // signal end to rpcImpl
            this.rpcImpl(null, null, null);
        this.rpcImpl = null;
        this.emit("end").off();
    }
    return this;
};

},{"../util/minimal":16}],15:[function(require,module,exports){
"use strict";
module.exports = LongBits;

var util = require("../util/minimal");

/**
 * Constructs new long bits.
 * @classdesc Helper class for working with the low and high bits of a 64 bit value.
 * @memberof util
 * @constructor
 * @param {number} lo Low 32 bits, unsigned
 * @param {number} hi High 32 bits, unsigned
 */
function LongBits(lo, hi) {

    // note that the casts below are theoretically unnecessary as of today, but older statically
    // generated converter code might still call the ctor with signed 32bits. kept for compat.

    /**
     * Low bits.
     * @type {number}
     */
    this.lo = lo >>> 0;

    /**
     * High bits.
     * @type {number}
     */
    this.hi = hi >>> 0;
}

/**
 * Zero bits.
 * @memberof util.LongBits
 * @type {util.LongBits}
 */
var zero = LongBits.zero = new LongBits(0, 0);

zero.toNumber = function() { return 0; };
zero.zzEncode = zero.zzDecode = function() { return this; };
zero.length = function() { return 1; };

/**
 * Zero hash.
 * @memberof util.LongBits
 * @type {string}
 */
var zeroHash = LongBits.zeroHash = "\0\0\0\0\0\0\0\0";

/**
 * Constructs new long bits from the specified number.
 * @param {number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.fromNumber = function fromNumber(value) {
    if (value === 0)
        return zero;
    var sign = value < 0;
    if (sign)
        value = -value;
    var lo = value >>> 0,
        hi = (value - lo) / 4294967296 >>> 0;
    if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
            lo = 0;
            if (++hi > 4294967295)
                hi = 0;
        }
    }
    return new LongBits(lo, hi);
};

/**
 * Constructs new long bits from a number, long or string.
 * @param {Long|number|string} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.from = function from(value) {
    if (typeof value === "number")
        return LongBits.fromNumber(value);
    if (util.isString(value)) {
        /* istanbul ignore else */
        if (util.Long)
            value = util.Long.fromString(value);
        else
            return LongBits.fromNumber(parseInt(value, 10));
    }
    return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
};

/**
 * Converts this long bits to a possibly unsafe JavaScript number.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {number} Possibly unsafe number
 */
LongBits.prototype.toNumber = function toNumber(unsigned) {
    if (!unsigned && this.hi >>> 31) {
        var lo = ~this.lo + 1 >>> 0,
            hi = ~this.hi     >>> 0;
        if (!lo)
            hi = hi + 1 >>> 0;
        return -(lo + hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
};

/**
 * Converts this long bits to a long.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long} Long
 */
LongBits.prototype.toLong = function toLong(unsigned) {
    return util.Long
        ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
        /* istanbul ignore next */
        : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(unsigned) };
};

var charCodeAt = String.prototype.charCodeAt;

/**
 * Constructs new long bits from the specified 8 characters long hash.
 * @param {string} hash Hash
 * @returns {util.LongBits} Bits
 */
LongBits.fromHash = function fromHash(hash) {
    if (hash === zeroHash)
        return zero;
    return new LongBits(
        ( charCodeAt.call(hash, 0)
        | charCodeAt.call(hash, 1) << 8
        | charCodeAt.call(hash, 2) << 16
        | charCodeAt.call(hash, 3) << 24) >>> 0
    ,
        ( charCodeAt.call(hash, 4)
        | charCodeAt.call(hash, 5) << 8
        | charCodeAt.call(hash, 6) << 16
        | charCodeAt.call(hash, 7) << 24) >>> 0
    );
};

/**
 * Converts this long bits to a 8 characters long hash.
 * @returns {string} Hash
 */
LongBits.prototype.toHash = function toHash() {
    return String.fromCharCode(
        this.lo        & 255,
        this.lo >>> 8  & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24      ,
        this.hi        & 255,
        this.hi >>> 8  & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24
    );
};

/**
 * Zig-zag encodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzEncode = function zzEncode() {
    var mask =   this.hi >> 31;
    this.hi  = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
    this.lo  = ( this.lo << 1                   ^ mask) >>> 0;
    return this;
};

/**
 * Zig-zag decodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzDecode = function zzDecode() {
    var mask = -(this.lo & 1);
    this.lo  = ((this.lo >>> 1 | this.hi << 31) ^ mask) >>> 0;
    this.hi  = ( this.hi >>> 1                  ^ mask) >>> 0;
    return this;
};

/**
 * Calculates the length of this longbits when encoded as a varint.
 * @returns {number} Length
 */
LongBits.prototype.length = function length() {
    var part0 =  this.lo,
        part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
        part2 =  this.hi >>> 24;
    return part2 === 0
         ? part1 === 0
           ? part0 < 16384
             ? part0 < 128 ? 1 : 2
             : part0 < 2097152 ? 3 : 4
           : part1 < 16384
             ? part1 < 128 ? 5 : 6
             : part1 < 2097152 ? 7 : 8
         : part2 < 128 ? 9 : 10;
};

},{"../util/minimal":16}],16:[function(require,module,exports){
(function (global){(function (){
"use strict";
var util = exports;

// used to return a Promise where callback is omitted
util.asPromise = require("@protobufjs/aspromise");

// converts to / from base64 encoded strings
util.base64 = require("@protobufjs/base64");

// base class of rpc.Service
util.EventEmitter = require("@protobufjs/eventemitter");

// float handling accross browsers
util.float = require("@protobufjs/float");

// requires modules optionally and hides the call from bundlers
util.inquire = require("@protobufjs/inquire");

// converts to / from utf8 encoded strings
util.utf8 = require("@protobufjs/utf8");

// provides a node-like buffer pool in the browser
util.pool = require("@protobufjs/pool");

// utility to work with the low and high bits of a 64 bit value
util.LongBits = require("./longbits");

/**
 * Whether running within node or not.
 * @memberof util
 * @type {boolean}
 */
util.isNode = Boolean(typeof global !== "undefined"
                   && global
                   && global.process
                   && global.process.versions
                   && global.process.versions.node);

/**
 * Global object reference.
 * @memberof util
 * @type {Object}
 */
util.global = util.isNode && global
           || typeof window !== "undefined" && window
           || typeof self   !== "undefined" && self
           || this; // eslint-disable-line no-invalid-this

/**
 * An immuable empty array.
 * @memberof util
 * @type {Array.<*>}
 * @const
 */
util.emptyArray = Object.freeze ? Object.freeze([]) : /* istanbul ignore next */ []; // used on prototypes

/**
 * An immutable empty object.
 * @type {Object}
 * @const
 */
util.emptyObject = Object.freeze ? Object.freeze({}) : /* istanbul ignore next */ {}; // used on prototypes

/**
 * Tests if the specified value is an integer.
 * @function
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is an integer
 */
util.isInteger = Number.isInteger || /* istanbul ignore next */ function isInteger(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};

/**
 * Tests if the specified value is a string.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a string
 */
util.isString = function isString(value) {
    return typeof value === "string" || value instanceof String;
};

/**
 * Tests if the specified value is a non-null object.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a non-null object
 */
util.isObject = function isObject(value) {
    return value && typeof value === "object";
};

/**
 * Checks if a property on a message is considered to be present.
 * This is an alias of {@link util.isSet}.
 * @function
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isset =

/**
 * Checks if a property on a message is considered to be present.
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isSet = function isSet(obj, prop) {
    var value = obj[prop];
    if (value != null && obj.hasOwnProperty(prop)) // eslint-disable-line eqeqeq, no-prototype-builtins
        return typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0;
    return false;
};

/**
 * Any compatible Buffer instance.
 * This is a minimal stand-alone definition of a Buffer instance. The actual type is that exported by node's typings.
 * @interface Buffer
 * @extends Uint8Array
 */

/**
 * Node's Buffer class if available.
 * @type {Constructor<Buffer>}
 */
util.Buffer = (function() {
    try {
        var Buffer = util.inquire("buffer").Buffer;
        // refuse to use non-node buffers if not explicitly assigned (perf reasons):
        return Buffer.prototype.utf8Write ? Buffer : /* istanbul ignore next */ null;
    } catch (e) {
        /* istanbul ignore next */
        return null;
    }
})();

// Internal alias of or polyfull for Buffer.from.
util._Buffer_from = null;

// Internal alias of or polyfill for Buffer.allocUnsafe.
util._Buffer_allocUnsafe = null;

/**
 * Creates a new buffer of whatever type supported by the environment.
 * @param {number|number[]} [sizeOrArray=0] Buffer size or number array
 * @returns {Uint8Array|Buffer} Buffer
 */
util.newBuffer = function newBuffer(sizeOrArray) {
    /* istanbul ignore next */
    return typeof sizeOrArray === "number"
        ? util.Buffer
            ? util._Buffer_allocUnsafe(sizeOrArray)
            : new util.Array(sizeOrArray)
        : util.Buffer
            ? util._Buffer_from(sizeOrArray)
            : typeof Uint8Array === "undefined"
                ? sizeOrArray
                : new Uint8Array(sizeOrArray);
};

/**
 * Array implementation used in the browser. `Uint8Array` if supported, otherwise `Array`.
 * @type {Constructor<Uint8Array>}
 */
util.Array = typeof Uint8Array !== "undefined" ? Uint8Array /* istanbul ignore next */ : Array;

/**
 * Any compatible Long instance.
 * This is a minimal stand-alone definition of a Long instance. The actual type is that exported by long.js.
 * @interface Long
 * @property {number} low Low bits
 * @property {number} high High bits
 * @property {boolean} unsigned Whether unsigned or not
 */

/**
 * Long.js's Long class if available.
 * @type {Constructor<Long>}
 */
util.Long = /* istanbul ignore next */ util.global.dcodeIO && /* istanbul ignore next */ util.global.dcodeIO.Long
         || /* istanbul ignore next */ util.global.Long
         || util.inquire("long");

/**
 * Regular expression used to verify 2 bit (`bool`) map keys.
 * @type {RegExp}
 * @const
 */
util.key2Re = /^true|false|0|1$/;

/**
 * Regular expression used to verify 32 bit (`int32` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;

/**
 * Regular expression used to verify 64 bit (`int64` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;

/**
 * Converts a number or long to an 8 characters long hash string.
 * @param {Long|number} value Value to convert
 * @returns {string} Hash
 */
util.longToHash = function longToHash(value) {
    return value
        ? util.LongBits.from(value).toHash()
        : util.LongBits.zeroHash;
};

/**
 * Converts an 8 characters long hash string to a long or number.
 * @param {string} hash Hash
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long|number} Original value
 */
util.longFromHash = function longFromHash(hash, unsigned) {
    var bits = util.LongBits.fromHash(hash);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
};

/**
 * Merges the properties of the source object into the destination object.
 * @memberof util
 * @param {Object.<string,*>} dst Destination object
 * @param {Object.<string,*>} src Source object
 * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
 * @returns {Object.<string,*>} Destination object
 */
function merge(dst, src, ifNotSet) { // used by converters
    for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
        if (dst[keys[i]] === undefined || !ifNotSet)
            dst[keys[i]] = src[keys[i]];
    return dst;
}

util.merge = merge;

/**
 * Converts the first character of a string to lower case.
 * @param {string} str String to convert
 * @returns {string} Converted string
 */
util.lcFirst = function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
};

/**
 * Creates a custom error constructor.
 * @memberof util
 * @param {string} name Error name
 * @returns {Constructor<Error>} Custom error constructor
 */
function newError(name) {

    function CustomError(message, properties) {

        if (!(this instanceof CustomError))
            return new CustomError(message, properties);

        // Error.call(this, message);
        // ^ just returns a new error instance because the ctor can be called as a function

        Object.defineProperty(this, "message", { get: function() { return message; } });

        /* istanbul ignore next */
        if (Error.captureStackTrace) // node
            Error.captureStackTrace(this, CustomError);
        else
            Object.defineProperty(this, "stack", { value: new Error().stack || "" });

        if (properties)
            merge(this, properties);
    }

    CustomError.prototype = Object.create(Error.prototype, {
        constructor: {
            value: CustomError,
            writable: true,
            enumerable: false,
            configurable: true,
        },
        name: {
            get: function get() { return name; },
            set: undefined,
            enumerable: false,
            // configurable: false would accurately preserve the behavior of
            // the original, but I'm guessing that was not intentional.
            // For an actual error subclass, this property would
            // be configurable.
            configurable: true,
        },
        toString: {
            value: function value() { return this.name + ": " + this.message; },
            writable: true,
            enumerable: false,
            configurable: true,
        },
    });

    return CustomError;
}

util.newError = newError;

/**
 * Constructs a new protocol error.
 * @classdesc Error subclass indicating a protocol specifc error.
 * @memberof util
 * @extends Error
 * @template T extends Message<T>
 * @constructor
 * @param {string} message Error message
 * @param {Object.<string,*>} [properties] Additional properties
 * @example
 * try {
 *     MyMessage.decode(someBuffer); // throws if required fields are missing
 * } catch (e) {
 *     if (e instanceof ProtocolError && e.instance)
 *         console.log("decoded so far: " + JSON.stringify(e.instance));
 * }
 */
util.ProtocolError = newError("ProtocolError");

/**
 * So far decoded message instance.
 * @name util.ProtocolError#instance
 * @type {Message<T>}
 */

/**
 * A OneOf getter as returned by {@link util.oneOfGetter}.
 * @typedef OneOfGetter
 * @type {function}
 * @returns {string|undefined} Set field name, if any
 */

/**
 * Builds a getter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfGetter} Unbound getter
 */
util.oneOfGetter = function getOneOf(fieldNames) {
    var fieldMap = {};
    for (var i = 0; i < fieldNames.length; ++i)
        fieldMap[fieldNames[i]] = 1;

    /**
     * @returns {string|undefined} Set field name, if any
     * @this Object
     * @ignore
     */
    return function() { // eslint-disable-line consistent-return
        for (var keys = Object.keys(this), i = keys.length - 1; i > -1; --i)
            if (fieldMap[keys[i]] === 1 && this[keys[i]] !== undefined && this[keys[i]] !== null)
                return keys[i];
    };
};

/**
 * A OneOf setter as returned by {@link util.oneOfSetter}.
 * @typedef OneOfSetter
 * @type {function}
 * @param {string|undefined} value Field name
 * @returns {undefined}
 */

/**
 * Builds a setter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfSetter} Unbound setter
 */
util.oneOfSetter = function setOneOf(fieldNames) {

    /**
     * @param {string} name Field name
     * @returns {undefined}
     * @this Object
     * @ignore
     */
    return function(name) {
        for (var i = 0; i < fieldNames.length; ++i)
            if (fieldNames[i] !== name)
                delete this[fieldNames[i]];
    };
};

/**
 * Default conversion options used for {@link Message#toJSON} implementations.
 *
 * These options are close to proto3's JSON mapping with the exception that internal types like Any are handled just like messages. More precisely:
 *
 * - Longs become strings
 * - Enums become string keys
 * - Bytes become base64 encoded strings
 * - (Sub-)Messages become plain objects
 * - Maps become plain objects with all string keys
 * - Repeated fields become arrays
 * - NaN and Infinity for float and double fields become strings
 *
 * @type {IConversionOptions}
 * @see https://developers.google.com/protocol-buffers/docs/proto3?hl=en#json
 */
util.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String,
    json: true
};

// Sets up buffer utility according to the environment (called in index-minimal)
util._configure = function() {
    var Buffer = util.Buffer;
    /* istanbul ignore if */
    if (!Buffer) {
        util._Buffer_from = util._Buffer_allocUnsafe = null;
        return;
    }
    // because node 4.x buffers are incompatible & immutable
    // see: https://github.com/dcodeIO/protobuf.js/pull/665
    util._Buffer_from = Buffer.from !== Uint8Array.from && Buffer.from ||
        /* istanbul ignore next */
        function Buffer_from(value, encoding) {
            return new Buffer(value, encoding);
        };
    util._Buffer_allocUnsafe = Buffer.allocUnsafe ||
        /* istanbul ignore next */
        function Buffer_allocUnsafe(size) {
            return new Buffer(size);
        };
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./longbits":15,"@protobufjs/aspromise":1,"@protobufjs/base64":2,"@protobufjs/eventemitter":3,"@protobufjs/float":4,"@protobufjs/inquire":5,"@protobufjs/pool":6,"@protobufjs/utf8":7}],17:[function(require,module,exports){
"use strict";
module.exports = Writer;

var util      = require("./util/minimal");

var BufferWriter; // cyclic

var LongBits  = util.LongBits,
    base64    = util.base64,
    utf8      = util.utf8;

/**
 * Constructs a new writer operation instance.
 * @classdesc Scheduled writer operation.
 * @constructor
 * @param {function(*, Uint8Array, number)} fn Function to call
 * @param {number} len Value byte length
 * @param {*} val Value to write
 * @ignore
 */
function Op(fn, len, val) {

    /**
     * Function to call.
     * @type {function(Uint8Array, number, *)}
     */
    this.fn = fn;

    /**
     * Value byte length.
     * @type {number}
     */
    this.len = len;

    /**
     * Next operation.
     * @type {Writer.Op|undefined}
     */
    this.next = undefined;

    /**
     * Value to write.
     * @type {*}
     */
    this.val = val; // type varies
}

/* istanbul ignore next */
function noop() {} // eslint-disable-line no-empty-function

/**
 * Constructs a new writer state instance.
 * @classdesc Copied writer state.
 * @memberof Writer
 * @constructor
 * @param {Writer} writer Writer to copy state from
 * @ignore
 */
function State(writer) {

    /**
     * Current head.
     * @type {Writer.Op}
     */
    this.head = writer.head;

    /**
     * Current tail.
     * @type {Writer.Op}
     */
    this.tail = writer.tail;

    /**
     * Current buffer length.
     * @type {number}
     */
    this.len = writer.len;

    /**
     * Next state.
     * @type {State|null}
     */
    this.next = writer.states;
}

/**
 * Constructs a new writer instance.
 * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 */
function Writer() {

    /**
     * Current length.
     * @type {number}
     */
    this.len = 0;

    /**
     * Operations head.
     * @type {Object}
     */
    this.head = new Op(noop, 0, 0);

    /**
     * Operations tail
     * @type {Object}
     */
    this.tail = this.head;

    /**
     * Linked forked states.
     * @type {Object|null}
     */
    this.states = null;

    // When a value is written, the writer calculates its byte length and puts it into a linked
    // list of operations to perform when finish() is called. This both allows us to allocate
    // buffers of the exact required size and reduces the amount of work we have to do compared
    // to first calculating over objects and then encoding over objects. In our case, the encoding
    // part is just a linked list walk calling operations with already prepared values.
}

var create = function create() {
    return util.Buffer
        ? function create_buffer_setup() {
            return (Writer.create = function create_buffer() {
                return new BufferWriter();
            })();
        }
        /* istanbul ignore next */
        : function create_array() {
            return new Writer();
        };
};

/**
 * Creates a new writer.
 * @function
 * @returns {BufferWriter|Writer} A {@link BufferWriter} when Buffers are supported, otherwise a {@link Writer}
 */
Writer.create = create();

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */
Writer.alloc = function alloc(size) {
    return new util.Array(size);
};

// Use Uint8Array buffer pool in the browser, just like node does with buffers
/* istanbul ignore else */
if (util.Array !== Array)
    Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);

/**
 * Pushes a new operation to the queue.
 * @param {function(Uint8Array, number, *)} fn Function to call
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @returns {Writer} `this`
 * @private
 */
Writer.prototype._push = function push(fn, len, val) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
};

function writeByte(val, buf, pos) {
    buf[pos] = val & 255;
}

function writeVarint32(val, buf, pos) {
    while (val > 127) {
        buf[pos++] = val & 127 | 128;
        val >>>= 7;
    }
    buf[pos] = val;
}

/**
 * Constructs a new varint writer operation instance.
 * @classdesc Scheduled varint writer operation.
 * @extends Op
 * @constructor
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @ignore
 */
function VarintOp(len, val) {
    this.len = len;
    this.next = undefined;
    this.val = val;
}

VarintOp.prototype = Object.create(Op.prototype);
VarintOp.prototype.fn = writeVarint32;

/**
 * Writes an unsigned 32 bit value as a varint.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.uint32 = function write_uint32(value) {
    // here, the call to this.push has been inlined and a varint specific Op subclass is used.
    // uint32 is by far the most frequently used operation and benefits significantly from this.
    this.len += (this.tail = this.tail.next = new VarintOp(
        (value = value >>> 0)
                < 128       ? 1
        : value < 16384     ? 2
        : value < 2097152   ? 3
        : value < 268435456 ? 4
        :                     5,
    value)).len;
    return this;
};

/**
 * Writes a signed 32 bit value as a varint.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.int32 = function write_int32(value) {
    return value < 0
        ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) // 10 bytes per spec
        : this.uint32(value);
};

/**
 * Writes a 32 bit value as a varint, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sint32 = function write_sint32(value) {
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
};

function writeVarint64(val, buf, pos) {
    while (val.hi) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
    }
    while (val.lo > 127) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = val.lo >>> 7;
    }
    buf[pos++] = val.lo;
}

/**
 * Writes an unsigned 64 bit value as a varint.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.uint64 = function write_uint64(value) {
    var bits = LongBits.from(value);
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a signed 64 bit value as a varint.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.int64 = Writer.prototype.uint64;

/**
 * Writes a signed 64 bit value as a varint, zig-zag encoded.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sint64 = function write_sint64(value) {
    var bits = LongBits.from(value).zzEncode();
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a boolish value as a varint.
 * @param {boolean} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.bool = function write_bool(value) {
    return this._push(writeByte, 1, value ? 1 : 0);
};

function writeFixed32(val, buf, pos) {
    buf[pos    ] =  val         & 255;
    buf[pos + 1] =  val >>> 8   & 255;
    buf[pos + 2] =  val >>> 16  & 255;
    buf[pos + 3] =  val >>> 24;
}

/**
 * Writes an unsigned 32 bit value as fixed 32 bits.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.fixed32 = function write_fixed32(value) {
    return this._push(writeFixed32, 4, value >>> 0);
};

/**
 * Writes a signed 32 bit value as fixed 32 bits.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sfixed32 = Writer.prototype.fixed32;

/**
 * Writes an unsigned 64 bit value as fixed 64 bits.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.fixed64 = function write_fixed64(value) {
    var bits = LongBits.from(value);
    return this._push(writeFixed32, 4, bits.lo)._push(writeFixed32, 4, bits.hi);
};

/**
 * Writes a signed 64 bit value as fixed 64 bits.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sfixed64 = Writer.prototype.fixed64;

/**
 * Writes a float (32 bit).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.float = function write_float(value) {
    return this._push(util.float.writeFloatLE, 4, value);
};

/**
 * Writes a double (64 bit float).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.double = function write_double(value) {
    return this._push(util.float.writeDoubleLE, 8, value);
};

var writeBytes = util.Array.prototype.set
    ? function writeBytes_set(val, buf, pos) {
        buf.set(val, pos); // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytes_for(val, buf, pos) {
        for (var i = 0; i < val.length; ++i)
            buf[pos + i] = val[i];
    };

/**
 * Writes a sequence of bytes.
 * @param {Uint8Array|string} value Buffer or base64 encoded string to write
 * @returns {Writer} `this`
 */
Writer.prototype.bytes = function write_bytes(value) {
    var len = value.length >>> 0;
    if (!len)
        return this._push(writeByte, 1, 0);
    if (util.isString(value)) {
        var buf = Writer.alloc(len = base64.length(value));
        base64.decode(value, buf, 0);
        value = buf;
    }
    return this.uint32(len)._push(writeBytes, len, value);
};

/**
 * Writes a string.
 * @param {string} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.string = function write_string(value) {
    var len = utf8.length(value);
    return len
        ? this.uint32(len)._push(utf8.write, len, value)
        : this._push(writeByte, 1, 0);
};

/**
 * Forks this writer's state by pushing it to a stack.
 * Calling {@link Writer#reset|reset} or {@link Writer#ldelim|ldelim} resets the writer to the previous state.
 * @returns {Writer} `this`
 */
Writer.prototype.fork = function fork() {
    this.states = new State(this);
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
};

/**
 * Resets this instance to the last state.
 * @returns {Writer} `this`
 */
Writer.prototype.reset = function reset() {
    if (this.states) {
        this.head   = this.states.head;
        this.tail   = this.states.tail;
        this.len    = this.states.len;
        this.states = this.states.next;
    } else {
        this.head = this.tail = new Op(noop, 0, 0);
        this.len  = 0;
    }
    return this;
};

/**
 * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
 * @returns {Writer} `this`
 */
Writer.prototype.ldelim = function ldelim() {
    var head = this.head,
        tail = this.tail,
        len  = this.len;
    this.reset().uint32(len);
    if (len) {
        this.tail.next = head.next; // skip noop
        this.tail = tail;
        this.len += len;
    }
    return this;
};

/**
 * Finishes the write operation.
 * @returns {Uint8Array} Finished buffer
 */
Writer.prototype.finish = function finish() {
    var head = this.head.next, // skip noop
        buf  = this.constructor.alloc(this.len),
        pos  = 0;
    while (head) {
        head.fn(head.val, buf, pos);
        pos += head.len;
        head = head.next;
    }
    // this.head = this.tail = null;
    return buf;
};

Writer._configure = function(BufferWriter_) {
    BufferWriter = BufferWriter_;
    Writer.create = create();
    BufferWriter._configure();
};

},{"./util/minimal":16}],18:[function(require,module,exports){
"use strict";
module.exports = BufferWriter;

// extends Writer
var Writer = require("./writer");
(BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;

var util = require("./util/minimal");

/**
 * Constructs a new buffer writer instance.
 * @classdesc Wire format writer using node buffers.
 * @extends Writer
 * @constructor
 */
function BufferWriter() {
    Writer.call(this);
}

BufferWriter._configure = function () {
    /**
     * Allocates a buffer of the specified size.
     * @function
     * @param {number} size Buffer size
     * @returns {Buffer} Buffer
     */
    BufferWriter.alloc = util._Buffer_allocUnsafe;

    BufferWriter.writeBytesBuffer = util.Buffer && util.Buffer.prototype instanceof Uint8Array && util.Buffer.prototype.set.name === "set"
        ? function writeBytesBuffer_set(val, buf, pos) {
          buf.set(val, pos); // faster than copy (requires node >= 4 where Buffers extend Uint8Array and set is properly inherited)
          // also works for plain array values
        }
        /* istanbul ignore next */
        : function writeBytesBuffer_copy(val, buf, pos) {
          if (val.copy) // Buffer values
            val.copy(buf, pos, 0, val.length);
          else for (var i = 0; i < val.length;) // plain array values
            buf[pos++] = val[i++];
        };
};


/**
 * @override
 */
BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
    if (util.isString(value))
        value = util._Buffer_from(value, "base64");
    var len = value.length >>> 0;
    this.uint32(len);
    if (len)
        this._push(BufferWriter.writeBytesBuffer, len, value);
    return this;
};

function writeStringBuffer(val, buf, pos) {
    if (val.length < 40) // plain js is faster for short strings (probably due to redundant assertions)
        util.utf8.write(val, buf, pos);
    else if (buf.utf8Write)
        buf.utf8Write(val, pos);
    else
        buf.write(val, pos);
}

/**
 * @override
 */
BufferWriter.prototype.string = function write_string_buffer(value) {
    var len = util.Buffer.byteLength(value);
    this.uint32(len);
    if (len)
        this._push(writeStringBuffer, len, value);
    return this;
};


/**
 * Finishes the write operation.
 * @name BufferWriter#finish
 * @function
 * @returns {Buffer} Finished buffer
 */

BufferWriter._configure();

},{"./util/minimal":16,"./writer":17}],19:[function(require,module,exports){
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.skymel = (function() {

    /**
     * Namespace skymel.
     * @exports skymel
     * @namespace
     */
    var skymel = {};

    skymel.modelio = (function() {

        /**
         * Namespace modelio.
         * @memberof skymel
         * @namespace
         */
        var modelio = {};

        modelio.UniformRandomDistributionParameters = (function() {

            /**
             * Properties of an UniformRandomDistributionParameters.
             * @memberof skymel.modelio
             * @interface IUniformRandomDistributionParameters
             * @property {number|null} [minimumValue] UniformRandomDistributionParameters minimumValue
             * @property {number|null} [maximumValue] UniformRandomDistributionParameters maximumValue
             */

            /**
             * Constructs a new UniformRandomDistributionParameters.
             * @memberof skymel.modelio
             * @classdesc Represents an UniformRandomDistributionParameters.
             * @implements IUniformRandomDistributionParameters
             * @constructor
             * @param {skymel.modelio.IUniformRandomDistributionParameters=} [properties] Properties to set
             */
            function UniformRandomDistributionParameters(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * UniformRandomDistributionParameters minimumValue.
             * @member {number} minimumValue
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @instance
             */
            UniformRandomDistributionParameters.prototype.minimumValue = 0;

            /**
             * UniformRandomDistributionParameters maximumValue.
             * @member {number} maximumValue
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @instance
             */
            UniformRandomDistributionParameters.prototype.maximumValue = 0;

            /**
             * Creates a new UniformRandomDistributionParameters instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {skymel.modelio.IUniformRandomDistributionParameters=} [properties] Properties to set
             * @returns {skymel.modelio.UniformRandomDistributionParameters} UniformRandomDistributionParameters instance
             */
            UniformRandomDistributionParameters.create = function create(properties) {
                return new UniformRandomDistributionParameters(properties);
            };

            /**
             * Encodes the specified UniformRandomDistributionParameters message. Does not implicitly {@link skymel.modelio.UniformRandomDistributionParameters.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {skymel.modelio.IUniformRandomDistributionParameters} message UniformRandomDistributionParameters message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UniformRandomDistributionParameters.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.minimumValue != null && Object.hasOwnProperty.call(message, "minimumValue"))
                    writer.uint32(/* id 1, wireType 1 =*/9).double(message.minimumValue);
                if (message.maximumValue != null && Object.hasOwnProperty.call(message, "maximumValue"))
                    writer.uint32(/* id 2, wireType 1 =*/17).double(message.maximumValue);
                return writer;
            };

            /**
             * Encodes the specified UniformRandomDistributionParameters message, length delimited. Does not implicitly {@link skymel.modelio.UniformRandomDistributionParameters.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {skymel.modelio.IUniformRandomDistributionParameters} message UniformRandomDistributionParameters message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UniformRandomDistributionParameters.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an UniformRandomDistributionParameters message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.UniformRandomDistributionParameters} UniformRandomDistributionParameters
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UniformRandomDistributionParameters.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.UniformRandomDistributionParameters();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.minimumValue = reader.double();
                            break;
                        }
                    case 2: {
                            message.maximumValue = reader.double();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an UniformRandomDistributionParameters message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.UniformRandomDistributionParameters} UniformRandomDistributionParameters
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UniformRandomDistributionParameters.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an UniformRandomDistributionParameters message.
             * @function verify
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            UniformRandomDistributionParameters.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.minimumValue != null && message.hasOwnProperty("minimumValue"))
                    if (typeof message.minimumValue !== "number")
                        return "minimumValue: number expected";
                if (message.maximumValue != null && message.hasOwnProperty("maximumValue"))
                    if (typeof message.maximumValue !== "number")
                        return "maximumValue: number expected";
                return null;
            };

            /**
             * Creates an UniformRandomDistributionParameters message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.UniformRandomDistributionParameters} UniformRandomDistributionParameters
             */
            UniformRandomDistributionParameters.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.UniformRandomDistributionParameters)
                    return object;
                var message = new $root.skymel.modelio.UniformRandomDistributionParameters();
                if (object.minimumValue != null)
                    message.minimumValue = Number(object.minimumValue);
                if (object.maximumValue != null)
                    message.maximumValue = Number(object.maximumValue);
                return message;
            };

            /**
             * Creates a plain object from an UniformRandomDistributionParameters message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {skymel.modelio.UniformRandomDistributionParameters} message UniformRandomDistributionParameters
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            UniformRandomDistributionParameters.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.minimumValue = 0;
                    object.maximumValue = 0;
                }
                if (message.minimumValue != null && message.hasOwnProperty("minimumValue"))
                    object.minimumValue = options.json && !isFinite(message.minimumValue) ? String(message.minimumValue) : message.minimumValue;
                if (message.maximumValue != null && message.hasOwnProperty("maximumValue"))
                    object.maximumValue = options.json && !isFinite(message.maximumValue) ? String(message.maximumValue) : message.maximumValue;
                return object;
            };

            /**
             * Converts this UniformRandomDistributionParameters to JSON.
             * @function toJSON
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            UniformRandomDistributionParameters.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for UniformRandomDistributionParameters
             * @function getTypeUrl
             * @memberof skymel.modelio.UniformRandomDistributionParameters
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            UniformRandomDistributionParameters.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.UniformRandomDistributionParameters";
            };

            return UniformRandomDistributionParameters;
        })();

        modelio.GaussianRandomDistributionParameters = (function() {

            /**
             * Properties of a GaussianRandomDistributionParameters.
             * @memberof skymel.modelio
             * @interface IGaussianRandomDistributionParameters
             * @property {number|null} [mean] GaussianRandomDistributionParameters mean
             * @property {number|null} [standardDeviation] GaussianRandomDistributionParameters standardDeviation
             */

            /**
             * Constructs a new GaussianRandomDistributionParameters.
             * @memberof skymel.modelio
             * @classdesc Represents a GaussianRandomDistributionParameters.
             * @implements IGaussianRandomDistributionParameters
             * @constructor
             * @param {skymel.modelio.IGaussianRandomDistributionParameters=} [properties] Properties to set
             */
            function GaussianRandomDistributionParameters(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GaussianRandomDistributionParameters mean.
             * @member {number} mean
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @instance
             */
            GaussianRandomDistributionParameters.prototype.mean = 0;

            /**
             * GaussianRandomDistributionParameters standardDeviation.
             * @member {number} standardDeviation
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @instance
             */
            GaussianRandomDistributionParameters.prototype.standardDeviation = 0;

            /**
             * Creates a new GaussianRandomDistributionParameters instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {skymel.modelio.IGaussianRandomDistributionParameters=} [properties] Properties to set
             * @returns {skymel.modelio.GaussianRandomDistributionParameters} GaussianRandomDistributionParameters instance
             */
            GaussianRandomDistributionParameters.create = function create(properties) {
                return new GaussianRandomDistributionParameters(properties);
            };

            /**
             * Encodes the specified GaussianRandomDistributionParameters message. Does not implicitly {@link skymel.modelio.GaussianRandomDistributionParameters.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {skymel.modelio.IGaussianRandomDistributionParameters} message GaussianRandomDistributionParameters message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GaussianRandomDistributionParameters.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.mean != null && Object.hasOwnProperty.call(message, "mean"))
                    writer.uint32(/* id 1, wireType 1 =*/9).double(message.mean);
                if (message.standardDeviation != null && Object.hasOwnProperty.call(message, "standardDeviation"))
                    writer.uint32(/* id 2, wireType 1 =*/17).double(message.standardDeviation);
                return writer;
            };

            /**
             * Encodes the specified GaussianRandomDistributionParameters message, length delimited. Does not implicitly {@link skymel.modelio.GaussianRandomDistributionParameters.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {skymel.modelio.IGaussianRandomDistributionParameters} message GaussianRandomDistributionParameters message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GaussianRandomDistributionParameters.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a GaussianRandomDistributionParameters message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.GaussianRandomDistributionParameters} GaussianRandomDistributionParameters
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GaussianRandomDistributionParameters.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.GaussianRandomDistributionParameters();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.mean = reader.double();
                            break;
                        }
                    case 2: {
                            message.standardDeviation = reader.double();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GaussianRandomDistributionParameters message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.GaussianRandomDistributionParameters} GaussianRandomDistributionParameters
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GaussianRandomDistributionParameters.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GaussianRandomDistributionParameters message.
             * @function verify
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GaussianRandomDistributionParameters.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.mean != null && message.hasOwnProperty("mean"))
                    if (typeof message.mean !== "number")
                        return "mean: number expected";
                if (message.standardDeviation != null && message.hasOwnProperty("standardDeviation"))
                    if (typeof message.standardDeviation !== "number")
                        return "standardDeviation: number expected";
                return null;
            };

            /**
             * Creates a GaussianRandomDistributionParameters message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.GaussianRandomDistributionParameters} GaussianRandomDistributionParameters
             */
            GaussianRandomDistributionParameters.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.GaussianRandomDistributionParameters)
                    return object;
                var message = new $root.skymel.modelio.GaussianRandomDistributionParameters();
                if (object.mean != null)
                    message.mean = Number(object.mean);
                if (object.standardDeviation != null)
                    message.standardDeviation = Number(object.standardDeviation);
                return message;
            };

            /**
             * Creates a plain object from a GaussianRandomDistributionParameters message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {skymel.modelio.GaussianRandomDistributionParameters} message GaussianRandomDistributionParameters
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GaussianRandomDistributionParameters.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.mean = 0;
                    object.standardDeviation = 0;
                }
                if (message.mean != null && message.hasOwnProperty("mean"))
                    object.mean = options.json && !isFinite(message.mean) ? String(message.mean) : message.mean;
                if (message.standardDeviation != null && message.hasOwnProperty("standardDeviation"))
                    object.standardDeviation = options.json && !isFinite(message.standardDeviation) ? String(message.standardDeviation) : message.standardDeviation;
                return object;
            };

            /**
             * Converts this GaussianRandomDistributionParameters to JSON.
             * @function toJSON
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GaussianRandomDistributionParameters.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for GaussianRandomDistributionParameters
             * @function getTypeUrl
             * @memberof skymel.modelio.GaussianRandomDistributionParameters
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            GaussianRandomDistributionParameters.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.GaussianRandomDistributionParameters";
            };

            return GaussianRandomDistributionParameters;
        })();

        modelio.NumericValueGenerator = (function() {

            /**
             * Properties of a NumericValueGenerator.
             * @memberof skymel.modelio
             * @interface INumericValueGenerator
             * @property {skymel.modelio.NumericValueGenerator.NumericValueGeneratorType|null} [generatorType] NumericValueGenerator generatorType
             * @property {number|null} [assignedValue] NumericValueGenerator assignedValue
             * @property {skymel.modelio.IUniformRandomDistributionParameters|null} [uniformRandomDistributionParameters] NumericValueGenerator uniformRandomDistributionParameters
             * @property {skymel.modelio.IGaussianRandomDistributionParameters|null} [gaussianRandomDistributionParameters] NumericValueGenerator gaussianRandomDistributionParameters
             */

            /**
             * Constructs a new NumericValueGenerator.
             * @memberof skymel.modelio
             * @classdesc Represents a NumericValueGenerator.
             * @implements INumericValueGenerator
             * @constructor
             * @param {skymel.modelio.INumericValueGenerator=} [properties] Properties to set
             */
            function NumericValueGenerator(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NumericValueGenerator generatorType.
             * @member {skymel.modelio.NumericValueGenerator.NumericValueGeneratorType} generatorType
             * @memberof skymel.modelio.NumericValueGenerator
             * @instance
             */
            NumericValueGenerator.prototype.generatorType = 0;

            /**
             * NumericValueGenerator assignedValue.
             * @member {number|null|undefined} assignedValue
             * @memberof skymel.modelio.NumericValueGenerator
             * @instance
             */
            NumericValueGenerator.prototype.assignedValue = null;

            /**
             * NumericValueGenerator uniformRandomDistributionParameters.
             * @member {skymel.modelio.IUniformRandomDistributionParameters|null|undefined} uniformRandomDistributionParameters
             * @memberof skymel.modelio.NumericValueGenerator
             * @instance
             */
            NumericValueGenerator.prototype.uniformRandomDistributionParameters = null;

            /**
             * NumericValueGenerator gaussianRandomDistributionParameters.
             * @member {skymel.modelio.IGaussianRandomDistributionParameters|null|undefined} gaussianRandomDistributionParameters
             * @memberof skymel.modelio.NumericValueGenerator
             * @instance
             */
            NumericValueGenerator.prototype.gaussianRandomDistributionParameters = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * NumericValueGenerator numericValueGeneratorParameters.
             * @member {"assignedValue"|"uniformRandomDistributionParameters"|"gaussianRandomDistributionParameters"|undefined} numericValueGeneratorParameters
             * @memberof skymel.modelio.NumericValueGenerator
             * @instance
             */
            Object.defineProperty(NumericValueGenerator.prototype, "numericValueGeneratorParameters", {
                get: $util.oneOfGetter($oneOfFields = ["assignedValue", "uniformRandomDistributionParameters", "gaussianRandomDistributionParameters"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Creates a new NumericValueGenerator instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {skymel.modelio.INumericValueGenerator=} [properties] Properties to set
             * @returns {skymel.modelio.NumericValueGenerator} NumericValueGenerator instance
             */
            NumericValueGenerator.create = function create(properties) {
                return new NumericValueGenerator(properties);
            };

            /**
             * Encodes the specified NumericValueGenerator message. Does not implicitly {@link skymel.modelio.NumericValueGenerator.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {skymel.modelio.INumericValueGenerator} message NumericValueGenerator message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NumericValueGenerator.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.generatorType != null && Object.hasOwnProperty.call(message, "generatorType"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.generatorType);
                if (message.assignedValue != null && Object.hasOwnProperty.call(message, "assignedValue"))
                    writer.uint32(/* id 2, wireType 1 =*/17).double(message.assignedValue);
                if (message.uniformRandomDistributionParameters != null && Object.hasOwnProperty.call(message, "uniformRandomDistributionParameters"))
                    $root.skymel.modelio.UniformRandomDistributionParameters.encode(message.uniformRandomDistributionParameters, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.gaussianRandomDistributionParameters != null && Object.hasOwnProperty.call(message, "gaussianRandomDistributionParameters"))
                    $root.skymel.modelio.GaussianRandomDistributionParameters.encode(message.gaussianRandomDistributionParameters, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified NumericValueGenerator message, length delimited. Does not implicitly {@link skymel.modelio.NumericValueGenerator.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {skymel.modelio.INumericValueGenerator} message NumericValueGenerator message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NumericValueGenerator.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NumericValueGenerator message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NumericValueGenerator} NumericValueGenerator
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NumericValueGenerator.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NumericValueGenerator();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.generatorType = reader.int32();
                            break;
                        }
                    case 2: {
                            message.assignedValue = reader.double();
                            break;
                        }
                    case 3: {
                            message.uniformRandomDistributionParameters = $root.skymel.modelio.UniformRandomDistributionParameters.decode(reader, reader.uint32());
                            break;
                        }
                    case 4: {
                            message.gaussianRandomDistributionParameters = $root.skymel.modelio.GaussianRandomDistributionParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NumericValueGenerator message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NumericValueGenerator} NumericValueGenerator
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NumericValueGenerator.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NumericValueGenerator message.
             * @function verify
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NumericValueGenerator.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                var properties = {};
                if (message.generatorType != null && message.hasOwnProperty("generatorType"))
                    switch (message.generatorType) {
                    default:
                        return "generatorType: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                if (message.assignedValue != null && message.hasOwnProperty("assignedValue")) {
                    properties.numericValueGeneratorParameters = 1;
                    if (typeof message.assignedValue !== "number")
                        return "assignedValue: number expected";
                }
                if (message.uniformRandomDistributionParameters != null && message.hasOwnProperty("uniformRandomDistributionParameters")) {
                    if (properties.numericValueGeneratorParameters === 1)
                        return "numericValueGeneratorParameters: multiple values";
                    properties.numericValueGeneratorParameters = 1;
                    {
                        var error = $root.skymel.modelio.UniformRandomDistributionParameters.verify(message.uniformRandomDistributionParameters);
                        if (error)
                            return "uniformRandomDistributionParameters." + error;
                    }
                }
                if (message.gaussianRandomDistributionParameters != null && message.hasOwnProperty("gaussianRandomDistributionParameters")) {
                    if (properties.numericValueGeneratorParameters === 1)
                        return "numericValueGeneratorParameters: multiple values";
                    properties.numericValueGeneratorParameters = 1;
                    {
                        var error = $root.skymel.modelio.GaussianRandomDistributionParameters.verify(message.gaussianRandomDistributionParameters);
                        if (error)
                            return "gaussianRandomDistributionParameters." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a NumericValueGenerator message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NumericValueGenerator} NumericValueGenerator
             */
            NumericValueGenerator.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NumericValueGenerator)
                    return object;
                var message = new $root.skymel.modelio.NumericValueGenerator();
                switch (object.generatorType) {
                default:
                    if (typeof object.generatorType === "number") {
                        message.generatorType = object.generatorType;
                        break;
                    }
                    break;
                case "UNKNOWN_GENERATOR":
                case 0:
                    message.generatorType = 0;
                    break;
                case "ASSIGNED_VALUE_REPEATS":
                case 1:
                    message.generatorType = 1;
                    break;
                case "UNIFORM_RANDOM_DISTRIBUTION":
                case 2:
                    message.generatorType = 2;
                    break;
                case "GAUSSIAN_RANDOM_DISTRIBUTION":
                case 3:
                    message.generatorType = 3;
                    break;
                }
                if (object.assignedValue != null)
                    message.assignedValue = Number(object.assignedValue);
                if (object.uniformRandomDistributionParameters != null) {
                    if (typeof object.uniformRandomDistributionParameters !== "object")
                        throw TypeError(".skymel.modelio.NumericValueGenerator.uniformRandomDistributionParameters: object expected");
                    message.uniformRandomDistributionParameters = $root.skymel.modelio.UniformRandomDistributionParameters.fromObject(object.uniformRandomDistributionParameters);
                }
                if (object.gaussianRandomDistributionParameters != null) {
                    if (typeof object.gaussianRandomDistributionParameters !== "object")
                        throw TypeError(".skymel.modelio.NumericValueGenerator.gaussianRandomDistributionParameters: object expected");
                    message.gaussianRandomDistributionParameters = $root.skymel.modelio.GaussianRandomDistributionParameters.fromObject(object.gaussianRandomDistributionParameters);
                }
                return message;
            };

            /**
             * Creates a plain object from a NumericValueGenerator message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {skymel.modelio.NumericValueGenerator} message NumericValueGenerator
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NumericValueGenerator.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.generatorType = options.enums === String ? "UNKNOWN_GENERATOR" : 0;
                if (message.generatorType != null && message.hasOwnProperty("generatorType"))
                    object.generatorType = options.enums === String ? $root.skymel.modelio.NumericValueGenerator.NumericValueGeneratorType[message.generatorType] === undefined ? message.generatorType : $root.skymel.modelio.NumericValueGenerator.NumericValueGeneratorType[message.generatorType] : message.generatorType;
                if (message.assignedValue != null && message.hasOwnProperty("assignedValue")) {
                    object.assignedValue = options.json && !isFinite(message.assignedValue) ? String(message.assignedValue) : message.assignedValue;
                    if (options.oneofs)
                        object.numericValueGeneratorParameters = "assignedValue";
                }
                if (message.uniformRandomDistributionParameters != null && message.hasOwnProperty("uniformRandomDistributionParameters")) {
                    object.uniformRandomDistributionParameters = $root.skymel.modelio.UniformRandomDistributionParameters.toObject(message.uniformRandomDistributionParameters, options);
                    if (options.oneofs)
                        object.numericValueGeneratorParameters = "uniformRandomDistributionParameters";
                }
                if (message.gaussianRandomDistributionParameters != null && message.hasOwnProperty("gaussianRandomDistributionParameters")) {
                    object.gaussianRandomDistributionParameters = $root.skymel.modelio.GaussianRandomDistributionParameters.toObject(message.gaussianRandomDistributionParameters, options);
                    if (options.oneofs)
                        object.numericValueGeneratorParameters = "gaussianRandomDistributionParameters";
                }
                return object;
            };

            /**
             * Converts this NumericValueGenerator to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NumericValueGenerator
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NumericValueGenerator.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NumericValueGenerator
             * @function getTypeUrl
             * @memberof skymel.modelio.NumericValueGenerator
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NumericValueGenerator.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NumericValueGenerator";
            };

            /**
             * NumericValueGeneratorType enum.
             * @name skymel.modelio.NumericValueGenerator.NumericValueGeneratorType
             * @enum {number}
             * @property {number} UNKNOWN_GENERATOR=0 UNKNOWN_GENERATOR value
             * @property {number} ASSIGNED_VALUE_REPEATS=1 ASSIGNED_VALUE_REPEATS value
             * @property {number} UNIFORM_RANDOM_DISTRIBUTION=2 UNIFORM_RANDOM_DISTRIBUTION value
             * @property {number} GAUSSIAN_RANDOM_DISTRIBUTION=3 GAUSSIAN_RANDOM_DISTRIBUTION value
             */
            NumericValueGenerator.NumericValueGeneratorType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_GENERATOR"] = 0;
                values[valuesById[1] = "ASSIGNED_VALUE_REPEATS"] = 1;
                values[valuesById[2] = "UNIFORM_RANDOM_DISTRIBUTION"] = 2;
                values[valuesById[3] = "GAUSSIAN_RANDOM_DISTRIBUTION"] = 3;
                return values;
            })();

            return NumericValueGenerator;
        })();

        modelio.ArrayPaddingParameters = (function() {

            /**
             * Properties of an ArrayPaddingParameters.
             * @memberof skymel.modelio
             * @interface IArrayPaddingParameters
             * @property {skymel.modelio.INumericValueGenerator|null} [paddingGenerator] ArrayPaddingParameters paddingGenerator
             * @property {Array.<number>|null} [paddedArrayShape] ArrayPaddingParameters paddedArrayShape
             */

            /**
             * Constructs a new ArrayPaddingParameters.
             * @memberof skymel.modelio
             * @classdesc Represents an ArrayPaddingParameters.
             * @implements IArrayPaddingParameters
             * @constructor
             * @param {skymel.modelio.IArrayPaddingParameters=} [properties] Properties to set
             */
            function ArrayPaddingParameters(properties) {
                this.paddedArrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ArrayPaddingParameters paddingGenerator.
             * @member {skymel.modelio.INumericValueGenerator|null|undefined} paddingGenerator
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @instance
             */
            ArrayPaddingParameters.prototype.paddingGenerator = null;

            /**
             * ArrayPaddingParameters paddedArrayShape.
             * @member {Array.<number>} paddedArrayShape
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @instance
             */
            ArrayPaddingParameters.prototype.paddedArrayShape = $util.emptyArray;

            /**
             * Creates a new ArrayPaddingParameters instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {skymel.modelio.IArrayPaddingParameters=} [properties] Properties to set
             * @returns {skymel.modelio.ArrayPaddingParameters} ArrayPaddingParameters instance
             */
            ArrayPaddingParameters.create = function create(properties) {
                return new ArrayPaddingParameters(properties);
            };

            /**
             * Encodes the specified ArrayPaddingParameters message. Does not implicitly {@link skymel.modelio.ArrayPaddingParameters.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {skymel.modelio.IArrayPaddingParameters} message ArrayPaddingParameters message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ArrayPaddingParameters.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.paddingGenerator != null && Object.hasOwnProperty.call(message, "paddingGenerator"))
                    $root.skymel.modelio.NumericValueGenerator.encode(message.paddingGenerator, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.paddedArrayShape != null && message.paddedArrayShape.length) {
                    writer.uint32(/* id 2, wireType 2 =*/18).fork();
                    for (var i = 0; i < message.paddedArrayShape.length; ++i)
                        writer.int32(message.paddedArrayShape[i]);
                    writer.ldelim();
                }
                return writer;
            };

            /**
             * Encodes the specified ArrayPaddingParameters message, length delimited. Does not implicitly {@link skymel.modelio.ArrayPaddingParameters.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {skymel.modelio.IArrayPaddingParameters} message ArrayPaddingParameters message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ArrayPaddingParameters.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an ArrayPaddingParameters message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ArrayPaddingParameters} ArrayPaddingParameters
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ArrayPaddingParameters.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ArrayPaddingParameters();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.paddingGenerator = $root.skymel.modelio.NumericValueGenerator.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            if (!(message.paddedArrayShape && message.paddedArrayShape.length))
                                message.paddedArrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.paddedArrayShape.push(reader.int32());
                            } else
                                message.paddedArrayShape.push(reader.int32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an ArrayPaddingParameters message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ArrayPaddingParameters} ArrayPaddingParameters
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ArrayPaddingParameters.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an ArrayPaddingParameters message.
             * @function verify
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ArrayPaddingParameters.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.paddingGenerator != null && message.hasOwnProperty("paddingGenerator")) {
                    var error = $root.skymel.modelio.NumericValueGenerator.verify(message.paddingGenerator);
                    if (error)
                        return "paddingGenerator." + error;
                }
                if (message.paddedArrayShape != null && message.hasOwnProperty("paddedArrayShape")) {
                    if (!Array.isArray(message.paddedArrayShape))
                        return "paddedArrayShape: array expected";
                    for (var i = 0; i < message.paddedArrayShape.length; ++i)
                        if (!$util.isInteger(message.paddedArrayShape[i]))
                            return "paddedArrayShape: integer[] expected";
                }
                return null;
            };

            /**
             * Creates an ArrayPaddingParameters message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ArrayPaddingParameters} ArrayPaddingParameters
             */
            ArrayPaddingParameters.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ArrayPaddingParameters)
                    return object;
                var message = new $root.skymel.modelio.ArrayPaddingParameters();
                if (object.paddingGenerator != null) {
                    if (typeof object.paddingGenerator !== "object")
                        throw TypeError(".skymel.modelio.ArrayPaddingParameters.paddingGenerator: object expected");
                    message.paddingGenerator = $root.skymel.modelio.NumericValueGenerator.fromObject(object.paddingGenerator);
                }
                if (object.paddedArrayShape) {
                    if (!Array.isArray(object.paddedArrayShape))
                        throw TypeError(".skymel.modelio.ArrayPaddingParameters.paddedArrayShape: array expected");
                    message.paddedArrayShape = [];
                    for (var i = 0; i < object.paddedArrayShape.length; ++i)
                        message.paddedArrayShape[i] = object.paddedArrayShape[i] | 0;
                }
                return message;
            };

            /**
             * Creates a plain object from an ArrayPaddingParameters message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {skymel.modelio.ArrayPaddingParameters} message ArrayPaddingParameters
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ArrayPaddingParameters.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.paddedArrayShape = [];
                if (options.defaults)
                    object.paddingGenerator = null;
                if (message.paddingGenerator != null && message.hasOwnProperty("paddingGenerator"))
                    object.paddingGenerator = $root.skymel.modelio.NumericValueGenerator.toObject(message.paddingGenerator, options);
                if (message.paddedArrayShape && message.paddedArrayShape.length) {
                    object.paddedArrayShape = [];
                    for (var j = 0; j < message.paddedArrayShape.length; ++j)
                        object.paddedArrayShape[j] = message.paddedArrayShape[j];
                }
                return object;
            };

            /**
             * Converts this ArrayPaddingParameters to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ArrayPaddingParameters.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ArrayPaddingParameters
             * @function getTypeUrl
             * @memberof skymel.modelio.ArrayPaddingParameters
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ArrayPaddingParameters.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ArrayPaddingParameters";
            };

            return ArrayPaddingParameters;
        })();

        modelio.NodeOutputFloat = (function() {

            /**
             * Properties of a NodeOutputFloat.
             * @memberof skymel.modelio
             * @interface INodeOutputFloat
             * @property {string|null} [nodeName] NodeOutputFloat nodeName
             * @property {number|null} [nodeId] NodeOutputFloat nodeId
             * @property {Array.<number>|null} [outputFlatArray] NodeOutputFloat outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputFloat arrayShape
             * @property {skymel.modelio.IArrayPaddingParameters|null} [arrayPaddingParameters] NodeOutputFloat arrayPaddingParameters
             */

            /**
             * Constructs a new NodeOutputFloat.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputFloat.
             * @implements INodeOutputFloat
             * @constructor
             * @param {skymel.modelio.INodeOutputFloat=} [properties] Properties to set
             */
            function NodeOutputFloat(properties) {
                this.outputFlatArray = [];
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputFloat nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputFloat
             * @instance
             */
            NodeOutputFloat.prototype.nodeName = "";

            /**
             * NodeOutputFloat nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputFloat
             * @instance
             */
            NodeOutputFloat.prototype.nodeId = 0;

            /**
             * NodeOutputFloat outputFlatArray.
             * @member {Array.<number>} outputFlatArray
             * @memberof skymel.modelio.NodeOutputFloat
             * @instance
             */
            NodeOutputFloat.prototype.outputFlatArray = $util.emptyArray;

            /**
             * NodeOutputFloat arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputFloat
             * @instance
             */
            NodeOutputFloat.prototype.arrayShape = $util.emptyArray;

            /**
             * NodeOutputFloat arrayPaddingParameters.
             * @member {skymel.modelio.IArrayPaddingParameters|null|undefined} arrayPaddingParameters
             * @memberof skymel.modelio.NodeOutputFloat
             * @instance
             */
            NodeOutputFloat.prototype.arrayPaddingParameters = null;

            /**
             * Creates a new NodeOutputFloat instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {skymel.modelio.INodeOutputFloat=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputFloat} NodeOutputFloat instance
             */
            NodeOutputFloat.create = function create(properties) {
                return new NodeOutputFloat(properties);
            };

            /**
             * Encodes the specified NodeOutputFloat message. Does not implicitly {@link skymel.modelio.NodeOutputFloat.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {skymel.modelio.INodeOutputFloat} message NodeOutputFloat message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputFloat.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && message.outputFlatArray.length) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork();
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        writer.float(message.outputFlatArray[i]);
                    writer.ldelim();
                }
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                if (message.arrayPaddingParameters != null && Object.hasOwnProperty.call(message, "arrayPaddingParameters"))
                    $root.skymel.modelio.ArrayPaddingParameters.encode(message.arrayPaddingParameters, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified NodeOutputFloat message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputFloat.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {skymel.modelio.INodeOutputFloat} message NodeOutputFloat message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputFloat.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputFloat message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputFloat} NodeOutputFloat
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputFloat.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputFloat();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            if (!(message.outputFlatArray && message.outputFlatArray.length))
                                message.outputFlatArray = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.outputFlatArray.push(reader.float());
                            } else
                                message.outputFlatArray.push(reader.float());
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    case 5: {
                            message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputFloat message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputFloat} NodeOutputFloat
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputFloat.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputFloat message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputFloat.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray")) {
                    if (!Array.isArray(message.outputFlatArray))
                        return "outputFlatArray: array expected";
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        if (typeof message.outputFlatArray[i] !== "number")
                            return "outputFlatArray: number[] expected";
                }
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters")) {
                    var error = $root.skymel.modelio.ArrayPaddingParameters.verify(message.arrayPaddingParameters);
                    if (error)
                        return "arrayPaddingParameters." + error;
                }
                return null;
            };

            /**
             * Creates a NodeOutputFloat message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputFloat} NodeOutputFloat
             */
            NodeOutputFloat.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputFloat)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputFloat();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray) {
                    if (!Array.isArray(object.outputFlatArray))
                        throw TypeError(".skymel.modelio.NodeOutputFloat.outputFlatArray: array expected");
                    message.outputFlatArray = [];
                    for (var i = 0; i < object.outputFlatArray.length; ++i)
                        message.outputFlatArray[i] = Number(object.outputFlatArray[i]);
                }
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputFloat.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                if (object.arrayPaddingParameters != null) {
                    if (typeof object.arrayPaddingParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputFloat.arrayPaddingParameters: object expected");
                    message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.fromObject(object.arrayPaddingParameters);
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputFloat message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {skymel.modelio.NodeOutputFloat} message NodeOutputFloat
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputFloat.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.outputFlatArray = [];
                    object.arrayShape = [];
                }
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                    object.arrayPaddingParameters = null;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray && message.outputFlatArray.length) {
                    object.outputFlatArray = [];
                    for (var j = 0; j < message.outputFlatArray.length; ++j)
                        object.outputFlatArray[j] = options.json && !isFinite(message.outputFlatArray[j]) ? String(message.outputFlatArray[j]) : message.outputFlatArray[j];
                }
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters"))
                    object.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.toObject(message.arrayPaddingParameters, options);
                return object;
            };

            /**
             * Converts this NodeOutputFloat to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputFloat
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputFloat.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputFloat
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputFloat
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputFloat.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputFloat";
            };

            return NodeOutputFloat;
        })();

        modelio.NodeOutputDouble = (function() {

            /**
             * Properties of a NodeOutputDouble.
             * @memberof skymel.modelio
             * @interface INodeOutputDouble
             * @property {string|null} [nodeName] NodeOutputDouble nodeName
             * @property {number|null} [nodeId] NodeOutputDouble nodeId
             * @property {Array.<number>|null} [outputFlatArray] NodeOutputDouble outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputDouble arrayShape
             * @property {skymel.modelio.IArrayPaddingParameters|null} [arrayPaddingParameters] NodeOutputDouble arrayPaddingParameters
             */

            /**
             * Constructs a new NodeOutputDouble.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputDouble.
             * @implements INodeOutputDouble
             * @constructor
             * @param {skymel.modelio.INodeOutputDouble=} [properties] Properties to set
             */
            function NodeOutputDouble(properties) {
                this.outputFlatArray = [];
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputDouble nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputDouble
             * @instance
             */
            NodeOutputDouble.prototype.nodeName = "";

            /**
             * NodeOutputDouble nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputDouble
             * @instance
             */
            NodeOutputDouble.prototype.nodeId = 0;

            /**
             * NodeOutputDouble outputFlatArray.
             * @member {Array.<number>} outputFlatArray
             * @memberof skymel.modelio.NodeOutputDouble
             * @instance
             */
            NodeOutputDouble.prototype.outputFlatArray = $util.emptyArray;

            /**
             * NodeOutputDouble arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputDouble
             * @instance
             */
            NodeOutputDouble.prototype.arrayShape = $util.emptyArray;

            /**
             * NodeOutputDouble arrayPaddingParameters.
             * @member {skymel.modelio.IArrayPaddingParameters|null|undefined} arrayPaddingParameters
             * @memberof skymel.modelio.NodeOutputDouble
             * @instance
             */
            NodeOutputDouble.prototype.arrayPaddingParameters = null;

            /**
             * Creates a new NodeOutputDouble instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {skymel.modelio.INodeOutputDouble=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputDouble} NodeOutputDouble instance
             */
            NodeOutputDouble.create = function create(properties) {
                return new NodeOutputDouble(properties);
            };

            /**
             * Encodes the specified NodeOutputDouble message. Does not implicitly {@link skymel.modelio.NodeOutputDouble.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {skymel.modelio.INodeOutputDouble} message NodeOutputDouble message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputDouble.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && message.outputFlatArray.length) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork();
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        writer.double(message.outputFlatArray[i]);
                    writer.ldelim();
                }
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                if (message.arrayPaddingParameters != null && Object.hasOwnProperty.call(message, "arrayPaddingParameters"))
                    $root.skymel.modelio.ArrayPaddingParameters.encode(message.arrayPaddingParameters, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified NodeOutputDouble message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputDouble.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {skymel.modelio.INodeOutputDouble} message NodeOutputDouble message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputDouble.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputDouble message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputDouble} NodeOutputDouble
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputDouble.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputDouble();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            if (!(message.outputFlatArray && message.outputFlatArray.length))
                                message.outputFlatArray = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.outputFlatArray.push(reader.double());
                            } else
                                message.outputFlatArray.push(reader.double());
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    case 5: {
                            message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputDouble message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputDouble} NodeOutputDouble
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputDouble.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputDouble message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputDouble.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray")) {
                    if (!Array.isArray(message.outputFlatArray))
                        return "outputFlatArray: array expected";
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        if (typeof message.outputFlatArray[i] !== "number")
                            return "outputFlatArray: number[] expected";
                }
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters")) {
                    var error = $root.skymel.modelio.ArrayPaddingParameters.verify(message.arrayPaddingParameters);
                    if (error)
                        return "arrayPaddingParameters." + error;
                }
                return null;
            };

            /**
             * Creates a NodeOutputDouble message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputDouble} NodeOutputDouble
             */
            NodeOutputDouble.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputDouble)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputDouble();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray) {
                    if (!Array.isArray(object.outputFlatArray))
                        throw TypeError(".skymel.modelio.NodeOutputDouble.outputFlatArray: array expected");
                    message.outputFlatArray = [];
                    for (var i = 0; i < object.outputFlatArray.length; ++i)
                        message.outputFlatArray[i] = Number(object.outputFlatArray[i]);
                }
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputDouble.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                if (object.arrayPaddingParameters != null) {
                    if (typeof object.arrayPaddingParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputDouble.arrayPaddingParameters: object expected");
                    message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.fromObject(object.arrayPaddingParameters);
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputDouble message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {skymel.modelio.NodeOutputDouble} message NodeOutputDouble
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputDouble.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.outputFlatArray = [];
                    object.arrayShape = [];
                }
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                    object.arrayPaddingParameters = null;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray && message.outputFlatArray.length) {
                    object.outputFlatArray = [];
                    for (var j = 0; j < message.outputFlatArray.length; ++j)
                        object.outputFlatArray[j] = options.json && !isFinite(message.outputFlatArray[j]) ? String(message.outputFlatArray[j]) : message.outputFlatArray[j];
                }
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters"))
                    object.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.toObject(message.arrayPaddingParameters, options);
                return object;
            };

            /**
             * Converts this NodeOutputDouble to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputDouble
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputDouble.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputDouble
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputDouble
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputDouble.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputDouble";
            };

            return NodeOutputDouble;
        })();

        modelio.NodeOutputInt32 = (function() {

            /**
             * Properties of a NodeOutputInt32.
             * @memberof skymel.modelio
             * @interface INodeOutputInt32
             * @property {string|null} [nodeName] NodeOutputInt32 nodeName
             * @property {number|null} [nodeId] NodeOutputInt32 nodeId
             * @property {Array.<number>|null} [outputFlatArray] NodeOutputInt32 outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputInt32 arrayShape
             * @property {skymel.modelio.IArrayPaddingParameters|null} [arrayPaddingParameters] NodeOutputInt32 arrayPaddingParameters
             */

            /**
             * Constructs a new NodeOutputInt32.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputInt32.
             * @implements INodeOutputInt32
             * @constructor
             * @param {skymel.modelio.INodeOutputInt32=} [properties] Properties to set
             */
            function NodeOutputInt32(properties) {
                this.outputFlatArray = [];
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputInt32 nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputInt32
             * @instance
             */
            NodeOutputInt32.prototype.nodeName = "";

            /**
             * NodeOutputInt32 nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputInt32
             * @instance
             */
            NodeOutputInt32.prototype.nodeId = 0;

            /**
             * NodeOutputInt32 outputFlatArray.
             * @member {Array.<number>} outputFlatArray
             * @memberof skymel.modelio.NodeOutputInt32
             * @instance
             */
            NodeOutputInt32.prototype.outputFlatArray = $util.emptyArray;

            /**
             * NodeOutputInt32 arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputInt32
             * @instance
             */
            NodeOutputInt32.prototype.arrayShape = $util.emptyArray;

            /**
             * NodeOutputInt32 arrayPaddingParameters.
             * @member {skymel.modelio.IArrayPaddingParameters|null|undefined} arrayPaddingParameters
             * @memberof skymel.modelio.NodeOutputInt32
             * @instance
             */
            NodeOutputInt32.prototype.arrayPaddingParameters = null;

            /**
             * Creates a new NodeOutputInt32 instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {skymel.modelio.INodeOutputInt32=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputInt32} NodeOutputInt32 instance
             */
            NodeOutputInt32.create = function create(properties) {
                return new NodeOutputInt32(properties);
            };

            /**
             * Encodes the specified NodeOutputInt32 message. Does not implicitly {@link skymel.modelio.NodeOutputInt32.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {skymel.modelio.INodeOutputInt32} message NodeOutputInt32 message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputInt32.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && message.outputFlatArray.length) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork();
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        writer.int32(message.outputFlatArray[i]);
                    writer.ldelim();
                }
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                if (message.arrayPaddingParameters != null && Object.hasOwnProperty.call(message, "arrayPaddingParameters"))
                    $root.skymel.modelio.ArrayPaddingParameters.encode(message.arrayPaddingParameters, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified NodeOutputInt32 message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputInt32.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {skymel.modelio.INodeOutputInt32} message NodeOutputInt32 message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputInt32.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputInt32 message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputInt32} NodeOutputInt32
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputInt32.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputInt32();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            if (!(message.outputFlatArray && message.outputFlatArray.length))
                                message.outputFlatArray = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.outputFlatArray.push(reader.int32());
                            } else
                                message.outputFlatArray.push(reader.int32());
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    case 5: {
                            message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputInt32 message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputInt32} NodeOutputInt32
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputInt32.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputInt32 message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputInt32.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray")) {
                    if (!Array.isArray(message.outputFlatArray))
                        return "outputFlatArray: array expected";
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        if (!$util.isInteger(message.outputFlatArray[i]))
                            return "outputFlatArray: integer[] expected";
                }
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters")) {
                    var error = $root.skymel.modelio.ArrayPaddingParameters.verify(message.arrayPaddingParameters);
                    if (error)
                        return "arrayPaddingParameters." + error;
                }
                return null;
            };

            /**
             * Creates a NodeOutputInt32 message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputInt32} NodeOutputInt32
             */
            NodeOutputInt32.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputInt32)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputInt32();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray) {
                    if (!Array.isArray(object.outputFlatArray))
                        throw TypeError(".skymel.modelio.NodeOutputInt32.outputFlatArray: array expected");
                    message.outputFlatArray = [];
                    for (var i = 0; i < object.outputFlatArray.length; ++i)
                        message.outputFlatArray[i] = object.outputFlatArray[i] | 0;
                }
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputInt32.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                if (object.arrayPaddingParameters != null) {
                    if (typeof object.arrayPaddingParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputInt32.arrayPaddingParameters: object expected");
                    message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.fromObject(object.arrayPaddingParameters);
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputInt32 message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {skymel.modelio.NodeOutputInt32} message NodeOutputInt32
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputInt32.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.outputFlatArray = [];
                    object.arrayShape = [];
                }
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                    object.arrayPaddingParameters = null;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray && message.outputFlatArray.length) {
                    object.outputFlatArray = [];
                    for (var j = 0; j < message.outputFlatArray.length; ++j)
                        object.outputFlatArray[j] = message.outputFlatArray[j];
                }
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters"))
                    object.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.toObject(message.arrayPaddingParameters, options);
                return object;
            };

            /**
             * Converts this NodeOutputInt32 to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputInt32
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputInt32.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputInt32
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputInt32
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputInt32.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputInt32";
            };

            return NodeOutputInt32;
        })();

        modelio.NodeOutputInt64 = (function() {

            /**
             * Properties of a NodeOutputInt64.
             * @memberof skymel.modelio
             * @interface INodeOutputInt64
             * @property {string|null} [nodeName] NodeOutputInt64 nodeName
             * @property {number|null} [nodeId] NodeOutputInt64 nodeId
             * @property {Array.<number|Long>|null} [outputFlatArray] NodeOutputInt64 outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputInt64 arrayShape
             * @property {skymel.modelio.IArrayPaddingParameters|null} [arrayPaddingParameters] NodeOutputInt64 arrayPaddingParameters
             */

            /**
             * Constructs a new NodeOutputInt64.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputInt64.
             * @implements INodeOutputInt64
             * @constructor
             * @param {skymel.modelio.INodeOutputInt64=} [properties] Properties to set
             */
            function NodeOutputInt64(properties) {
                this.outputFlatArray = [];
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputInt64 nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputInt64
             * @instance
             */
            NodeOutputInt64.prototype.nodeName = "";

            /**
             * NodeOutputInt64 nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputInt64
             * @instance
             */
            NodeOutputInt64.prototype.nodeId = 0;

            /**
             * NodeOutputInt64 outputFlatArray.
             * @member {Array.<number|Long>} outputFlatArray
             * @memberof skymel.modelio.NodeOutputInt64
             * @instance
             */
            NodeOutputInt64.prototype.outputFlatArray = $util.emptyArray;

            /**
             * NodeOutputInt64 arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputInt64
             * @instance
             */
            NodeOutputInt64.prototype.arrayShape = $util.emptyArray;

            /**
             * NodeOutputInt64 arrayPaddingParameters.
             * @member {skymel.modelio.IArrayPaddingParameters|null|undefined} arrayPaddingParameters
             * @memberof skymel.modelio.NodeOutputInt64
             * @instance
             */
            NodeOutputInt64.prototype.arrayPaddingParameters = null;

            /**
             * Creates a new NodeOutputInt64 instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {skymel.modelio.INodeOutputInt64=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputInt64} NodeOutputInt64 instance
             */
            NodeOutputInt64.create = function create(properties) {
                return new NodeOutputInt64(properties);
            };

            /**
             * Encodes the specified NodeOutputInt64 message. Does not implicitly {@link skymel.modelio.NodeOutputInt64.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {skymel.modelio.INodeOutputInt64} message NodeOutputInt64 message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputInt64.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && message.outputFlatArray.length) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork();
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        writer.int64(message.outputFlatArray[i]);
                    writer.ldelim();
                }
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                if (message.arrayPaddingParameters != null && Object.hasOwnProperty.call(message, "arrayPaddingParameters"))
                    $root.skymel.modelio.ArrayPaddingParameters.encode(message.arrayPaddingParameters, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified NodeOutputInt64 message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputInt64.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {skymel.modelio.INodeOutputInt64} message NodeOutputInt64 message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputInt64.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputInt64 message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputInt64} NodeOutputInt64
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputInt64.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputInt64();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            if (!(message.outputFlatArray && message.outputFlatArray.length))
                                message.outputFlatArray = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.outputFlatArray.push(reader.int64());
                            } else
                                message.outputFlatArray.push(reader.int64());
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    case 5: {
                            message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputInt64 message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputInt64} NodeOutputInt64
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputInt64.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputInt64 message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputInt64.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray")) {
                    if (!Array.isArray(message.outputFlatArray))
                        return "outputFlatArray: array expected";
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        if (!$util.isInteger(message.outputFlatArray[i]) && !(message.outputFlatArray[i] && $util.isInteger(message.outputFlatArray[i].low) && $util.isInteger(message.outputFlatArray[i].high)))
                            return "outputFlatArray: integer|Long[] expected";
                }
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters")) {
                    var error = $root.skymel.modelio.ArrayPaddingParameters.verify(message.arrayPaddingParameters);
                    if (error)
                        return "arrayPaddingParameters." + error;
                }
                return null;
            };

            /**
             * Creates a NodeOutputInt64 message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputInt64} NodeOutputInt64
             */
            NodeOutputInt64.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputInt64)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputInt64();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray) {
                    if (!Array.isArray(object.outputFlatArray))
                        throw TypeError(".skymel.modelio.NodeOutputInt64.outputFlatArray: array expected");
                    message.outputFlatArray = [];
                    for (var i = 0; i < object.outputFlatArray.length; ++i)
                        if ($util.Long)
                            (message.outputFlatArray[i] = $util.Long.fromValue(object.outputFlatArray[i])).unsigned = false;
                        else if (typeof object.outputFlatArray[i] === "string")
                            message.outputFlatArray[i] = parseInt(object.outputFlatArray[i], 10);
                        else if (typeof object.outputFlatArray[i] === "number")
                            message.outputFlatArray[i] = object.outputFlatArray[i];
                        else if (typeof object.outputFlatArray[i] === "object")
                            message.outputFlatArray[i] = new $util.LongBits(object.outputFlatArray[i].low >>> 0, object.outputFlatArray[i].high >>> 0).toNumber();
                }
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputInt64.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                if (object.arrayPaddingParameters != null) {
                    if (typeof object.arrayPaddingParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputInt64.arrayPaddingParameters: object expected");
                    message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.fromObject(object.arrayPaddingParameters);
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputInt64 message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {skymel.modelio.NodeOutputInt64} message NodeOutputInt64
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputInt64.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.outputFlatArray = [];
                    object.arrayShape = [];
                }
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                    object.arrayPaddingParameters = null;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray && message.outputFlatArray.length) {
                    object.outputFlatArray = [];
                    for (var j = 0; j < message.outputFlatArray.length; ++j)
                        if (typeof message.outputFlatArray[j] === "number")
                            object.outputFlatArray[j] = options.longs === String ? String(message.outputFlatArray[j]) : message.outputFlatArray[j];
                        else
                            object.outputFlatArray[j] = options.longs === String ? $util.Long.prototype.toString.call(message.outputFlatArray[j]) : options.longs === Number ? new $util.LongBits(message.outputFlatArray[j].low >>> 0, message.outputFlatArray[j].high >>> 0).toNumber() : message.outputFlatArray[j];
                }
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters"))
                    object.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.toObject(message.arrayPaddingParameters, options);
                return object;
            };

            /**
             * Converts this NodeOutputInt64 to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputInt64
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputInt64.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputInt64
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputInt64
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputInt64.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputInt64";
            };

            return NodeOutputInt64;
        })();

        modelio.NodeOutputBytes = (function() {

            /**
             * Properties of a NodeOutputBytes.
             * @memberof skymel.modelio
             * @interface INodeOutputBytes
             * @property {string|null} [nodeName] NodeOutputBytes nodeName
             * @property {number|null} [nodeId] NodeOutputBytes nodeId
             * @property {Uint8Array|null} [outputFlatArray] NodeOutputBytes outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputBytes arrayShape
             */

            /**
             * Constructs a new NodeOutputBytes.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputBytes.
             * @implements INodeOutputBytes
             * @constructor
             * @param {skymel.modelio.INodeOutputBytes=} [properties] Properties to set
             */
            function NodeOutputBytes(properties) {
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputBytes nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputBytes
             * @instance
             */
            NodeOutputBytes.prototype.nodeName = "";

            /**
             * NodeOutputBytes nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputBytes
             * @instance
             */
            NodeOutputBytes.prototype.nodeId = 0;

            /**
             * NodeOutputBytes outputFlatArray.
             * @member {Uint8Array} outputFlatArray
             * @memberof skymel.modelio.NodeOutputBytes
             * @instance
             */
            NodeOutputBytes.prototype.outputFlatArray = $util.newBuffer([]);

            /**
             * NodeOutputBytes arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputBytes
             * @instance
             */
            NodeOutputBytes.prototype.arrayShape = $util.emptyArray;

            /**
             * Creates a new NodeOutputBytes instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {skymel.modelio.INodeOutputBytes=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputBytes} NodeOutputBytes instance
             */
            NodeOutputBytes.create = function create(properties) {
                return new NodeOutputBytes(properties);
            };

            /**
             * Encodes the specified NodeOutputBytes message. Does not implicitly {@link skymel.modelio.NodeOutputBytes.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {skymel.modelio.INodeOutputBytes} message NodeOutputBytes message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputBytes.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && Object.hasOwnProperty.call(message, "outputFlatArray"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.outputFlatArray);
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                return writer;
            };

            /**
             * Encodes the specified NodeOutputBytes message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputBytes.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {skymel.modelio.INodeOutputBytes} message NodeOutputBytes message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputBytes.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputBytes message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputBytes} NodeOutputBytes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputBytes.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputBytes();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.outputFlatArray = reader.bytes();
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputBytes message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputBytes} NodeOutputBytes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputBytes.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputBytes message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputBytes.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray"))
                    if (!(message.outputFlatArray && typeof message.outputFlatArray.length === "number" || $util.isString(message.outputFlatArray)))
                        return "outputFlatArray: buffer expected";
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                return null;
            };

            /**
             * Creates a NodeOutputBytes message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputBytes} NodeOutputBytes
             */
            NodeOutputBytes.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputBytes)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputBytes();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray != null)
                    if (typeof object.outputFlatArray === "string")
                        $util.base64.decode(object.outputFlatArray, message.outputFlatArray = $util.newBuffer($util.base64.length(object.outputFlatArray)), 0);
                    else if (object.outputFlatArray.length >= 0)
                        message.outputFlatArray = object.outputFlatArray;
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputBytes.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputBytes message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {skymel.modelio.NodeOutputBytes} message NodeOutputBytes
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputBytes.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.arrayShape = [];
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                    if (options.bytes === String)
                        object.outputFlatArray = "";
                    else {
                        object.outputFlatArray = [];
                        if (options.bytes !== Array)
                            object.outputFlatArray = $util.newBuffer(object.outputFlatArray);
                    }
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray"))
                    object.outputFlatArray = options.bytes === String ? $util.base64.encode(message.outputFlatArray, 0, message.outputFlatArray.length) : options.bytes === Array ? Array.prototype.slice.call(message.outputFlatArray) : message.outputFlatArray;
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                return object;
            };

            /**
             * Converts this NodeOutputBytes to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputBytes
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputBytes.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputBytes
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputBytes
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputBytes.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputBytes";
            };

            return NodeOutputBytes;
        })();

        modelio.NodeOutputString = (function() {

            /**
             * Properties of a NodeOutputString.
             * @memberof skymel.modelio
             * @interface INodeOutputString
             * @property {string|null} [nodeName] NodeOutputString nodeName
             * @property {number|null} [nodeId] NodeOutputString nodeId
             * @property {Array.<string>|null} [outputStrings] NodeOutputString outputStrings
             */

            /**
             * Constructs a new NodeOutputString.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputString.
             * @implements INodeOutputString
             * @constructor
             * @param {skymel.modelio.INodeOutputString=} [properties] Properties to set
             */
            function NodeOutputString(properties) {
                this.outputStrings = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputString nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputString
             * @instance
             */
            NodeOutputString.prototype.nodeName = "";

            /**
             * NodeOutputString nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputString
             * @instance
             */
            NodeOutputString.prototype.nodeId = 0;

            /**
             * NodeOutputString outputStrings.
             * @member {Array.<string>} outputStrings
             * @memberof skymel.modelio.NodeOutputString
             * @instance
             */
            NodeOutputString.prototype.outputStrings = $util.emptyArray;

            /**
             * Creates a new NodeOutputString instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {skymel.modelio.INodeOutputString=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputString} NodeOutputString instance
             */
            NodeOutputString.create = function create(properties) {
                return new NodeOutputString(properties);
            };

            /**
             * Encodes the specified NodeOutputString message. Does not implicitly {@link skymel.modelio.NodeOutputString.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {skymel.modelio.INodeOutputString} message NodeOutputString message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputString.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputStrings != null && message.outputStrings.length)
                    for (var i = 0; i < message.outputStrings.length; ++i)
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.outputStrings[i]);
                return writer;
            };

            /**
             * Encodes the specified NodeOutputString message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputString.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {skymel.modelio.INodeOutputString} message NodeOutputString message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputString.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputString message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputString} NodeOutputString
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputString.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputString();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            if (!(message.outputStrings && message.outputStrings.length))
                                message.outputStrings = [];
                            message.outputStrings.push(reader.string());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputString message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputString} NodeOutputString
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputString.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputString message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputString.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputStrings != null && message.hasOwnProperty("outputStrings")) {
                    if (!Array.isArray(message.outputStrings))
                        return "outputStrings: array expected";
                    for (var i = 0; i < message.outputStrings.length; ++i)
                        if (!$util.isString(message.outputStrings[i]))
                            return "outputStrings: string[] expected";
                }
                return null;
            };

            /**
             * Creates a NodeOutputString message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputString} NodeOutputString
             */
            NodeOutputString.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputString)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputString();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputStrings) {
                    if (!Array.isArray(object.outputStrings))
                        throw TypeError(".skymel.modelio.NodeOutputString.outputStrings: array expected");
                    message.outputStrings = [];
                    for (var i = 0; i < object.outputStrings.length; ++i)
                        message.outputStrings[i] = String(object.outputStrings[i]);
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputString message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {skymel.modelio.NodeOutputString} message NodeOutputString
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputString.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.outputStrings = [];
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputStrings && message.outputStrings.length) {
                    object.outputStrings = [];
                    for (var j = 0; j < message.outputStrings.length; ++j)
                        object.outputStrings[j] = message.outputStrings[j];
                }
                return object;
            };

            /**
             * Converts this NodeOutputString to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputString
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputString.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputString
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputString
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputString.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputString";
            };

            return NodeOutputString;
        })();

        modelio.NodeOutputBoolean = (function() {

            /**
             * Properties of a NodeOutputBoolean.
             * @memberof skymel.modelio
             * @interface INodeOutputBoolean
             * @property {string|null} [nodeName] NodeOutputBoolean nodeName
             * @property {number|null} [nodeId] NodeOutputBoolean nodeId
             * @property {Array.<boolean>|null} [outputFlatArray] NodeOutputBoolean outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputBoolean arrayShape
             */

            /**
             * Constructs a new NodeOutputBoolean.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputBoolean.
             * @implements INodeOutputBoolean
             * @constructor
             * @param {skymel.modelio.INodeOutputBoolean=} [properties] Properties to set
             */
            function NodeOutputBoolean(properties) {
                this.outputFlatArray = [];
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputBoolean nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputBoolean
             * @instance
             */
            NodeOutputBoolean.prototype.nodeName = "";

            /**
             * NodeOutputBoolean nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputBoolean
             * @instance
             */
            NodeOutputBoolean.prototype.nodeId = 0;

            /**
             * NodeOutputBoolean outputFlatArray.
             * @member {Array.<boolean>} outputFlatArray
             * @memberof skymel.modelio.NodeOutputBoolean
             * @instance
             */
            NodeOutputBoolean.prototype.outputFlatArray = $util.emptyArray;

            /**
             * NodeOutputBoolean arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputBoolean
             * @instance
             */
            NodeOutputBoolean.prototype.arrayShape = $util.emptyArray;

            /**
             * Creates a new NodeOutputBoolean instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {skymel.modelio.INodeOutputBoolean=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputBoolean} NodeOutputBoolean instance
             */
            NodeOutputBoolean.create = function create(properties) {
                return new NodeOutputBoolean(properties);
            };

            /**
             * Encodes the specified NodeOutputBoolean message. Does not implicitly {@link skymel.modelio.NodeOutputBoolean.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {skymel.modelio.INodeOutputBoolean} message NodeOutputBoolean message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputBoolean.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && message.outputFlatArray.length) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork();
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        writer.bool(message.outputFlatArray[i]);
                    writer.ldelim();
                }
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                return writer;
            };

            /**
             * Encodes the specified NodeOutputBoolean message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputBoolean.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {skymel.modelio.INodeOutputBoolean} message NodeOutputBoolean message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputBoolean.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputBoolean message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputBoolean} NodeOutputBoolean
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputBoolean.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputBoolean();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            if (!(message.outputFlatArray && message.outputFlatArray.length))
                                message.outputFlatArray = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.outputFlatArray.push(reader.bool());
                            } else
                                message.outputFlatArray.push(reader.bool());
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputBoolean message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputBoolean} NodeOutputBoolean
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputBoolean.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputBoolean message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputBoolean.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray")) {
                    if (!Array.isArray(message.outputFlatArray))
                        return "outputFlatArray: array expected";
                    for (var i = 0; i < message.outputFlatArray.length; ++i)
                        if (typeof message.outputFlatArray[i] !== "boolean")
                            return "outputFlatArray: boolean[] expected";
                }
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                return null;
            };

            /**
             * Creates a NodeOutputBoolean message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputBoolean} NodeOutputBoolean
             */
            NodeOutputBoolean.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputBoolean)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputBoolean();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray) {
                    if (!Array.isArray(object.outputFlatArray))
                        throw TypeError(".skymel.modelio.NodeOutputBoolean.outputFlatArray: array expected");
                    message.outputFlatArray = [];
                    for (var i = 0; i < object.outputFlatArray.length; ++i)
                        message.outputFlatArray[i] = Boolean(object.outputFlatArray[i]);
                }
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputBoolean.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputBoolean message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {skymel.modelio.NodeOutputBoolean} message NodeOutputBoolean
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputBoolean.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.outputFlatArray = [];
                    object.arrayShape = [];
                }
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray && message.outputFlatArray.length) {
                    object.outputFlatArray = [];
                    for (var j = 0; j < message.outputFlatArray.length; ++j)
                        object.outputFlatArray[j] = message.outputFlatArray[j];
                }
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                return object;
            };

            /**
             * Converts this NodeOutputBoolean to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputBoolean
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputBoolean.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputBoolean
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputBoolean
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputBoolean.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputBoolean";
            };

            return NodeOutputBoolean;
        })();

        modelio.NodeOutputCompressedBytes = (function() {

            /**
             * Properties of a NodeOutputCompressedBytes.
             * @memberof skymel.modelio
             * @interface INodeOutputCompressedBytes
             * @property {string|null} [nodeName] NodeOutputCompressedBytes nodeName
             * @property {number|null} [nodeId] NodeOutputCompressedBytes nodeId
             * @property {Uint8Array|null} [outputFlatArray] NodeOutputCompressedBytes outputFlatArray
             * @property {Array.<number>|null} [arrayShape] NodeOutputCompressedBytes arrayShape
             * @property {skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType|null} [uncompressedDataType] NodeOutputCompressedBytes uncompressedDataType
             * @property {skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm|null} [compressionAlgorithm] NodeOutputCompressedBytes compressionAlgorithm
             * @property {skymel.modelio.NodeOutputCompressedBytes.IUnlistedAlgorithmParameters|null} [unlistedAlgorithmParameters] NodeOutputCompressedBytes unlistedAlgorithmParameters
             * @property {skymel.modelio.NodeOutputCompressedBytes.IZfpAlgorithmParameters|null} [zfpParameters] NodeOutputCompressedBytes zfpParameters
             * @property {skymel.modelio.IArrayPaddingParameters|null} [arrayPaddingParameters] NodeOutputCompressedBytes arrayPaddingParameters
             */

            /**
             * Constructs a new NodeOutputCompressedBytes.
             * @memberof skymel.modelio
             * @classdesc Represents a NodeOutputCompressedBytes.
             * @implements INodeOutputCompressedBytes
             * @constructor
             * @param {skymel.modelio.INodeOutputCompressedBytes=} [properties] Properties to set
             */
            function NodeOutputCompressedBytes(properties) {
                this.arrayShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NodeOutputCompressedBytes nodeName.
             * @member {string} nodeName
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.nodeName = "";

            /**
             * NodeOutputCompressedBytes nodeId.
             * @member {number} nodeId
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.nodeId = 0;

            /**
             * NodeOutputCompressedBytes outputFlatArray.
             * @member {Uint8Array} outputFlatArray
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.outputFlatArray = $util.newBuffer([]);

            /**
             * NodeOutputCompressedBytes arrayShape.
             * @member {Array.<number>} arrayShape
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.arrayShape = $util.emptyArray;

            /**
             * NodeOutputCompressedBytes uncompressedDataType.
             * @member {skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType} uncompressedDataType
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.uncompressedDataType = 0;

            /**
             * NodeOutputCompressedBytes compressionAlgorithm.
             * @member {skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm} compressionAlgorithm
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.compressionAlgorithm = 0;

            /**
             * NodeOutputCompressedBytes unlistedAlgorithmParameters.
             * @member {skymel.modelio.NodeOutputCompressedBytes.IUnlistedAlgorithmParameters|null|undefined} unlistedAlgorithmParameters
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.unlistedAlgorithmParameters = null;

            /**
             * NodeOutputCompressedBytes zfpParameters.
             * @member {skymel.modelio.NodeOutputCompressedBytes.IZfpAlgorithmParameters|null|undefined} zfpParameters
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.zfpParameters = null;

            /**
             * NodeOutputCompressedBytes arrayPaddingParameters.
             * @member {skymel.modelio.IArrayPaddingParameters|null|undefined} arrayPaddingParameters
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            NodeOutputCompressedBytes.prototype.arrayPaddingParameters = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * NodeOutputCompressedBytes compressionAlgorithmParameters.
             * @member {"unlistedAlgorithmParameters"|"zfpParameters"|undefined} compressionAlgorithmParameters
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             */
            Object.defineProperty(NodeOutputCompressedBytes.prototype, "compressionAlgorithmParameters", {
                get: $util.oneOfGetter($oneOfFields = ["unlistedAlgorithmParameters", "zfpParameters"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Creates a new NodeOutputCompressedBytes instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {skymel.modelio.INodeOutputCompressedBytes=} [properties] Properties to set
             * @returns {skymel.modelio.NodeOutputCompressedBytes} NodeOutputCompressedBytes instance
             */
            NodeOutputCompressedBytes.create = function create(properties) {
                return new NodeOutputCompressedBytes(properties);
            };

            /**
             * Encodes the specified NodeOutputCompressedBytes message. Does not implicitly {@link skymel.modelio.NodeOutputCompressedBytes.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {skymel.modelio.INodeOutputCompressedBytes} message NodeOutputCompressedBytes message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputCompressedBytes.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nodeName != null && Object.hasOwnProperty.call(message, "nodeName"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.nodeName);
                if (message.nodeId != null && Object.hasOwnProperty.call(message, "nodeId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.nodeId);
                if (message.outputFlatArray != null && Object.hasOwnProperty.call(message, "outputFlatArray"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.outputFlatArray);
                if (message.arrayShape != null && message.arrayShape.length) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork();
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        writer.int32(message.arrayShape[i]);
                    writer.ldelim();
                }
                if (message.uncompressedDataType != null && Object.hasOwnProperty.call(message, "uncompressedDataType"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.uncompressedDataType);
                if (message.compressionAlgorithm != null && Object.hasOwnProperty.call(message, "compressionAlgorithm"))
                    writer.uint32(/* id 6, wireType 0 =*/48).int32(message.compressionAlgorithm);
                if (message.unlistedAlgorithmParameters != null && Object.hasOwnProperty.call(message, "unlistedAlgorithmParameters"))
                    $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.encode(message.unlistedAlgorithmParameters, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                if (message.zfpParameters != null && Object.hasOwnProperty.call(message, "zfpParameters"))
                    $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.encode(message.zfpParameters, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                if (message.arrayPaddingParameters != null && Object.hasOwnProperty.call(message, "arrayPaddingParameters"))
                    $root.skymel.modelio.ArrayPaddingParameters.encode(message.arrayPaddingParameters, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified NodeOutputCompressedBytes message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputCompressedBytes.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {skymel.modelio.INodeOutputCompressedBytes} message NodeOutputCompressedBytes message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NodeOutputCompressedBytes.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a NodeOutputCompressedBytes message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.NodeOutputCompressedBytes} NodeOutputCompressedBytes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputCompressedBytes.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputCompressedBytes();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nodeName = reader.string();
                            break;
                        }
                    case 2: {
                            message.nodeId = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.outputFlatArray = reader.bytes();
                            break;
                        }
                    case 4: {
                            if (!(message.arrayShape && message.arrayShape.length))
                                message.arrayShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.arrayShape.push(reader.int32());
                            } else
                                message.arrayShape.push(reader.int32());
                            break;
                        }
                    case 5: {
                            message.uncompressedDataType = reader.int32();
                            break;
                        }
                    case 6: {
                            message.compressionAlgorithm = reader.int32();
                            break;
                        }
                    case 7: {
                            message.unlistedAlgorithmParameters = $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.decode(reader, reader.uint32());
                            break;
                        }
                    case 8: {
                            message.zfpParameters = $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.decode(reader, reader.uint32());
                            break;
                        }
                    case 9: {
                            message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a NodeOutputCompressedBytes message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.NodeOutputCompressedBytes} NodeOutputCompressedBytes
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NodeOutputCompressedBytes.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a NodeOutputCompressedBytes message.
             * @function verify
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            NodeOutputCompressedBytes.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                var properties = {};
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    if (!$util.isString(message.nodeName))
                        return "nodeName: string expected";
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    if (!$util.isInteger(message.nodeId))
                        return "nodeId: integer expected";
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray"))
                    if (!(message.outputFlatArray && typeof message.outputFlatArray.length === "number" || $util.isString(message.outputFlatArray)))
                        return "outputFlatArray: buffer expected";
                if (message.arrayShape != null && message.hasOwnProperty("arrayShape")) {
                    if (!Array.isArray(message.arrayShape))
                        return "arrayShape: array expected";
                    for (var i = 0; i < message.arrayShape.length; ++i)
                        if (!$util.isInteger(message.arrayShape[i]))
                            return "arrayShape: integer[] expected";
                }
                if (message.uncompressedDataType != null && message.hasOwnProperty("uncompressedDataType"))
                    switch (message.uncompressedDataType) {
                    default:
                        return "uncompressedDataType: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                        break;
                    }
                if (message.compressionAlgorithm != null && message.hasOwnProperty("compressionAlgorithm"))
                    switch (message.compressionAlgorithm) {
                    default:
                        return "compressionAlgorithm: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                if (message.unlistedAlgorithmParameters != null && message.hasOwnProperty("unlistedAlgorithmParameters")) {
                    properties.compressionAlgorithmParameters = 1;
                    {
                        var error = $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.verify(message.unlistedAlgorithmParameters);
                        if (error)
                            return "unlistedAlgorithmParameters." + error;
                    }
                }
                if (message.zfpParameters != null && message.hasOwnProperty("zfpParameters")) {
                    if (properties.compressionAlgorithmParameters === 1)
                        return "compressionAlgorithmParameters: multiple values";
                    properties.compressionAlgorithmParameters = 1;
                    {
                        var error = $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.verify(message.zfpParameters);
                        if (error)
                            return "zfpParameters." + error;
                    }
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters")) {
                    var error = $root.skymel.modelio.ArrayPaddingParameters.verify(message.arrayPaddingParameters);
                    if (error)
                        return "arrayPaddingParameters." + error;
                }
                return null;
            };

            /**
             * Creates a NodeOutputCompressedBytes message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.NodeOutputCompressedBytes} NodeOutputCompressedBytes
             */
            NodeOutputCompressedBytes.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.NodeOutputCompressedBytes)
                    return object;
                var message = new $root.skymel.modelio.NodeOutputCompressedBytes();
                if (object.nodeName != null)
                    message.nodeName = String(object.nodeName);
                if (object.nodeId != null)
                    message.nodeId = object.nodeId >>> 0;
                if (object.outputFlatArray != null)
                    if (typeof object.outputFlatArray === "string")
                        $util.base64.decode(object.outputFlatArray, message.outputFlatArray = $util.newBuffer($util.base64.length(object.outputFlatArray)), 0);
                    else if (object.outputFlatArray.length >= 0)
                        message.outputFlatArray = object.outputFlatArray;
                if (object.arrayShape) {
                    if (!Array.isArray(object.arrayShape))
                        throw TypeError(".skymel.modelio.NodeOutputCompressedBytes.arrayShape: array expected");
                    message.arrayShape = [];
                    for (var i = 0; i < object.arrayShape.length; ++i)
                        message.arrayShape[i] = object.arrayShape[i] | 0;
                }
                switch (object.uncompressedDataType) {
                default:
                    if (typeof object.uncompressedDataType === "number") {
                        message.uncompressedDataType = object.uncompressedDataType;
                        break;
                    }
                    break;
                case "UNKNOWN_DATATYPE":
                case 0:
                    message.uncompressedDataType = 0;
                    break;
                case "BYTES":
                case 1:
                    message.uncompressedDataType = 1;
                    break;
                case "INT8":
                case 2:
                    message.uncompressedDataType = 2;
                    break;
                case "UINT8":
                case 3:
                    message.uncompressedDataType = 3;
                    break;
                case "INT16":
                case 4:
                    message.uncompressedDataType = 4;
                    break;
                case "UINT16":
                case 5:
                    message.uncompressedDataType = 5;
                    break;
                case "INT32":
                case 6:
                    message.uncompressedDataType = 6;
                    break;
                case "UINT32":
                case 7:
                    message.uncompressedDataType = 7;
                    break;
                case "INT64":
                case 8:
                    message.uncompressedDataType = 8;
                    break;
                case "UINT64":
                case 9:
                    message.uncompressedDataType = 9;
                    break;
                case "FLOAT16":
                case 10:
                    message.uncompressedDataType = 10;
                    break;
                case "FLOAT32":
                case 11:
                    message.uncompressedDataType = 11;
                    break;
                case "FLOAT64":
                case 12:
                    message.uncompressedDataType = 12;
                    break;
                case "STRING":
                case 13:
                    message.uncompressedDataType = 13;
                    break;
                }
                switch (object.compressionAlgorithm) {
                default:
                    if (typeof object.compressionAlgorithm === "number") {
                        message.compressionAlgorithm = object.compressionAlgorithm;
                        break;
                    }
                    break;
                case "UNLISTED_ALGORITHM":
                case 0:
                    message.compressionAlgorithm = 0;
                    break;
                case "ZFP":
                case 1:
                    message.compressionAlgorithm = 1;
                    break;
                case "FLOAT32_TO_FLOAT16_CONVERSION":
                case 2:
                    message.compressionAlgorithm = 2;
                    break;
                }
                if (object.unlistedAlgorithmParameters != null) {
                    if (typeof object.unlistedAlgorithmParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputCompressedBytes.unlistedAlgorithmParameters: object expected");
                    message.unlistedAlgorithmParameters = $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.fromObject(object.unlistedAlgorithmParameters);
                }
                if (object.zfpParameters != null) {
                    if (typeof object.zfpParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputCompressedBytes.zfpParameters: object expected");
                    message.zfpParameters = $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.fromObject(object.zfpParameters);
                }
                if (object.arrayPaddingParameters != null) {
                    if (typeof object.arrayPaddingParameters !== "object")
                        throw TypeError(".skymel.modelio.NodeOutputCompressedBytes.arrayPaddingParameters: object expected");
                    message.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.fromObject(object.arrayPaddingParameters);
                }
                return message;
            };

            /**
             * Creates a plain object from a NodeOutputCompressedBytes message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {skymel.modelio.NodeOutputCompressedBytes} message NodeOutputCompressedBytes
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            NodeOutputCompressedBytes.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.arrayShape = [];
                if (options.defaults) {
                    object.nodeName = "";
                    object.nodeId = 0;
                    if (options.bytes === String)
                        object.outputFlatArray = "";
                    else {
                        object.outputFlatArray = [];
                        if (options.bytes !== Array)
                            object.outputFlatArray = $util.newBuffer(object.outputFlatArray);
                    }
                    object.uncompressedDataType = options.enums === String ? "UNKNOWN_DATATYPE" : 0;
                    object.compressionAlgorithm = options.enums === String ? "UNLISTED_ALGORITHM" : 0;
                    object.arrayPaddingParameters = null;
                }
                if (message.nodeName != null && message.hasOwnProperty("nodeName"))
                    object.nodeName = message.nodeName;
                if (message.nodeId != null && message.hasOwnProperty("nodeId"))
                    object.nodeId = message.nodeId;
                if (message.outputFlatArray != null && message.hasOwnProperty("outputFlatArray"))
                    object.outputFlatArray = options.bytes === String ? $util.base64.encode(message.outputFlatArray, 0, message.outputFlatArray.length) : options.bytes === Array ? Array.prototype.slice.call(message.outputFlatArray) : message.outputFlatArray;
                if (message.arrayShape && message.arrayShape.length) {
                    object.arrayShape = [];
                    for (var j = 0; j < message.arrayShape.length; ++j)
                        object.arrayShape[j] = message.arrayShape[j];
                }
                if (message.uncompressedDataType != null && message.hasOwnProperty("uncompressedDataType"))
                    object.uncompressedDataType = options.enums === String ? $root.skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType[message.uncompressedDataType] === undefined ? message.uncompressedDataType : $root.skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType[message.uncompressedDataType] : message.uncompressedDataType;
                if (message.compressionAlgorithm != null && message.hasOwnProperty("compressionAlgorithm"))
                    object.compressionAlgorithm = options.enums === String ? $root.skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm[message.compressionAlgorithm] === undefined ? message.compressionAlgorithm : $root.skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm[message.compressionAlgorithm] : message.compressionAlgorithm;
                if (message.unlistedAlgorithmParameters != null && message.hasOwnProperty("unlistedAlgorithmParameters")) {
                    object.unlistedAlgorithmParameters = $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.toObject(message.unlistedAlgorithmParameters, options);
                    if (options.oneofs)
                        object.compressionAlgorithmParameters = "unlistedAlgorithmParameters";
                }
                if (message.zfpParameters != null && message.hasOwnProperty("zfpParameters")) {
                    object.zfpParameters = $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.toObject(message.zfpParameters, options);
                    if (options.oneofs)
                        object.compressionAlgorithmParameters = "zfpParameters";
                }
                if (message.arrayPaddingParameters != null && message.hasOwnProperty("arrayPaddingParameters"))
                    object.arrayPaddingParameters = $root.skymel.modelio.ArrayPaddingParameters.toObject(message.arrayPaddingParameters, options);
                return object;
            };

            /**
             * Converts this NodeOutputCompressedBytes to JSON.
             * @function toJSON
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            NodeOutputCompressedBytes.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for NodeOutputCompressedBytes
             * @function getTypeUrl
             * @memberof skymel.modelio.NodeOutputCompressedBytes
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            NodeOutputCompressedBytes.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.NodeOutputCompressedBytes";
            };

            /**
             * UncompressedDataType enum.
             * @name skymel.modelio.NodeOutputCompressedBytes.UncompressedDataType
             * @enum {number}
             * @property {number} UNKNOWN_DATATYPE=0 UNKNOWN_DATATYPE value
             * @property {number} BYTES=1 BYTES value
             * @property {number} INT8=2 INT8 value
             * @property {number} UINT8=3 UINT8 value
             * @property {number} INT16=4 INT16 value
             * @property {number} UINT16=5 UINT16 value
             * @property {number} INT32=6 INT32 value
             * @property {number} UINT32=7 UINT32 value
             * @property {number} INT64=8 INT64 value
             * @property {number} UINT64=9 UINT64 value
             * @property {number} FLOAT16=10 FLOAT16 value
             * @property {number} FLOAT32=11 FLOAT32 value
             * @property {number} FLOAT64=12 FLOAT64 value
             * @property {number} STRING=13 STRING value
             */
            NodeOutputCompressedBytes.UncompressedDataType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_DATATYPE"] = 0;
                values[valuesById[1] = "BYTES"] = 1;
                values[valuesById[2] = "INT8"] = 2;
                values[valuesById[3] = "UINT8"] = 3;
                values[valuesById[4] = "INT16"] = 4;
                values[valuesById[5] = "UINT16"] = 5;
                values[valuesById[6] = "INT32"] = 6;
                values[valuesById[7] = "UINT32"] = 7;
                values[valuesById[8] = "INT64"] = 8;
                values[valuesById[9] = "UINT64"] = 9;
                values[valuesById[10] = "FLOAT16"] = 10;
                values[valuesById[11] = "FLOAT32"] = 11;
                values[valuesById[12] = "FLOAT64"] = 12;
                values[valuesById[13] = "STRING"] = 13;
                return values;
            })();

            /**
             * CompressionAlgorithm enum.
             * @name skymel.modelio.NodeOutputCompressedBytes.CompressionAlgorithm
             * @enum {number}
             * @property {number} UNLISTED_ALGORITHM=0 UNLISTED_ALGORITHM value
             * @property {number} ZFP=1 ZFP value
             * @property {number} FLOAT32_TO_FLOAT16_CONVERSION=2 FLOAT32_TO_FLOAT16_CONVERSION value
             */
            NodeOutputCompressedBytes.CompressionAlgorithm = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNLISTED_ALGORITHM"] = 0;
                values[valuesById[1] = "ZFP"] = 1;
                values[valuesById[2] = "FLOAT32_TO_FLOAT16_CONVERSION"] = 2;
                return values;
            })();

            NodeOutputCompressedBytes.ZfpAlgorithmParameters = (function() {

                /**
                 * Properties of a ZfpAlgorithmParameters.
                 * @memberof skymel.modelio.NodeOutputCompressedBytes
                 * @interface IZfpAlgorithmParameters
                 * @property {number|null} [tolerance] ZfpAlgorithmParameters tolerance
                 * @property {number|null} [rate] ZfpAlgorithmParameters rate
                 * @property {number|Long|null} [precision] ZfpAlgorithmParameters precision
                 * @property {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.ZfpDataType|null} [dataType] ZfpAlgorithmParameters dataType
                 * @property {number|null} [nx] ZfpAlgorithmParameters nx
                 * @property {number|null} [ny] ZfpAlgorithmParameters ny
                 * @property {number|null} [nz] ZfpAlgorithmParameters nz
                 * @property {number|null} [nw] ZfpAlgorithmParameters nw
                 * @property {number|Long|null} [uncompressedDataSizeBytes] ZfpAlgorithmParameters uncompressedDataSizeBytes
                 */

                /**
                 * Constructs a new ZfpAlgorithmParameters.
                 * @memberof skymel.modelio.NodeOutputCompressedBytes
                 * @classdesc Represents a ZfpAlgorithmParameters.
                 * @implements IZfpAlgorithmParameters
                 * @constructor
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IZfpAlgorithmParameters=} [properties] Properties to set
                 */
                function ZfpAlgorithmParameters(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ZfpAlgorithmParameters tolerance.
                 * @member {number} tolerance
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.tolerance = 0;

                /**
                 * ZfpAlgorithmParameters rate.
                 * @member {number} rate
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.rate = 0;

                /**
                 * ZfpAlgorithmParameters precision.
                 * @member {number|Long} precision
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.precision = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

                /**
                 * ZfpAlgorithmParameters dataType.
                 * @member {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.ZfpDataType} dataType
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.dataType = 0;

                /**
                 * ZfpAlgorithmParameters nx.
                 * @member {number} nx
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.nx = 0;

                /**
                 * ZfpAlgorithmParameters ny.
                 * @member {number} ny
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.ny = 0;

                /**
                 * ZfpAlgorithmParameters nz.
                 * @member {number} nz
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.nz = 0;

                /**
                 * ZfpAlgorithmParameters nw.
                 * @member {number} nw
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.nw = 0;

                /**
                 * ZfpAlgorithmParameters uncompressedDataSizeBytes.
                 * @member {number|Long} uncompressedDataSizeBytes
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 */
                ZfpAlgorithmParameters.prototype.uncompressedDataSizeBytes = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * Creates a new ZfpAlgorithmParameters instance using the specified properties.
                 * @function create
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IZfpAlgorithmParameters=} [properties] Properties to set
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters} ZfpAlgorithmParameters instance
                 */
                ZfpAlgorithmParameters.create = function create(properties) {
                    return new ZfpAlgorithmParameters(properties);
                };

                /**
                 * Encodes the specified ZfpAlgorithmParameters message. Does not implicitly {@link skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.verify|verify} messages.
                 * @function encode
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IZfpAlgorithmParameters} message ZfpAlgorithmParameters message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ZfpAlgorithmParameters.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.tolerance != null && Object.hasOwnProperty.call(message, "tolerance"))
                        writer.uint32(/* id 1, wireType 1 =*/9).double(message.tolerance);
                    if (message.rate != null && Object.hasOwnProperty.call(message, "rate"))
                        writer.uint32(/* id 2, wireType 1 =*/17).double(message.rate);
                    if (message.precision != null && Object.hasOwnProperty.call(message, "precision"))
                        writer.uint32(/* id 3, wireType 0 =*/24).int64(message.precision);
                    if (message.dataType != null && Object.hasOwnProperty.call(message, "dataType"))
                        writer.uint32(/* id 4, wireType 0 =*/32).int32(message.dataType);
                    if (message.nx != null && Object.hasOwnProperty.call(message, "nx"))
                        writer.uint32(/* id 5, wireType 0 =*/40).int32(message.nx);
                    if (message.ny != null && Object.hasOwnProperty.call(message, "ny"))
                        writer.uint32(/* id 6, wireType 0 =*/48).int32(message.ny);
                    if (message.nz != null && Object.hasOwnProperty.call(message, "nz"))
                        writer.uint32(/* id 7, wireType 0 =*/56).int32(message.nz);
                    if (message.nw != null && Object.hasOwnProperty.call(message, "nw"))
                        writer.uint32(/* id 8, wireType 0 =*/64).int32(message.nw);
                    if (message.uncompressedDataSizeBytes != null && Object.hasOwnProperty.call(message, "uncompressedDataSizeBytes"))
                        writer.uint32(/* id 9, wireType 0 =*/72).uint64(message.uncompressedDataSizeBytes);
                    return writer;
                };

                /**
                 * Encodes the specified ZfpAlgorithmParameters message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IZfpAlgorithmParameters} message ZfpAlgorithmParameters message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ZfpAlgorithmParameters.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a ZfpAlgorithmParameters message from the specified reader or buffer.
                 * @function decode
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters} ZfpAlgorithmParameters
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ZfpAlgorithmParameters.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.tolerance = reader.double();
                                break;
                            }
                        case 2: {
                                message.rate = reader.double();
                                break;
                            }
                        case 3: {
                                message.precision = reader.int64();
                                break;
                            }
                        case 4: {
                                message.dataType = reader.int32();
                                break;
                            }
                        case 5: {
                                message.nx = reader.int32();
                                break;
                            }
                        case 6: {
                                message.ny = reader.int32();
                                break;
                            }
                        case 7: {
                                message.nz = reader.int32();
                                break;
                            }
                        case 8: {
                                message.nw = reader.int32();
                                break;
                            }
                        case 9: {
                                message.uncompressedDataSizeBytes = reader.uint64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a ZfpAlgorithmParameters message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters} ZfpAlgorithmParameters
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ZfpAlgorithmParameters.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a ZfpAlgorithmParameters message.
                 * @function verify
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ZfpAlgorithmParameters.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.tolerance != null && message.hasOwnProperty("tolerance"))
                        if (typeof message.tolerance !== "number")
                            return "tolerance: number expected";
                    if (message.rate != null && message.hasOwnProperty("rate"))
                        if (typeof message.rate !== "number")
                            return "rate: number expected";
                    if (message.precision != null && message.hasOwnProperty("precision"))
                        if (!$util.isInteger(message.precision) && !(message.precision && $util.isInteger(message.precision.low) && $util.isInteger(message.precision.high)))
                            return "precision: integer|Long expected";
                    if (message.dataType != null && message.hasOwnProperty("dataType"))
                        switch (message.dataType) {
                        default:
                            return "dataType: enum value expected";
                        case 0:
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            break;
                        }
                    if (message.nx != null && message.hasOwnProperty("nx"))
                        if (!$util.isInteger(message.nx))
                            return "nx: integer expected";
                    if (message.ny != null && message.hasOwnProperty("ny"))
                        if (!$util.isInteger(message.ny))
                            return "ny: integer expected";
                    if (message.nz != null && message.hasOwnProperty("nz"))
                        if (!$util.isInteger(message.nz))
                            return "nz: integer expected";
                    if (message.nw != null && message.hasOwnProperty("nw"))
                        if (!$util.isInteger(message.nw))
                            return "nw: integer expected";
                    if (message.uncompressedDataSizeBytes != null && message.hasOwnProperty("uncompressedDataSizeBytes"))
                        if (!$util.isInteger(message.uncompressedDataSizeBytes) && !(message.uncompressedDataSizeBytes && $util.isInteger(message.uncompressedDataSizeBytes.low) && $util.isInteger(message.uncompressedDataSizeBytes.high)))
                            return "uncompressedDataSizeBytes: integer|Long expected";
                    return null;
                };

                /**
                 * Creates a ZfpAlgorithmParameters message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters} ZfpAlgorithmParameters
                 */
                ZfpAlgorithmParameters.fromObject = function fromObject(object) {
                    if (object instanceof $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters)
                        return object;
                    var message = new $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters();
                    if (object.tolerance != null)
                        message.tolerance = Number(object.tolerance);
                    if (object.rate != null)
                        message.rate = Number(object.rate);
                    if (object.precision != null)
                        if ($util.Long)
                            (message.precision = $util.Long.fromValue(object.precision)).unsigned = false;
                        else if (typeof object.precision === "string")
                            message.precision = parseInt(object.precision, 10);
                        else if (typeof object.precision === "number")
                            message.precision = object.precision;
                        else if (typeof object.precision === "object")
                            message.precision = new $util.LongBits(object.precision.low >>> 0, object.precision.high >>> 0).toNumber();
                    switch (object.dataType) {
                    default:
                        if (typeof object.dataType === "number") {
                            message.dataType = object.dataType;
                            break;
                        }
                        break;
                    case "ZFP_TYPE_NONE":
                    case 0:
                        message.dataType = 0;
                        break;
                    case "ZFP_TYPE_INT32":
                    case 1:
                        message.dataType = 1;
                        break;
                    case "ZFP_TYPE_INT64":
                    case 2:
                        message.dataType = 2;
                        break;
                    case "ZFP_TYPE_FLOAT":
                    case 3:
                        message.dataType = 3;
                        break;
                    case "ZFP_TYPE_DOUBLE":
                    case 4:
                        message.dataType = 4;
                        break;
                    }
                    if (object.nx != null)
                        message.nx = object.nx | 0;
                    if (object.ny != null)
                        message.ny = object.ny | 0;
                    if (object.nz != null)
                        message.nz = object.nz | 0;
                    if (object.nw != null)
                        message.nw = object.nw | 0;
                    if (object.uncompressedDataSizeBytes != null)
                        if ($util.Long)
                            (message.uncompressedDataSizeBytes = $util.Long.fromValue(object.uncompressedDataSizeBytes)).unsigned = true;
                        else if (typeof object.uncompressedDataSizeBytes === "string")
                            message.uncompressedDataSizeBytes = parseInt(object.uncompressedDataSizeBytes, 10);
                        else if (typeof object.uncompressedDataSizeBytes === "number")
                            message.uncompressedDataSizeBytes = object.uncompressedDataSizeBytes;
                        else if (typeof object.uncompressedDataSizeBytes === "object")
                            message.uncompressedDataSizeBytes = new $util.LongBits(object.uncompressedDataSizeBytes.low >>> 0, object.uncompressedDataSizeBytes.high >>> 0).toNumber(true);
                    return message;
                };

                /**
                 * Creates a plain object from a ZfpAlgorithmParameters message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters} message ZfpAlgorithmParameters
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ZfpAlgorithmParameters.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.tolerance = 0;
                        object.rate = 0;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, false);
                            object.precision = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else
                            object.precision = options.longs === String ? "0" : 0;
                        object.dataType = options.enums === String ? "ZFP_TYPE_NONE" : 0;
                        object.nx = 0;
                        object.ny = 0;
                        object.nz = 0;
                        object.nw = 0;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.uncompressedDataSizeBytes = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else
                            object.uncompressedDataSizeBytes = options.longs === String ? "0" : 0;
                    }
                    if (message.tolerance != null && message.hasOwnProperty("tolerance"))
                        object.tolerance = options.json && !isFinite(message.tolerance) ? String(message.tolerance) : message.tolerance;
                    if (message.rate != null && message.hasOwnProperty("rate"))
                        object.rate = options.json && !isFinite(message.rate) ? String(message.rate) : message.rate;
                    if (message.precision != null && message.hasOwnProperty("precision"))
                        if (typeof message.precision === "number")
                            object.precision = options.longs === String ? String(message.precision) : message.precision;
                        else
                            object.precision = options.longs === String ? $util.Long.prototype.toString.call(message.precision) : options.longs === Number ? new $util.LongBits(message.precision.low >>> 0, message.precision.high >>> 0).toNumber() : message.precision;
                    if (message.dataType != null && message.hasOwnProperty("dataType"))
                        object.dataType = options.enums === String ? $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.ZfpDataType[message.dataType] === undefined ? message.dataType : $root.skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.ZfpDataType[message.dataType] : message.dataType;
                    if (message.nx != null && message.hasOwnProperty("nx"))
                        object.nx = message.nx;
                    if (message.ny != null && message.hasOwnProperty("ny"))
                        object.ny = message.ny;
                    if (message.nz != null && message.hasOwnProperty("nz"))
                        object.nz = message.nz;
                    if (message.nw != null && message.hasOwnProperty("nw"))
                        object.nw = message.nw;
                    if (message.uncompressedDataSizeBytes != null && message.hasOwnProperty("uncompressedDataSizeBytes"))
                        if (typeof message.uncompressedDataSizeBytes === "number")
                            object.uncompressedDataSizeBytes = options.longs === String ? String(message.uncompressedDataSizeBytes) : message.uncompressedDataSizeBytes;
                        else
                            object.uncompressedDataSizeBytes = options.longs === String ? $util.Long.prototype.toString.call(message.uncompressedDataSizeBytes) : options.longs === Number ? new $util.LongBits(message.uncompressedDataSizeBytes.low >>> 0, message.uncompressedDataSizeBytes.high >>> 0).toNumber(true) : message.uncompressedDataSizeBytes;
                    return object;
                };

                /**
                 * Converts this ZfpAlgorithmParameters to JSON.
                 * @function toJSON
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ZfpAlgorithmParameters.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the default type url for ZfpAlgorithmParameters
                 * @function getTypeUrl
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                ZfpAlgorithmParameters.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters";
                };

                /**
                 * ZfpDataType enum.
                 * @name skymel.modelio.NodeOutputCompressedBytes.ZfpAlgorithmParameters.ZfpDataType
                 * @enum {number}
                 * @property {number} ZFP_TYPE_NONE=0 ZFP_TYPE_NONE value
                 * @property {number} ZFP_TYPE_INT32=1 ZFP_TYPE_INT32 value
                 * @property {number} ZFP_TYPE_INT64=2 ZFP_TYPE_INT64 value
                 * @property {number} ZFP_TYPE_FLOAT=3 ZFP_TYPE_FLOAT value
                 * @property {number} ZFP_TYPE_DOUBLE=4 ZFP_TYPE_DOUBLE value
                 */
                ZfpAlgorithmParameters.ZfpDataType = (function() {
                    var valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "ZFP_TYPE_NONE"] = 0;
                    values[valuesById[1] = "ZFP_TYPE_INT32"] = 1;
                    values[valuesById[2] = "ZFP_TYPE_INT64"] = 2;
                    values[valuesById[3] = "ZFP_TYPE_FLOAT"] = 3;
                    values[valuesById[4] = "ZFP_TYPE_DOUBLE"] = 4;
                    return values;
                })();

                return ZfpAlgorithmParameters;
            })();

            NodeOutputCompressedBytes.UnlistedAlgorithmParameters = (function() {

                /**
                 * Properties of an UnlistedAlgorithmParameters.
                 * @memberof skymel.modelio.NodeOutputCompressedBytes
                 * @interface IUnlistedAlgorithmParameters
                 * @property {string|null} [name] UnlistedAlgorithmParameters name
                 * @property {Uint8Array|null} [additionalInfo] UnlistedAlgorithmParameters additionalInfo
                 */

                /**
                 * Constructs a new UnlistedAlgorithmParameters.
                 * @memberof skymel.modelio.NodeOutputCompressedBytes
                 * @classdesc Represents an UnlistedAlgorithmParameters.
                 * @implements IUnlistedAlgorithmParameters
                 * @constructor
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IUnlistedAlgorithmParameters=} [properties] Properties to set
                 */
                function UnlistedAlgorithmParameters(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * UnlistedAlgorithmParameters name.
                 * @member {string} name
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @instance
                 */
                UnlistedAlgorithmParameters.prototype.name = "";

                /**
                 * UnlistedAlgorithmParameters additionalInfo.
                 * @member {Uint8Array} additionalInfo
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @instance
                 */
                UnlistedAlgorithmParameters.prototype.additionalInfo = $util.newBuffer([]);

                /**
                 * Creates a new UnlistedAlgorithmParameters instance using the specified properties.
                 * @function create
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IUnlistedAlgorithmParameters=} [properties] Properties to set
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters} UnlistedAlgorithmParameters instance
                 */
                UnlistedAlgorithmParameters.create = function create(properties) {
                    return new UnlistedAlgorithmParameters(properties);
                };

                /**
                 * Encodes the specified UnlistedAlgorithmParameters message. Does not implicitly {@link skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.verify|verify} messages.
                 * @function encode
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IUnlistedAlgorithmParameters} message UnlistedAlgorithmParameters message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UnlistedAlgorithmParameters.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                    if (message.additionalInfo != null && Object.hasOwnProperty.call(message, "additionalInfo"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.additionalInfo);
                    return writer;
                };

                /**
                 * Encodes the specified UnlistedAlgorithmParameters message, length delimited. Does not implicitly {@link skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.IUnlistedAlgorithmParameters} message UnlistedAlgorithmParameters message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UnlistedAlgorithmParameters.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an UnlistedAlgorithmParameters message from the specified reader or buffer.
                 * @function decode
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters} UnlistedAlgorithmParameters
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UnlistedAlgorithmParameters.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.name = reader.string();
                                break;
                            }
                        case 2: {
                                message.additionalInfo = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an UnlistedAlgorithmParameters message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters} UnlistedAlgorithmParameters
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UnlistedAlgorithmParameters.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an UnlistedAlgorithmParameters message.
                 * @function verify
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                UnlistedAlgorithmParameters.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.name != null && message.hasOwnProperty("name"))
                        if (!$util.isString(message.name))
                            return "name: string expected";
                    if (message.additionalInfo != null && message.hasOwnProperty("additionalInfo"))
                        if (!(message.additionalInfo && typeof message.additionalInfo.length === "number" || $util.isString(message.additionalInfo)))
                            return "additionalInfo: buffer expected";
                    return null;
                };

                /**
                 * Creates an UnlistedAlgorithmParameters message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters} UnlistedAlgorithmParameters
                 */
                UnlistedAlgorithmParameters.fromObject = function fromObject(object) {
                    if (object instanceof $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters)
                        return object;
                    var message = new $root.skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters();
                    if (object.name != null)
                        message.name = String(object.name);
                    if (object.additionalInfo != null)
                        if (typeof object.additionalInfo === "string")
                            $util.base64.decode(object.additionalInfo, message.additionalInfo = $util.newBuffer($util.base64.length(object.additionalInfo)), 0);
                        else if (object.additionalInfo.length >= 0)
                            message.additionalInfo = object.additionalInfo;
                    return message;
                };

                /**
                 * Creates a plain object from an UnlistedAlgorithmParameters message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters} message UnlistedAlgorithmParameters
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                UnlistedAlgorithmParameters.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.name = "";
                        if (options.bytes === String)
                            object.additionalInfo = "";
                        else {
                            object.additionalInfo = [];
                            if (options.bytes !== Array)
                                object.additionalInfo = $util.newBuffer(object.additionalInfo);
                        }
                    }
                    if (message.name != null && message.hasOwnProperty("name"))
                        object.name = message.name;
                    if (message.additionalInfo != null && message.hasOwnProperty("additionalInfo"))
                        object.additionalInfo = options.bytes === String ? $util.base64.encode(message.additionalInfo, 0, message.additionalInfo.length) : options.bytes === Array ? Array.prototype.slice.call(message.additionalInfo) : message.additionalInfo;
                    return object;
                };

                /**
                 * Converts this UnlistedAlgorithmParameters to JSON.
                 * @function toJSON
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                UnlistedAlgorithmParameters.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                /**
                 * Gets the default type url for UnlistedAlgorithmParameters
                 * @function getTypeUrl
                 * @memberof skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                UnlistedAlgorithmParameters.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/skymel.modelio.NodeOutputCompressedBytes.UnlistedAlgorithmParameters";
                };

                return UnlistedAlgorithmParameters;
            })();

            return NodeOutputCompressedBytes;
        })();

        modelio.GraphOutput = (function() {

            /**
             * Properties of a GraphOutput.
             * @memberof skymel.modelio
             * @interface IGraphOutput
             * @property {Array.<skymel.modelio.INodeOutputFloat>|null} [floatOutputs] GraphOutput floatOutputs
             * @property {Array.<skymel.modelio.INodeOutputDouble>|null} [doubleOutputs] GraphOutput doubleOutputs
             * @property {Array.<skymel.modelio.INodeOutputInt32>|null} [int32Outputs] GraphOutput int32Outputs
             * @property {Array.<skymel.modelio.INodeOutputInt64>|null} [int64Outputs] GraphOutput int64Outputs
             * @property {Array.<skymel.modelio.INodeOutputBytes>|null} [bytesOutputs] GraphOutput bytesOutputs
             * @property {Array.<skymel.modelio.INodeOutputString>|null} [stringOutputs] GraphOutput stringOutputs
             * @property {Array.<skymel.modelio.INodeOutputCompressedBytes>|null} [compressedBytesOutputs] GraphOutput compressedBytesOutputs
             * @property {Array.<skymel.modelio.INodeOutputBoolean>|null} [booleanOutputs] GraphOutput booleanOutputs
             */

            /**
             * Constructs a new GraphOutput.
             * @memberof skymel.modelio
             * @classdesc Represents a GraphOutput.
             * @implements IGraphOutput
             * @constructor
             * @param {skymel.modelio.IGraphOutput=} [properties] Properties to set
             */
            function GraphOutput(properties) {
                this.floatOutputs = [];
                this.doubleOutputs = [];
                this.int32Outputs = [];
                this.int64Outputs = [];
                this.bytesOutputs = [];
                this.stringOutputs = [];
                this.compressedBytesOutputs = [];
                this.booleanOutputs = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GraphOutput floatOutputs.
             * @member {Array.<skymel.modelio.INodeOutputFloat>} floatOutputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.floatOutputs = $util.emptyArray;

            /**
             * GraphOutput doubleOutputs.
             * @member {Array.<skymel.modelio.INodeOutputDouble>} doubleOutputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.doubleOutputs = $util.emptyArray;

            /**
             * GraphOutput int32Outputs.
             * @member {Array.<skymel.modelio.INodeOutputInt32>} int32Outputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.int32Outputs = $util.emptyArray;

            /**
             * GraphOutput int64Outputs.
             * @member {Array.<skymel.modelio.INodeOutputInt64>} int64Outputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.int64Outputs = $util.emptyArray;

            /**
             * GraphOutput bytesOutputs.
             * @member {Array.<skymel.modelio.INodeOutputBytes>} bytesOutputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.bytesOutputs = $util.emptyArray;

            /**
             * GraphOutput stringOutputs.
             * @member {Array.<skymel.modelio.INodeOutputString>} stringOutputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.stringOutputs = $util.emptyArray;

            /**
             * GraphOutput compressedBytesOutputs.
             * @member {Array.<skymel.modelio.INodeOutputCompressedBytes>} compressedBytesOutputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.compressedBytesOutputs = $util.emptyArray;

            /**
             * GraphOutput booleanOutputs.
             * @member {Array.<skymel.modelio.INodeOutputBoolean>} booleanOutputs
             * @memberof skymel.modelio.GraphOutput
             * @instance
             */
            GraphOutput.prototype.booleanOutputs = $util.emptyArray;

            /**
             * Creates a new GraphOutput instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {skymel.modelio.IGraphOutput=} [properties] Properties to set
             * @returns {skymel.modelio.GraphOutput} GraphOutput instance
             */
            GraphOutput.create = function create(properties) {
                return new GraphOutput(properties);
            };

            /**
             * Encodes the specified GraphOutput message. Does not implicitly {@link skymel.modelio.GraphOutput.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {skymel.modelio.IGraphOutput} message GraphOutput message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GraphOutput.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.floatOutputs != null && message.floatOutputs.length)
                    for (var i = 0; i < message.floatOutputs.length; ++i)
                        $root.skymel.modelio.NodeOutputFloat.encode(message.floatOutputs[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.doubleOutputs != null && message.doubleOutputs.length)
                    for (var i = 0; i < message.doubleOutputs.length; ++i)
                        $root.skymel.modelio.NodeOutputDouble.encode(message.doubleOutputs[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.int32Outputs != null && message.int32Outputs.length)
                    for (var i = 0; i < message.int32Outputs.length; ++i)
                        $root.skymel.modelio.NodeOutputInt32.encode(message.int32Outputs[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.int64Outputs != null && message.int64Outputs.length)
                    for (var i = 0; i < message.int64Outputs.length; ++i)
                        $root.skymel.modelio.NodeOutputInt64.encode(message.int64Outputs[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.bytesOutputs != null && message.bytesOutputs.length)
                    for (var i = 0; i < message.bytesOutputs.length; ++i)
                        $root.skymel.modelio.NodeOutputBytes.encode(message.bytesOutputs[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                if (message.stringOutputs != null && message.stringOutputs.length)
                    for (var i = 0; i < message.stringOutputs.length; ++i)
                        $root.skymel.modelio.NodeOutputString.encode(message.stringOutputs[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                if (message.compressedBytesOutputs != null && message.compressedBytesOutputs.length)
                    for (var i = 0; i < message.compressedBytesOutputs.length; ++i)
                        $root.skymel.modelio.NodeOutputCompressedBytes.encode(message.compressedBytesOutputs[i], writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                if (message.booleanOutputs != null && message.booleanOutputs.length)
                    for (var i = 0; i < message.booleanOutputs.length; ++i)
                        $root.skymel.modelio.NodeOutputBoolean.encode(message.booleanOutputs[i], writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified GraphOutput message, length delimited. Does not implicitly {@link skymel.modelio.GraphOutput.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {skymel.modelio.IGraphOutput} message GraphOutput message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GraphOutput.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a GraphOutput message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.GraphOutput} GraphOutput
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GraphOutput.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.GraphOutput();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            if (!(message.floatOutputs && message.floatOutputs.length))
                                message.floatOutputs = [];
                            message.floatOutputs.push($root.skymel.modelio.NodeOutputFloat.decode(reader, reader.uint32()));
                            break;
                        }
                    case 2: {
                            if (!(message.doubleOutputs && message.doubleOutputs.length))
                                message.doubleOutputs = [];
                            message.doubleOutputs.push($root.skymel.modelio.NodeOutputDouble.decode(reader, reader.uint32()));
                            break;
                        }
                    case 3: {
                            if (!(message.int32Outputs && message.int32Outputs.length))
                                message.int32Outputs = [];
                            message.int32Outputs.push($root.skymel.modelio.NodeOutputInt32.decode(reader, reader.uint32()));
                            break;
                        }
                    case 4: {
                            if (!(message.int64Outputs && message.int64Outputs.length))
                                message.int64Outputs = [];
                            message.int64Outputs.push($root.skymel.modelio.NodeOutputInt64.decode(reader, reader.uint32()));
                            break;
                        }
                    case 5: {
                            if (!(message.bytesOutputs && message.bytesOutputs.length))
                                message.bytesOutputs = [];
                            message.bytesOutputs.push($root.skymel.modelio.NodeOutputBytes.decode(reader, reader.uint32()));
                            break;
                        }
                    case 6: {
                            if (!(message.stringOutputs && message.stringOutputs.length))
                                message.stringOutputs = [];
                            message.stringOutputs.push($root.skymel.modelio.NodeOutputString.decode(reader, reader.uint32()));
                            break;
                        }
                    case 7: {
                            if (!(message.compressedBytesOutputs && message.compressedBytesOutputs.length))
                                message.compressedBytesOutputs = [];
                            message.compressedBytesOutputs.push($root.skymel.modelio.NodeOutputCompressedBytes.decode(reader, reader.uint32()));
                            break;
                        }
                    case 8: {
                            if (!(message.booleanOutputs && message.booleanOutputs.length))
                                message.booleanOutputs = [];
                            message.booleanOutputs.push($root.skymel.modelio.NodeOutputBoolean.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GraphOutput message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.GraphOutput} GraphOutput
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GraphOutput.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GraphOutput message.
             * @function verify
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GraphOutput.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.floatOutputs != null && message.hasOwnProperty("floatOutputs")) {
                    if (!Array.isArray(message.floatOutputs))
                        return "floatOutputs: array expected";
                    for (var i = 0; i < message.floatOutputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputFloat.verify(message.floatOutputs[i]);
                        if (error)
                            return "floatOutputs." + error;
                    }
                }
                if (message.doubleOutputs != null && message.hasOwnProperty("doubleOutputs")) {
                    if (!Array.isArray(message.doubleOutputs))
                        return "doubleOutputs: array expected";
                    for (var i = 0; i < message.doubleOutputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputDouble.verify(message.doubleOutputs[i]);
                        if (error)
                            return "doubleOutputs." + error;
                    }
                }
                if (message.int32Outputs != null && message.hasOwnProperty("int32Outputs")) {
                    if (!Array.isArray(message.int32Outputs))
                        return "int32Outputs: array expected";
                    for (var i = 0; i < message.int32Outputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputInt32.verify(message.int32Outputs[i]);
                        if (error)
                            return "int32Outputs." + error;
                    }
                }
                if (message.int64Outputs != null && message.hasOwnProperty("int64Outputs")) {
                    if (!Array.isArray(message.int64Outputs))
                        return "int64Outputs: array expected";
                    for (var i = 0; i < message.int64Outputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputInt64.verify(message.int64Outputs[i]);
                        if (error)
                            return "int64Outputs." + error;
                    }
                }
                if (message.bytesOutputs != null && message.hasOwnProperty("bytesOutputs")) {
                    if (!Array.isArray(message.bytesOutputs))
                        return "bytesOutputs: array expected";
                    for (var i = 0; i < message.bytesOutputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputBytes.verify(message.bytesOutputs[i]);
                        if (error)
                            return "bytesOutputs." + error;
                    }
                }
                if (message.stringOutputs != null && message.hasOwnProperty("stringOutputs")) {
                    if (!Array.isArray(message.stringOutputs))
                        return "stringOutputs: array expected";
                    for (var i = 0; i < message.stringOutputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputString.verify(message.stringOutputs[i]);
                        if (error)
                            return "stringOutputs." + error;
                    }
                }
                if (message.compressedBytesOutputs != null && message.hasOwnProperty("compressedBytesOutputs")) {
                    if (!Array.isArray(message.compressedBytesOutputs))
                        return "compressedBytesOutputs: array expected";
                    for (var i = 0; i < message.compressedBytesOutputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputCompressedBytes.verify(message.compressedBytesOutputs[i]);
                        if (error)
                            return "compressedBytesOutputs." + error;
                    }
                }
                if (message.booleanOutputs != null && message.hasOwnProperty("booleanOutputs")) {
                    if (!Array.isArray(message.booleanOutputs))
                        return "booleanOutputs: array expected";
                    for (var i = 0; i < message.booleanOutputs.length; ++i) {
                        var error = $root.skymel.modelio.NodeOutputBoolean.verify(message.booleanOutputs[i]);
                        if (error)
                            return "booleanOutputs." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a GraphOutput message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.GraphOutput} GraphOutput
             */
            GraphOutput.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.GraphOutput)
                    return object;
                var message = new $root.skymel.modelio.GraphOutput();
                if (object.floatOutputs) {
                    if (!Array.isArray(object.floatOutputs))
                        throw TypeError(".skymel.modelio.GraphOutput.floatOutputs: array expected");
                    message.floatOutputs = [];
                    for (var i = 0; i < object.floatOutputs.length; ++i) {
                        if (typeof object.floatOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.floatOutputs: object expected");
                        message.floatOutputs[i] = $root.skymel.modelio.NodeOutputFloat.fromObject(object.floatOutputs[i]);
                    }
                }
                if (object.doubleOutputs) {
                    if (!Array.isArray(object.doubleOutputs))
                        throw TypeError(".skymel.modelio.GraphOutput.doubleOutputs: array expected");
                    message.doubleOutputs = [];
                    for (var i = 0; i < object.doubleOutputs.length; ++i) {
                        if (typeof object.doubleOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.doubleOutputs: object expected");
                        message.doubleOutputs[i] = $root.skymel.modelio.NodeOutputDouble.fromObject(object.doubleOutputs[i]);
                    }
                }
                if (object.int32Outputs) {
                    if (!Array.isArray(object.int32Outputs))
                        throw TypeError(".skymel.modelio.GraphOutput.int32Outputs: array expected");
                    message.int32Outputs = [];
                    for (var i = 0; i < object.int32Outputs.length; ++i) {
                        if (typeof object.int32Outputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.int32Outputs: object expected");
                        message.int32Outputs[i] = $root.skymel.modelio.NodeOutputInt32.fromObject(object.int32Outputs[i]);
                    }
                }
                if (object.int64Outputs) {
                    if (!Array.isArray(object.int64Outputs))
                        throw TypeError(".skymel.modelio.GraphOutput.int64Outputs: array expected");
                    message.int64Outputs = [];
                    for (var i = 0; i < object.int64Outputs.length; ++i) {
                        if (typeof object.int64Outputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.int64Outputs: object expected");
                        message.int64Outputs[i] = $root.skymel.modelio.NodeOutputInt64.fromObject(object.int64Outputs[i]);
                    }
                }
                if (object.bytesOutputs) {
                    if (!Array.isArray(object.bytesOutputs))
                        throw TypeError(".skymel.modelio.GraphOutput.bytesOutputs: array expected");
                    message.bytesOutputs = [];
                    for (var i = 0; i < object.bytesOutputs.length; ++i) {
                        if (typeof object.bytesOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.bytesOutputs: object expected");
                        message.bytesOutputs[i] = $root.skymel.modelio.NodeOutputBytes.fromObject(object.bytesOutputs[i]);
                    }
                }
                if (object.stringOutputs) {
                    if (!Array.isArray(object.stringOutputs))
                        throw TypeError(".skymel.modelio.GraphOutput.stringOutputs: array expected");
                    message.stringOutputs = [];
                    for (var i = 0; i < object.stringOutputs.length; ++i) {
                        if (typeof object.stringOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.stringOutputs: object expected");
                        message.stringOutputs[i] = $root.skymel.modelio.NodeOutputString.fromObject(object.stringOutputs[i]);
                    }
                }
                if (object.compressedBytesOutputs) {
                    if (!Array.isArray(object.compressedBytesOutputs))
                        throw TypeError(".skymel.modelio.GraphOutput.compressedBytesOutputs: array expected");
                    message.compressedBytesOutputs = [];
                    for (var i = 0; i < object.compressedBytesOutputs.length; ++i) {
                        if (typeof object.compressedBytesOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.compressedBytesOutputs: object expected");
                        message.compressedBytesOutputs[i] = $root.skymel.modelio.NodeOutputCompressedBytes.fromObject(object.compressedBytesOutputs[i]);
                    }
                }
                if (object.booleanOutputs) {
                    if (!Array.isArray(object.booleanOutputs))
                        throw TypeError(".skymel.modelio.GraphOutput.booleanOutputs: array expected");
                    message.booleanOutputs = [];
                    for (var i = 0; i < object.booleanOutputs.length; ++i) {
                        if (typeof object.booleanOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.GraphOutput.booleanOutputs: object expected");
                        message.booleanOutputs[i] = $root.skymel.modelio.NodeOutputBoolean.fromObject(object.booleanOutputs[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from a GraphOutput message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {skymel.modelio.GraphOutput} message GraphOutput
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GraphOutput.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.floatOutputs = [];
                    object.doubleOutputs = [];
                    object.int32Outputs = [];
                    object.int64Outputs = [];
                    object.bytesOutputs = [];
                    object.stringOutputs = [];
                    object.compressedBytesOutputs = [];
                    object.booleanOutputs = [];
                }
                if (message.floatOutputs && message.floatOutputs.length) {
                    object.floatOutputs = [];
                    for (var j = 0; j < message.floatOutputs.length; ++j)
                        object.floatOutputs[j] = $root.skymel.modelio.NodeOutputFloat.toObject(message.floatOutputs[j], options);
                }
                if (message.doubleOutputs && message.doubleOutputs.length) {
                    object.doubleOutputs = [];
                    for (var j = 0; j < message.doubleOutputs.length; ++j)
                        object.doubleOutputs[j] = $root.skymel.modelio.NodeOutputDouble.toObject(message.doubleOutputs[j], options);
                }
                if (message.int32Outputs && message.int32Outputs.length) {
                    object.int32Outputs = [];
                    for (var j = 0; j < message.int32Outputs.length; ++j)
                        object.int32Outputs[j] = $root.skymel.modelio.NodeOutputInt32.toObject(message.int32Outputs[j], options);
                }
                if (message.int64Outputs && message.int64Outputs.length) {
                    object.int64Outputs = [];
                    for (var j = 0; j < message.int64Outputs.length; ++j)
                        object.int64Outputs[j] = $root.skymel.modelio.NodeOutputInt64.toObject(message.int64Outputs[j], options);
                }
                if (message.bytesOutputs && message.bytesOutputs.length) {
                    object.bytesOutputs = [];
                    for (var j = 0; j < message.bytesOutputs.length; ++j)
                        object.bytesOutputs[j] = $root.skymel.modelio.NodeOutputBytes.toObject(message.bytesOutputs[j], options);
                }
                if (message.stringOutputs && message.stringOutputs.length) {
                    object.stringOutputs = [];
                    for (var j = 0; j < message.stringOutputs.length; ++j)
                        object.stringOutputs[j] = $root.skymel.modelio.NodeOutputString.toObject(message.stringOutputs[j], options);
                }
                if (message.compressedBytesOutputs && message.compressedBytesOutputs.length) {
                    object.compressedBytesOutputs = [];
                    for (var j = 0; j < message.compressedBytesOutputs.length; ++j)
                        object.compressedBytesOutputs[j] = $root.skymel.modelio.NodeOutputCompressedBytes.toObject(message.compressedBytesOutputs[j], options);
                }
                if (message.booleanOutputs && message.booleanOutputs.length) {
                    object.booleanOutputs = [];
                    for (var j = 0; j < message.booleanOutputs.length; ++j)
                        object.booleanOutputs[j] = $root.skymel.modelio.NodeOutputBoolean.toObject(message.booleanOutputs[j], options);
                }
                return object;
            };

            /**
             * Converts this GraphOutput to JSON.
             * @function toJSON
             * @memberof skymel.modelio.GraphOutput
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GraphOutput.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for GraphOutput
             * @function getTypeUrl
             * @memberof skymel.modelio.GraphOutput
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            GraphOutput.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.GraphOutput";
            };

            return GraphOutput;
        })();

        modelio.Image = (function() {

            /**
             * Properties of an Image.
             * @memberof skymel.modelio
             * @interface IImage
             * @property {string|null} [imageUrl] Image imageUrl
             * @property {Uint8Array|null} [imageBytes] Image imageBytes
             * @property {string|null} [imageBase64] Image imageBase64
             */

            /**
             * Constructs a new Image.
             * @memberof skymel.modelio
             * @classdesc Represents an Image.
             * @implements IImage
             * @constructor
             * @param {skymel.modelio.IImage=} [properties] Properties to set
             */
            function Image(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Image imageUrl.
             * @member {string|null|undefined} imageUrl
             * @memberof skymel.modelio.Image
             * @instance
             */
            Image.prototype.imageUrl = null;

            /**
             * Image imageBytes.
             * @member {Uint8Array|null|undefined} imageBytes
             * @memberof skymel.modelio.Image
             * @instance
             */
            Image.prototype.imageBytes = null;

            /**
             * Image imageBase64.
             * @member {string|null|undefined} imageBase64
             * @memberof skymel.modelio.Image
             * @instance
             */
            Image.prototype.imageBase64 = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * Image image.
             * @member {"imageUrl"|"imageBytes"|"imageBase64"|undefined} image
             * @memberof skymel.modelio.Image
             * @instance
             */
            Object.defineProperty(Image.prototype, "image", {
                get: $util.oneOfGetter($oneOfFields = ["imageUrl", "imageBytes", "imageBase64"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Creates a new Image instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.Image
             * @static
             * @param {skymel.modelio.IImage=} [properties] Properties to set
             * @returns {skymel.modelio.Image} Image instance
             */
            Image.create = function create(properties) {
                return new Image(properties);
            };

            /**
             * Encodes the specified Image message. Does not implicitly {@link skymel.modelio.Image.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.Image
             * @static
             * @param {skymel.modelio.IImage} message Image message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Image.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.imageUrl != null && Object.hasOwnProperty.call(message, "imageUrl"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.imageUrl);
                if (message.imageBytes != null && Object.hasOwnProperty.call(message, "imageBytes"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.imageBytes);
                if (message.imageBase64 != null && Object.hasOwnProperty.call(message, "imageBase64"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.imageBase64);
                return writer;
            };

            /**
             * Encodes the specified Image message, length delimited. Does not implicitly {@link skymel.modelio.Image.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.Image
             * @static
             * @param {skymel.modelio.IImage} message Image message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Image.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Image message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.Image
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.Image} Image
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Image.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.Image();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.imageUrl = reader.string();
                            break;
                        }
                    case 2: {
                            message.imageBytes = reader.bytes();
                            break;
                        }
                    case 3: {
                            message.imageBase64 = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Image message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.Image
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.Image} Image
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Image.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Image message.
             * @function verify
             * @memberof skymel.modelio.Image
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Image.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                var properties = {};
                if (message.imageUrl != null && message.hasOwnProperty("imageUrl")) {
                    properties.image = 1;
                    if (!$util.isString(message.imageUrl))
                        return "imageUrl: string expected";
                }
                if (message.imageBytes != null && message.hasOwnProperty("imageBytes")) {
                    if (properties.image === 1)
                        return "image: multiple values";
                    properties.image = 1;
                    if (!(message.imageBytes && typeof message.imageBytes.length === "number" || $util.isString(message.imageBytes)))
                        return "imageBytes: buffer expected";
                }
                if (message.imageBase64 != null && message.hasOwnProperty("imageBase64")) {
                    if (properties.image === 1)
                        return "image: multiple values";
                    properties.image = 1;
                    if (!$util.isString(message.imageBase64))
                        return "imageBase64: string expected";
                }
                return null;
            };

            /**
             * Creates an Image message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.Image
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.Image} Image
             */
            Image.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.Image)
                    return object;
                var message = new $root.skymel.modelio.Image();
                if (object.imageUrl != null)
                    message.imageUrl = String(object.imageUrl);
                if (object.imageBytes != null)
                    if (typeof object.imageBytes === "string")
                        $util.base64.decode(object.imageBytes, message.imageBytes = $util.newBuffer($util.base64.length(object.imageBytes)), 0);
                    else if (object.imageBytes.length >= 0)
                        message.imageBytes = object.imageBytes;
                if (object.imageBase64 != null)
                    message.imageBase64 = String(object.imageBase64);
                return message;
            };

            /**
             * Creates a plain object from an Image message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.Image
             * @static
             * @param {skymel.modelio.Image} message Image
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Image.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (message.imageUrl != null && message.hasOwnProperty("imageUrl")) {
                    object.imageUrl = message.imageUrl;
                    if (options.oneofs)
                        object.image = "imageUrl";
                }
                if (message.imageBytes != null && message.hasOwnProperty("imageBytes")) {
                    object.imageBytes = options.bytes === String ? $util.base64.encode(message.imageBytes, 0, message.imageBytes.length) : options.bytes === Array ? Array.prototype.slice.call(message.imageBytes) : message.imageBytes;
                    if (options.oneofs)
                        object.image = "imageBytes";
                }
                if (message.imageBase64 != null && message.hasOwnProperty("imageBase64")) {
                    object.imageBase64 = message.imageBase64;
                    if (options.oneofs)
                        object.image = "imageBase64";
                }
                return object;
            };

            /**
             * Converts this Image to JSON.
             * @function toJSON
             * @memberof skymel.modelio.Image
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Image.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Image
             * @function getTypeUrl
             * @memberof skymel.modelio.Image
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Image.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.Image";
            };

            return Image;
        })();

        modelio.InferenceRequest = (function() {

            /**
             * Properties of an InferenceRequest.
             * @memberof skymel.modelio
             * @interface IInferenceRequest
             * @property {string|null} [requestId] InferenceRequest requestId
             * @property {string|null} [apiKey] InferenceRequest apiKey
             * @property {Array.<skymel.modelio.IImage>|null} [images] InferenceRequest images
             * @property {Array.<string>|null} [texts] InferenceRequest texts
             * @property {Array.<number>|null} [tokenIds] InferenceRequest tokenIds
             * @property {Array.<skymel.modelio.IGraphOutput>|null} [graphOutput] InferenceRequest graphOutput
             */

            /**
             * Constructs a new InferenceRequest.
             * @memberof skymel.modelio
             * @classdesc Represents an InferenceRequest.
             * @implements IInferenceRequest
             * @constructor
             * @param {skymel.modelio.IInferenceRequest=} [properties] Properties to set
             */
            function InferenceRequest(properties) {
                this.images = [];
                this.texts = [];
                this.tokenIds = [];
                this.graphOutput = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * InferenceRequest requestId.
             * @member {string} requestId
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             */
            InferenceRequest.prototype.requestId = "";

            /**
             * InferenceRequest apiKey.
             * @member {string} apiKey
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             */
            InferenceRequest.prototype.apiKey = "";

            /**
             * InferenceRequest images.
             * @member {Array.<skymel.modelio.IImage>} images
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             */
            InferenceRequest.prototype.images = $util.emptyArray;

            /**
             * InferenceRequest texts.
             * @member {Array.<string>} texts
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             */
            InferenceRequest.prototype.texts = $util.emptyArray;

            /**
             * InferenceRequest tokenIds.
             * @member {Array.<number>} tokenIds
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             */
            InferenceRequest.prototype.tokenIds = $util.emptyArray;

            /**
             * InferenceRequest graphOutput.
             * @member {Array.<skymel.modelio.IGraphOutput>} graphOutput
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             */
            InferenceRequest.prototype.graphOutput = $util.emptyArray;

            /**
             * Creates a new InferenceRequest instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {skymel.modelio.IInferenceRequest=} [properties] Properties to set
             * @returns {skymel.modelio.InferenceRequest} InferenceRequest instance
             */
            InferenceRequest.create = function create(properties) {
                return new InferenceRequest(properties);
            };

            /**
             * Encodes the specified InferenceRequest message. Does not implicitly {@link skymel.modelio.InferenceRequest.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {skymel.modelio.IInferenceRequest} message InferenceRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InferenceRequest.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.requestId != null && Object.hasOwnProperty.call(message, "requestId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.requestId);
                if (message.apiKey != null && Object.hasOwnProperty.call(message, "apiKey"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.apiKey);
                if (message.images != null && message.images.length)
                    for (var i = 0; i < message.images.length; ++i)
                        $root.skymel.modelio.Image.encode(message.images[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.texts != null && message.texts.length)
                    for (var i = 0; i < message.texts.length; ++i)
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.texts[i]);
                if (message.tokenIds != null && message.tokenIds.length) {
                    writer.uint32(/* id 5, wireType 2 =*/42).fork();
                    for (var i = 0; i < message.tokenIds.length; ++i)
                        writer.int32(message.tokenIds[i]);
                    writer.ldelim();
                }
                if (message.graphOutput != null && message.graphOutput.length)
                    for (var i = 0; i < message.graphOutput.length; ++i)
                        $root.skymel.modelio.GraphOutput.encode(message.graphOutput[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified InferenceRequest message, length delimited. Does not implicitly {@link skymel.modelio.InferenceRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {skymel.modelio.IInferenceRequest} message InferenceRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InferenceRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an InferenceRequest message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.InferenceRequest} InferenceRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InferenceRequest.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.InferenceRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.requestId = reader.string();
                            break;
                        }
                    case 2: {
                            message.apiKey = reader.string();
                            break;
                        }
                    case 3: {
                            if (!(message.images && message.images.length))
                                message.images = [];
                            message.images.push($root.skymel.modelio.Image.decode(reader, reader.uint32()));
                            break;
                        }
                    case 4: {
                            if (!(message.texts && message.texts.length))
                                message.texts = [];
                            message.texts.push(reader.string());
                            break;
                        }
                    case 5: {
                            if (!(message.tokenIds && message.tokenIds.length))
                                message.tokenIds = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.tokenIds.push(reader.int32());
                            } else
                                message.tokenIds.push(reader.int32());
                            break;
                        }
                    case 6: {
                            if (!(message.graphOutput && message.graphOutput.length))
                                message.graphOutput = [];
                            message.graphOutput.push($root.skymel.modelio.GraphOutput.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an InferenceRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.InferenceRequest} InferenceRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InferenceRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an InferenceRequest message.
             * @function verify
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            InferenceRequest.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    if (!$util.isString(message.requestId))
                        return "requestId: string expected";
                if (message.apiKey != null && message.hasOwnProperty("apiKey"))
                    if (!$util.isString(message.apiKey))
                        return "apiKey: string expected";
                if (message.images != null && message.hasOwnProperty("images")) {
                    if (!Array.isArray(message.images))
                        return "images: array expected";
                    for (var i = 0; i < message.images.length; ++i) {
                        var error = $root.skymel.modelio.Image.verify(message.images[i]);
                        if (error)
                            return "images." + error;
                    }
                }
                if (message.texts != null && message.hasOwnProperty("texts")) {
                    if (!Array.isArray(message.texts))
                        return "texts: array expected";
                    for (var i = 0; i < message.texts.length; ++i)
                        if (!$util.isString(message.texts[i]))
                            return "texts: string[] expected";
                }
                if (message.tokenIds != null && message.hasOwnProperty("tokenIds")) {
                    if (!Array.isArray(message.tokenIds))
                        return "tokenIds: array expected";
                    for (var i = 0; i < message.tokenIds.length; ++i)
                        if (!$util.isInteger(message.tokenIds[i]))
                            return "tokenIds: integer[] expected";
                }
                if (message.graphOutput != null && message.hasOwnProperty("graphOutput")) {
                    if (!Array.isArray(message.graphOutput))
                        return "graphOutput: array expected";
                    for (var i = 0; i < message.graphOutput.length; ++i) {
                        var error = $root.skymel.modelio.GraphOutput.verify(message.graphOutput[i]);
                        if (error)
                            return "graphOutput." + error;
                    }
                }
                return null;
            };

            /**
             * Creates an InferenceRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.InferenceRequest} InferenceRequest
             */
            InferenceRequest.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.InferenceRequest)
                    return object;
                var message = new $root.skymel.modelio.InferenceRequest();
                if (object.requestId != null)
                    message.requestId = String(object.requestId);
                if (object.apiKey != null)
                    message.apiKey = String(object.apiKey);
                if (object.images) {
                    if (!Array.isArray(object.images))
                        throw TypeError(".skymel.modelio.InferenceRequest.images: array expected");
                    message.images = [];
                    for (var i = 0; i < object.images.length; ++i) {
                        if (typeof object.images[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceRequest.images: object expected");
                        message.images[i] = $root.skymel.modelio.Image.fromObject(object.images[i]);
                    }
                }
                if (object.texts) {
                    if (!Array.isArray(object.texts))
                        throw TypeError(".skymel.modelio.InferenceRequest.texts: array expected");
                    message.texts = [];
                    for (var i = 0; i < object.texts.length; ++i)
                        message.texts[i] = String(object.texts[i]);
                }
                if (object.tokenIds) {
                    if (!Array.isArray(object.tokenIds))
                        throw TypeError(".skymel.modelio.InferenceRequest.tokenIds: array expected");
                    message.tokenIds = [];
                    for (var i = 0; i < object.tokenIds.length; ++i)
                        message.tokenIds[i] = object.tokenIds[i] | 0;
                }
                if (object.graphOutput) {
                    if (!Array.isArray(object.graphOutput))
                        throw TypeError(".skymel.modelio.InferenceRequest.graphOutput: array expected");
                    message.graphOutput = [];
                    for (var i = 0; i < object.graphOutput.length; ++i) {
                        if (typeof object.graphOutput[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceRequest.graphOutput: object expected");
                        message.graphOutput[i] = $root.skymel.modelio.GraphOutput.fromObject(object.graphOutput[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from an InferenceRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {skymel.modelio.InferenceRequest} message InferenceRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            InferenceRequest.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.images = [];
                    object.texts = [];
                    object.tokenIds = [];
                    object.graphOutput = [];
                }
                if (options.defaults) {
                    object.requestId = "";
                    object.apiKey = "";
                }
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    object.requestId = message.requestId;
                if (message.apiKey != null && message.hasOwnProperty("apiKey"))
                    object.apiKey = message.apiKey;
                if (message.images && message.images.length) {
                    object.images = [];
                    for (var j = 0; j < message.images.length; ++j)
                        object.images[j] = $root.skymel.modelio.Image.toObject(message.images[j], options);
                }
                if (message.texts && message.texts.length) {
                    object.texts = [];
                    for (var j = 0; j < message.texts.length; ++j)
                        object.texts[j] = message.texts[j];
                }
                if (message.tokenIds && message.tokenIds.length) {
                    object.tokenIds = [];
                    for (var j = 0; j < message.tokenIds.length; ++j)
                        object.tokenIds[j] = message.tokenIds[j];
                }
                if (message.graphOutput && message.graphOutput.length) {
                    object.graphOutput = [];
                    for (var j = 0; j < message.graphOutput.length; ++j)
                        object.graphOutput[j] = $root.skymel.modelio.GraphOutput.toObject(message.graphOutput[j], options);
                }
                return object;
            };

            /**
             * Converts this InferenceRequest to JSON.
             * @function toJSON
             * @memberof skymel.modelio.InferenceRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            InferenceRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for InferenceRequest
             * @function getTypeUrl
             * @memberof skymel.modelio.InferenceRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            InferenceRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.InferenceRequest";
            };

            return InferenceRequest;
        })();

        modelio.ClassIdAndProbabilisticConfidenceScore = (function() {

            /**
             * Properties of a ClassIdAndProbabilisticConfidenceScore.
             * @memberof skymel.modelio
             * @interface IClassIdAndProbabilisticConfidenceScore
             * @property {string|null} [className] ClassIdAndProbabilisticConfidenceScore className
             * @property {number|null} [classId] ClassIdAndProbabilisticConfidenceScore classId
             * @property {number|null} [probabilisticConfidence] ClassIdAndProbabilisticConfidenceScore probabilisticConfidence
             */

            /**
             * Constructs a new ClassIdAndProbabilisticConfidenceScore.
             * @memberof skymel.modelio
             * @classdesc Represents a ClassIdAndProbabilisticConfidenceScore.
             * @implements IClassIdAndProbabilisticConfidenceScore
             * @constructor
             * @param {skymel.modelio.IClassIdAndProbabilisticConfidenceScore=} [properties] Properties to set
             */
            function ClassIdAndProbabilisticConfidenceScore(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ClassIdAndProbabilisticConfidenceScore className.
             * @member {string} className
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @instance
             */
            ClassIdAndProbabilisticConfidenceScore.prototype.className = "";

            /**
             * ClassIdAndProbabilisticConfidenceScore classId.
             * @member {number} classId
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @instance
             */
            ClassIdAndProbabilisticConfidenceScore.prototype.classId = 0;

            /**
             * ClassIdAndProbabilisticConfidenceScore probabilisticConfidence.
             * @member {number} probabilisticConfidence
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @instance
             */
            ClassIdAndProbabilisticConfidenceScore.prototype.probabilisticConfidence = 0;

            /**
             * Creates a new ClassIdAndProbabilisticConfidenceScore instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {skymel.modelio.IClassIdAndProbabilisticConfidenceScore=} [properties] Properties to set
             * @returns {skymel.modelio.ClassIdAndProbabilisticConfidenceScore} ClassIdAndProbabilisticConfidenceScore instance
             */
            ClassIdAndProbabilisticConfidenceScore.create = function create(properties) {
                return new ClassIdAndProbabilisticConfidenceScore(properties);
            };

            /**
             * Encodes the specified ClassIdAndProbabilisticConfidenceScore message. Does not implicitly {@link skymel.modelio.ClassIdAndProbabilisticConfidenceScore.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {skymel.modelio.IClassIdAndProbabilisticConfidenceScore} message ClassIdAndProbabilisticConfidenceScore message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ClassIdAndProbabilisticConfidenceScore.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.className != null && Object.hasOwnProperty.call(message, "className"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.className);
                if (message.classId != null && Object.hasOwnProperty.call(message, "classId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.classId);
                if (message.probabilisticConfidence != null && Object.hasOwnProperty.call(message, "probabilisticConfidence"))
                    writer.uint32(/* id 3, wireType 5 =*/29).float(message.probabilisticConfidence);
                return writer;
            };

            /**
             * Encodes the specified ClassIdAndProbabilisticConfidenceScore message, length delimited. Does not implicitly {@link skymel.modelio.ClassIdAndProbabilisticConfidenceScore.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {skymel.modelio.IClassIdAndProbabilisticConfidenceScore} message ClassIdAndProbabilisticConfidenceScore message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ClassIdAndProbabilisticConfidenceScore.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ClassIdAndProbabilisticConfidenceScore message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ClassIdAndProbabilisticConfidenceScore} ClassIdAndProbabilisticConfidenceScore
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ClassIdAndProbabilisticConfidenceScore.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.className = reader.string();
                            break;
                        }
                    case 2: {
                            message.classId = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.probabilisticConfidence = reader.float();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ClassIdAndProbabilisticConfidenceScore message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ClassIdAndProbabilisticConfidenceScore} ClassIdAndProbabilisticConfidenceScore
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ClassIdAndProbabilisticConfidenceScore.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ClassIdAndProbabilisticConfidenceScore message.
             * @function verify
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ClassIdAndProbabilisticConfidenceScore.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.className != null && message.hasOwnProperty("className"))
                    if (!$util.isString(message.className))
                        return "className: string expected";
                if (message.classId != null && message.hasOwnProperty("classId"))
                    if (!$util.isInteger(message.classId))
                        return "classId: integer expected";
                if (message.probabilisticConfidence != null && message.hasOwnProperty("probabilisticConfidence"))
                    if (typeof message.probabilisticConfidence !== "number")
                        return "probabilisticConfidence: number expected";
                return null;
            };

            /**
             * Creates a ClassIdAndProbabilisticConfidenceScore message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ClassIdAndProbabilisticConfidenceScore} ClassIdAndProbabilisticConfidenceScore
             */
            ClassIdAndProbabilisticConfidenceScore.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore)
                    return object;
                var message = new $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore();
                if (object.className != null)
                    message.className = String(object.className);
                if (object.classId != null)
                    message.classId = object.classId >>> 0;
                if (object.probabilisticConfidence != null)
                    message.probabilisticConfidence = Number(object.probabilisticConfidence);
                return message;
            };

            /**
             * Creates a plain object from a ClassIdAndProbabilisticConfidenceScore message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {skymel.modelio.ClassIdAndProbabilisticConfidenceScore} message ClassIdAndProbabilisticConfidenceScore
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ClassIdAndProbabilisticConfidenceScore.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.className = "";
                    object.classId = 0;
                    object.probabilisticConfidence = 0;
                }
                if (message.className != null && message.hasOwnProperty("className"))
                    object.className = message.className;
                if (message.classId != null && message.hasOwnProperty("classId"))
                    object.classId = message.classId;
                if (message.probabilisticConfidence != null && message.hasOwnProperty("probabilisticConfidence"))
                    object.probabilisticConfidence = options.json && !isFinite(message.probabilisticConfidence) ? String(message.probabilisticConfidence) : message.probabilisticConfidence;
                return object;
            };

            /**
             * Converts this ClassIdAndProbabilisticConfidenceScore to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ClassIdAndProbabilisticConfidenceScore.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ClassIdAndProbabilisticConfidenceScore
             * @function getTypeUrl
             * @memberof skymel.modelio.ClassIdAndProbabilisticConfidenceScore
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ClassIdAndProbabilisticConfidenceScore.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ClassIdAndProbabilisticConfidenceScore";
            };

            return ClassIdAndProbabilisticConfidenceScore;
        })();

        modelio.ClassifierOutput = (function() {

            /**
             * Properties of a ClassifierOutput.
             * @memberof skymel.modelio
             * @interface IClassifierOutput
             * @property {Array.<skymel.modelio.IClassIdAndProbabilisticConfidenceScore>|null} [classConfidenceScores] ClassifierOutput classConfidenceScores
             */

            /**
             * Constructs a new ClassifierOutput.
             * @memberof skymel.modelio
             * @classdesc Represents a ClassifierOutput.
             * @implements IClassifierOutput
             * @constructor
             * @param {skymel.modelio.IClassifierOutput=} [properties] Properties to set
             */
            function ClassifierOutput(properties) {
                this.classConfidenceScores = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ClassifierOutput classConfidenceScores.
             * @member {Array.<skymel.modelio.IClassIdAndProbabilisticConfidenceScore>} classConfidenceScores
             * @memberof skymel.modelio.ClassifierOutput
             * @instance
             */
            ClassifierOutput.prototype.classConfidenceScores = $util.emptyArray;

            /**
             * Creates a new ClassifierOutput instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {skymel.modelio.IClassifierOutput=} [properties] Properties to set
             * @returns {skymel.modelio.ClassifierOutput} ClassifierOutput instance
             */
            ClassifierOutput.create = function create(properties) {
                return new ClassifierOutput(properties);
            };

            /**
             * Encodes the specified ClassifierOutput message. Does not implicitly {@link skymel.modelio.ClassifierOutput.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {skymel.modelio.IClassifierOutput} message ClassifierOutput message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ClassifierOutput.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.classConfidenceScores != null && message.classConfidenceScores.length)
                    for (var i = 0; i < message.classConfidenceScores.length; ++i)
                        $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore.encode(message.classConfidenceScores[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ClassifierOutput message, length delimited. Does not implicitly {@link skymel.modelio.ClassifierOutput.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {skymel.modelio.IClassifierOutput} message ClassifierOutput message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ClassifierOutput.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ClassifierOutput message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ClassifierOutput} ClassifierOutput
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ClassifierOutput.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ClassifierOutput();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            if (!(message.classConfidenceScores && message.classConfidenceScores.length))
                                message.classConfidenceScores = [];
                            message.classConfidenceScores.push($root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ClassifierOutput message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ClassifierOutput} ClassifierOutput
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ClassifierOutput.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ClassifierOutput message.
             * @function verify
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ClassifierOutput.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.classConfidenceScores != null && message.hasOwnProperty("classConfidenceScores")) {
                    if (!Array.isArray(message.classConfidenceScores))
                        return "classConfidenceScores: array expected";
                    for (var i = 0; i < message.classConfidenceScores.length; ++i) {
                        var error = $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore.verify(message.classConfidenceScores[i]);
                        if (error)
                            return "classConfidenceScores." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a ClassifierOutput message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ClassifierOutput} ClassifierOutput
             */
            ClassifierOutput.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ClassifierOutput)
                    return object;
                var message = new $root.skymel.modelio.ClassifierOutput();
                if (object.classConfidenceScores) {
                    if (!Array.isArray(object.classConfidenceScores))
                        throw TypeError(".skymel.modelio.ClassifierOutput.classConfidenceScores: array expected");
                    message.classConfidenceScores = [];
                    for (var i = 0; i < object.classConfidenceScores.length; ++i) {
                        if (typeof object.classConfidenceScores[i] !== "object")
                            throw TypeError(".skymel.modelio.ClassifierOutput.classConfidenceScores: object expected");
                        message.classConfidenceScores[i] = $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore.fromObject(object.classConfidenceScores[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from a ClassifierOutput message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {skymel.modelio.ClassifierOutput} message ClassifierOutput
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ClassifierOutput.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.classConfidenceScores = [];
                if (message.classConfidenceScores && message.classConfidenceScores.length) {
                    object.classConfidenceScores = [];
                    for (var j = 0; j < message.classConfidenceScores.length; ++j)
                        object.classConfidenceScores[j] = $root.skymel.modelio.ClassIdAndProbabilisticConfidenceScore.toObject(message.classConfidenceScores[j], options);
                }
                return object;
            };

            /**
             * Converts this ClassifierOutput to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ClassifierOutput
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ClassifierOutput.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ClassifierOutput
             * @function getTypeUrl
             * @memberof skymel.modelio.ClassifierOutput
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ClassifierOutput.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ClassifierOutput";
            };

            return ClassifierOutput;
        })();

        modelio.StatusReport = (function() {

            /**
             * Properties of a StatusReport.
             * @memberof skymel.modelio
             * @interface IStatusReport
             * @property {skymel.modelio.StatusReport.StatusCode|null} [status] StatusReport status
             * @property {string|null} [message] StatusReport message
             */

            /**
             * Constructs a new StatusReport.
             * @memberof skymel.modelio
             * @classdesc Represents a StatusReport.
             * @implements IStatusReport
             * @constructor
             * @param {skymel.modelio.IStatusReport=} [properties] Properties to set
             */
            function StatusReport(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * StatusReport status.
             * @member {skymel.modelio.StatusReport.StatusCode} status
             * @memberof skymel.modelio.StatusReport
             * @instance
             */
            StatusReport.prototype.status = 0;

            /**
             * StatusReport message.
             * @member {string} message
             * @memberof skymel.modelio.StatusReport
             * @instance
             */
            StatusReport.prototype.message = "";

            /**
             * Creates a new StatusReport instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {skymel.modelio.IStatusReport=} [properties] Properties to set
             * @returns {skymel.modelio.StatusReport} StatusReport instance
             */
            StatusReport.create = function create(properties) {
                return new StatusReport(properties);
            };

            /**
             * Encodes the specified StatusReport message. Does not implicitly {@link skymel.modelio.StatusReport.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {skymel.modelio.IStatusReport} message StatusReport message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            StatusReport.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.status);
                if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
                return writer;
            };

            /**
             * Encodes the specified StatusReport message, length delimited. Does not implicitly {@link skymel.modelio.StatusReport.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {skymel.modelio.IStatusReport} message StatusReport message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            StatusReport.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a StatusReport message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.StatusReport} StatusReport
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            StatusReport.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.StatusReport();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.status = reader.int32();
                            break;
                        }
                    case 2: {
                            message.message = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a StatusReport message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.StatusReport} StatusReport
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            StatusReport.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a StatusReport message.
             * @function verify
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            StatusReport.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.status != null && message.hasOwnProperty("status"))
                    switch (message.status) {
                    default:
                        return "status: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                if (message.message != null && message.hasOwnProperty("message"))
                    if (!$util.isString(message.message))
                        return "message: string expected";
                return null;
            };

            /**
             * Creates a StatusReport message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.StatusReport} StatusReport
             */
            StatusReport.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.StatusReport)
                    return object;
                var message = new $root.skymel.modelio.StatusReport();
                switch (object.status) {
                default:
                    if (typeof object.status === "number") {
                        message.status = object.status;
                        break;
                    }
                    break;
                case "UNKNOWN_STATUS":
                case 0:
                    message.status = 0;
                    break;
                case "SUCCESS":
                case 1:
                    message.status = 1;
                    break;
                case "CLIENT_ERROR":
                case 2:
                    message.status = 2;
                    break;
                case "SERVER_ERROR":
                case 3:
                    message.status = 3;
                    break;
                case "OTHER_ERROR":
                case 4:
                    message.status = 4;
                    break;
                }
                if (object.message != null)
                    message.message = String(object.message);
                return message;
            };

            /**
             * Creates a plain object from a StatusReport message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {skymel.modelio.StatusReport} message StatusReport
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            StatusReport.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.status = options.enums === String ? "UNKNOWN_STATUS" : 0;
                    object.message = "";
                }
                if (message.status != null && message.hasOwnProperty("status"))
                    object.status = options.enums === String ? $root.skymel.modelio.StatusReport.StatusCode[message.status] === undefined ? message.status : $root.skymel.modelio.StatusReport.StatusCode[message.status] : message.status;
                if (message.message != null && message.hasOwnProperty("message"))
                    object.message = message.message;
                return object;
            };

            /**
             * Converts this StatusReport to JSON.
             * @function toJSON
             * @memberof skymel.modelio.StatusReport
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            StatusReport.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for StatusReport
             * @function getTypeUrl
             * @memberof skymel.modelio.StatusReport
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            StatusReport.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.StatusReport";
            };

            /**
             * StatusCode enum.
             * @name skymel.modelio.StatusReport.StatusCode
             * @enum {number}
             * @property {number} UNKNOWN_STATUS=0 UNKNOWN_STATUS value
             * @property {number} SUCCESS=1 SUCCESS value
             * @property {number} CLIENT_ERROR=2 CLIENT_ERROR value
             * @property {number} SERVER_ERROR=3 SERVER_ERROR value
             * @property {number} OTHER_ERROR=4 OTHER_ERROR value
             */
            StatusReport.StatusCode = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_STATUS"] = 0;
                values[valuesById[1] = "SUCCESS"] = 1;
                values[valuesById[2] = "CLIENT_ERROR"] = 2;
                values[valuesById[3] = "SERVER_ERROR"] = 3;
                values[valuesById[4] = "OTHER_ERROR"] = 4;
                return values;
            })();

            return StatusReport;
        })();

        modelio.InferenceResponse = (function() {

            /**
             * Properties of an InferenceResponse.
             * @memberof skymel.modelio
             * @interface IInferenceResponse
             * @property {string|null} [requestId] InferenceResponse requestId
             * @property {skymel.modelio.IStatusReport|null} [status] InferenceResponse status
             * @property {Array.<skymel.modelio.IClassifierOutput>|null} [classifierOutputs] InferenceResponse classifierOutputs
             * @property {Array.<string>|null} [textOutputs] InferenceResponse textOutputs
             * @property {Array.<number>|null} [integerOutputs] InferenceResponse integerOutputs
             * @property {Array.<skymel.modelio.IImage>|null} [imageOutputs] InferenceResponse imageOutputs
             * @property {Array.<skymel.modelio.IGraphOutput>|null} [graphOutput] InferenceResponse graphOutput
             */

            /**
             * Constructs a new InferenceResponse.
             * @memberof skymel.modelio
             * @classdesc Represents an InferenceResponse.
             * @implements IInferenceResponse
             * @constructor
             * @param {skymel.modelio.IInferenceResponse=} [properties] Properties to set
             */
            function InferenceResponse(properties) {
                this.classifierOutputs = [];
                this.textOutputs = [];
                this.integerOutputs = [];
                this.imageOutputs = [];
                this.graphOutput = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * InferenceResponse requestId.
             * @member {string} requestId
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.requestId = "";

            /**
             * InferenceResponse status.
             * @member {skymel.modelio.IStatusReport|null|undefined} status
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.status = null;

            /**
             * InferenceResponse classifierOutputs.
             * @member {Array.<skymel.modelio.IClassifierOutput>} classifierOutputs
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.classifierOutputs = $util.emptyArray;

            /**
             * InferenceResponse textOutputs.
             * @member {Array.<string>} textOutputs
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.textOutputs = $util.emptyArray;

            /**
             * InferenceResponse integerOutputs.
             * @member {Array.<number>} integerOutputs
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.integerOutputs = $util.emptyArray;

            /**
             * InferenceResponse imageOutputs.
             * @member {Array.<skymel.modelio.IImage>} imageOutputs
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.imageOutputs = $util.emptyArray;

            /**
             * InferenceResponse graphOutput.
             * @member {Array.<skymel.modelio.IGraphOutput>} graphOutput
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             */
            InferenceResponse.prototype.graphOutput = $util.emptyArray;

            /**
             * Creates a new InferenceResponse instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {skymel.modelio.IInferenceResponse=} [properties] Properties to set
             * @returns {skymel.modelio.InferenceResponse} InferenceResponse instance
             */
            InferenceResponse.create = function create(properties) {
                return new InferenceResponse(properties);
            };

            /**
             * Encodes the specified InferenceResponse message. Does not implicitly {@link skymel.modelio.InferenceResponse.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {skymel.modelio.IInferenceResponse} message InferenceResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InferenceResponse.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.requestId != null && Object.hasOwnProperty.call(message, "requestId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.requestId);
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    $root.skymel.modelio.StatusReport.encode(message.status, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.classifierOutputs != null && message.classifierOutputs.length)
                    for (var i = 0; i < message.classifierOutputs.length; ++i)
                        $root.skymel.modelio.ClassifierOutput.encode(message.classifierOutputs[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.textOutputs != null && message.textOutputs.length)
                    for (var i = 0; i < message.textOutputs.length; ++i)
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.textOutputs[i]);
                if (message.integerOutputs != null && message.integerOutputs.length) {
                    writer.uint32(/* id 5, wireType 2 =*/42).fork();
                    for (var i = 0; i < message.integerOutputs.length; ++i)
                        writer.int32(message.integerOutputs[i]);
                    writer.ldelim();
                }
                if (message.imageOutputs != null && message.imageOutputs.length)
                    for (var i = 0; i < message.imageOutputs.length; ++i)
                        $root.skymel.modelio.Image.encode(message.imageOutputs[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                if (message.graphOutput != null && message.graphOutput.length)
                    for (var i = 0; i < message.graphOutput.length; ++i)
                        $root.skymel.modelio.GraphOutput.encode(message.graphOutput[i], writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified InferenceResponse message, length delimited. Does not implicitly {@link skymel.modelio.InferenceResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {skymel.modelio.IInferenceResponse} message InferenceResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InferenceResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an InferenceResponse message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.InferenceResponse} InferenceResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InferenceResponse.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.InferenceResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.requestId = reader.string();
                            break;
                        }
                    case 2: {
                            message.status = $root.skymel.modelio.StatusReport.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            if (!(message.classifierOutputs && message.classifierOutputs.length))
                                message.classifierOutputs = [];
                            message.classifierOutputs.push($root.skymel.modelio.ClassifierOutput.decode(reader, reader.uint32()));
                            break;
                        }
                    case 4: {
                            if (!(message.textOutputs && message.textOutputs.length))
                                message.textOutputs = [];
                            message.textOutputs.push(reader.string());
                            break;
                        }
                    case 5: {
                            if (!(message.integerOutputs && message.integerOutputs.length))
                                message.integerOutputs = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.integerOutputs.push(reader.int32());
                            } else
                                message.integerOutputs.push(reader.int32());
                            break;
                        }
                    case 6: {
                            if (!(message.imageOutputs && message.imageOutputs.length))
                                message.imageOutputs = [];
                            message.imageOutputs.push($root.skymel.modelio.Image.decode(reader, reader.uint32()));
                            break;
                        }
                    case 7: {
                            if (!(message.graphOutput && message.graphOutput.length))
                                message.graphOutput = [];
                            message.graphOutput.push($root.skymel.modelio.GraphOutput.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an InferenceResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.InferenceResponse} InferenceResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InferenceResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an InferenceResponse message.
             * @function verify
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            InferenceResponse.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    if (!$util.isString(message.requestId))
                        return "requestId: string expected";
                if (message.status != null && message.hasOwnProperty("status")) {
                    var error = $root.skymel.modelio.StatusReport.verify(message.status);
                    if (error)
                        return "status." + error;
                }
                if (message.classifierOutputs != null && message.hasOwnProperty("classifierOutputs")) {
                    if (!Array.isArray(message.classifierOutputs))
                        return "classifierOutputs: array expected";
                    for (var i = 0; i < message.classifierOutputs.length; ++i) {
                        var error = $root.skymel.modelio.ClassifierOutput.verify(message.classifierOutputs[i]);
                        if (error)
                            return "classifierOutputs." + error;
                    }
                }
                if (message.textOutputs != null && message.hasOwnProperty("textOutputs")) {
                    if (!Array.isArray(message.textOutputs))
                        return "textOutputs: array expected";
                    for (var i = 0; i < message.textOutputs.length; ++i)
                        if (!$util.isString(message.textOutputs[i]))
                            return "textOutputs: string[] expected";
                }
                if (message.integerOutputs != null && message.hasOwnProperty("integerOutputs")) {
                    if (!Array.isArray(message.integerOutputs))
                        return "integerOutputs: array expected";
                    for (var i = 0; i < message.integerOutputs.length; ++i)
                        if (!$util.isInteger(message.integerOutputs[i]))
                            return "integerOutputs: integer[] expected";
                }
                if (message.imageOutputs != null && message.hasOwnProperty("imageOutputs")) {
                    if (!Array.isArray(message.imageOutputs))
                        return "imageOutputs: array expected";
                    for (var i = 0; i < message.imageOutputs.length; ++i) {
                        var error = $root.skymel.modelio.Image.verify(message.imageOutputs[i]);
                        if (error)
                            return "imageOutputs." + error;
                    }
                }
                if (message.graphOutput != null && message.hasOwnProperty("graphOutput")) {
                    if (!Array.isArray(message.graphOutput))
                        return "graphOutput: array expected";
                    for (var i = 0; i < message.graphOutput.length; ++i) {
                        var error = $root.skymel.modelio.GraphOutput.verify(message.graphOutput[i]);
                        if (error)
                            return "graphOutput." + error;
                    }
                }
                return null;
            };

            /**
             * Creates an InferenceResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.InferenceResponse} InferenceResponse
             */
            InferenceResponse.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.InferenceResponse)
                    return object;
                var message = new $root.skymel.modelio.InferenceResponse();
                if (object.requestId != null)
                    message.requestId = String(object.requestId);
                if (object.status != null) {
                    if (typeof object.status !== "object")
                        throw TypeError(".skymel.modelio.InferenceResponse.status: object expected");
                    message.status = $root.skymel.modelio.StatusReport.fromObject(object.status);
                }
                if (object.classifierOutputs) {
                    if (!Array.isArray(object.classifierOutputs))
                        throw TypeError(".skymel.modelio.InferenceResponse.classifierOutputs: array expected");
                    message.classifierOutputs = [];
                    for (var i = 0; i < object.classifierOutputs.length; ++i) {
                        if (typeof object.classifierOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceResponse.classifierOutputs: object expected");
                        message.classifierOutputs[i] = $root.skymel.modelio.ClassifierOutput.fromObject(object.classifierOutputs[i]);
                    }
                }
                if (object.textOutputs) {
                    if (!Array.isArray(object.textOutputs))
                        throw TypeError(".skymel.modelio.InferenceResponse.textOutputs: array expected");
                    message.textOutputs = [];
                    for (var i = 0; i < object.textOutputs.length; ++i)
                        message.textOutputs[i] = String(object.textOutputs[i]);
                }
                if (object.integerOutputs) {
                    if (!Array.isArray(object.integerOutputs))
                        throw TypeError(".skymel.modelio.InferenceResponse.integerOutputs: array expected");
                    message.integerOutputs = [];
                    for (var i = 0; i < object.integerOutputs.length; ++i)
                        message.integerOutputs[i] = object.integerOutputs[i] | 0;
                }
                if (object.imageOutputs) {
                    if (!Array.isArray(object.imageOutputs))
                        throw TypeError(".skymel.modelio.InferenceResponse.imageOutputs: array expected");
                    message.imageOutputs = [];
                    for (var i = 0; i < object.imageOutputs.length; ++i) {
                        if (typeof object.imageOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceResponse.imageOutputs: object expected");
                        message.imageOutputs[i] = $root.skymel.modelio.Image.fromObject(object.imageOutputs[i]);
                    }
                }
                if (object.graphOutput) {
                    if (!Array.isArray(object.graphOutput))
                        throw TypeError(".skymel.modelio.InferenceResponse.graphOutput: array expected");
                    message.graphOutput = [];
                    for (var i = 0; i < object.graphOutput.length; ++i) {
                        if (typeof object.graphOutput[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceResponse.graphOutput: object expected");
                        message.graphOutput[i] = $root.skymel.modelio.GraphOutput.fromObject(object.graphOutput[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from an InferenceResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {skymel.modelio.InferenceResponse} message InferenceResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            InferenceResponse.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.classifierOutputs = [];
                    object.textOutputs = [];
                    object.integerOutputs = [];
                    object.imageOutputs = [];
                    object.graphOutput = [];
                }
                if (options.defaults) {
                    object.requestId = "";
                    object.status = null;
                }
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    object.requestId = message.requestId;
                if (message.status != null && message.hasOwnProperty("status"))
                    object.status = $root.skymel.modelio.StatusReport.toObject(message.status, options);
                if (message.classifierOutputs && message.classifierOutputs.length) {
                    object.classifierOutputs = [];
                    for (var j = 0; j < message.classifierOutputs.length; ++j)
                        object.classifierOutputs[j] = $root.skymel.modelio.ClassifierOutput.toObject(message.classifierOutputs[j], options);
                }
                if (message.textOutputs && message.textOutputs.length) {
                    object.textOutputs = [];
                    for (var j = 0; j < message.textOutputs.length; ++j)
                        object.textOutputs[j] = message.textOutputs[j];
                }
                if (message.integerOutputs && message.integerOutputs.length) {
                    object.integerOutputs = [];
                    for (var j = 0; j < message.integerOutputs.length; ++j)
                        object.integerOutputs[j] = message.integerOutputs[j];
                }
                if (message.imageOutputs && message.imageOutputs.length) {
                    object.imageOutputs = [];
                    for (var j = 0; j < message.imageOutputs.length; ++j)
                        object.imageOutputs[j] = $root.skymel.modelio.Image.toObject(message.imageOutputs[j], options);
                }
                if (message.graphOutput && message.graphOutput.length) {
                    object.graphOutput = [];
                    for (var j = 0; j < message.graphOutput.length; ++j)
                        object.graphOutput[j] = $root.skymel.modelio.GraphOutput.toObject(message.graphOutput[j], options);
                }
                return object;
            };

            /**
             * Converts this InferenceResponse to JSON.
             * @function toJSON
             * @memberof skymel.modelio.InferenceResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            InferenceResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for InferenceResponse
             * @function getTypeUrl
             * @memberof skymel.modelio.InferenceResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            InferenceResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.InferenceResponse";
            };

            return InferenceResponse;
        })();

        modelio.ModelInputOutputDescription = (function() {

            /**
             * Properties of a ModelInputOutputDescription.
             * @memberof skymel.modelio
             * @interface IModelInputOutputDescription
             * @property {string|null} [name] ModelInputOutputDescription name
             * @property {skymel.modelio.ModelInputOutputDescription.DataType|null} [dataType] ModelInputOutputDescription dataType
             * @property {Array.<number>|null} [dataShape] ModelInputOutputDescription dataShape
             */

            /**
             * Constructs a new ModelInputOutputDescription.
             * @memberof skymel.modelio
             * @classdesc Represents a ModelInputOutputDescription.
             * @implements IModelInputOutputDescription
             * @constructor
             * @param {skymel.modelio.IModelInputOutputDescription=} [properties] Properties to set
             */
            function ModelInputOutputDescription(properties) {
                this.dataShape = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ModelInputOutputDescription name.
             * @member {string} name
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @instance
             */
            ModelInputOutputDescription.prototype.name = "";

            /**
             * ModelInputOutputDescription dataType.
             * @member {skymel.modelio.ModelInputOutputDescription.DataType} dataType
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @instance
             */
            ModelInputOutputDescription.prototype.dataType = 0;

            /**
             * ModelInputOutputDescription dataShape.
             * @member {Array.<number>} dataShape
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @instance
             */
            ModelInputOutputDescription.prototype.dataShape = $util.emptyArray;

            /**
             * Creates a new ModelInputOutputDescription instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {skymel.modelio.IModelInputOutputDescription=} [properties] Properties to set
             * @returns {skymel.modelio.ModelInputOutputDescription} ModelInputOutputDescription instance
             */
            ModelInputOutputDescription.create = function create(properties) {
                return new ModelInputOutputDescription(properties);
            };

            /**
             * Encodes the specified ModelInputOutputDescription message. Does not implicitly {@link skymel.modelio.ModelInputOutputDescription.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {skymel.modelio.IModelInputOutputDescription} message ModelInputOutputDescription message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelInputOutputDescription.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                if (message.dataType != null && Object.hasOwnProperty.call(message, "dataType"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.dataType);
                if (message.dataShape != null && message.dataShape.length) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork();
                    for (var i = 0; i < message.dataShape.length; ++i)
                        writer.int32(message.dataShape[i]);
                    writer.ldelim();
                }
                return writer;
            };

            /**
             * Encodes the specified ModelInputOutputDescription message, length delimited. Does not implicitly {@link skymel.modelio.ModelInputOutputDescription.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {skymel.modelio.IModelInputOutputDescription} message ModelInputOutputDescription message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelInputOutputDescription.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ModelInputOutputDescription message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ModelInputOutputDescription} ModelInputOutputDescription
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelInputOutputDescription.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ModelInputOutputDescription();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.name = reader.string();
                            break;
                        }
                    case 2: {
                            message.dataType = reader.int32();
                            break;
                        }
                    case 3: {
                            if (!(message.dataShape && message.dataShape.length))
                                message.dataShape = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.dataShape.push(reader.int32());
                            } else
                                message.dataShape.push(reader.int32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ModelInputOutputDescription message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ModelInputOutputDescription} ModelInputOutputDescription
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelInputOutputDescription.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ModelInputOutputDescription message.
             * @function verify
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ModelInputOutputDescription.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.name != null && message.hasOwnProperty("name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.dataType != null && message.hasOwnProperty("dataType"))
                    switch (message.dataType) {
                    default:
                        return "dataType: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                        break;
                    }
                if (message.dataShape != null && message.hasOwnProperty("dataShape")) {
                    if (!Array.isArray(message.dataShape))
                        return "dataShape: array expected";
                    for (var i = 0; i < message.dataShape.length; ++i)
                        if (!$util.isInteger(message.dataShape[i]))
                            return "dataShape: integer[] expected";
                }
                return null;
            };

            /**
             * Creates a ModelInputOutputDescription message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ModelInputOutputDescription} ModelInputOutputDescription
             */
            ModelInputOutputDescription.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ModelInputOutputDescription)
                    return object;
                var message = new $root.skymel.modelio.ModelInputOutputDescription();
                if (object.name != null)
                    message.name = String(object.name);
                switch (object.dataType) {
                default:
                    if (typeof object.dataType === "number") {
                        message.dataType = object.dataType;
                        break;
                    }
                    break;
                case "UNKNOWN_TYPE":
                case 0:
                    message.dataType = 0;
                    break;
                case "BYTES":
                case 1:
                    message.dataType = 1;
                    break;
                case "UINT8":
                case 2:
                    message.dataType = 2;
                    break;
                case "INT32":
                case 3:
                    message.dataType = 3;
                    break;
                case "INT64":
                case 4:
                    message.dataType = 4;
                    break;
                case "FLOAT32":
                case 5:
                    message.dataType = 5;
                    break;
                case "DOUBLE":
                case 6:
                    message.dataType = 6;
                    break;
                case "LONG_DOUBLE":
                case 7:
                    message.dataType = 7;
                    break;
                case "STRING":
                case 8:
                    message.dataType = 8;
                    break;
                }
                if (object.dataShape) {
                    if (!Array.isArray(object.dataShape))
                        throw TypeError(".skymel.modelio.ModelInputOutputDescription.dataShape: array expected");
                    message.dataShape = [];
                    for (var i = 0; i < object.dataShape.length; ++i)
                        message.dataShape[i] = object.dataShape[i] | 0;
                }
                return message;
            };

            /**
             * Creates a plain object from a ModelInputOutputDescription message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {skymel.modelio.ModelInputOutputDescription} message ModelInputOutputDescription
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ModelInputOutputDescription.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.dataShape = [];
                if (options.defaults) {
                    object.name = "";
                    object.dataType = options.enums === String ? "UNKNOWN_TYPE" : 0;
                }
                if (message.name != null && message.hasOwnProperty("name"))
                    object.name = message.name;
                if (message.dataType != null && message.hasOwnProperty("dataType"))
                    object.dataType = options.enums === String ? $root.skymel.modelio.ModelInputOutputDescription.DataType[message.dataType] === undefined ? message.dataType : $root.skymel.modelio.ModelInputOutputDescription.DataType[message.dataType] : message.dataType;
                if (message.dataShape && message.dataShape.length) {
                    object.dataShape = [];
                    for (var j = 0; j < message.dataShape.length; ++j)
                        object.dataShape[j] = message.dataShape[j];
                }
                return object;
            };

            /**
             * Converts this ModelInputOutputDescription to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ModelInputOutputDescription.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ModelInputOutputDescription
             * @function getTypeUrl
             * @memberof skymel.modelio.ModelInputOutputDescription
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ModelInputOutputDescription.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ModelInputOutputDescription";
            };

            /**
             * DataType enum.
             * @name skymel.modelio.ModelInputOutputDescription.DataType
             * @enum {number}
             * @property {number} UNKNOWN_TYPE=0 UNKNOWN_TYPE value
             * @property {number} BYTES=1 BYTES value
             * @property {number} UINT8=2 UINT8 value
             * @property {number} INT32=3 INT32 value
             * @property {number} INT64=4 INT64 value
             * @property {number} FLOAT32=5 FLOAT32 value
             * @property {number} DOUBLE=6 DOUBLE value
             * @property {number} LONG_DOUBLE=7 LONG_DOUBLE value
             * @property {number} STRING=8 STRING value
             */
            ModelInputOutputDescription.DataType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_TYPE"] = 0;
                values[valuesById[1] = "BYTES"] = 1;
                values[valuesById[2] = "UINT8"] = 2;
                values[valuesById[3] = "INT32"] = 3;
                values[valuesById[4] = "INT64"] = 4;
                values[valuesById[5] = "FLOAT32"] = 5;
                values[valuesById[6] = "DOUBLE"] = 6;
                values[valuesById[7] = "LONG_DOUBLE"] = 7;
                values[valuesById[8] = "STRING"] = 8;
                return values;
            })();

            return ModelInputOutputDescription;
        })();

        modelio.SensitiveDataSignature = (function() {

            /**
             * Properties of a SensitiveDataSignature.
             * @memberof skymel.modelio
             * @interface ISensitiveDataSignature
             * @property {string|null} [signature] SensitiveDataSignature signature
             * @property {string|null} [publicKey] SensitiveDataSignature publicKey
             */

            /**
             * Constructs a new SensitiveDataSignature.
             * @memberof skymel.modelio
             * @classdesc Represents a SensitiveDataSignature.
             * @implements ISensitiveDataSignature
             * @constructor
             * @param {skymel.modelio.ISensitiveDataSignature=} [properties] Properties to set
             */
            function SensitiveDataSignature(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SensitiveDataSignature signature.
             * @member {string} signature
             * @memberof skymel.modelio.SensitiveDataSignature
             * @instance
             */
            SensitiveDataSignature.prototype.signature = "";

            /**
             * SensitiveDataSignature publicKey.
             * @member {string} publicKey
             * @memberof skymel.modelio.SensitiveDataSignature
             * @instance
             */
            SensitiveDataSignature.prototype.publicKey = "";

            /**
             * Creates a new SensitiveDataSignature instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {skymel.modelio.ISensitiveDataSignature=} [properties] Properties to set
             * @returns {skymel.modelio.SensitiveDataSignature} SensitiveDataSignature instance
             */
            SensitiveDataSignature.create = function create(properties) {
                return new SensitiveDataSignature(properties);
            };

            /**
             * Encodes the specified SensitiveDataSignature message. Does not implicitly {@link skymel.modelio.SensitiveDataSignature.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {skymel.modelio.ISensitiveDataSignature} message SensitiveDataSignature message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SensitiveDataSignature.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.signature != null && Object.hasOwnProperty.call(message, "signature"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.signature);
                if (message.publicKey != null && Object.hasOwnProperty.call(message, "publicKey"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.publicKey);
                return writer;
            };

            /**
             * Encodes the specified SensitiveDataSignature message, length delimited. Does not implicitly {@link skymel.modelio.SensitiveDataSignature.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {skymel.modelio.ISensitiveDataSignature} message SensitiveDataSignature message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SensitiveDataSignature.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SensitiveDataSignature message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.SensitiveDataSignature} SensitiveDataSignature
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SensitiveDataSignature.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.SensitiveDataSignature();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.signature = reader.string();
                            break;
                        }
                    case 2: {
                            message.publicKey = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SensitiveDataSignature message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.SensitiveDataSignature} SensitiveDataSignature
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SensitiveDataSignature.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SensitiveDataSignature message.
             * @function verify
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SensitiveDataSignature.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.signature != null && message.hasOwnProperty("signature"))
                    if (!$util.isString(message.signature))
                        return "signature: string expected";
                if (message.publicKey != null && message.hasOwnProperty("publicKey"))
                    if (!$util.isString(message.publicKey))
                        return "publicKey: string expected";
                return null;
            };

            /**
             * Creates a SensitiveDataSignature message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.SensitiveDataSignature} SensitiveDataSignature
             */
            SensitiveDataSignature.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.SensitiveDataSignature)
                    return object;
                var message = new $root.skymel.modelio.SensitiveDataSignature();
                if (object.signature != null)
                    message.signature = String(object.signature);
                if (object.publicKey != null)
                    message.publicKey = String(object.publicKey);
                return message;
            };

            /**
             * Creates a plain object from a SensitiveDataSignature message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {skymel.modelio.SensitiveDataSignature} message SensitiveDataSignature
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SensitiveDataSignature.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.signature = "";
                    object.publicKey = "";
                }
                if (message.signature != null && message.hasOwnProperty("signature"))
                    object.signature = message.signature;
                if (message.publicKey != null && message.hasOwnProperty("publicKey"))
                    object.publicKey = message.publicKey;
                return object;
            };

            /**
             * Converts this SensitiveDataSignature to JSON.
             * @function toJSON
             * @memberof skymel.modelio.SensitiveDataSignature
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SensitiveDataSignature.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SensitiveDataSignature
             * @function getTypeUrl
             * @memberof skymel.modelio.SensitiveDataSignature
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SensitiveDataSignature.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.SensitiveDataSignature";
            };

            return SensitiveDataSignature;
        })();

        modelio.ModelBinary = (function() {

            /**
             * Properties of a ModelBinary.
             * @memberof skymel.modelio
             * @interface IModelBinary
             * @property {Uint8Array|null} [modelBytes] ModelBinary modelBytes
             * @property {boolean|null} [isCompressed] ModelBinary isCompressed
             * @property {skymel.modelio.ModelBinary.CompressionAlgorithm|null} [compressionAlgorithm] ModelBinary compressionAlgorithm
             * @property {skymel.modelio.ISensitiveDataSignature|null} [signature] ModelBinary signature
             */

            /**
             * Constructs a new ModelBinary.
             * @memberof skymel.modelio
             * @classdesc Represents a ModelBinary.
             * @implements IModelBinary
             * @constructor
             * @param {skymel.modelio.IModelBinary=} [properties] Properties to set
             */
            function ModelBinary(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ModelBinary modelBytes.
             * @member {Uint8Array} modelBytes
             * @memberof skymel.modelio.ModelBinary
             * @instance
             */
            ModelBinary.prototype.modelBytes = $util.newBuffer([]);

            /**
             * ModelBinary isCompressed.
             * @member {boolean} isCompressed
             * @memberof skymel.modelio.ModelBinary
             * @instance
             */
            ModelBinary.prototype.isCompressed = false;

            /**
             * ModelBinary compressionAlgorithm.
             * @member {skymel.modelio.ModelBinary.CompressionAlgorithm} compressionAlgorithm
             * @memberof skymel.modelio.ModelBinary
             * @instance
             */
            ModelBinary.prototype.compressionAlgorithm = 0;

            /**
             * ModelBinary signature.
             * @member {skymel.modelio.ISensitiveDataSignature|null|undefined} signature
             * @memberof skymel.modelio.ModelBinary
             * @instance
             */
            ModelBinary.prototype.signature = null;

            /**
             * Creates a new ModelBinary instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {skymel.modelio.IModelBinary=} [properties] Properties to set
             * @returns {skymel.modelio.ModelBinary} ModelBinary instance
             */
            ModelBinary.create = function create(properties) {
                return new ModelBinary(properties);
            };

            /**
             * Encodes the specified ModelBinary message. Does not implicitly {@link skymel.modelio.ModelBinary.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {skymel.modelio.IModelBinary} message ModelBinary message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelBinary.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.modelBytes != null && Object.hasOwnProperty.call(message, "modelBytes"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.modelBytes);
                if (message.isCompressed != null && Object.hasOwnProperty.call(message, "isCompressed"))
                    writer.uint32(/* id 2, wireType 0 =*/16).bool(message.isCompressed);
                if (message.compressionAlgorithm != null && Object.hasOwnProperty.call(message, "compressionAlgorithm"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.compressionAlgorithm);
                if (message.signature != null && Object.hasOwnProperty.call(message, "signature"))
                    $root.skymel.modelio.SensitiveDataSignature.encode(message.signature, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ModelBinary message, length delimited. Does not implicitly {@link skymel.modelio.ModelBinary.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {skymel.modelio.IModelBinary} message ModelBinary message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelBinary.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ModelBinary message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ModelBinary} ModelBinary
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelBinary.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ModelBinary();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.modelBytes = reader.bytes();
                            break;
                        }
                    case 2: {
                            message.isCompressed = reader.bool();
                            break;
                        }
                    case 3: {
                            message.compressionAlgorithm = reader.int32();
                            break;
                        }
                    case 4: {
                            message.signature = $root.skymel.modelio.SensitiveDataSignature.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ModelBinary message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ModelBinary} ModelBinary
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelBinary.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ModelBinary message.
             * @function verify
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ModelBinary.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.modelBytes != null && message.hasOwnProperty("modelBytes"))
                    if (!(message.modelBytes && typeof message.modelBytes.length === "number" || $util.isString(message.modelBytes)))
                        return "modelBytes: buffer expected";
                if (message.isCompressed != null && message.hasOwnProperty("isCompressed"))
                    if (typeof message.isCompressed !== "boolean")
                        return "isCompressed: boolean expected";
                if (message.compressionAlgorithm != null && message.hasOwnProperty("compressionAlgorithm"))
                    switch (message.compressionAlgorithm) {
                    default:
                        return "compressionAlgorithm: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                if (message.signature != null && message.hasOwnProperty("signature")) {
                    var error = $root.skymel.modelio.SensitiveDataSignature.verify(message.signature);
                    if (error)
                        return "signature." + error;
                }
                return null;
            };

            /**
             * Creates a ModelBinary message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ModelBinary} ModelBinary
             */
            ModelBinary.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ModelBinary)
                    return object;
                var message = new $root.skymel.modelio.ModelBinary();
                if (object.modelBytes != null)
                    if (typeof object.modelBytes === "string")
                        $util.base64.decode(object.modelBytes, message.modelBytes = $util.newBuffer($util.base64.length(object.modelBytes)), 0);
                    else if (object.modelBytes.length >= 0)
                        message.modelBytes = object.modelBytes;
                if (object.isCompressed != null)
                    message.isCompressed = Boolean(object.isCompressed);
                switch (object.compressionAlgorithm) {
                default:
                    if (typeof object.compressionAlgorithm === "number") {
                        message.compressionAlgorithm = object.compressionAlgorithm;
                        break;
                    }
                    break;
                case "UNKNOWN_COMPRESSION":
                case 0:
                    message.compressionAlgorithm = 0;
                    break;
                case "GZIP":
                case 1:
                    message.compressionAlgorithm = 1;
                    break;
                case "BROTLI":
                case 2:
                    message.compressionAlgorithm = 2;
                    break;
                case "DEFLATE":
                case 3:
                    message.compressionAlgorithm = 3;
                    break;
                }
                if (object.signature != null) {
                    if (typeof object.signature !== "object")
                        throw TypeError(".skymel.modelio.ModelBinary.signature: object expected");
                    message.signature = $root.skymel.modelio.SensitiveDataSignature.fromObject(object.signature);
                }
                return message;
            };

            /**
             * Creates a plain object from a ModelBinary message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {skymel.modelio.ModelBinary} message ModelBinary
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ModelBinary.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    if (options.bytes === String)
                        object.modelBytes = "";
                    else {
                        object.modelBytes = [];
                        if (options.bytes !== Array)
                            object.modelBytes = $util.newBuffer(object.modelBytes);
                    }
                    object.isCompressed = false;
                    object.compressionAlgorithm = options.enums === String ? "UNKNOWN_COMPRESSION" : 0;
                    object.signature = null;
                }
                if (message.modelBytes != null && message.hasOwnProperty("modelBytes"))
                    object.modelBytes = options.bytes === String ? $util.base64.encode(message.modelBytes, 0, message.modelBytes.length) : options.bytes === Array ? Array.prototype.slice.call(message.modelBytes) : message.modelBytes;
                if (message.isCompressed != null && message.hasOwnProperty("isCompressed"))
                    object.isCompressed = message.isCompressed;
                if (message.compressionAlgorithm != null && message.hasOwnProperty("compressionAlgorithm"))
                    object.compressionAlgorithm = options.enums === String ? $root.skymel.modelio.ModelBinary.CompressionAlgorithm[message.compressionAlgorithm] === undefined ? message.compressionAlgorithm : $root.skymel.modelio.ModelBinary.CompressionAlgorithm[message.compressionAlgorithm] : message.compressionAlgorithm;
                if (message.signature != null && message.hasOwnProperty("signature"))
                    object.signature = $root.skymel.modelio.SensitiveDataSignature.toObject(message.signature, options);
                return object;
            };

            /**
             * Converts this ModelBinary to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ModelBinary
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ModelBinary.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ModelBinary
             * @function getTypeUrl
             * @memberof skymel.modelio.ModelBinary
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ModelBinary.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ModelBinary";
            };

            /**
             * CompressionAlgorithm enum.
             * @name skymel.modelio.ModelBinary.CompressionAlgorithm
             * @enum {number}
             * @property {number} UNKNOWN_COMPRESSION=0 UNKNOWN_COMPRESSION value
             * @property {number} GZIP=1 GZIP value
             * @property {number} BROTLI=2 BROTLI value
             * @property {number} DEFLATE=3 DEFLATE value
             */
            ModelBinary.CompressionAlgorithm = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_COMPRESSION"] = 0;
                values[valuesById[1] = "GZIP"] = 1;
                values[valuesById[2] = "BROTLI"] = 2;
                values[valuesById[3] = "DEFLATE"] = 3;
                return values;
            })();

            return ModelBinary;
        })();

        modelio.EndpointLocationAndId = (function() {

            /**
             * Properties of an EndpointLocationAndId.
             * @memberof skymel.modelio
             * @interface IEndpointLocationAndId
             * @property {string|null} [endpointId] EndpointLocationAndId endpointId
             * @property {skymel.modelio.EndpointLocationAndId.EndpointLocation|null} [endpointLocation] EndpointLocationAndId endpointLocation
             * @property {string|null} [endpointUrl] EndpointLocationAndId endpointUrl
             */

            /**
             * Constructs a new EndpointLocationAndId.
             * @memberof skymel.modelio
             * @classdesc Represents an EndpointLocationAndId.
             * @implements IEndpointLocationAndId
             * @constructor
             * @param {skymel.modelio.IEndpointLocationAndId=} [properties] Properties to set
             */
            function EndpointLocationAndId(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EndpointLocationAndId endpointId.
             * @member {string} endpointId
             * @memberof skymel.modelio.EndpointLocationAndId
             * @instance
             */
            EndpointLocationAndId.prototype.endpointId = "";

            /**
             * EndpointLocationAndId endpointLocation.
             * @member {skymel.modelio.EndpointLocationAndId.EndpointLocation} endpointLocation
             * @memberof skymel.modelio.EndpointLocationAndId
             * @instance
             */
            EndpointLocationAndId.prototype.endpointLocation = 0;

            /**
             * EndpointLocationAndId endpointUrl.
             * @member {string} endpointUrl
             * @memberof skymel.modelio.EndpointLocationAndId
             * @instance
             */
            EndpointLocationAndId.prototype.endpointUrl = "";

            /**
             * Creates a new EndpointLocationAndId instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {skymel.modelio.IEndpointLocationAndId=} [properties] Properties to set
             * @returns {skymel.modelio.EndpointLocationAndId} EndpointLocationAndId instance
             */
            EndpointLocationAndId.create = function create(properties) {
                return new EndpointLocationAndId(properties);
            };

            /**
             * Encodes the specified EndpointLocationAndId message. Does not implicitly {@link skymel.modelio.EndpointLocationAndId.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {skymel.modelio.IEndpointLocationAndId} message EndpointLocationAndId message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EndpointLocationAndId.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.endpointId != null && Object.hasOwnProperty.call(message, "endpointId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.endpointId);
                if (message.endpointLocation != null && Object.hasOwnProperty.call(message, "endpointLocation"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.endpointLocation);
                if (message.endpointUrl != null && Object.hasOwnProperty.call(message, "endpointUrl"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.endpointUrl);
                return writer;
            };

            /**
             * Encodes the specified EndpointLocationAndId message, length delimited. Does not implicitly {@link skymel.modelio.EndpointLocationAndId.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {skymel.modelio.IEndpointLocationAndId} message EndpointLocationAndId message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EndpointLocationAndId.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an EndpointLocationAndId message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.EndpointLocationAndId} EndpointLocationAndId
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EndpointLocationAndId.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.EndpointLocationAndId();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.endpointId = reader.string();
                            break;
                        }
                    case 2: {
                            message.endpointLocation = reader.int32();
                            break;
                        }
                    case 3: {
                            message.endpointUrl = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an EndpointLocationAndId message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.EndpointLocationAndId} EndpointLocationAndId
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EndpointLocationAndId.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an EndpointLocationAndId message.
             * @function verify
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            EndpointLocationAndId.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.endpointId != null && message.hasOwnProperty("endpointId"))
                    if (!$util.isString(message.endpointId))
                        return "endpointId: string expected";
                if (message.endpointLocation != null && message.hasOwnProperty("endpointLocation"))
                    switch (message.endpointLocation) {
                    default:
                        return "endpointLocation: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                if (message.endpointUrl != null && message.hasOwnProperty("endpointUrl"))
                    if (!$util.isString(message.endpointUrl))
                        return "endpointUrl: string expected";
                return null;
            };

            /**
             * Creates an EndpointLocationAndId message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.EndpointLocationAndId} EndpointLocationAndId
             */
            EndpointLocationAndId.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.EndpointLocationAndId)
                    return object;
                var message = new $root.skymel.modelio.EndpointLocationAndId();
                if (object.endpointId != null)
                    message.endpointId = String(object.endpointId);
                switch (object.endpointLocation) {
                default:
                    if (typeof object.endpointLocation === "number") {
                        message.endpointLocation = object.endpointLocation;
                        break;
                    }
                    break;
                case "UNKNOWN_LOCATION":
                case 0:
                    message.endpointLocation = 0;
                    break;
                case "LOCAL":
                case 1:
                    message.endpointLocation = 1;
                    break;
                case "REMOTE":
                case 2:
                    message.endpointLocation = 2;
                    break;
                }
                if (object.endpointUrl != null)
                    message.endpointUrl = String(object.endpointUrl);
                return message;
            };

            /**
             * Creates a plain object from an EndpointLocationAndId message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {skymel.modelio.EndpointLocationAndId} message EndpointLocationAndId
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            EndpointLocationAndId.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.endpointId = "";
                    object.endpointLocation = options.enums === String ? "UNKNOWN_LOCATION" : 0;
                    object.endpointUrl = "";
                }
                if (message.endpointId != null && message.hasOwnProperty("endpointId"))
                    object.endpointId = message.endpointId;
                if (message.endpointLocation != null && message.hasOwnProperty("endpointLocation"))
                    object.endpointLocation = options.enums === String ? $root.skymel.modelio.EndpointLocationAndId.EndpointLocation[message.endpointLocation] === undefined ? message.endpointLocation : $root.skymel.modelio.EndpointLocationAndId.EndpointLocation[message.endpointLocation] : message.endpointLocation;
                if (message.endpointUrl != null && message.hasOwnProperty("endpointUrl"))
                    object.endpointUrl = message.endpointUrl;
                return object;
            };

            /**
             * Converts this EndpointLocationAndId to JSON.
             * @function toJSON
             * @memberof skymel.modelio.EndpointLocationAndId
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            EndpointLocationAndId.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for EndpointLocationAndId
             * @function getTypeUrl
             * @memberof skymel.modelio.EndpointLocationAndId
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            EndpointLocationAndId.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.EndpointLocationAndId";
            };

            /**
             * EndpointLocation enum.
             * @name skymel.modelio.EndpointLocationAndId.EndpointLocation
             * @enum {number}
             * @property {number} UNKNOWN_LOCATION=0 UNKNOWN_LOCATION value
             * @property {number} LOCAL=1 LOCAL value
             * @property {number} REMOTE=2 REMOTE value
             */
            EndpointLocationAndId.EndpointLocation = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_LOCATION"] = 0;
                values[valuesById[1] = "LOCAL"] = 1;
                values[valuesById[2] = "REMOTE"] = 2;
                return values;
            })();

            return EndpointLocationAndId;
        })();

        modelio.AbstractSyntaxTree = (function() {

            /**
             * Properties of an AbstractSyntaxTree.
             * @memberof skymel.modelio
             * @interface IAbstractSyntaxTree
             * @property {Uint8Array|null} [abstractSyntaxTree] AbstractSyntaxTree abstractSyntaxTree
             * @property {Array.<skymel.modelio.AbstractSyntaxTree.SupportedLanguages>|null} [supportedLanguages] AbstractSyntaxTree supportedLanguages
             */

            /**
             * Constructs a new AbstractSyntaxTree.
             * @memberof skymel.modelio
             * @classdesc Represents an AbstractSyntaxTree.
             * @implements IAbstractSyntaxTree
             * @constructor
             * @param {skymel.modelio.IAbstractSyntaxTree=} [properties] Properties to set
             */
            function AbstractSyntaxTree(properties) {
                this.supportedLanguages = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AbstractSyntaxTree abstractSyntaxTree.
             * @member {Uint8Array} abstractSyntaxTree
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @instance
             */
            AbstractSyntaxTree.prototype.abstractSyntaxTree = $util.newBuffer([]);

            /**
             * AbstractSyntaxTree supportedLanguages.
             * @member {Array.<skymel.modelio.AbstractSyntaxTree.SupportedLanguages>} supportedLanguages
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @instance
             */
            AbstractSyntaxTree.prototype.supportedLanguages = $util.emptyArray;

            /**
             * Creates a new AbstractSyntaxTree instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {skymel.modelio.IAbstractSyntaxTree=} [properties] Properties to set
             * @returns {skymel.modelio.AbstractSyntaxTree} AbstractSyntaxTree instance
             */
            AbstractSyntaxTree.create = function create(properties) {
                return new AbstractSyntaxTree(properties);
            };

            /**
             * Encodes the specified AbstractSyntaxTree message. Does not implicitly {@link skymel.modelio.AbstractSyntaxTree.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {skymel.modelio.IAbstractSyntaxTree} message AbstractSyntaxTree message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AbstractSyntaxTree.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.abstractSyntaxTree != null && Object.hasOwnProperty.call(message, "abstractSyntaxTree"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.abstractSyntaxTree);
                if (message.supportedLanguages != null && message.supportedLanguages.length) {
                    writer.uint32(/* id 2, wireType 2 =*/18).fork();
                    for (var i = 0; i < message.supportedLanguages.length; ++i)
                        writer.int32(message.supportedLanguages[i]);
                    writer.ldelim();
                }
                return writer;
            };

            /**
             * Encodes the specified AbstractSyntaxTree message, length delimited. Does not implicitly {@link skymel.modelio.AbstractSyntaxTree.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {skymel.modelio.IAbstractSyntaxTree} message AbstractSyntaxTree message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AbstractSyntaxTree.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AbstractSyntaxTree message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.AbstractSyntaxTree} AbstractSyntaxTree
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AbstractSyntaxTree.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.AbstractSyntaxTree();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.abstractSyntaxTree = reader.bytes();
                            break;
                        }
                    case 2: {
                            if (!(message.supportedLanguages && message.supportedLanguages.length))
                                message.supportedLanguages = [];
                            if ((tag & 7) === 2) {
                                var end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.supportedLanguages.push(reader.int32());
                            } else
                                message.supportedLanguages.push(reader.int32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an AbstractSyntaxTree message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.AbstractSyntaxTree} AbstractSyntaxTree
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AbstractSyntaxTree.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AbstractSyntaxTree message.
             * @function verify
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AbstractSyntaxTree.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.abstractSyntaxTree != null && message.hasOwnProperty("abstractSyntaxTree"))
                    if (!(message.abstractSyntaxTree && typeof message.abstractSyntaxTree.length === "number" || $util.isString(message.abstractSyntaxTree)))
                        return "abstractSyntaxTree: buffer expected";
                if (message.supportedLanguages != null && message.hasOwnProperty("supportedLanguages")) {
                    if (!Array.isArray(message.supportedLanguages))
                        return "supportedLanguages: array expected";
                    for (var i = 0; i < message.supportedLanguages.length; ++i)
                        switch (message.supportedLanguages[i]) {
                        default:
                            return "supportedLanguages: enum value[] expected";
                        case 0:
                        case 1:
                        case 2:
                            break;
                        }
                }
                return null;
            };

            /**
             * Creates an AbstractSyntaxTree message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.AbstractSyntaxTree} AbstractSyntaxTree
             */
            AbstractSyntaxTree.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.AbstractSyntaxTree)
                    return object;
                var message = new $root.skymel.modelio.AbstractSyntaxTree();
                if (object.abstractSyntaxTree != null)
                    if (typeof object.abstractSyntaxTree === "string")
                        $util.base64.decode(object.abstractSyntaxTree, message.abstractSyntaxTree = $util.newBuffer($util.base64.length(object.abstractSyntaxTree)), 0);
                    else if (object.abstractSyntaxTree.length >= 0)
                        message.abstractSyntaxTree = object.abstractSyntaxTree;
                if (object.supportedLanguages) {
                    if (!Array.isArray(object.supportedLanguages))
                        throw TypeError(".skymel.modelio.AbstractSyntaxTree.supportedLanguages: array expected");
                    message.supportedLanguages = [];
                    for (var i = 0; i < object.supportedLanguages.length; ++i)
                        switch (object.supportedLanguages[i]) {
                        default:
                            if (typeof object.supportedLanguages[i] === "number") {
                                message.supportedLanguages[i] = object.supportedLanguages[i];
                                break;
                            }
                        case "NO_KNOWN_LANGUAGE":
                        case 0:
                            message.supportedLanguages[i] = 0;
                            break;
                        case "JAVASCRIPT":
                        case 1:
                            message.supportedLanguages[i] = 1;
                            break;
                        case "PYTHON":
                        case 2:
                            message.supportedLanguages[i] = 2;
                            break;
                        }
                }
                return message;
            };

            /**
             * Creates a plain object from an AbstractSyntaxTree message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {skymel.modelio.AbstractSyntaxTree} message AbstractSyntaxTree
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AbstractSyntaxTree.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.supportedLanguages = [];
                if (options.defaults)
                    if (options.bytes === String)
                        object.abstractSyntaxTree = "";
                    else {
                        object.abstractSyntaxTree = [];
                        if (options.bytes !== Array)
                            object.abstractSyntaxTree = $util.newBuffer(object.abstractSyntaxTree);
                    }
                if (message.abstractSyntaxTree != null && message.hasOwnProperty("abstractSyntaxTree"))
                    object.abstractSyntaxTree = options.bytes === String ? $util.base64.encode(message.abstractSyntaxTree, 0, message.abstractSyntaxTree.length) : options.bytes === Array ? Array.prototype.slice.call(message.abstractSyntaxTree) : message.abstractSyntaxTree;
                if (message.supportedLanguages && message.supportedLanguages.length) {
                    object.supportedLanguages = [];
                    for (var j = 0; j < message.supportedLanguages.length; ++j)
                        object.supportedLanguages[j] = options.enums === String ? $root.skymel.modelio.AbstractSyntaxTree.SupportedLanguages[message.supportedLanguages[j]] === undefined ? message.supportedLanguages[j] : $root.skymel.modelio.AbstractSyntaxTree.SupportedLanguages[message.supportedLanguages[j]] : message.supportedLanguages[j];
                }
                return object;
            };

            /**
             * Converts this AbstractSyntaxTree to JSON.
             * @function toJSON
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AbstractSyntaxTree.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AbstractSyntaxTree
             * @function getTypeUrl
             * @memberof skymel.modelio.AbstractSyntaxTree
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AbstractSyntaxTree.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.AbstractSyntaxTree";
            };

            /**
             * SupportedLanguages enum.
             * @name skymel.modelio.AbstractSyntaxTree.SupportedLanguages
             * @enum {number}
             * @property {number} NO_KNOWN_LANGUAGE=0 NO_KNOWN_LANGUAGE value
             * @property {number} JAVASCRIPT=1 JAVASCRIPT value
             * @property {number} PYTHON=2 PYTHON value
             */
            AbstractSyntaxTree.SupportedLanguages = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "NO_KNOWN_LANGUAGE"] = 0;
                values[valuesById[1] = "JAVASCRIPT"] = 1;
                values[valuesById[2] = "PYTHON"] = 2;
                return values;
            })();

            return AbstractSyntaxTree;
        })();

        modelio.InferenceEndpoint = (function() {

            /**
             * Properties of an InferenceEndpoint.
             * @memberof skymel.modelio
             * @interface IInferenceEndpoint
             * @property {skymel.modelio.IEndpointLocationAndId|null} [endpointLocationAndId] InferenceEndpoint endpointLocationAndId
             * @property {skymel.modelio.InferenceEndpoint.ModelRuntime|null} [modelRuntime] InferenceEndpoint modelRuntime
             * @property {string|null} [modelRuntimeVersion] InferenceEndpoint modelRuntimeVersion
             * @property {Array.<skymel.modelio.IModelInputOutputDescription>|null} [modelInputs] InferenceEndpoint modelInputs
             * @property {Array.<skymel.modelio.IModelInputOutputDescription>|null} [modelOutputs] InferenceEndpoint modelOutputs
             * @property {skymel.modelio.IModelBinary|null} [modelBinary] InferenceEndpoint modelBinary
             * @property {skymel.modelio.IAbstractSyntaxTree|null} [modelRunner] InferenceEndpoint modelRunner
             * @property {skymel.modelio.IEndpointLocationAndId|null} [chainedEndpoint] InferenceEndpoint chainedEndpoint
             * @property {skymel.modelio.ISensitiveDataSignature|null} [signature] InferenceEndpoint signature
             * @property {skymel.modelio.InferenceEndpoint.LocalModelCachePreference|null} [cachePreference] InferenceEndpoint cachePreference
             */

            /**
             * Constructs a new InferenceEndpoint.
             * @memberof skymel.modelio
             * @classdesc Represents an InferenceEndpoint.
             * @implements IInferenceEndpoint
             * @constructor
             * @param {skymel.modelio.IInferenceEndpoint=} [properties] Properties to set
             */
            function InferenceEndpoint(properties) {
                this.modelInputs = [];
                this.modelOutputs = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * InferenceEndpoint endpointLocationAndId.
             * @member {skymel.modelio.IEndpointLocationAndId|null|undefined} endpointLocationAndId
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.endpointLocationAndId = null;

            /**
             * InferenceEndpoint modelRuntime.
             * @member {skymel.modelio.InferenceEndpoint.ModelRuntime} modelRuntime
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.modelRuntime = 0;

            /**
             * InferenceEndpoint modelRuntimeVersion.
             * @member {string} modelRuntimeVersion
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.modelRuntimeVersion = "";

            /**
             * InferenceEndpoint modelInputs.
             * @member {Array.<skymel.modelio.IModelInputOutputDescription>} modelInputs
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.modelInputs = $util.emptyArray;

            /**
             * InferenceEndpoint modelOutputs.
             * @member {Array.<skymel.modelio.IModelInputOutputDescription>} modelOutputs
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.modelOutputs = $util.emptyArray;

            /**
             * InferenceEndpoint modelBinary.
             * @member {skymel.modelio.IModelBinary|null|undefined} modelBinary
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.modelBinary = null;

            /**
             * InferenceEndpoint modelRunner.
             * @member {skymel.modelio.IAbstractSyntaxTree|null|undefined} modelRunner
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.modelRunner = null;

            /**
             * InferenceEndpoint chainedEndpoint.
             * @member {skymel.modelio.IEndpointLocationAndId|null|undefined} chainedEndpoint
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.chainedEndpoint = null;

            /**
             * InferenceEndpoint signature.
             * @member {skymel.modelio.ISensitiveDataSignature|null|undefined} signature
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.signature = null;

            /**
             * InferenceEndpoint cachePreference.
             * @member {skymel.modelio.InferenceEndpoint.LocalModelCachePreference} cachePreference
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             */
            InferenceEndpoint.prototype.cachePreference = 0;

            /**
             * Creates a new InferenceEndpoint instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {skymel.modelio.IInferenceEndpoint=} [properties] Properties to set
             * @returns {skymel.modelio.InferenceEndpoint} InferenceEndpoint instance
             */
            InferenceEndpoint.create = function create(properties) {
                return new InferenceEndpoint(properties);
            };

            /**
             * Encodes the specified InferenceEndpoint message. Does not implicitly {@link skymel.modelio.InferenceEndpoint.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {skymel.modelio.IInferenceEndpoint} message InferenceEndpoint message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InferenceEndpoint.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.endpointLocationAndId != null && Object.hasOwnProperty.call(message, "endpointLocationAndId"))
                    $root.skymel.modelio.EndpointLocationAndId.encode(message.endpointLocationAndId, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.modelRuntime != null && Object.hasOwnProperty.call(message, "modelRuntime"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.modelRuntime);
                if (message.modelRuntimeVersion != null && Object.hasOwnProperty.call(message, "modelRuntimeVersion"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.modelRuntimeVersion);
                if (message.modelInputs != null && message.modelInputs.length)
                    for (var i = 0; i < message.modelInputs.length; ++i)
                        $root.skymel.modelio.ModelInputOutputDescription.encode(message.modelInputs[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.modelOutputs != null && message.modelOutputs.length)
                    for (var i = 0; i < message.modelOutputs.length; ++i)
                        $root.skymel.modelio.ModelInputOutputDescription.encode(message.modelOutputs[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                if (message.modelBinary != null && Object.hasOwnProperty.call(message, "modelBinary"))
                    $root.skymel.modelio.ModelBinary.encode(message.modelBinary, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                if (message.modelRunner != null && Object.hasOwnProperty.call(message, "modelRunner"))
                    $root.skymel.modelio.AbstractSyntaxTree.encode(message.modelRunner, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                if (message.chainedEndpoint != null && Object.hasOwnProperty.call(message, "chainedEndpoint"))
                    $root.skymel.modelio.EndpointLocationAndId.encode(message.chainedEndpoint, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                if (message.signature != null && Object.hasOwnProperty.call(message, "signature"))
                    $root.skymel.modelio.SensitiveDataSignature.encode(message.signature, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
                if (message.cachePreference != null && Object.hasOwnProperty.call(message, "cachePreference"))
                    writer.uint32(/* id 10, wireType 0 =*/80).int32(message.cachePreference);
                return writer;
            };

            /**
             * Encodes the specified InferenceEndpoint message, length delimited. Does not implicitly {@link skymel.modelio.InferenceEndpoint.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {skymel.modelio.IInferenceEndpoint} message InferenceEndpoint message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InferenceEndpoint.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an InferenceEndpoint message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.InferenceEndpoint} InferenceEndpoint
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InferenceEndpoint.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.InferenceEndpoint();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.modelRuntime = reader.int32();
                            break;
                        }
                    case 3: {
                            message.modelRuntimeVersion = reader.string();
                            break;
                        }
                    case 4: {
                            if (!(message.modelInputs && message.modelInputs.length))
                                message.modelInputs = [];
                            message.modelInputs.push($root.skymel.modelio.ModelInputOutputDescription.decode(reader, reader.uint32()));
                            break;
                        }
                    case 5: {
                            if (!(message.modelOutputs && message.modelOutputs.length))
                                message.modelOutputs = [];
                            message.modelOutputs.push($root.skymel.modelio.ModelInputOutputDescription.decode(reader, reader.uint32()));
                            break;
                        }
                    case 6: {
                            message.modelBinary = $root.skymel.modelio.ModelBinary.decode(reader, reader.uint32());
                            break;
                        }
                    case 7: {
                            message.modelRunner = $root.skymel.modelio.AbstractSyntaxTree.decode(reader, reader.uint32());
                            break;
                        }
                    case 8: {
                            message.chainedEndpoint = $root.skymel.modelio.EndpointLocationAndId.decode(reader, reader.uint32());
                            break;
                        }
                    case 9: {
                            message.signature = $root.skymel.modelio.SensitiveDataSignature.decode(reader, reader.uint32());
                            break;
                        }
                    case 10: {
                            message.cachePreference = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an InferenceEndpoint message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.InferenceEndpoint} InferenceEndpoint
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InferenceEndpoint.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an InferenceEndpoint message.
             * @function verify
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            InferenceEndpoint.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.endpointLocationAndId != null && message.hasOwnProperty("endpointLocationAndId")) {
                    var error = $root.skymel.modelio.EndpointLocationAndId.verify(message.endpointLocationAndId);
                    if (error)
                        return "endpointLocationAndId." + error;
                }
                if (message.modelRuntime != null && message.hasOwnProperty("modelRuntime"))
                    switch (message.modelRuntime) {
                    default:
                        return "modelRuntime: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                if (message.modelRuntimeVersion != null && message.hasOwnProperty("modelRuntimeVersion"))
                    if (!$util.isString(message.modelRuntimeVersion))
                        return "modelRuntimeVersion: string expected";
                if (message.modelInputs != null && message.hasOwnProperty("modelInputs")) {
                    if (!Array.isArray(message.modelInputs))
                        return "modelInputs: array expected";
                    for (var i = 0; i < message.modelInputs.length; ++i) {
                        var error = $root.skymel.modelio.ModelInputOutputDescription.verify(message.modelInputs[i]);
                        if (error)
                            return "modelInputs." + error;
                    }
                }
                if (message.modelOutputs != null && message.hasOwnProperty("modelOutputs")) {
                    if (!Array.isArray(message.modelOutputs))
                        return "modelOutputs: array expected";
                    for (var i = 0; i < message.modelOutputs.length; ++i) {
                        var error = $root.skymel.modelio.ModelInputOutputDescription.verify(message.modelOutputs[i]);
                        if (error)
                            return "modelOutputs." + error;
                    }
                }
                if (message.modelBinary != null && message.hasOwnProperty("modelBinary")) {
                    var error = $root.skymel.modelio.ModelBinary.verify(message.modelBinary);
                    if (error)
                        return "modelBinary." + error;
                }
                if (message.modelRunner != null && message.hasOwnProperty("modelRunner")) {
                    var error = $root.skymel.modelio.AbstractSyntaxTree.verify(message.modelRunner);
                    if (error)
                        return "modelRunner." + error;
                }
                if (message.chainedEndpoint != null && message.hasOwnProperty("chainedEndpoint")) {
                    var error = $root.skymel.modelio.EndpointLocationAndId.verify(message.chainedEndpoint);
                    if (error)
                        return "chainedEndpoint." + error;
                }
                if (message.signature != null && message.hasOwnProperty("signature")) {
                    var error = $root.skymel.modelio.SensitiveDataSignature.verify(message.signature);
                    if (error)
                        return "signature." + error;
                }
                if (message.cachePreference != null && message.hasOwnProperty("cachePreference"))
                    switch (message.cachePreference) {
                    default:
                        return "cachePreference: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                return null;
            };

            /**
             * Creates an InferenceEndpoint message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.InferenceEndpoint} InferenceEndpoint
             */
            InferenceEndpoint.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.InferenceEndpoint)
                    return object;
                var message = new $root.skymel.modelio.InferenceEndpoint();
                if (object.endpointLocationAndId != null) {
                    if (typeof object.endpointLocationAndId !== "object")
                        throw TypeError(".skymel.modelio.InferenceEndpoint.endpointLocationAndId: object expected");
                    message.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.fromObject(object.endpointLocationAndId);
                }
                switch (object.modelRuntime) {
                default:
                    if (typeof object.modelRuntime === "number") {
                        message.modelRuntime = object.modelRuntime;
                        break;
                    }
                    break;
                case "UNKNOWN_RUNTIME":
                case 0:
                    message.modelRuntime = 0;
                    break;
                case "TF_LITE":
                case 1:
                    message.modelRuntime = 1;
                    break;
                case "TF":
                case 2:
                    message.modelRuntime = 2;
                    break;
                case "PYTORCH":
                case 3:
                    message.modelRuntime = 3;
                    break;
                case "ONNX":
                case 4:
                    message.modelRuntime = 4;
                    break;
                }
                if (object.modelRuntimeVersion != null)
                    message.modelRuntimeVersion = String(object.modelRuntimeVersion);
                if (object.modelInputs) {
                    if (!Array.isArray(object.modelInputs))
                        throw TypeError(".skymel.modelio.InferenceEndpoint.modelInputs: array expected");
                    message.modelInputs = [];
                    for (var i = 0; i < object.modelInputs.length; ++i) {
                        if (typeof object.modelInputs[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceEndpoint.modelInputs: object expected");
                        message.modelInputs[i] = $root.skymel.modelio.ModelInputOutputDescription.fromObject(object.modelInputs[i]);
                    }
                }
                if (object.modelOutputs) {
                    if (!Array.isArray(object.modelOutputs))
                        throw TypeError(".skymel.modelio.InferenceEndpoint.modelOutputs: array expected");
                    message.modelOutputs = [];
                    for (var i = 0; i < object.modelOutputs.length; ++i) {
                        if (typeof object.modelOutputs[i] !== "object")
                            throw TypeError(".skymel.modelio.InferenceEndpoint.modelOutputs: object expected");
                        message.modelOutputs[i] = $root.skymel.modelio.ModelInputOutputDescription.fromObject(object.modelOutputs[i]);
                    }
                }
                if (object.modelBinary != null) {
                    if (typeof object.modelBinary !== "object")
                        throw TypeError(".skymel.modelio.InferenceEndpoint.modelBinary: object expected");
                    message.modelBinary = $root.skymel.modelio.ModelBinary.fromObject(object.modelBinary);
                }
                if (object.modelRunner != null) {
                    if (typeof object.modelRunner !== "object")
                        throw TypeError(".skymel.modelio.InferenceEndpoint.modelRunner: object expected");
                    message.modelRunner = $root.skymel.modelio.AbstractSyntaxTree.fromObject(object.modelRunner);
                }
                if (object.chainedEndpoint != null) {
                    if (typeof object.chainedEndpoint !== "object")
                        throw TypeError(".skymel.modelio.InferenceEndpoint.chainedEndpoint: object expected");
                    message.chainedEndpoint = $root.skymel.modelio.EndpointLocationAndId.fromObject(object.chainedEndpoint);
                }
                if (object.signature != null) {
                    if (typeof object.signature !== "object")
                        throw TypeError(".skymel.modelio.InferenceEndpoint.signature: object expected");
                    message.signature = $root.skymel.modelio.SensitiveDataSignature.fromObject(object.signature);
                }
                switch (object.cachePreference) {
                default:
                    if (typeof object.cachePreference === "number") {
                        message.cachePreference = object.cachePreference;
                        break;
                    }
                    break;
                case "DEFAULT_PREFERENCE":
                case 0:
                    message.cachePreference = 0;
                    break;
                case "INDEXED_DB":
                case 1:
                    message.cachePreference = 1;
                    break;
                case "LOCAL_STORAGE":
                case 2:
                    message.cachePreference = 2;
                    break;
                case "SESSION_STORAGE":
                case 3:
                    message.cachePreference = 3;
                    break;
                case "NO_CACHING":
                case 4:
                    message.cachePreference = 4;
                    break;
                }
                return message;
            };

            /**
             * Creates a plain object from an InferenceEndpoint message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {skymel.modelio.InferenceEndpoint} message InferenceEndpoint
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            InferenceEndpoint.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                    object.modelInputs = [];
                    object.modelOutputs = [];
                }
                if (options.defaults) {
                    object.endpointLocationAndId = null;
                    object.modelRuntime = options.enums === String ? "UNKNOWN_RUNTIME" : 0;
                    object.modelRuntimeVersion = "";
                    object.modelBinary = null;
                    object.modelRunner = null;
                    object.chainedEndpoint = null;
                    object.signature = null;
                    object.cachePreference = options.enums === String ? "DEFAULT_PREFERENCE" : 0;
                }
                if (message.endpointLocationAndId != null && message.hasOwnProperty("endpointLocationAndId"))
                    object.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.toObject(message.endpointLocationAndId, options);
                if (message.modelRuntime != null && message.hasOwnProperty("modelRuntime"))
                    object.modelRuntime = options.enums === String ? $root.skymel.modelio.InferenceEndpoint.ModelRuntime[message.modelRuntime] === undefined ? message.modelRuntime : $root.skymel.modelio.InferenceEndpoint.ModelRuntime[message.modelRuntime] : message.modelRuntime;
                if (message.modelRuntimeVersion != null && message.hasOwnProperty("modelRuntimeVersion"))
                    object.modelRuntimeVersion = message.modelRuntimeVersion;
                if (message.modelInputs && message.modelInputs.length) {
                    object.modelInputs = [];
                    for (var j = 0; j < message.modelInputs.length; ++j)
                        object.modelInputs[j] = $root.skymel.modelio.ModelInputOutputDescription.toObject(message.modelInputs[j], options);
                }
                if (message.modelOutputs && message.modelOutputs.length) {
                    object.modelOutputs = [];
                    for (var j = 0; j < message.modelOutputs.length; ++j)
                        object.modelOutputs[j] = $root.skymel.modelio.ModelInputOutputDescription.toObject(message.modelOutputs[j], options);
                }
                if (message.modelBinary != null && message.hasOwnProperty("modelBinary"))
                    object.modelBinary = $root.skymel.modelio.ModelBinary.toObject(message.modelBinary, options);
                if (message.modelRunner != null && message.hasOwnProperty("modelRunner"))
                    object.modelRunner = $root.skymel.modelio.AbstractSyntaxTree.toObject(message.modelRunner, options);
                if (message.chainedEndpoint != null && message.hasOwnProperty("chainedEndpoint"))
                    object.chainedEndpoint = $root.skymel.modelio.EndpointLocationAndId.toObject(message.chainedEndpoint, options);
                if (message.signature != null && message.hasOwnProperty("signature"))
                    object.signature = $root.skymel.modelio.SensitiveDataSignature.toObject(message.signature, options);
                if (message.cachePreference != null && message.hasOwnProperty("cachePreference"))
                    object.cachePreference = options.enums === String ? $root.skymel.modelio.InferenceEndpoint.LocalModelCachePreference[message.cachePreference] === undefined ? message.cachePreference : $root.skymel.modelio.InferenceEndpoint.LocalModelCachePreference[message.cachePreference] : message.cachePreference;
                return object;
            };

            /**
             * Converts this InferenceEndpoint to JSON.
             * @function toJSON
             * @memberof skymel.modelio.InferenceEndpoint
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            InferenceEndpoint.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for InferenceEndpoint
             * @function getTypeUrl
             * @memberof skymel.modelio.InferenceEndpoint
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            InferenceEndpoint.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.InferenceEndpoint";
            };

            /**
             * ModelRuntime enum.
             * @name skymel.modelio.InferenceEndpoint.ModelRuntime
             * @enum {number}
             * @property {number} UNKNOWN_RUNTIME=0 UNKNOWN_RUNTIME value
             * @property {number} TF_LITE=1 TF_LITE value
             * @property {number} TF=2 TF value
             * @property {number} PYTORCH=3 PYTORCH value
             * @property {number} ONNX=4 ONNX value
             */
            InferenceEndpoint.ModelRuntime = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "UNKNOWN_RUNTIME"] = 0;
                values[valuesById[1] = "TF_LITE"] = 1;
                values[valuesById[2] = "TF"] = 2;
                values[valuesById[3] = "PYTORCH"] = 3;
                values[valuesById[4] = "ONNX"] = 4;
                return values;
            })();

            /**
             * LocalModelCachePreference enum.
             * @name skymel.modelio.InferenceEndpoint.LocalModelCachePreference
             * @enum {number}
             * @property {number} DEFAULT_PREFERENCE=0 DEFAULT_PREFERENCE value
             * @property {number} INDEXED_DB=1 INDEXED_DB value
             * @property {number} LOCAL_STORAGE=2 LOCAL_STORAGE value
             * @property {number} SESSION_STORAGE=3 SESSION_STORAGE value
             * @property {number} NO_CACHING=4 NO_CACHING value
             */
            InferenceEndpoint.LocalModelCachePreference = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "DEFAULT_PREFERENCE"] = 0;
                values[valuesById[1] = "INDEXED_DB"] = 1;
                values[valuesById[2] = "LOCAL_STORAGE"] = 2;
                values[valuesById[3] = "SESSION_STORAGE"] = 3;
                values[valuesById[4] = "NO_CACHING"] = 4;
                return values;
            })();

            return InferenceEndpoint;
        })();

        modelio.ModelFetchRequest = (function() {

            /**
             * Properties of a ModelFetchRequest.
             * @memberof skymel.modelio
             * @interface IModelFetchRequest
             * @property {string|null} [apiKey] ModelFetchRequest apiKey
             * @property {string|null} [requestId] ModelFetchRequest requestId
             * @property {skymel.modelio.IEndpointLocationAndId|null} [endpointLocationAndId] ModelFetchRequest endpointLocationAndId
             */

            /**
             * Constructs a new ModelFetchRequest.
             * @memberof skymel.modelio
             * @classdesc Represents a ModelFetchRequest.
             * @implements IModelFetchRequest
             * @constructor
             * @param {skymel.modelio.IModelFetchRequest=} [properties] Properties to set
             */
            function ModelFetchRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ModelFetchRequest apiKey.
             * @member {string} apiKey
             * @memberof skymel.modelio.ModelFetchRequest
             * @instance
             */
            ModelFetchRequest.prototype.apiKey = "";

            /**
             * ModelFetchRequest requestId.
             * @member {string} requestId
             * @memberof skymel.modelio.ModelFetchRequest
             * @instance
             */
            ModelFetchRequest.prototype.requestId = "";

            /**
             * ModelFetchRequest endpointLocationAndId.
             * @member {skymel.modelio.IEndpointLocationAndId|null|undefined} endpointLocationAndId
             * @memberof skymel.modelio.ModelFetchRequest
             * @instance
             */
            ModelFetchRequest.prototype.endpointLocationAndId = null;

            /**
             * Creates a new ModelFetchRequest instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {skymel.modelio.IModelFetchRequest=} [properties] Properties to set
             * @returns {skymel.modelio.ModelFetchRequest} ModelFetchRequest instance
             */
            ModelFetchRequest.create = function create(properties) {
                return new ModelFetchRequest(properties);
            };

            /**
             * Encodes the specified ModelFetchRequest message. Does not implicitly {@link skymel.modelio.ModelFetchRequest.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {skymel.modelio.IModelFetchRequest} message ModelFetchRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelFetchRequest.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.apiKey != null && Object.hasOwnProperty.call(message, "apiKey"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.apiKey);
                if (message.requestId != null && Object.hasOwnProperty.call(message, "requestId"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.requestId);
                if (message.endpointLocationAndId != null && Object.hasOwnProperty.call(message, "endpointLocationAndId"))
                    $root.skymel.modelio.EndpointLocationAndId.encode(message.endpointLocationAndId, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ModelFetchRequest message, length delimited. Does not implicitly {@link skymel.modelio.ModelFetchRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {skymel.modelio.IModelFetchRequest} message ModelFetchRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelFetchRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ModelFetchRequest message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ModelFetchRequest} ModelFetchRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelFetchRequest.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ModelFetchRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.apiKey = reader.string();
                            break;
                        }
                    case 2: {
                            message.requestId = reader.string();
                            break;
                        }
                    case 3: {
                            message.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ModelFetchRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ModelFetchRequest} ModelFetchRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelFetchRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ModelFetchRequest message.
             * @function verify
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ModelFetchRequest.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.apiKey != null && message.hasOwnProperty("apiKey"))
                    if (!$util.isString(message.apiKey))
                        return "apiKey: string expected";
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    if (!$util.isString(message.requestId))
                        return "requestId: string expected";
                if (message.endpointLocationAndId != null && message.hasOwnProperty("endpointLocationAndId")) {
                    var error = $root.skymel.modelio.EndpointLocationAndId.verify(message.endpointLocationAndId);
                    if (error)
                        return "endpointLocationAndId." + error;
                }
                return null;
            };

            /**
             * Creates a ModelFetchRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ModelFetchRequest} ModelFetchRequest
             */
            ModelFetchRequest.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ModelFetchRequest)
                    return object;
                var message = new $root.skymel.modelio.ModelFetchRequest();
                if (object.apiKey != null)
                    message.apiKey = String(object.apiKey);
                if (object.requestId != null)
                    message.requestId = String(object.requestId);
                if (object.endpointLocationAndId != null) {
                    if (typeof object.endpointLocationAndId !== "object")
                        throw TypeError(".skymel.modelio.ModelFetchRequest.endpointLocationAndId: object expected");
                    message.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.fromObject(object.endpointLocationAndId);
                }
                return message;
            };

            /**
             * Creates a plain object from a ModelFetchRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {skymel.modelio.ModelFetchRequest} message ModelFetchRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ModelFetchRequest.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.apiKey = "";
                    object.requestId = "";
                    object.endpointLocationAndId = null;
                }
                if (message.apiKey != null && message.hasOwnProperty("apiKey"))
                    object.apiKey = message.apiKey;
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    object.requestId = message.requestId;
                if (message.endpointLocationAndId != null && message.hasOwnProperty("endpointLocationAndId"))
                    object.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.toObject(message.endpointLocationAndId, options);
                return object;
            };

            /**
             * Converts this ModelFetchRequest to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ModelFetchRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ModelFetchRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ModelFetchRequest
             * @function getTypeUrl
             * @memberof skymel.modelio.ModelFetchRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ModelFetchRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ModelFetchRequest";
            };

            return ModelFetchRequest;
        })();

        modelio.ModelFetchResponse = (function() {

            /**
             * Properties of a ModelFetchResponse.
             * @memberof skymel.modelio
             * @interface IModelFetchResponse
             * @property {string|null} [requestId] ModelFetchResponse requestId
             * @property {skymel.modelio.IEndpointLocationAndId|null} [endpointLocationAndId] ModelFetchResponse endpointLocationAndId
             * @property {skymel.modelio.IModelBinary|null} [modelBinary] ModelFetchResponse modelBinary
             */

            /**
             * Constructs a new ModelFetchResponse.
             * @memberof skymel.modelio
             * @classdesc Represents a ModelFetchResponse.
             * @implements IModelFetchResponse
             * @constructor
             * @param {skymel.modelio.IModelFetchResponse=} [properties] Properties to set
             */
            function ModelFetchResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ModelFetchResponse requestId.
             * @member {string} requestId
             * @memberof skymel.modelio.ModelFetchResponse
             * @instance
             */
            ModelFetchResponse.prototype.requestId = "";

            /**
             * ModelFetchResponse endpointLocationAndId.
             * @member {skymel.modelio.IEndpointLocationAndId|null|undefined} endpointLocationAndId
             * @memberof skymel.modelio.ModelFetchResponse
             * @instance
             */
            ModelFetchResponse.prototype.endpointLocationAndId = null;

            /**
             * ModelFetchResponse modelBinary.
             * @member {skymel.modelio.IModelBinary|null|undefined} modelBinary
             * @memberof skymel.modelio.ModelFetchResponse
             * @instance
             */
            ModelFetchResponse.prototype.modelBinary = null;

            /**
             * Creates a new ModelFetchResponse instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {skymel.modelio.IModelFetchResponse=} [properties] Properties to set
             * @returns {skymel.modelio.ModelFetchResponse} ModelFetchResponse instance
             */
            ModelFetchResponse.create = function create(properties) {
                return new ModelFetchResponse(properties);
            };

            /**
             * Encodes the specified ModelFetchResponse message. Does not implicitly {@link skymel.modelio.ModelFetchResponse.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {skymel.modelio.IModelFetchResponse} message ModelFetchResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelFetchResponse.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.requestId != null && Object.hasOwnProperty.call(message, "requestId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.requestId);
                if (message.endpointLocationAndId != null && Object.hasOwnProperty.call(message, "endpointLocationAndId"))
                    $root.skymel.modelio.EndpointLocationAndId.encode(message.endpointLocationAndId, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.modelBinary != null && Object.hasOwnProperty.call(message, "modelBinary"))
                    $root.skymel.modelio.ModelBinary.encode(message.modelBinary, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ModelFetchResponse message, length delimited. Does not implicitly {@link skymel.modelio.ModelFetchResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {skymel.modelio.IModelFetchResponse} message ModelFetchResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ModelFetchResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ModelFetchResponse message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.ModelFetchResponse} ModelFetchResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelFetchResponse.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.ModelFetchResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.requestId = reader.string();
                            break;
                        }
                    case 2: {
                            message.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.modelBinary = $root.skymel.modelio.ModelBinary.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ModelFetchResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.ModelFetchResponse} ModelFetchResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ModelFetchResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ModelFetchResponse message.
             * @function verify
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ModelFetchResponse.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    if (!$util.isString(message.requestId))
                        return "requestId: string expected";
                if (message.endpointLocationAndId != null && message.hasOwnProperty("endpointLocationAndId")) {
                    var error = $root.skymel.modelio.EndpointLocationAndId.verify(message.endpointLocationAndId);
                    if (error)
                        return "endpointLocationAndId." + error;
                }
                if (message.modelBinary != null && message.hasOwnProperty("modelBinary")) {
                    var error = $root.skymel.modelio.ModelBinary.verify(message.modelBinary);
                    if (error)
                        return "modelBinary." + error;
                }
                return null;
            };

            /**
             * Creates a ModelFetchResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.ModelFetchResponse} ModelFetchResponse
             */
            ModelFetchResponse.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.ModelFetchResponse)
                    return object;
                var message = new $root.skymel.modelio.ModelFetchResponse();
                if (object.requestId != null)
                    message.requestId = String(object.requestId);
                if (object.endpointLocationAndId != null) {
                    if (typeof object.endpointLocationAndId !== "object")
                        throw TypeError(".skymel.modelio.ModelFetchResponse.endpointLocationAndId: object expected");
                    message.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.fromObject(object.endpointLocationAndId);
                }
                if (object.modelBinary != null) {
                    if (typeof object.modelBinary !== "object")
                        throw TypeError(".skymel.modelio.ModelFetchResponse.modelBinary: object expected");
                    message.modelBinary = $root.skymel.modelio.ModelBinary.fromObject(object.modelBinary);
                }
                return message;
            };

            /**
             * Creates a plain object from a ModelFetchResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {skymel.modelio.ModelFetchResponse} message ModelFetchResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ModelFetchResponse.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.requestId = "";
                    object.endpointLocationAndId = null;
                    object.modelBinary = null;
                }
                if (message.requestId != null && message.hasOwnProperty("requestId"))
                    object.requestId = message.requestId;
                if (message.endpointLocationAndId != null && message.hasOwnProperty("endpointLocationAndId"))
                    object.endpointLocationAndId = $root.skymel.modelio.EndpointLocationAndId.toObject(message.endpointLocationAndId, options);
                if (message.modelBinary != null && message.hasOwnProperty("modelBinary"))
                    object.modelBinary = $root.skymel.modelio.ModelBinary.toObject(message.modelBinary, options);
                return object;
            };

            /**
             * Converts this ModelFetchResponse to JSON.
             * @function toJSON
             * @memberof skymel.modelio.ModelFetchResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ModelFetchResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ModelFetchResponse
             * @function getTypeUrl
             * @memberof skymel.modelio.ModelFetchResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ModelFetchResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.ModelFetchResponse";
            };

            return ModelFetchResponse;
        })();

        modelio.TensorFlowJSModelArtifactsProto = (function() {

            /**
             * Properties of a TensorFlowJSModelArtifactsProto.
             * @memberof skymel.modelio
             * @interface ITensorFlowJSModelArtifactsProto
             * @property {string|null} [convertedBy] TensorFlowJSModelArtifactsProto convertedBy
             * @property {string|null} [format] TensorFlowJSModelArtifactsProto format
             * @property {string|null} [generatedBy] TensorFlowJSModelArtifactsProto generatedBy
             * @property {string|null} [jsonEncodedSignature] TensorFlowJSModelArtifactsProto jsonEncodedSignature
             * @property {string|null} [jsonEncodedModelTopology] TensorFlowJSModelArtifactsProto jsonEncodedModelTopology
             * @property {string|null} [jsonEncodedWeightSpecs] TensorFlowJSModelArtifactsProto jsonEncodedWeightSpecs
             * @property {string|null} [jsonEncodedTrainingConfig] TensorFlowJSModelArtifactsProto jsonEncodedTrainingConfig
             * @property {Uint8Array|null} [binaryWeightData] TensorFlowJSModelArtifactsProto binaryWeightData
             * @property {string|null} [name] TensorFlowJSModelArtifactsProto name
             */

            /**
             * Constructs a new TensorFlowJSModelArtifactsProto.
             * @memberof skymel.modelio
             * @classdesc Represents a TensorFlowJSModelArtifactsProto.
             * @implements ITensorFlowJSModelArtifactsProto
             * @constructor
             * @param {skymel.modelio.ITensorFlowJSModelArtifactsProto=} [properties] Properties to set
             */
            function TensorFlowJSModelArtifactsProto(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * TensorFlowJSModelArtifactsProto convertedBy.
             * @member {string} convertedBy
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.convertedBy = "";

            /**
             * TensorFlowJSModelArtifactsProto format.
             * @member {string} format
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.format = "";

            /**
             * TensorFlowJSModelArtifactsProto generatedBy.
             * @member {string} generatedBy
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.generatedBy = "";

            /**
             * TensorFlowJSModelArtifactsProto jsonEncodedSignature.
             * @member {string} jsonEncodedSignature
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.jsonEncodedSignature = "";

            /**
             * TensorFlowJSModelArtifactsProto jsonEncodedModelTopology.
             * @member {string} jsonEncodedModelTopology
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.jsonEncodedModelTopology = "";

            /**
             * TensorFlowJSModelArtifactsProto jsonEncodedWeightSpecs.
             * @member {string} jsonEncodedWeightSpecs
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.jsonEncodedWeightSpecs = "";

            /**
             * TensorFlowJSModelArtifactsProto jsonEncodedTrainingConfig.
             * @member {string} jsonEncodedTrainingConfig
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.jsonEncodedTrainingConfig = "";

            /**
             * TensorFlowJSModelArtifactsProto binaryWeightData.
             * @member {Uint8Array} binaryWeightData
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.binaryWeightData = $util.newBuffer([]);

            /**
             * TensorFlowJSModelArtifactsProto name.
             * @member {string} name
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             */
            TensorFlowJSModelArtifactsProto.prototype.name = "";

            /**
             * Creates a new TensorFlowJSModelArtifactsProto instance using the specified properties.
             * @function create
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {skymel.modelio.ITensorFlowJSModelArtifactsProto=} [properties] Properties to set
             * @returns {skymel.modelio.TensorFlowJSModelArtifactsProto} TensorFlowJSModelArtifactsProto instance
             */
            TensorFlowJSModelArtifactsProto.create = function create(properties) {
                return new TensorFlowJSModelArtifactsProto(properties);
            };

            /**
             * Encodes the specified TensorFlowJSModelArtifactsProto message. Does not implicitly {@link skymel.modelio.TensorFlowJSModelArtifactsProto.verify|verify} messages.
             * @function encode
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {skymel.modelio.ITensorFlowJSModelArtifactsProto} message TensorFlowJSModelArtifactsProto message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TensorFlowJSModelArtifactsProto.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.convertedBy != null && Object.hasOwnProperty.call(message, "convertedBy"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.convertedBy);
                if (message.format != null && Object.hasOwnProperty.call(message, "format"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.format);
                if (message.generatedBy != null && Object.hasOwnProperty.call(message, "generatedBy"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.generatedBy);
                if (message.jsonEncodedSignature != null && Object.hasOwnProperty.call(message, "jsonEncodedSignature"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.jsonEncodedSignature);
                if (message.jsonEncodedModelTopology != null && Object.hasOwnProperty.call(message, "jsonEncodedModelTopology"))
                    writer.uint32(/* id 5, wireType 2 =*/42).string(message.jsonEncodedModelTopology);
                if (message.jsonEncodedWeightSpecs != null && Object.hasOwnProperty.call(message, "jsonEncodedWeightSpecs"))
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.jsonEncodedWeightSpecs);
                if (message.jsonEncodedTrainingConfig != null && Object.hasOwnProperty.call(message, "jsonEncodedTrainingConfig"))
                    writer.uint32(/* id 7, wireType 2 =*/58).string(message.jsonEncodedTrainingConfig);
                if (message.binaryWeightData != null && Object.hasOwnProperty.call(message, "binaryWeightData"))
                    writer.uint32(/* id 8, wireType 2 =*/66).bytes(message.binaryWeightData);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 9, wireType 2 =*/74).string(message.name);
                return writer;
            };

            /**
             * Encodes the specified TensorFlowJSModelArtifactsProto message, length delimited. Does not implicitly {@link skymel.modelio.TensorFlowJSModelArtifactsProto.verify|verify} messages.
             * @function encodeDelimited
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {skymel.modelio.ITensorFlowJSModelArtifactsProto} message TensorFlowJSModelArtifactsProto message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TensorFlowJSModelArtifactsProto.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a TensorFlowJSModelArtifactsProto message from the specified reader or buffer.
             * @function decode
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {skymel.modelio.TensorFlowJSModelArtifactsProto} TensorFlowJSModelArtifactsProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TensorFlowJSModelArtifactsProto.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.skymel.modelio.TensorFlowJSModelArtifactsProto();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.convertedBy = reader.string();
                            break;
                        }
                    case 2: {
                            message.format = reader.string();
                            break;
                        }
                    case 3: {
                            message.generatedBy = reader.string();
                            break;
                        }
                    case 4: {
                            message.jsonEncodedSignature = reader.string();
                            break;
                        }
                    case 5: {
                            message.jsonEncodedModelTopology = reader.string();
                            break;
                        }
                    case 6: {
                            message.jsonEncodedWeightSpecs = reader.string();
                            break;
                        }
                    case 7: {
                            message.jsonEncodedTrainingConfig = reader.string();
                            break;
                        }
                    case 8: {
                            message.binaryWeightData = reader.bytes();
                            break;
                        }
                    case 9: {
                            message.name = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a TensorFlowJSModelArtifactsProto message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {skymel.modelio.TensorFlowJSModelArtifactsProto} TensorFlowJSModelArtifactsProto
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TensorFlowJSModelArtifactsProto.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a TensorFlowJSModelArtifactsProto message.
             * @function verify
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            TensorFlowJSModelArtifactsProto.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.convertedBy != null && message.hasOwnProperty("convertedBy"))
                    if (!$util.isString(message.convertedBy))
                        return "convertedBy: string expected";
                if (message.format != null && message.hasOwnProperty("format"))
                    if (!$util.isString(message.format))
                        return "format: string expected";
                if (message.generatedBy != null && message.hasOwnProperty("generatedBy"))
                    if (!$util.isString(message.generatedBy))
                        return "generatedBy: string expected";
                if (message.jsonEncodedSignature != null && message.hasOwnProperty("jsonEncodedSignature"))
                    if (!$util.isString(message.jsonEncodedSignature))
                        return "jsonEncodedSignature: string expected";
                if (message.jsonEncodedModelTopology != null && message.hasOwnProperty("jsonEncodedModelTopology"))
                    if (!$util.isString(message.jsonEncodedModelTopology))
                        return "jsonEncodedModelTopology: string expected";
                if (message.jsonEncodedWeightSpecs != null && message.hasOwnProperty("jsonEncodedWeightSpecs"))
                    if (!$util.isString(message.jsonEncodedWeightSpecs))
                        return "jsonEncodedWeightSpecs: string expected";
                if (message.jsonEncodedTrainingConfig != null && message.hasOwnProperty("jsonEncodedTrainingConfig"))
                    if (!$util.isString(message.jsonEncodedTrainingConfig))
                        return "jsonEncodedTrainingConfig: string expected";
                if (message.binaryWeightData != null && message.hasOwnProperty("binaryWeightData"))
                    if (!(message.binaryWeightData && typeof message.binaryWeightData.length === "number" || $util.isString(message.binaryWeightData)))
                        return "binaryWeightData: buffer expected";
                if (message.name != null && message.hasOwnProperty("name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                return null;
            };

            /**
             * Creates a TensorFlowJSModelArtifactsProto message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {skymel.modelio.TensorFlowJSModelArtifactsProto} TensorFlowJSModelArtifactsProto
             */
            TensorFlowJSModelArtifactsProto.fromObject = function fromObject(object) {
                if (object instanceof $root.skymel.modelio.TensorFlowJSModelArtifactsProto)
                    return object;
                var message = new $root.skymel.modelio.TensorFlowJSModelArtifactsProto();
                if (object.convertedBy != null)
                    message.convertedBy = String(object.convertedBy);
                if (object.format != null)
                    message.format = String(object.format);
                if (object.generatedBy != null)
                    message.generatedBy = String(object.generatedBy);
                if (object.jsonEncodedSignature != null)
                    message.jsonEncodedSignature = String(object.jsonEncodedSignature);
                if (object.jsonEncodedModelTopology != null)
                    message.jsonEncodedModelTopology = String(object.jsonEncodedModelTopology);
                if (object.jsonEncodedWeightSpecs != null)
                    message.jsonEncodedWeightSpecs = String(object.jsonEncodedWeightSpecs);
                if (object.jsonEncodedTrainingConfig != null)
                    message.jsonEncodedTrainingConfig = String(object.jsonEncodedTrainingConfig);
                if (object.binaryWeightData != null)
                    if (typeof object.binaryWeightData === "string")
                        $util.base64.decode(object.binaryWeightData, message.binaryWeightData = $util.newBuffer($util.base64.length(object.binaryWeightData)), 0);
                    else if (object.binaryWeightData.length >= 0)
                        message.binaryWeightData = object.binaryWeightData;
                if (object.name != null)
                    message.name = String(object.name);
                return message;
            };

            /**
             * Creates a plain object from a TensorFlowJSModelArtifactsProto message. Also converts values to other types if specified.
             * @function toObject
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {skymel.modelio.TensorFlowJSModelArtifactsProto} message TensorFlowJSModelArtifactsProto
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            TensorFlowJSModelArtifactsProto.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.convertedBy = "";
                    object.format = "";
                    object.generatedBy = "";
                    object.jsonEncodedSignature = "";
                    object.jsonEncodedModelTopology = "";
                    object.jsonEncodedWeightSpecs = "";
                    object.jsonEncodedTrainingConfig = "";
                    if (options.bytes === String)
                        object.binaryWeightData = "";
                    else {
                        object.binaryWeightData = [];
                        if (options.bytes !== Array)
                            object.binaryWeightData = $util.newBuffer(object.binaryWeightData);
                    }
                    object.name = "";
                }
                if (message.convertedBy != null && message.hasOwnProperty("convertedBy"))
                    object.convertedBy = message.convertedBy;
                if (message.format != null && message.hasOwnProperty("format"))
                    object.format = message.format;
                if (message.generatedBy != null && message.hasOwnProperty("generatedBy"))
                    object.generatedBy = message.generatedBy;
                if (message.jsonEncodedSignature != null && message.hasOwnProperty("jsonEncodedSignature"))
                    object.jsonEncodedSignature = message.jsonEncodedSignature;
                if (message.jsonEncodedModelTopology != null && message.hasOwnProperty("jsonEncodedModelTopology"))
                    object.jsonEncodedModelTopology = message.jsonEncodedModelTopology;
                if (message.jsonEncodedWeightSpecs != null && message.hasOwnProperty("jsonEncodedWeightSpecs"))
                    object.jsonEncodedWeightSpecs = message.jsonEncodedWeightSpecs;
                if (message.jsonEncodedTrainingConfig != null && message.hasOwnProperty("jsonEncodedTrainingConfig"))
                    object.jsonEncodedTrainingConfig = message.jsonEncodedTrainingConfig;
                if (message.binaryWeightData != null && message.hasOwnProperty("binaryWeightData"))
                    object.binaryWeightData = options.bytes === String ? $util.base64.encode(message.binaryWeightData, 0, message.binaryWeightData.length) : options.bytes === Array ? Array.prototype.slice.call(message.binaryWeightData) : message.binaryWeightData;
                if (message.name != null && message.hasOwnProperty("name"))
                    object.name = message.name;
                return object;
            };

            /**
             * Converts this TensorFlowJSModelArtifactsProto to JSON.
             * @function toJSON
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            TensorFlowJSModelArtifactsProto.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for TensorFlowJSModelArtifactsProto
             * @function getTypeUrl
             * @memberof skymel.modelio.TensorFlowJSModelArtifactsProto
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            TensorFlowJSModelArtifactsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/skymel.modelio.TensorFlowJSModelArtifactsProto";
            };

            return TensorFlowJSModelArtifactsProto;
        })();

        return modelio;
    })();

    return skymel;
})();

module.exports = $root;

},{"protobufjs/minimal":8}]},{},[19])(19)
});
