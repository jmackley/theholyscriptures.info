/*  Prototype JavaScript framework, version 1.5.1.1
 *  (c) 2005-2007 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
/*--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.5.1.1',

  Browser: {
    IE:     !!(window.attachEvent && !window.opera),
    Opera:  !!window.opera,
    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1
  },

  BrowserFeatures: {
    XPath: !!document.evaluate,
    ElementExtensions: !!window.HTMLElement,
    SpecificElementExtensions:
      (document.createElement('div').__proto__ !==
       document.createElement('form').__proto__)
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
}

var Class = {
  create: function() {
    return function() {
      this.initialize.apply(this, arguments);
    }
  }
}

var Abstract = new Object();

Object.extend = function(destination, source) {
  for (var property in source) {
    destination[property] = source[property];
  }
  return destination;
}

Object.extend(Object, {
  inspect: function(object) {
    try {
      if (object === undefined) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : object.toString();
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },

  toJSON: function(object) {
    var type = typeof object;
    switch(type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }
    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (object.ownerDocument === document) return;
    var results = [];
    for (var property in object) {
      var value = Object.toJSON(object[property]);
      if (value !== undefined)
        results.push(property.toJSON() + ': ' + value);
    }
    return '{' + results.join(', ') + '}';
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return Object.extend({}, object);
  }
});

Function.prototype.bind = function() {
  var __method = this, args = $A(arguments), object = args.shift();
  return function() {
    return __method.apply(object, args.concat($A(arguments)));
  }
}

Function.prototype.bindAsEventListener = function(object) {
  var __method = this, args = $A(arguments), object = args.shift();
  return function(event) {
    return __method.apply(object, [event || window.event].concat(args));
  }
}

Object.extend(Number.prototype, {
  toColorPart: function() {
    return this.toPaddedString(2, 16);
  },

  succ: function() {
    return this + 1;
  },

  times: function(iterator) {
    $R(0, this, true).each(iterator);
    return this;
  },

  toPaddedString: function(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  },

  toJSON: function() {
    return isFinite(this) ? this.toString() : 'null';
  }
});

Date.prototype.toJSON = function() {
  return '"' + this.getFullYear() + '-' +
    (this.getMonth() + 1).toPaddedString(2) + '-' +
    this.getDate().toPaddedString(2) + 'T' +
    this.getHours().toPaddedString(2) + ':' +
    this.getMinutes().toPaddedString(2) + ':' +
    this.getSeconds().toPaddedString(2) + '"';
};

var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) {}
    }

    return returnValue;
  }
}

/*--------------------------------------------------------------------------*/

var PeriodicalExecuter = Class.create();
PeriodicalExecuter.prototype = {
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.callback(this);
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
}
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepareReplacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepareReplacement(replacement);
    count = count === undefined ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return this;
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = truncation === undefined ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : this;
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  stripTags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  stripScripts: function() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  },

  extractScripts: function() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  evalScripts: function() {
    return this.extractScripts().map(function(script) { return eval(script) });
  },

  escapeHTML: function() {
    var self = arguments.callee;
    self.text.data = this;
    return self.div.innerHTML;
  },

  unescapeHTML: function() {
    var div = document.createElement('div');
    div.innerHTML = this.stripTags();
    return div.childNodes[0] ? (div.childNodes.length > 1 ?
      $A(div.childNodes).inject('', function(memo, node) { return memo+node.nodeValue }) :
      div.childNodes[0].nodeValue) : '';
  },

  toQueryParams: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return {};

    return match[1].split(separator || '&').inject({}, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (hash[key].constructor != Array) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  },

  toArray: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    var result = '';
    for (var i = 0; i < count; i++) result += this;
    return result;
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = String.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  toJSON: function() {
    return this.inspect(true);
  },

  unfilterJSON: function(filter) {
    return this.sub(filter || Prototype.JSONFilter, '#{1}');
  },

  isJSON: function() {
    var str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  evalJSON: function(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  include: function(pattern) {
    return this.indexOf(pattern) > -1;
  },

  startsWith: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  endsWith: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  empty: function() {
    return this == '';
  },

  blank: function() {
    return /^\s*$/.test(this);
  }
});

if (Prototype.Browser.WebKit || Prototype.Browser.IE) Object.extend(String.prototype, {
  escapeHTML: function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
  unescapeHTML: function() {
    return this.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
});

String.prototype.gsub.prepareReplacement = function(replacement) {
  if (typeof replacement == 'function') return replacement;
  var template = new Template(replacement);
  return function(match) { return template.evaluate(match) };
}

String.prototype.parseQuery = String.prototype.toQueryParams;

Object.extend(String.prototype.escapeHTML, {
  div:  document.createElement('div'),
  text: document.createTextNode('')
});

with (String.prototype.escapeHTML) div.appendChild(text);

var Template = Class.create();
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;
Template.prototype = {
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern  = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    return this.template.gsub(this.pattern, function(match) {
      var before = match[1];
      if (before == '\\') return match[2];
      return before + String.interpret(object[match[3]]);
    });
  }
}

var $break = {}, $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Enumerable = {
  each: function(iterator) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator(value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  },

  eachSlice: function(number, iterator) {
    var index = -number, slices = [], array = this.toArray();
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.map(iterator);
  },

  all: function(iterator) {
    var result = true;
    this.each(function(value, index) {
      result = result && !!(iterator || Prototype.K)(value, index);
      if (!result) throw $break;
    });
    return result;
  },

  any: function(iterator) {
    var result = false;
    this.each(function(value, index) {
      if (result = !!(iterator || Prototype.K)(value, index))
        throw $break;
    });
    return result;
  },

  collect: function(iterator) {
    var results = [];
    this.each(function(value, index) {
      results.push((iterator || Prototype.K)(value, index));
    });
    return results;
  },

  detect: function(iterator) {
    var result;
    this.each(function(value, index) {
      if (iterator(value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  },

  findAll: function(iterator) {
    var results = [];
    this.each(function(value, index) {
      if (iterator(value, index))
        results.push(value);
    });
    return results;
  },

  grep: function(pattern, iterator) {
    var results = [];
    this.each(function(value, index) {
      var stringValue = value.toString();
      if (stringValue.match(pattern))
        results.push((iterator || Prototype.K)(value, index));
    })
    return results;
  },

  include: function(object) {
    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  },

  inGroupsOf: function(number, fillWith) {
    fillWith = fillWith === undefined ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  },

  inject: function(memo, iterator) {
    this.each(function(value, index) {
      memo = iterator(memo, value, index);
    });
    return memo;
  },

  invoke: function(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  },

  max: function(iterator) {
    var result;
    this.each(function(value, index) {
      value = (iterator || Prototype.K)(value, index);
      if (result == undefined || value >= result)
        result = value;
    });
    return result;
  },

  min: function(iterator) {
    var result;
    this.each(function(value, index) {
      value = (iterator || Prototype.K)(value, index);
      if (result == undefined || value < result)
        result = value;
    });
    return result;
  },

  partition: function(iterator) {
    var trues = [], falses = [];
    this.each(function(value, index) {
      ((iterator || Prototype.K)(value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  },

  pluck: function(property) {
    var results = [];
    this.each(function(value, index) {
      results.push(value[property]);
    });
    return results;
  },

  reject: function(iterator) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator(value, index))
        results.push(value);
    });
    return results;
  },

  sortBy: function(iterator) {
    return this.map(function(value, index) {
      return {value: value, criteria: iterator(value, index)};
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  },

  toArray: function() {
    return this.map();
  },

  zip: function() {
    var iterator = Prototype.K, args = $A(arguments);
    if (typeof args.last() == 'function')
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  },

  size: function() {
    return this.toArray().length;
  },

  inspect: function() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }
}

Object.extend(Enumerable, {
  map:     Enumerable.collect,
  find:    Enumerable.detect,
  select:  Enumerable.findAll,
  member:  Enumerable.include,
  entries: Enumerable.toArray
});
var $A = Array.from = function(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) {
    return iterable.toArray();
  } else {
    var results = [];
    for (var i = 0, length = iterable.length; i < length; i++)
      results.push(iterable[i]);
    return results;
  }
}

if (Prototype.Browser.WebKit) {
  $A = Array.from = function(iterable) {
    if (!iterable) return [];
    if (!(typeof iterable == 'function' && iterable == '[object NodeList]') &&
      iterable.toArray) {
      return iterable.toArray();
    } else {
      var results = [];
      for (var i = 0, length = iterable.length; i < length; i++)
        results.push(iterable[i]);
      return results;
    }
  }
}

Object.extend(Array.prototype, Enumerable);

if (!Array.prototype._reverse)
  Array.prototype._reverse = Array.prototype.reverse;

Object.extend(Array.prototype, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },

  clear: function() {
    this.length = 0;
    return this;
  },

  first: function() {
    return this[0];
  },

  last: function() {
    return this[this.length - 1];
  },

  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },

  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat(value && value.constructor == Array ?
        value.flatten() : [value]);
    });
  },

  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  indexOf: function(object) {
    for (var i = 0, length = this.length; i < length; i++)
      if (this[i] == object) return i;
    return -1;
  },

  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },

  reduce: function() {
    return this.length > 1 ? this : this[0];
  },

  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },

  clone: function() {
    return [].concat(this);
  },

  size: function() {
    return this.length;
  },

  inspect: function() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  },

  toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (value !== undefined) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }
});

Array.prototype.toArray = Array.prototype.clone;

function $w(string) {
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

if (Prototype.Browser.Opera){
  Array.prototype.concat = function() {
    var array = [];
    for (var i = 0, length = this.length; i < length; i++) array.push(this[i]);
    for (var i = 0, length = arguments.length; i < length; i++) {
      if (arguments[i].constructor == Array) {
        for (var j = 0, arrayLength = arguments[i].length; j < arrayLength; j++)
          array.push(arguments[i][j]);
      } else {
        array.push(arguments[i]);
      }
    }
    return array;
  }
}
var Hash = function(object) {
  if (object instanceof Hash) this.merge(object);
  else Object.extend(this, object || {});
};

Object.extend(Hash, {
  toQueryString: function(obj) {
    var parts = [];
    parts.add = arguments.callee.addPair;

    this.prototype._each.call(obj, function(pair) {
      if (!pair.key) return;
      var value = pair.value;

      if (value && typeof value == 'object') {
        if (value.constructor == Array) value.each(function(value) {
          parts.add(pair.key, value);
        });
        return;
      }
      parts.add(pair.key, value);
    });

    return parts.join('&');
  },

  toJSON: function(object) {
    var results = [];
    this.prototype._each.call(object, function(pair) {
      var value = Object.toJSON(pair.value);
      if (value !== undefined) results.push(pair.key.toJSON() + ': ' + value);
    });
    return '{' + results.join(', ') + '}';
  }
});

Hash.toQueryString.addPair = function(key, value, prefix) {
  key = encodeURIComponent(key);
  if (value === undefined) this.push(key);
  else this.push(key + '=' + (value == null ? '' : encodeURIComponent(value)));
}

Object.extend(Hash.prototype, Enumerable);
Object.extend(Hash.prototype, {
  _each: function(iterator) {
    for (var key in this) {
      var value = this[key];
      if (value && value == Hash.prototype[key]) continue;

      var pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  },

  keys: function() {
    return this.pluck('key');
  },

  values: function() {
    return this.pluck('value');
  },

  merge: function(hash) {
    return $H(hash).inject(this, function(mergedHash, pair) {
      mergedHash[pair.key] = pair.value;
      return mergedHash;
    });
  },

  remove: function() {
    var result;
    for(var i = 0, length = arguments.length; i < length; i++) {
      var value = this[arguments[i]];
      if (value !== undefined){
        if (result === undefined) result = value;
        else {
          if (result.constructor != Array) result = [result];
          result.push(value)
        }
      }
      delete this[arguments[i]];
    }
    return result;
  },

  toQueryString: function() {
    return Hash.toQueryString(this);
  },

  inspect: function() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  },

  toJSON: function() {
    return Hash.toJSON(this);
  }
});

function $H(object) {
  if (object instanceof Hash) return object;
  return new Hash(object);
};

// Safari iterates over shadowed properties
if (function() {
  var i = 0, Test = function(value) { this.key = value };
  Test.prototype.key = 'foo';
  for (var property in new Test('bar')) i++;
  return i > 1;
}()) Hash.prototype._each = function(iterator) {
  var cache = [];
  for (var key in this) {
    var value = this[key];
    if ((value && value == Hash.prototype[key]) || cache.include(key)) continue;
    cache.push(key);
    var pair = [key, value];
    pair.key = key;
    pair.value = value;
    iterator(pair);
  }
};
ObjectRange = Class.create();
Object.extend(ObjectRange.prototype, Enumerable);
Object.extend(ObjectRange.prototype, {
  initialize: function(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  },

  _each: function(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  },

  include: function(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }
});

var $R = function(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
}

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (typeof responder[callback] == 'function') {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) {}
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate: function() {
    Ajax.activeRequestCount++;
  },
  onComplete: function() {
    Ajax.activeRequestCount--;
  }
});

Ajax.Base = function() {};
Ajax.Base.prototype = {
  setOptions: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   ''
    }
    Object.extend(this.options, options || {});

    this.options.method = this.options.method.toLowerCase();
    if (typeof this.options.parameters == 'string')
      this.options.parameters = this.options.parameters.toQueryParams();
  }
}

Ajax.Request = Class.create();
Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Request.prototype = Object.extend(new Ajax.Base(), {
  _complete: false,

  initialize: function(url, options) {
    this.transport = Ajax.getTransport();
    this.setOptions(options);
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Hash.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      if (this.options.onCreate) this.options.onCreate(this.transport);
      Ajax.Responders.dispatch('onCreate', this, this.transport);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous)
        setTimeout(function() { this.respondToReadyState(1) }.bind(this), 10);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (typeof extras.push == 'function')
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    return !this.transport.status
        || (this.transport.status >= 200 && this.transport.status < 300);
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState];
    var transport = this.transport, json = this.evalJSON();

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + this.transport.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(transport, json);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = this.getHeader('Content-type');
      if (contentType && contentType.strip().
        match(/^(text|application)\/(x-)?(java|ecma)script(;.*)?$/i))
          this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(transport, json);
      Ajax.Responders.dispatch('on' + state, this, transport, json);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name);
    } catch (e) { return null }
  },

  evalJSON: function() {
    try {
      var json = this.getHeader('X-JSON');
      return json ? json.evalJSON() : null;
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Updater = Class.create();

Object.extend(Object.extend(Ajax.Updater.prototype, Ajax.Request.prototype), {
  initialize: function(container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    }

    this.transport = Ajax.getTransport();
    this.setOptions(options);

    var onComplete = this.options.onComplete || Prototype.emptyFunction;
    this.options.onComplete = (function(transport, param) {
      this.updateContent();
      onComplete(transport, param);
    }).bind(this);

    this.request(url);
  },

  updateContent: function() {
    var receiver = this.container[this.success() ? 'success' : 'failure'];
    var response = this.transport.responseText;

    if (!this.options.evalScripts) response = response.stripScripts();

    if (receiver = $(receiver)) {
      if (this.options.insertion)
        new this.options.insertion(receiver, response);
      else
        receiver.update(response);
    }

    if (this.success()) {
      if (this.onComplete)
        setTimeout(this.onComplete.bind(this), 10);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create();
Ajax.PeriodicalUpdater.prototype = Object.extend(new Ajax.Base(), {
  initialize: function(container, url, options) {
    this.setOptions(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = {};
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(request) {
    if (this.options.decay) {
      this.decay = (request.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = request.responseText;
    }
    this.timer = setTimeout(this.onTimerEvent.bind(this),
      this.decay * this.frequency * 1000);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});
function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (typeof element == 'string')
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(query.snapshotItem(i));
    return results;
  };

  document.getElementsByClassName = function(className, parentElement) {
    var q = ".//*[contains(concat(' ', @class, ' '), ' " + className + " ')]";
    return document._getElementsByXPath(q, parentElement);
  }

} else document.getElementsByClassName = function(className, parentElement) {
  var children = ($(parentElement) || document.body).getElementsByTagName('*');
  var elements = [], child, pattern = new RegExp("(^|\\s)" + className + "(\\s|$)");
  for (var i = 0, length = children.length; i < length; i++) {
    child = children[i];
    var elementClassName = child.className;
    if (elementClassName.length == 0) continue;
    if (elementClassName == className || elementClassName.match(pattern))
      elements.push(Element.extend(child));
  }
  return elements;
};

/*--------------------------------------------------------------------------*/

if (!window.Element) var Element = {};

Element.extend = function(element) {
  var F = Prototype.BrowserFeatures;
  if (!element || !element.tagName || element.nodeType == 3 ||
   element._extended || F.SpecificElementExtensions || element == window)
    return element;

  var methods = {}, tagName = element.tagName, cache = Element.extend.cache,
   T = Element.Methods.ByTag;

  // extend methods for all tags (Safari doesn't need this)
  if (!F.ElementExtensions) {
    Object.extend(methods, Element.Methods),
    Object.extend(methods, Element.Methods.Simulated);
  }

  // extend methods for specific tags
  if (T[tagName]) Object.extend(methods, T[tagName]);

  for (var property in methods) {
    var value = methods[property];
    if (typeof value == 'function' && !(property in element))
      element[property] = cache.findOrStore(value);
  }

  element._extended = Prototype.emptyFunction;
  return element;
};

Element.extend.cache = {
  findOrStore: function(value) {
    return this[value] = this[value] || function() {
      return value.apply(null, [this].concat($A(arguments)));
    }
  }
};

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    $(element).style.display = 'none';
    return element;

  },

  show: function(element) {
    $(element).style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: function(element, html) {
    html = typeof html == 'undefined' ? '' : html.toString();
    $(element).innerHTML = html.stripScripts();
    setTimeout(function() {html.evalScripts()}, 10);
    return element;
  },

  replace: function(element, html) {
    element = $(element);
    html = typeof html == 'undefined' ? '' : html.toString();
    if (element.outerHTML) {
      element.outerHTML = html.stripScripts();
    } else {
      var range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      element.parentNode.replaceChild(
        range.createContextualFragment(html.stripScripts()), element);
    }
    setTimeout(function() {html.evalScripts()}, 10);
    return element;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  descendants: function(element) {
    return $A($(element).getElementsByTagName('*')).each(Element.extend);
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },

  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },

  match: function(element, selector) {
    if (typeof selector == 'string')
      selector = new Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return expression ? Selector.findElement(ancestors, expression, index) :
      ancestors[index || 0];
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    var descendants = element.descendants();
    return expression ? Selector.findElement(descendants, expression, index) :
      descendants[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return expression ? Selector.findElement(previousSiblings, expression, index) :
      previousSiblings[index || 0];
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return expression ? Selector.findElement(nextSiblings, expression, index) :
      nextSiblings[index || 0];
  },

  getElementsBySelector: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element, args);
  },

  getElementsByClassName: function(element, className) {
    return document.getElementsByClassName(className, element);
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      if (!element.attributes) return null;
      var t = Element._attributeTranslations;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name])  name = t.names[name];
      var attribute = element.attributes[name];
      return attribute ? attribute.nodeValue : null;
    }
    return element.getAttribute(name);
  },

  getHeight: function(element) {
    return $(element).getDimensions().height;
  },

  getWidth: function(element) {
    return $(element).getDimensions().width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    if (elementClassName.length == 0) return false;
    if (elementClassName == className ||
        elementClassName.match(new RegExp("(^|\\s)" + className + "(\\s|$)")))
      return true;
    return false;
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    Element.classNames(element).add(className);
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    Element.classNames(element).remove(className);
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    Element.classNames(element)[element.hasClassName(className) ? 'remove' : 'add'](className);
    return element;
  },

  observe: function() {
    Event.observe.apply(Event, arguments);
    return $A(arguments).first();
  },

  stopObserving: function() {
    Event.stopObserving.apply(Event, arguments);
    return $A(arguments).first();
  },

  // removes whitespace-only text node children
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    while (element = element.parentNode)
      if (element == ancestor) return true;
    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = Position.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value) {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles, camelized) {
    element = $(element);
    var elementStyle = element.style;

    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property])
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (elementStyle.styleFloat === undefined ? 'cssFloat' : 'styleFloat') :
          (camelized ? property : property.camelize())] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = $(element).getStyle('display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (window.opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = element.style.overflow || 'auto';
    if ((Element.getStyle(element, 'overflow') || 'visible') != 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  }
};

Object.extend(Element.Methods, {
  childOf: Element.Methods.descendantOf,
  childElements: Element.Methods.immediateDescendants
});

if (Prototype.Browser.Opera) {
  Element.Methods._getStyle = Element.Methods.getStyle;
  Element.Methods.getStyle = function(element, style) {
    switch(style) {
      case 'left':
      case 'top':
      case 'right':
      case 'bottom':
        if (Element._getStyle(element, 'position') == 'static') return null;
      default: return Element._getStyle(element, style);
    }
  };
}
else if (Prototype.Browser.IE) {
  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset'+style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      style.filter = filter.replace(/alpha\([^\)]*\)/gi,'');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = filter.replace(/alpha\([^\)]*\)/gi, '') +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  // IE is missing .innerHTML support for TABLE-related elements
  Element.Methods.update = function(element, html) {
    element = $(element);
    html = typeof html == 'undefined' ? '' : html.toString();
    var tagName = element.tagName.toUpperCase();
    if (['THEAD','TBODY','TR','TD'].include(tagName)) {
      var div = document.createElement('div');
      switch (tagName) {
        case 'THEAD':
        case 'TBODY':
          div.innerHTML = '<table><tbody>' +  html.stripScripts() + '</tbody></table>';
          depth = 2;
          break;
        case 'TR':
          div.innerHTML = '<table><tbody><tr>' +  html.stripScripts() + '</tr></tbody></table>';
          depth = 3;
          break;
        case 'TD':
          div.innerHTML = '<table><tbody><tr><td>' +  html.stripScripts() + '</td></tr></tbody></table>';
          depth = 4;
      }
      $A(element.childNodes).each(function(node) { element.removeChild(node) });
      depth.times(function() { div = div.firstChild });
      $A(div.childNodes).each(function(node) { element.appendChild(node) });
    } else {
      element.innerHTML = html.stripScripts();
    }
    setTimeout(function() { html.evalScripts() }, 10);
    return element;
  }
}
else if (Prototype.Browser.Gecko) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

Element._attributeTranslations = {
  names: {
    colspan:   "colSpan",
    rowspan:   "rowSpan",
    valign:    "vAlign",
    datetime:  "dateTime",
    accesskey: "accessKey",
    tabindex:  "tabIndex",
    enctype:   "encType",
    maxlength: "maxLength",
    readonly:  "readOnly",
    longdesc:  "longDesc"
  },
  values: {
    _getAttr: function(element, attribute) {
      return element.getAttribute(attribute, 2);
    },
    _flag: function(element, attribute) {
      return $(element).hasAttribute(attribute) ? attribute : null;
    },
    style: function(element) {
      return element.style.cssText.toLowerCase();
    },
    title: function(element) {
      var node = element.getAttributeNode('title');
      return node.specified ? node.nodeValue : null;
    }
  }
};

(function() {
  Object.extend(this, {
    href: this._getAttr,
    src:  this._getAttr,
    type: this._getAttr,
    disabled: this._flag,
    checked:  this._flag,
    readonly: this._flag,
    multiple: this._flag
  });
}).call(Element._attributeTranslations.values);

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    var t = Element._attributeTranslations, node;
    attribute = t.names[attribute] || attribute;
    node = $(element).getAttributeNode(attribute);
    return node && node.specified;
  }
};

Element.Methods.ByTag = {};

Object.extend(Element, Element.Methods);

if (!Prototype.BrowserFeatures.ElementExtensions &&
 document.createElement('div').__proto__) {
  window.HTMLElement = {};
  window.HTMLElement.prototype = document.createElement('div').__proto__;
  Prototype.BrowserFeatures.ElementExtensions = true;
}

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || {});
  else {
    if (tagName.constructor == Array) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = {};
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    var cache = Element.extend.cache;
    for (var property in methods) {
      var value = methods[property];
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = cache.findOrStore(value);
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    window[klass] = {};
    window[klass].prototype = document.createElement(tagName).__proto__;
    return window[klass];
  }

  if (F.ElementExtensions) {
    copy(Element.Methods, HTMLElement.prototype);
    copy(Element.Methods.Simulated, HTMLElement.prototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (typeof klass == "undefined") continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;
};

var Toggle = { display: Element.toggle };

/*--------------------------------------------------------------------------*/

Abstract.Insertion = function(adjacency) {
  this.adjacency = adjacency;
}

Abstract.Insertion.prototype = {
  initialize: function(element, content) {
    this.element = $(element);
    this.content = content.stripScripts();

    if (this.adjacency && this.element.insertAdjacentHTML) {
      try {
        this.element.insertAdjacentHTML(this.adjacency, this.content);
      } catch (e) {
        var tagName = this.element.tagName.toUpperCase();
        if (['TBODY', 'TR'].include(tagName)) {
          this.insertContent(this.contentFromAnonymousTable());
        } else {
          throw e;
        }
      }
    } else {
      this.range = this.element.ownerDocument.createRange();
      if (this.initializeRange) this.initializeRange();
      this.insertContent([this.range.createContextualFragment(this.content)]);
    }

    setTimeout(function() {content.evalScripts()}, 10);
  },

  contentFromAnonymousTable: function() {
    var div = document.createElement('div');
    div.innerHTML = '<table><tbody>' + this.content + '</tbody></table>';
    return $A(div.childNodes[0].childNodes[0].childNodes);
  }
}

var Insertion = new Object();

Insertion.Before = Class.create();
Insertion.Before.prototype = Object.extend(new Abstract.Insertion('beforeBegin'), {
  initializeRange: function() {
    this.range.setStartBefore(this.element);
  },

  insertContent: function(fragments) {
    fragments.each((function(fragment) {
      this.element.parentNode.insertBefore(fragment, this.element);
    }).bind(this));
  }
});

Insertion.Top = Class.create();
Insertion.Top.prototype = Object.extend(new Abstract.Insertion('afterBegin'), {
  initializeRange: function() {
    this.range.selectNodeContents(this.element);
    this.range.collapse(true);
  },

  insertContent: function(fragments) {
    fragments.reverse(false).each((function(fragment) {
      this.element.insertBefore(fragment, this.element.firstChild);
    }).bind(this));
  }
});

Insertion.Bottom = Class.create();
Insertion.Bottom.prototype = Object.extend(new Abstract.Insertion('beforeEnd'), {
  initializeRange: function() {
    this.range.selectNodeContents(this.element);
    this.range.collapse(this.element);
  },

  insertContent: function(fragments) {
    fragments.each((function(fragment) {
      this.element.appendChild(fragment);
    }).bind(this));
  }
});

Insertion.After = Class.create();
Insertion.After.prototype = Object.extend(new Abstract.Insertion('afterEnd'), {
  initializeRange: function() {
    this.range.setStartAfter(this.element);
  },

  insertContent: function(fragments) {
    fragments.each((function(fragment) {
      this.element.parentNode.insertBefore(fragment,
        this.element.nextSibling);
    }).bind(this));
  }
});

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);
/* Portions of the Selector class are derived from Jack Slocum’s DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create();

Selector.prototype = {
  initialize: function(expression) {
    this.expression = expression.strip();
    this.compileMatcher();
  },

  compileMatcher: function() {
    // Selectors with namespaced attributes can't use the XPath version
    if (Prototype.BrowserFeatures.XPath && !(/\[[\w-]*?:/).test(this.expression))
      return this.compileXPathMatcher();

    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e]; return;
    }
    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          this.matcher.push(typeof c[i] == 'function' ? c[i](m) :
    	      new Template(c[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le,  m;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        if (m = e.match(ps[i])) {
          this.matcher.push(typeof x[i] == 'function' ? x[i](m) :
            new Template(x[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    if (this.xpath) return document._getElementsByXPath(this.xpath, root);
    return this.matcher(root);
  },

  match: function(element) {
    return this.findElements(document).include(element);
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
};

Object.extend(Selector, {
  _cache: {},

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: "[@#{1}]",
    attr: function(m) {
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (typeof h === 'function') return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0 or translate(text(), ' \t\r\n', '') = '')]",
      'checked':     "[@checked]",
      'disabled':    "[@disabled]",
      'enabled':     "[not(@disabled)]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, m, v;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i in p) {
            if (m = e.match(p[i])) {
              v = typeof x[i] == 'function' ? x[i](m) : new Template(x[i]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);   c = false;',
    className:    'n = h.className(n, r, "#{1}", c); c = false;',
    id:           'n = h.id(n, r, "#{1}", c);        c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}"); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}"); c = false;').evaluate(m);
    },
    pseudo:       function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: {
    // combinators must be listed first
    // (and descendant needs to be last combinator)
    laterSibling: /^\s*~\s*/,
    child:        /^\s*>\s*/,
    adjacent:     /^\s*\+\s*/,
    descendant:   /^\s/,

    // selectors follow
    tagName:      /^\s*(\*|[\w\-]+)(\b|$)?/,
    id:           /^#([\w\-\*]+)(\b|$)/,
    className:    /^\.([\w\-\*]+)(\b|$)/,
    pseudo:       /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|\s|(?=:))/,
    attrPresence: /^\[([\w]+)\]/,
    attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\]]*?)\4|([^'"][^\]]*?)))?\]/
  },

  handlers: {
    // UTILITY FUNCTIONS
    // joins two collections
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    // marks an array of nodes for counting
    mark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._counted = true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._counted = undefined;
      return nodes;
    },

    // mark each child node with its position (for nth calls)
    // "ofType" flag indicates whether we're indexing for nth-of-type
    // rather than nth-child
    index: function(parentNode, reverse, ofType) {
      parentNode._counted = true;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._counted)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._counted)) node.nodeIndex = j++;
      }
    },

    // filters out duplicates and extends all nodes
    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (!(n = nodes[i])._counted) {
          n._counted = true;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    // COMBINATOR FUNCTIONS
    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, children = [], child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
	      if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    // TOKEN FUNCTIONS
    tagName: function(nodes, root, tagName, combinator) {
      tagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          // fastlane for ordinary descendant combinators
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() == tagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;
      if (!nodes && root == document) return targetNode ? [targetNode] : [];
      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr) {
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    // handles the an+b logic
    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    // handles nth(-last)-child, nth(-last)-of-type, and (first|last)-of-type
    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._counted) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        // IE treats comments as element nodes
        if (node.tagName == '!' || (node.firstChild && !node.innerHTML.match(/^\s*$/))) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._counted) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled) results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv.startsWith(v); },
    '$=': function(nv, v) { return nv.endsWith(v); },
    '*=': function(nv, v) { return nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + nv.toUpperCase() + '-').include('-' + v.toUpperCase() + '-'); }
  },

  matchElements: function(elements, expression) {
    var matches = new Selector(expression).findElements(), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._counted) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (typeof expression == 'number') {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    var exprs = expressions.join(','), expressions = [];
    exprs.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}
var Form = {
  reset: function(form) {
    $(form).reset();
    return form;
  },

  serializeElements: function(elements, getHash) {
    var data = elements.inject({}, function(result, element) {
      if (!element.disabled && element.name) {
        var key = element.name, value = $(element).getValue();
        if (value != null) {
         	if (key in result) {
            if (result[key].constructor != Array) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return getHash ? data : Hash.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, getHash) {
    return Form.serializeElements(Form.getElements(form), getHash);
  },

  getElements: function(form) {
    return $A($(form).getElementsByTagName('*')).inject([],
      function(elements, child) {
        if (Form.Element.Serializers[child.tagName.toLowerCase()])
          elements.push(Element.extend(child));
        return elements;
      }
    );
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    return $(form).getElements().find(function(element) {
      return element.type != 'hidden' && !element.disabled &&
        ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || {});

    var params = options.parameters;
    options.parameters = form.serialize(true);

    if (params) {
      if (typeof params == 'string') params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(form.readAttribute('action'), options);
  }
}

/*--------------------------------------------------------------------------*/

Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
}

Form.Element.Methods = {
  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = {};
        pair[element.name] = value;
        return Hash.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
        !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) {}
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.blur();
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
}

/*--------------------------------------------------------------------------*/

var Field = Form.Element;
var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element);
      default:
        return Form.Element.Serializers.textarea(element);
    }
  },

  inputSelector: function(element) {
    return element.checked ? element.value : null;
  },

  textarea: function(element) {
    return element.value;
  },

  select: function(element) {
    return this[element.type == 'select-one' ?
      'selectOne' : 'selectMany'](element);
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    // extend element because hasAttribute may not be native
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
}

/*--------------------------------------------------------------------------*/

Abstract.TimedObserver = function() {}
Abstract.TimedObserver.prototype = {
  initialize: function(element, frequency, callback) {
    this.frequency = frequency;
    this.element   = $(element);
    this.callback  = callback;

    this.lastValue = this.getValue();
    this.registerCallback();
  },

  registerCallback: function() {
    setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  onTimerEvent: function() {
    var value = this.getValue();
    var changed = ('string' == typeof this.lastValue && 'string' == typeof value
      ? this.lastValue != value : String(this.lastValue) != String(value));
    if (changed) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
}

Form.Element.Observer = Class.create();
Form.Element.Observer.prototype = Object.extend(new Abstract.TimedObserver(), {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create();
Form.Observer.prototype = Object.extend(new Abstract.TimedObserver(), {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = function() {}
Abstract.EventObserver.prototype = {
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback.bind(this));
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
}

Form.Element.EventObserver = Class.create();
Form.Element.EventObserver.prototype = Object.extend(new Abstract.EventObserver(), {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create();
Form.EventObserver.prototype = Object.extend(new Abstract.EventObserver(), {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
if (!window.Event) {
  var Event = new Object();
}

Object.extend(Event, {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,

  element: function(event) {
    return $(event.target || event.srcElement);
  },

  isLeftClick: function(event) {
    return (((event.which) && (event.which == 1)) ||
            ((event.button) && (event.button == 1)));
  },

  pointerX: function(event) {
    return event.pageX || (event.clientX +
      (document.documentElement.scrollLeft || document.body.scrollLeft));
  },

  pointerY: function(event) {
    return event.pageY || (event.clientY +
      (document.documentElement.scrollTop || document.body.scrollTop));
  },

  stop: function(event) {
    if (event.preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      event.returnValue = false;
      event.cancelBubble = true;
    }
  },

  // find the first node with the given tagName, starting from the
  // node the event was triggered on; traverses the DOM upwards
  findElement: function(event, tagName) {
    var element = Event.element(event);
    while (element.parentNode && (!element.tagName ||
        (element.tagName.toUpperCase() != tagName.toUpperCase())))
      element = element.parentNode;
    return element;
  },

  observers: false,

  _observeAndCache: function(element, name, observer, useCapture) {
    if (!this.observers) this.observers = [];
    if (element.addEventListener) {
      this.observers.push([element, name, observer, useCapture]);
      element.addEventListener(name, observer, useCapture);
    } else if (element.attachEvent) {
      this.observers.push([element, name, observer, useCapture]);
      element.attachEvent('on' + name, observer);
    }
  },

  unloadCache: function() {
    if (!Event.observers) return;
    for (var i = 0, length = Event.observers.length; i < length; i++) {
      Event.stopObserving.apply(this, Event.observers[i]);
      Event.observers[i][0] = null;
    }
    Event.observers = false;
  },

  observe: function(element, name, observer, useCapture) {
    element = $(element);
    useCapture = useCapture || false;

    if (name == 'keypress' &&
      (Prototype.Browser.WebKit || element.attachEvent))
      name = 'keydown';

    Event._observeAndCache(element, name, observer, useCapture);
  },

  stopObserving: function(element, name, observer, useCapture) {
    element = $(element);
    useCapture = useCapture || false;

    if (name == 'keypress' &&
        (Prototype.Browser.WebKit || element.attachEvent))
      name = 'keydown';

    if (element.removeEventListener) {
      element.removeEventListener(name, observer, useCapture);
    } else if (element.detachEvent) {
      try {
        element.detachEvent('on' + name, observer);
      } catch (e) {}
    }
  }
});

/* prevent memory leaks in IE */
if (Prototype.Browser.IE)
  Event.observe(window, 'unload', Event.unloadCache, false);
var Position = {
  // set to true if needed, warning: firefox performance problems
  // NOT neeeded for page scrolling, only if draggable contained in
  // scrollable elements
  includeScrollOffsets: false,

  // must be called before calling withinIncludingScrolloffset, every time the
  // page is scrolled
  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  realOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return [valueL, valueT];
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return [valueL, valueT];
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if(element.tagName=='BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p == 'relative' || p == 'absolute') break;
      }
    } while (element);
    return [valueL, valueT];
  },

  offsetParent: function(element) {
    if (element.offsetParent) return element.offsetParent;
    if (element == document.body) return element;

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return element;

    return document.body;
  },

  // caches x/y coordinate pair to use with overlap
  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = this.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = this.realOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = this.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  // within must be called directly before
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },

  page: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body)
        if (Element.getStyle(element,'position')=='absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!window.opera || element.tagName=='BODY') {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return [valueL, valueT];
  },

  clone: function(source, target) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || {})

    // find page position of source
    source = $(source);
    var p = Position.page(source);

    // find coordinate system to use
    target = $(target);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements,
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(target,'position') == 'absolute') {
      parent = Position.offsetParent(target);
      delta = Position.page(parent);
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    // set position
    if(options.setLeft)   target.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if(options.setTop)    target.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if(options.setWidth)  target.style.width = source.offsetWidth + 'px';
    if(options.setHeight) target.style.height = source.offsetHeight + 'px';
  },

  absolutize: function(element) {
    element = $(element);
    if (element.style.position == 'absolute') return;
    Position.prepare();

    var offsets = Position.positionedOffset(element);
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
  },

  relativize: function(element) {
    element = $(element);
    if (element.style.position == 'relative') return;
    Position.prepare();

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
  }
}

// Safari returns margins on body which is incorrect if the child is absolutely
// positioned.  For performance reasons, redefine Position.cumulativeOffset for
// KHTML/WebKit only.
if (Prototype.Browser.WebKit) {
  Position.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return [valueL, valueT];
  }
}

Element.addMethods();

// end prototype.js

// script.aculo.us effects.js v1.7.0, Fri Jan 19 19:16:36 CET 2007

// Copyright (c) 2005, 2006 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
// Contributors:
//  Justin Palmer (http://encytemedia.com/)
//  Mark Pilgrim (http://diveintomark.org/)
//  Martin Bialasinki
// 
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/ 

// converts rgb() and #xxx to #xxxxxx format,  
// returns self (or first argument) if not convertable  
String.prototype.parseColor = function() {  
  var color = '#';
  if(this.slice(0,4) == 'rgb(') {  
    var cols = this.slice(4,this.length-1).split(',');  
    var i=0; do { color += parseInt(cols[i]).toColorPart() } while (++i<3);  
  } else {  
    if(this.slice(0,1) == '#') {  
      if(this.length==4) for(var i=1;i<4;i++) color += (this.charAt(i) + this.charAt(i)).toLowerCase();  
      if(this.length==7) color = this.toLowerCase();  
    }  
  }  
  return(color.length==7 ? color : (arguments[0] || this));  
}

/*--------------------------------------------------------------------------*/

Element.collectTextNodes = function(element) {  
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue : 
      (node.hasChildNodes() ? Element.collectTextNodes(node) : ''));
  }).flatten().join('');
}

Element.collectTextNodesIgnoreClass = function(element, className) {  
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue : 
      ((node.hasChildNodes() && !Element.hasClassName(node,className)) ? 
        Element.collectTextNodesIgnoreClass(node, className) : ''));
  }).flatten().join('');
}

Element.setContentZoom = function(element, percent) {
  element = $(element);  
  element.setStyle({fontSize: (percent/100) + 'em'});   
  if(navigator.appVersion.indexOf('AppleWebKit')>0) window.scrollBy(0,0);
  return element;
}

Element.getOpacity = function(element){
  return $(element).getStyle('opacity');
}

Element.setOpacity = function(element, value){
  return $(element).setStyle({opacity:value});
}

Element.getInlineOpacity = function(element){
  return $(element).style.opacity || '';
}

Element.forceRerendering = function(element) {
  try {
    element = $(element);
    var n = document.createTextNode(' ');
    element.appendChild(n);
    element.removeChild(n);
  } catch(e) { }
};

/*--------------------------------------------------------------------------*/

Array.prototype.call = function() {
  var args = arguments;
  this.each(function(f){ f.apply(this, args) });
}

/*--------------------------------------------------------------------------*/

var Effect = {
  _elementDoesNotExistError: {
    name: 'ElementDoesNotExistError',
    message: 'The specified DOM element does not exist, but is required for this effect to operate'
  },
  tagifyText: function(element) {
    if(typeof Builder == 'undefined')
      throw("Effect.tagifyText requires including script.aculo.us' builder.js library");
      
    var tagifyStyle = 'position:relative';
    if(/MSIE/.test(navigator.userAgent) && !window.opera) tagifyStyle += ';zoom:1';
    
    element = $(element);
    $A(element.childNodes).each( function(child) {
      if(child.nodeType==3) {
        child.nodeValue.toArray().each( function(character) {
          element.insertBefore(
            Builder.node('span',{style: tagifyStyle},
              character == ' ' ? String.fromCharCode(160) : character), 
              child);
        });
        Element.remove(child);
      }
    });
  },
  multiple: function(element, effect) {
    var elements;
    if(((typeof element == 'object') || 
        (typeof element == 'function')) && 
       (element.length))
      elements = element;
    else
      elements = $(element).childNodes;
      
    var options = Object.extend({
      speed: 0.1,
      delay: 0.0
    }, arguments[2] || {});
    var masterDelay = options.delay;

    $A(elements).each( function(element, index) {
      new effect(element, Object.extend(options, { delay: index * options.speed + masterDelay }));
    });
  },
  PAIRS: {
    'slide':  ['SlideDown','SlideUp'],
    'blind':  ['BlindDown','BlindUp'],
    'appear': ['Appear','Fade']
  },
  toggle: function(element, effect) {
    element = $(element);
    effect = (effect || 'appear').toLowerCase();
    var options = Object.extend({
      queue: { position:'end', scope:(element.id || 'global'), limit: 1 }
    }, arguments[2] || {});
    Effect[element.visible() ? 
      Effect.PAIRS[effect][1] : Effect.PAIRS[effect][0]](element, options);
  }
};

var Effect2 = Effect; // deprecated

/* ------------- transitions ------------- */

Effect.Transitions = {
  linear: Prototype.K,
  sinoidal: function(pos) {
    return (-Math.cos(pos*Math.PI)/2) + 0.5;
  },
  reverse: function(pos) {
    return 1-pos;
  },
  flicker: function(pos) {
    return ((-Math.cos(pos*Math.PI)/4) + 0.75) + Math.random()/4;
  },
  wobble: function(pos) {
    return (-Math.cos(pos*Math.PI*(9*pos))/2) + 0.5;
  },
  pulse: function(pos, pulses) { 
    pulses = pulses || 5; 
    return (
      Math.round((pos % (1/pulses)) * pulses) == 0 ? 
            ((pos * pulses * 2) - Math.floor(pos * pulses * 2)) : 
        1 - ((pos * pulses * 2) - Math.floor(pos * pulses * 2))
      );
  },
  none: function(pos) {
    return 0;
  },
  full: function(pos) {
    return 1;
  }
};

/* ------------- core effects ------------- */

Effect.ScopedQueue = Class.create();
Object.extend(Object.extend(Effect.ScopedQueue.prototype, Enumerable), {
  initialize: function() {
    this.effects  = [];
    this.interval = null;
  },
  _each: function(iterator) {
    this.effects._each(iterator);
  },
  add: function(effect) {
    var timestamp = new Date().getTime();
    
    var position = (typeof effect.options.queue == 'string') ? 
      effect.options.queue : effect.options.queue.position;
    
    switch(position) {
      case 'front':
        // move unstarted effects after this effect  
        this.effects.findAll(function(e){ return e.state=='idle' }).each( function(e) {
            e.startOn  += effect.finishOn;
            e.finishOn += effect.finishOn;
          });
        break;
      case 'with-last':
        timestamp = this.effects.pluck('startOn').max() || timestamp;
        break;
      case 'end':
        // start effect after last queued effect has finished
        timestamp = this.effects.pluck('finishOn').max() || timestamp;
        break;
    }
    
    effect.startOn  += timestamp;
    effect.finishOn += timestamp;

    if(!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit))
      this.effects.push(effect);
    
    if(!this.interval) 
      this.interval = setInterval(this.loop.bind(this), 15);
  },
  remove: function(effect) {
    this.effects = this.effects.reject(function(e) { return e==effect });
    if(this.effects.length == 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  loop: function() {
    var timePos = new Date().getTime();
    for(var i=0, len=this.effects.length;i<len;i++) 
      if(this.effects[i]) this.effects[i].loop(timePos);
  }
});

Effect.Queues = {
  instances: $H(),
  get: function(queueName) {
    if(typeof queueName != 'string') return queueName;
    
    if(!this.instances[queueName])
      this.instances[queueName] = new Effect.ScopedQueue();
      
    return this.instances[queueName];
  }
}
Effect.Queue = Effect.Queues.get('global');

Effect.DefaultOptions = {
  transition: Effect.Transitions.sinoidal,
  duration:   1.0,   // seconds
  fps:        60.0,  // max. 60fps due to Effect.Queue implementation
  sync:       false, // true for combining
  from:       0.0,
  to:         1.0,
  delay:      0.0,
  queue:      'parallel'
}

Effect.Base = function() {};
Effect.Base.prototype = {
  position: null,
  start: function(options) {
    this.options      = Object.extend(Object.extend({},Effect.DefaultOptions), options || {});
    this.currentFrame = 0;
    this.state        = 'idle';
    this.startOn      = this.options.delay*1000;
    this.finishOn     = this.startOn + (this.options.duration*1000);
    this.event('beforeStart');
    if(!this.options.sync)
      Effect.Queues.get(typeof this.options.queue == 'string' ? 
        'global' : this.options.queue.scope).add(this);
  },
  loop: function(timePos) {
    if(timePos >= this.startOn) {
      if(timePos >= this.finishOn) {
        this.render(1.0);
        this.cancel();
        this.event('beforeFinish');
        if(this.finish) this.finish(); 
        this.event('afterFinish');
        return;  
      }
      var pos   = (timePos - this.startOn) / (this.finishOn - this.startOn);
      var frame = Math.round(pos * this.options.fps * this.options.duration);
      if(frame > this.currentFrame) {
        this.render(pos);
        this.currentFrame = frame;
      }
    }
  },
  render: function(pos) {
    if(this.state == 'idle') {
      this.state = 'running';
      this.event('beforeSetup');
      if(this.setup) this.setup();
      this.event('afterSetup');
    }
    if(this.state == 'running') {
      if(this.options.transition) pos = this.options.transition(pos);
      pos *= (this.options.to-this.options.from);
      pos += this.options.from;
      this.position = pos;
      this.event('beforeUpdate');
      if(this.update) this.update(pos);
      this.event('afterUpdate');
    }
  },
  cancel: function() {
    if(!this.options.sync)
      Effect.Queues.get(typeof this.options.queue == 'string' ? 
        'global' : this.options.queue.scope).remove(this);
    this.state = 'finished';
  },
  event: function(eventName) {
    if(this.options[eventName + 'Internal']) this.options[eventName + 'Internal'](this);
    if(this.options[eventName]) this.options[eventName](this);
  },
  inspect: function() {
    var data = $H();
    for(property in this)
      if(typeof this[property] != 'function') data[property] = this[property];
    return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>';
  }
}

Effect.Parallel = Class.create();
Object.extend(Object.extend(Effect.Parallel.prototype, Effect.Base.prototype), {
  initialize: function(effects) {
    this.effects = effects || [];
    this.start(arguments[1]);
  },
  update: function(position) {
    this.effects.invoke('render', position);
  },
  finish: function(position) {
    this.effects.each( function(effect) {
      effect.render(1.0);
      effect.cancel();
      effect.event('beforeFinish');
      if(effect.finish) effect.finish(position);
      effect.event('afterFinish');
    });
  }
});

Effect.Event = Class.create();
Object.extend(Object.extend(Effect.Event.prototype, Effect.Base.prototype), {
  initialize: function() {
    var options = Object.extend({
      duration: 0
    }, arguments[0] || {});
    this.start(options);
  },
  update: Prototype.emptyFunction
});

Effect.Opacity = Class.create();
Object.extend(Object.extend(Effect.Opacity.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    // make this work on IE on elements without 'layout'
    if(/MSIE/.test(navigator.userAgent) && !window.opera && (!this.element.currentStyle.hasLayout))
      this.element.setStyle({zoom: 1});
    var options = Object.extend({
      from: this.element.getOpacity() || 0.0,
      to:   1.0
    }, arguments[1] || {});
    this.start(options);
  },
  update: function(position) {
    this.element.setOpacity(position);
  }
});

Effect.Move = Class.create();
Object.extend(Object.extend(Effect.Move.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      x:    0,
      y:    0,
      mode: 'relative'
    }, arguments[1] || {});
    this.start(options);
  },
  setup: function() {
    // Bug in Opera: Opera returns the "real" position of a static element or
    // relative element that does not have top/left explicitly set.
    // ==> Always set top and left for position relative elements in your stylesheets 
    // (to 0 if you do not need them) 
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop  = parseFloat(this.element.getStyle('top')  || '0');
    if(this.options.mode == 'absolute') {
      // absolute movement, so we need to calc deltaX and deltaY
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
    }
  },
  update: function(position) {
    this.element.setStyle({
      left: Math.round(this.options.x  * position + this.originalLeft) + 'px',
      top:  Math.round(this.options.y  * position + this.originalTop)  + 'px'
    });
  }
});

// for backwards compatibility
Effect.MoveBy = function(element, toTop, toLeft) {
  return new Effect.Move(element, 
    Object.extend({ x: toLeft, y: toTop }, arguments[3] || {}));
};

Effect.Scale = Class.create();
Object.extend(Object.extend(Effect.Scale.prototype, Effect.Base.prototype), {
  initialize: function(element, percent) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      scaleX: true,
      scaleY: true,
      scaleContent: true,
      scaleFromCenter: false,
      scaleMode: 'box',        // 'box' or 'contents' or {} with provided values
      scaleFrom: 100.0,
      scaleTo:   percent
    }, arguments[2] || {});
    this.start(options);
  },
  setup: function() {
    this.restoreAfterFinish = this.options.restoreAfterFinish || false;
    this.elementPositioning = this.element.getStyle('position');
    
    this.originalStyle = {};
    ['top','left','width','height','fontSize'].each( function(k) {
      this.originalStyle[k] = this.element.style[k];
    }.bind(this));
      
    this.originalTop  = this.element.offsetTop;
    this.originalLeft = this.element.offsetLeft;
    
    var fontSize = this.element.getStyle('font-size') || '100%';
    ['em','px','%','pt'].each( function(fontSizeType) {
      if(fontSize.indexOf(fontSizeType)>0) {
        this.fontSize     = parseFloat(fontSize);
        this.fontSizeType = fontSizeType;
      }
    }.bind(this));
    
    this.factor = (this.options.scaleTo - this.options.scaleFrom)/100;
    
    this.dims = null;
    if(this.options.scaleMode=='box')
      this.dims = [this.element.offsetHeight, this.element.offsetWidth];
    if(/^content/.test(this.options.scaleMode))
      this.dims = [this.element.scrollHeight, this.element.scrollWidth];
    if(!this.dims)
      this.dims = [this.options.scaleMode.originalHeight,
                   this.options.scaleMode.originalWidth];
  },
  update: function(position) {
    var currentScale = (this.options.scaleFrom/100.0) + (this.factor * position);
    if(this.options.scaleContent && this.fontSize)
      this.element.setStyle({fontSize: this.fontSize * currentScale + this.fontSizeType });
    this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale);
  },
  finish: function(position) {
    if(this.restoreAfterFinish) this.element.setStyle(this.originalStyle);
  },
  setDimensions: function(height, width) {
    var d = {};
    if(this.options.scaleX) d.width = Math.round(width) + 'px';
    if(this.options.scaleY) d.height = Math.round(height) + 'px';
    if(this.options.scaleFromCenter) {
      var topd  = (height - this.dims[0])/2;
      var leftd = (width  - this.dims[1])/2;
      if(this.elementPositioning == 'absolute') {
        if(this.options.scaleY) d.top = this.originalTop-topd + 'px';
        if(this.options.scaleX) d.left = this.originalLeft-leftd + 'px';
      } else {
        if(this.options.scaleY) d.top = -topd + 'px';
        if(this.options.scaleX) d.left = -leftd + 'px';
      }
    }
    this.element.setStyle(d);
  }
});

Effect.Highlight = Class.create();
Object.extend(Object.extend(Effect.Highlight.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({ startcolor: '#ffff99' }, arguments[1] || {});
    this.start(options);
  },
  setup: function() {
    // Prevent executing on elements not in the layout flow
    if(this.element.getStyle('display')=='none') { this.cancel(); return; }
    // Disable background image during the effect
    this.oldStyle = {};
    if (!this.options.keepBackgroundImage) {
      this.oldStyle.backgroundImage = this.element.getStyle('background-image');
      this.element.setStyle({backgroundImage: 'none'});
    }
    if(!this.options.endcolor)
      this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
    if(!this.options.restorecolor)
      this.options.restorecolor = this.element.getStyle('background-color');
    // init color calculations
    this._base  = $R(0,2).map(function(i){ return parseInt(this.options.startcolor.slice(i*2+1,i*2+3),16) }.bind(this));
    this._delta = $R(0,2).map(function(i){ return parseInt(this.options.endcolor.slice(i*2+1,i*2+3),16)-this._base[i] }.bind(this));
  },
  update: function(position) {
    this.element.setStyle({backgroundColor: $R(0,2).inject('#',function(m,v,i){
      return m+(Math.round(this._base[i]+(this._delta[i]*position)).toColorPart()); }.bind(this)) });
  },
  finish: function() {
    this.element.setStyle(Object.extend(this.oldStyle, {
      backgroundColor: this.options.restorecolor
    }));
  }
});

Effect.ScrollTo = Class.create();
Object.extend(Object.extend(Effect.ScrollTo.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    this.start(arguments[1] || {});
  },
  setup: function() {
    Position.prepare();
    var offsets = Position.cumulativeOffset(this.element);
    if(this.options.offset) offsets[1] += this.options.offset;
    var max = window.innerHeight ? 
      window.height - window.innerHeight :
      document.body.scrollHeight - 
        (document.documentElement.clientHeight ? 
          document.documentElement.clientHeight : document.body.clientHeight);
    this.scrollStart = Position.deltaY;
    this.delta = (offsets[1] > max ? max : offsets[1]) - this.scrollStart;
  },
  update: function(position) {
    Position.prepare();
    window.scrollTo(Position.deltaX, 
      this.scrollStart + (position*this.delta));
  }
});

/* ------------- combination effects ------------- */

Effect.Fade = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  var options = Object.extend({
  from: element.getOpacity() || 1.0,
  to:   0.0,
  afterFinishInternal: function(effect) { 
    if(effect.options.to!=0) return;
    effect.element.hide().setStyle({opacity: oldOpacity}); 
  }}, arguments[1] || {});
  return new Effect.Opacity(element,options);
}

Effect.Appear = function(element) {
  element = $(element);
  var options = Object.extend({
  from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
  to:   1.0,
  // force Safari to render floated elements properly
  afterFinishInternal: function(effect) {
    effect.element.forceRerendering();
  },
  beforeSetup: function(effect) {
    effect.element.setOpacity(effect.options.from).show(); 
  }}, arguments[1] || {});
  return new Effect.Opacity(element,options);
}

Effect.Puff = function(element) {
  element = $(element);
  var oldStyle = { 
    opacity: element.getInlineOpacity(), 
    position: element.getStyle('position'),
    top:  element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  return new Effect.Parallel(
   [ new Effect.Scale(element, 200, 
      { sync: true, scaleFromCenter: true, scaleContent: true, restoreAfterFinish: true }), 
     new Effect.Opacity(element, { sync: true, to: 0.0 } ) ], 
     Object.extend({ duration: 1.0, 
      beforeSetupInternal: function(effect) {
        Position.absolutize(effect.effects[0].element)
      },
      afterFinishInternal: function(effect) {
         effect.effects[0].element.hide().setStyle(oldStyle); }
     }, arguments[1] || {})
   );
}

Effect.BlindUp = function(element) {
  element = $(element);
  element.makeClipping();
  return new Effect.Scale(element, 0,
    Object.extend({ scaleContent: false, 
      scaleX: false, 
      restoreAfterFinish: true,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping();
      } 
    }, arguments[1] || {})
  );
}

Effect.BlindDown = function(element) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({ 
    scaleContent: false, 
    scaleX: false,
    scaleFrom: 0,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({height: '0px'}).show(); 
    },  
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, arguments[1] || {}));
}

Effect.SwitchOff = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  return new Effect.Appear(element, Object.extend({
    duration: 0.4,
    from: 0,
    transition: Effect.Transitions.flicker,
    afterFinishInternal: function(effect) {
      new Effect.Scale(effect.element, 1, { 
        duration: 0.3, scaleFromCenter: true,
        scaleX: false, scaleContent: false, restoreAfterFinish: true,
        beforeSetup: function(effect) { 
          effect.element.makePositioned().makeClipping();
        },
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().undoPositioned().setStyle({opacity: oldOpacity});
        }
      })
    }
  }, arguments[1] || {}));
}

Effect.DropOut = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left'),
    opacity: element.getInlineOpacity() };
  return new Effect.Parallel(
    [ new Effect.Move(element, {x: 0, y: 100, sync: true }), 
      new Effect.Opacity(element, { sync: true, to: 0.0 }) ],
    Object.extend(
      { duration: 0.5,
        beforeSetup: function(effect) {
          effect.effects[0].element.makePositioned(); 
        },
        afterFinishInternal: function(effect) {
          effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle);
        } 
      }, arguments[1] || {}));
}

Effect.Shake = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left') };
    return new Effect.Move(element, 
      { x:  20, y: 0, duration: 0.05, afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  40, y: 0, duration: 0.1,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -20, y: 0, duration: 0.05, afterFinishInternal: function(effect) {
        effect.element.undoPositioned().setStyle(oldStyle);
  }}) }}) }}) }}) }}) }});
}

Effect.SlideDown = function(element) {
  element = $(element).cleanWhitespace();
  // SlideDown need to have the content of the element wrapped in a container element with fixed height!
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({ 
    scaleContent: false, 
    scaleX: false, 
    scaleFrom: window.opera ? 0 : 1,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if(window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().setStyle({height: '0px'}).show(); 
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' }); 
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom}); }
    }, arguments[1] || {})
  );
}

Effect.SlideUp = function(element) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  return new Effect.Scale(element, window.opera ? 0 : 1,
   Object.extend({ scaleContent: false, 
    scaleX: false, 
    scaleMode: 'box',
    scaleFrom: 100,
    restoreAfterFinish: true,
    beforeStartInternal: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if(window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().show();
    },  
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping().undoPositioned().setStyle({bottom: oldInnerBottom});
      effect.element.down().undoPositioned();
    }
   }, arguments[1] || {})
  );
}

// Bug in opera makes the TD containing this element expand for a instance after finish 
Effect.Squish = function(element) {
  return new Effect.Scale(element, window.opera ? 1 : 0, { 
    restoreAfterFinish: true,
    beforeSetup: function(effect) {
      effect.element.makeClipping(); 
    },  
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping(); 
    }
  });
}

Effect.Grow = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.full
  }, arguments[1] || {});
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();    
  var initialMoveX, initialMoveY;
  var moveX, moveY;
  
  switch (options.direction) {
    case 'top-left':
      initialMoveX = initialMoveY = moveX = moveY = 0; 
      break;
    case 'top-right':
      initialMoveX = dims.width;
      initialMoveY = moveY = 0;
      moveX = -dims.width;
      break;
    case 'bottom-left':
      initialMoveX = moveX = 0;
      initialMoveY = dims.height;
      moveY = -dims.height;
      break;
    case 'bottom-right':
      initialMoveX = dims.width;
      initialMoveY = dims.height;
      moveX = -dims.width;
      moveY = -dims.height;
      break;
    case 'center':
      initialMoveX = dims.width / 2;
      initialMoveY = dims.height / 2;
      moveX = -dims.width / 2;
      moveY = -dims.height / 2;
      break;
  }
  
  return new Effect.Move(element, {
    x: initialMoveX,
    y: initialMoveY,
    duration: 0.01, 
    beforeSetup: function(effect) {
      effect.element.hide().makeClipping().makePositioned();
    },
    afterFinishInternal: function(effect) {
      new Effect.Parallel(
        [ new Effect.Opacity(effect.element, { sync: true, to: 1.0, from: 0.0, transition: options.opacityTransition }),
          new Effect.Move(effect.element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition }),
          new Effect.Scale(effect.element, 100, {
            scaleMode: { originalHeight: dims.height, originalWidth: dims.width }, 
            sync: true, scaleFrom: window.opera ? 1 : 0, transition: options.scaleTransition, restoreAfterFinish: true})
        ], Object.extend({
             beforeSetup: function(effect) {
               effect.effects[0].element.setStyle({height: '0px'}).show(); 
             },
             afterFinishInternal: function(effect) {
               effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle); 
             }
           }, options)
      )
    }
  });
}

Effect.Shrink = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.none
  }, arguments[1] || {});
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var moveX, moveY;
  
  switch (options.direction) {
    case 'top-left':
      moveX = moveY = 0;
      break;
    case 'top-right':
      moveX = dims.width;
      moveY = 0;
      break;
    case 'bottom-left':
      moveX = 0;
      moveY = dims.height;
      break;
    case 'bottom-right':
      moveX = dims.width;
      moveY = dims.height;
      break;
    case 'center':  
      moveX = dims.width / 2;
      moveY = dims.height / 2;
      break;
  }
  
  return new Effect.Parallel(
    [ new Effect.Opacity(element, { sync: true, to: 0.0, from: 1.0, transition: options.opacityTransition }),
      new Effect.Scale(element, window.opera ? 1 : 0, { sync: true, transition: options.scaleTransition, restoreAfterFinish: true}),
      new Effect.Move(element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition })
    ], Object.extend({            
         beforeStartInternal: function(effect) {
           effect.effects[0].element.makePositioned().makeClipping(); 
         },
         afterFinishInternal: function(effect) {
           effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle); }
       }, options)
  );
}

Effect.Pulsate = function(element) {
  element = $(element);
  var options    = arguments[1] || {};
  var oldOpacity = element.getInlineOpacity();
  var transition = options.transition || Effect.Transitions.sinoidal;
  var reverser   = function(pos){ return transition(1-Effect.Transitions.pulse(pos, options.pulses)) };
  reverser.bind(transition);
  return new Effect.Opacity(element, 
    Object.extend(Object.extend({  duration: 2.0, from: 0,
      afterFinishInternal: function(effect) { effect.element.setStyle({opacity: oldOpacity}); }
    }, options), {transition: reverser}));
}

Effect.Fold = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height };
  element.makeClipping();
  return new Effect.Scale(element, 5, Object.extend({   
    scaleContent: false,
    scaleX: false,
    afterFinishInternal: function(effect) {
    new Effect.Scale(element, 1, { 
      scaleContent: false, 
      scaleY: false,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping().setStyle(oldStyle);
      } });
  }}, arguments[1] || {}));
};

Effect.Morph = Class.create();
Object.extend(Object.extend(Effect.Morph.prototype, Effect.Base.prototype), {
  initialize: function(element) {
    this.element = $(element);
    if(!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      style: {}
    }, arguments[1] || {});
    if (typeof options.style == 'string') {
      if(options.style.indexOf(':') == -1) {
        var cssText = '', selector = '.' + options.style;
        $A(document.styleSheets).reverse().each(function(styleSheet) {
          if (styleSheet.cssRules) cssRules = styleSheet.cssRules;
          else if (styleSheet.rules) cssRules = styleSheet.rules;
          $A(cssRules).reverse().each(function(rule) {
            if (selector == rule.selectorText) {
              cssText = rule.style.cssText;
              throw $break;
            }
          });
          if (cssText) throw $break;
        });
        this.style = cssText.parseStyle();
        options.afterFinishInternal = function(effect){
          effect.element.addClassName(effect.options.style);
          effect.transforms.each(function(transform) {
            if(transform.style != 'opacity')
              effect.element.style[transform.style.camelize()] = '';
          });
        }
      } else this.style = options.style.parseStyle();
    } else this.style = $H(options.style)
    this.start(options);
  },
  setup: function(){
    function parseColor(color){
      if(!color || ['rgba(0, 0, 0, 0)','transparent'].include(color)) color = '#ffffff';
      color = color.parseColor();
      return $R(0,2).map(function(i){
        return parseInt( color.slice(i*2+1,i*2+3), 16 ) 
      });
    }
    this.transforms = this.style.map(function(pair){
      var property = pair[0].underscore().dasherize(), value = pair[1], unit = null;

      if(value.parseColor('#zzzzzz') != '#zzzzzz') {
        value = value.parseColor();
        unit  = 'color';
      } else if(property == 'opacity') {
        value = parseFloat(value);
        if(/MSIE/.test(navigator.userAgent) && !window.opera && (!this.element.currentStyle.hasLayout))
          this.element.setStyle({zoom: 1});
      } else if(Element.CSS_LENGTH.test(value)) 
        var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/),
          value = parseFloat(components[1]), unit = (components.length == 3) ? components[2] : null;

      var originalValue = this.element.getStyle(property);
      return $H({ 
        style: property, 
        originalValue: unit=='color' ? parseColor(originalValue) : parseFloat(originalValue || 0), 
        targetValue: unit=='color' ? parseColor(value) : value,
        unit: unit
      });
    }.bind(this)).reject(function(transform){
      return (
        (transform.originalValue == transform.targetValue) ||
        (
          transform.unit != 'color' &&
          (isNaN(transform.originalValue) || isNaN(transform.targetValue))
        )
      )
    });
  },
  update: function(position) {
    var style = $H(), value = null;
    this.transforms.each(function(transform){
      value = transform.unit=='color' ?
        $R(0,2).inject('#',function(m,v,i){
          return m+(Math.round(transform.originalValue[i]+
            (transform.targetValue[i] - transform.originalValue[i])*position)).toColorPart() }) : 
        transform.originalValue + Math.round(
          ((transform.targetValue - transform.originalValue) * position) * 1000)/1000 + transform.unit;
      style[transform.style] = value;
    });
    this.element.setStyle(style);
  }
});

Effect.Transform = Class.create();
Object.extend(Effect.Transform.prototype, {
  initialize: function(tracks){
    this.tracks  = [];
    this.options = arguments[1] || {};
    this.addTracks(tracks);
  },
  addTracks: function(tracks){
    tracks.each(function(track){
      var data = $H(track).values().first();
      this.tracks.push($H({
        ids:     $H(track).keys().first(),
        effect:  Effect.Morph,
        options: { style: data }
      }));
    }.bind(this));
    return this;
  },
  play: function(){
    return new Effect.Parallel(
      this.tracks.map(function(track){
        var elements = [$(track.ids) || $$(track.ids)].flatten();
        return elements.map(function(e){ return new track.effect(e, Object.extend({ sync:true }, track.options)) });
      }).flatten(),
      this.options
    );
  }
});

Element.CSS_PROPERTIES = $w(
  'backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' + 
  'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' +
  'borderRightColor borderRightStyle borderRightWidth borderSpacing ' +
  'borderTopColor borderTopStyle borderTopWidth bottom clip color ' +
  'fontSize fontWeight height left letterSpacing lineHeight ' +
  'marginBottom marginLeft marginRight marginTop markerOffset maxHeight '+
  'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' +
  'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' +
  'right textIndent top width wordSpacing zIndex');
  
Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;

String.prototype.parseStyle = function(){
  var element = Element.extend(document.createElement('div'));
  element.innerHTML = '<div style="' + this + '"></div>';
  var style = element.down().style, styleRules = $H();
  
  Element.CSS_PROPERTIES.each(function(property){
    if(style[property]) styleRules[property] = style[property]; 
  });
  if(/MSIE/.test(navigator.userAgent) && !window.opera && this.indexOf('opacity') > -1) {
    styleRules.opacity = this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1];
  }
  return styleRules;
};

Element.morph = function(element, style) {
  new Effect.Morph(element, Object.extend({ style: style }, arguments[2] || {}));
  return element;
};

['setOpacity','getOpacity','getInlineOpacity','forceRerendering','setContentZoom',
 'collectTextNodes','collectTextNodesIgnoreClass','morph'].each( 
  function(f) { Element.Methods[f] = Element[f]; }
);

Element.Methods.visualEffect = function(element, effect, options) {
  s = effect.gsub(/_/, '-').camelize();
  effect_class = s.charAt(0).toUpperCase() + s.substring(1);
  new Effect[effect_class](element, options);
  return $(element);
};

Element.addMethods();

// end effects.js

//***********************************************************************************************************************************/
//	LyteBox v3.22
//
//	 Author: Markus F. Hay
//  Website: http://www.dolem.com/lytebox
//	   Date: October 2, 2007
//	License: Creative Commons Attribution 3.0 License (http://creativecommons.org/licenses/by/3.0/)
// Browsers: Tested successfully on WinXP with the following browsers (using no DOCTYPE and Strict/Transitional/Loose DOCTYPES):
//				* Firefox: 2.0.0.7, 1.5.0.12
//				* Internet Explorer: 7.0, 6.0 SP2, 5.5 SP2
//				* Opera: 9.23
//
// Releases: For up-to-date and complete release information, visit http://www.dolem.com/forum/showthread.php?tid=62
//				* v3.22 (10/02/07)
//				* v3.21 (09/30/07)
//				* v3.20 (07/12/07)
//				* v3.10 (05/28/07)
//				* v3.00 (05/15/07)
//				* v2.02 (11/13/06)
//
//   Credit: LyteBox was originally derived from the Lightbox class (v2.02) that was written by Lokesh Dhakar. For more
//			 information please visit http://huddletogether.com/projects/lightbox2/
//***********************************************************************************************************************************/
Array.prototype.removeDuplicates = function () { for (var i = 1; i < this.length; i++) { if (this[i][0] == this[i-1][0]) { this.splice(i,1); } } }
Array.prototype.empty = function () { for (var i = 0; i <= this.length; i++) { this.shift(); } }
String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); }

function LyteBox() {
	/*** Start Global Configuration ***/
		this.theme				  = 'blue';	// themes: grey (default), red, green, blue, gold
		this.hideFlash			= true;		// controls whether or not Flash objects should be hidden
		this.outerBorder		= true;		// controls whether to show the outer grey (or theme) border
		this.resizeSpeed		= 8;		// controls the speed of the image resizing (1=slowest and 10=fastest)
		this.maxOpacity			= 80;		// higher opacity = darker overlay, lower opacity = lighter overlay
		this.navType			  = 1;		// 1 = "Prev/Next" buttons on top left and left (default), 2 = "<< prev | next >>" links next to image number
		this.autoResize			= true;		// controls whether or not images should be resized if larger than the browser window dimensions
		this.doAnimations		= true;		// controls whether or not "animate" Lytebox, i.e. resize transition between images, fade in/out effects, etc.
		
		this.borderSize			= 2;		// if you adjust the padding in the CSS, you will need to update this variable -- otherwise, leave this alone...
	/*** End Global Configuration ***/
	
	/*** Configure Slideshow Options ***/
		this.slideInterval		= 4000;		// Change value (milliseconds) to increase/decrease the time between "slides" (10000 = 10 seconds)
		this.showNavigation		= true;		// true to display Next/Prev buttons/text during slideshow, false to hide
		this.showClose			= true;		// true to display the Close button, false to hide
		this.showDetails		= true;		// true to display image details (caption, count), false to hide
		this.showPlayPause		= true;		// true to display pause/play buttons next to close button, false to hide
		this.autoEnd			= true;		// true to automatically close Lytebox after the last image is reached, false to keep open
		this.pauseOnNextClick	= false;	// true to pause the slideshow when the "Next" button is clicked
    this.pauseOnPrevClick 	= true;		// true to pause the slideshow when the "Prev" button is clicked
	/*** End Slideshow Configuration ***/
	
	if(this.resizeSpeed > 10) { this.resizeSpeed = 10; }
	if(this.resizeSpeed < 1) { resizeSpeed = 1; }
	this.resizeDuration = (11 - this.resizeSpeed) * 0.15;
	this.resizeWTimerArray		= new Array();
	this.resizeWTimerCount		= 0;
	this.resizeHTimerArray		= new Array();
	this.resizeHTimerCount		= 0;
	this.showContentTimerArray	= new Array();
	this.showContentTimerCount	= 0;
	this.overlayTimerArray		= new Array();
	this.overlayTimerCount		= 0;
	this.imageTimerArray		= new Array();
	this.imageTimerCount		= 0;
	this.timerIDArray			= new Array();
	this.timerIDCount			= 0;
	this.slideshowIDArray		= new Array();
	this.slideshowIDCount		= 0;
	this.imageArray	 = new Array();
	this.activeImage = null;
	this.slideArray	 = new Array();
	this.activeSlide = null;
	this.frameArray	 = new Array();
	this.activeFrame = null;
	this.checkFrame();
	this.isSlideshow = false;
	this.isLyteframe = false;
	/*@cc_on
		/*@if (@_jscript)
			this.ie = (document.all && !window.opera) ? true : false;
		/*@else @*/
			this.ie = false;
		/*@end
	@*/
	this.ie7 = (this.ie && window.XMLHttpRequest);	
	this.initialize();
}
LyteBox.prototype.initialize = function() {
	this.updateLyteboxItems();
	var objBody = this.doc.getElementsByTagName("body").item(0);	
	if (this.doc.getElementById('lbOverlay')) {
		objBody.removeChild(this.doc.getElementById("lbOverlay"));
		objBody.removeChild(this.doc.getElementById("lbMain"));
	}
	var objOverlay = this.doc.createElement("div");
		objOverlay.setAttribute('id','lbOverlay');
		objOverlay.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		if ((this.ie && !this.ie7) || (this.ie7 && this.doc.compatMode == 'BackCompat')) {
			objOverlay.style.position = 'absolute';
		}
		objOverlay.style.display = 'none';
		objBody.appendChild(objOverlay);
	var objLytebox = this.doc.createElement("div");
		objLytebox.setAttribute('id','lbMain');
		objLytebox.style.display = 'none';
		objBody.appendChild(objLytebox);
	var objOuterContainer = this.doc.createElement("div");
		objOuterContainer.setAttribute('id','lbOuterContainer');
		objOuterContainer.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objLytebox.appendChild(objOuterContainer);
	var objIframeContainer = this.doc.createElement("div");
		objIframeContainer.setAttribute('id','lbIframeContainer');
		objIframeContainer.style.display = 'none';
		objOuterContainer.appendChild(objIframeContainer);
	var objIframe = this.doc.createElement("iframe");
		objIframe.setAttribute('id','lbIframe');
		objIframe.setAttribute('name','lbIframe');
		objIframe.style.display = 'none';
		objIframeContainer.appendChild(objIframe);
	var objImageContainer = this.doc.createElement("div");
		objImageContainer.setAttribute('id','lbImageContainer');
		objOuterContainer.appendChild(objImageContainer);
	var objLyteboxImage = this.doc.createElement("img");
		objLyteboxImage.setAttribute('id','lbImage');
		objImageContainer.appendChild(objLyteboxImage);
	var objLoading = this.doc.createElement("div");
		objLoading.setAttribute('id','lbLoading');
		objOuterContainer.appendChild(objLoading);
	var objDetailsContainer = this.doc.createElement("div");
		objDetailsContainer.setAttribute('id','lbDetailsContainer');
		objDetailsContainer.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objLytebox.appendChild(objDetailsContainer);
	var objDetailsData =this.doc.createElement("div");
		objDetailsData.setAttribute('id','lbDetailsData');
		objDetailsData.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objDetailsContainer.appendChild(objDetailsData);
	var objDetails = this.doc.createElement("div");
		objDetails.setAttribute('id','lbDetails');
		objDetailsData.appendChild(objDetails);
	var objCaption = this.doc.createElement("span");
		objCaption.setAttribute('id','lbCaption');
		objDetails.appendChild(objCaption);
	var objHoverNav = this.doc.createElement("div");
		objHoverNav.setAttribute('id','lbHoverNav');
		objImageContainer.appendChild(objHoverNav);
	var objBottomNav = this.doc.createElement("div");
		objBottomNav.setAttribute('id','lbBottomNav');
		objDetailsData.appendChild(objBottomNav);
	var objPrev = this.doc.createElement("a");
		objPrev.setAttribute('id','lbPrev');
		objPrev.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objPrev.setAttribute('href','#');
		objHoverNav.appendChild(objPrev);
	var objNext = this.doc.createElement("a");
		objNext.setAttribute('id','lbNext');
		objNext.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objNext.setAttribute('href','#');
		objHoverNav.appendChild(objNext);
	var objNumberDisplay = this.doc.createElement("span");
		objNumberDisplay.setAttribute('id','lbNumberDisplay');
		objDetails.appendChild(objNumberDisplay);
	var objNavDisplay = this.doc.createElement("span");
		objNavDisplay.setAttribute('id','lbNavDisplay');
		objNavDisplay.style.display = 'none';
		objDetails.appendChild(objNavDisplay);
	var objClose = this.doc.createElement("a");
		objClose.setAttribute('id','lbClose');
		objClose.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objClose.setAttribute('href','#');
		objBottomNav.appendChild(objClose);
	var objPause = this.doc.createElement("a");
		objPause.setAttribute('id','lbPause');
		objPause.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objPause.setAttribute('href','#');
		objPause.style.display = 'none';
		objBottomNav.appendChild(objPause);
	var objPlay = this.doc.createElement("a");
		objPlay.setAttribute('id','lbPlay');
		objPlay.setAttribute((this.ie ? 'className' : 'class'), this.theme);
		objPlay.setAttribute('href','#');
		objPlay.style.display = 'none';
		objBottomNav.appendChild(objPlay);
};
LyteBox.prototype.updateLyteboxItems = function() {	
	var anchors = (this.isFrame) ? window.parent.frames[window.name].document.getElementsByTagName('a') : document.getElementsByTagName('a');
	for (var i = 0; i < anchors.length; i++) {
		var anchor = anchors[i];
		var relAttribute = String(anchor.getAttribute('rel'));
		if (anchor.getAttribute('href')) {
			if (relAttribute.toLowerCase().match('lytebox')) {
				anchor.onclick = function () { myLytebox.start(this, false, false); return false; }
			} else if (relAttribute.toLowerCase().match('lyteshow')) {
				anchor.onclick = function () { myLytebox.start(this, true, false); return false; }
			} else if (relAttribute.toLowerCase().match('lyteframe')) {
				anchor.onclick = function () { myLytebox.start(this, false, true); return false; }
			}
		}
	}
};
LyteBox.prototype.start = function(imageLink, doSlide, doFrame) {
	if (this.ie && !this.ie7) {	this.toggleSelects('hide');	}
	if (this.hideFlash) { this.toggleFlash('hide'); }
	this.isLyteframe = (doFrame ? true : false);
	var pageSize	= this.getPageSize();
	var objOverlay	= this.doc.getElementById('lbOverlay');
	var objBody		= this.doc.getElementsByTagName("body").item(0);
	objOverlay.style.height = pageSize[1] + "px";
	objOverlay.style.display = '';
	this.appear('lbOverlay', (this.doAnimations ? 0 : this.maxOpacity));
	var anchors = (this.isFrame) ? window.parent.frames[window.name].document.getElementsByTagName('a') : document.getElementsByTagName('a');
	if (this.isLyteframe) {
		this.frameArray = [];
		this.frameNum = 0;
		if ((imageLink.getAttribute('rel') == 'lyteframe')) {
			var rev = imageLink.getAttribute('rev');
			this.frameArray.push(new Array(imageLink.getAttribute('href'), imageLink.getAttribute('title'), (rev == null || rev == '' ? 'width: 400px; height: 400px; scrolling: auto;' : rev)));
		} else {
			if (imageLink.getAttribute('rel').indexOf('lyteframe') != -1) {
				for (var i = 0; i < anchors.length; i++) {
					var anchor = anchors[i];
					if (anchor.getAttribute('href') && (anchor.getAttribute('rel') == imageLink.getAttribute('rel'))) {
						var rev = anchor.getAttribute('rev');
						this.frameArray.push(new Array(anchor.getAttribute('href'), anchor.getAttribute('title'), (rev == null || rev == '' ? 'width: 400px; height: 400px; scrolling: auto;' : rev)));
					}
				}
				this.frameArray.removeDuplicates();
				while(this.frameArray[this.frameNum][0] != imageLink.getAttribute('href')) { this.frameNum++; }
			}
		}
	} else {
		this.imageArray = [];
		this.imageNum = 0;
		this.slideArray = [];
		this.slideNum = 0;
		if ((imageLink.getAttribute('rel') == 'lytebox')) {
			this.imageArray.push(new Array(imageLink.getAttribute('href'), imageLink.getAttribute('title')));
		} else {
			if (imageLink.getAttribute('rel').indexOf('lytebox') != -1) {
				for (var i = 0; i < anchors.length; i++) {
					var anchor = anchors[i];
					if (anchor.getAttribute('href') && (anchor.getAttribute('rel') == imageLink.getAttribute('rel'))) {
						this.imageArray.push(new Array(anchor.getAttribute('href'), anchor.getAttribute('title')));
					}
				}
				this.imageArray.removeDuplicates();
				while(this.imageArray[this.imageNum][0] != imageLink.getAttribute('href')) { this.imageNum++; }
			}
			if (imageLink.getAttribute('rel').indexOf('lyteshow') != -1) {
				for (var i = 0; i < anchors.length; i++) {
					var anchor = anchors[i];
					if (anchor.getAttribute('href') && (anchor.getAttribute('rel') == imageLink.getAttribute('rel'))) {
						this.slideArray.push(new Array(anchor.getAttribute('href'), anchor.getAttribute('title')));
					}
				}
				this.slideArray.removeDuplicates();
				while(this.slideArray[this.slideNum][0] != imageLink.getAttribute('href')) { this.slideNum++; }
			}
		}
	}
	var object = this.doc.getElementById('lbMain');
		object.style.top = (this.getPageScroll() + (pageSize[3] / 15)) + "px";
		object.style.display = '';
	if (!this.outerBorder) {
		this.doc.getElementById('lbOuterContainer').style.border = 'none';
		this.doc.getElementById('lbDetailsContainer').style.border = 'none';
	} else {
		this.doc.getElementById('lbOuterContainer').style.borderBottom = '';
		this.doc.getElementById('lbOuterContainer').setAttribute((this.ie ? 'className' : 'class'), this.theme);
	}
	this.doc.getElementById('lbOverlay').onclick = function() { myLytebox.end(); return false; }
	this.doc.getElementById('lbMain').onclick = function(e) {
		var e = e;
		if (!e) {
			if (window.parent.frames[window.name] && (parent.document.getElementsByTagName('frameset').length <= 0)) {
				e = window.parent.window.event;
			} else {
				e = window.event;
			}
		}
		var id = (e.target ? e.target.id : e.srcElement.id);
		if (id == 'lbMain') { myLytebox.end(); return false; }
	}
	this.doc.getElementById('lbClose').onclick = function() { myLytebox.end(); return false; }
	this.doc.getElementById('lbPause').onclick = function() { myLytebox.togglePlayPause("lbPause", "lbPlay"); return false; }
	this.doc.getElementById('lbPlay').onclick = function() { myLytebox.togglePlayPause("lbPlay", "lbPause"); return false; }	
	this.isSlideshow = doSlide;
	this.isPaused = (this.slideNum != 0 ? true : false);
	if (this.isSlideshow && this.showPlayPause && this.isPaused) {
		this.doc.getElementById('lbPlay').style.display = '';
		this.doc.getElementById('lbPause').style.display = 'none';
	}
	if (this.isLyteframe) {
		this.changeContent(this.frameNum);
	} else {
		if (this.isSlideshow) {
			this.changeContent(this.slideNum);
		} else {
			this.changeContent(this.imageNum);
		}
	}
};
LyteBox.prototype.changeContent = function(imageNum) {
	if (this.isSlideshow) {
		for (var i = 0; i < this.slideshowIDCount; i++) { window.clearTimeout(this.slideshowIDArray[i]); }
	}
	this.activeImage = this.activeSlide = this.activeFrame = imageNum;
	if (!this.outerBorder) {
		this.doc.getElementById('lbOuterContainer').style.border = 'none';
		this.doc.getElementById('lbDetailsContainer').style.border = 'none';
	} else {
		this.doc.getElementById('lbOuterContainer').style.borderBottom = '';
		this.doc.getElementById('lbOuterContainer').setAttribute((this.ie ? 'className' : 'class'), this.theme);
	}
	this.doc.getElementById('lbLoading').style.display = '';
	this.doc.getElementById('lbImage').style.display = 'none';
	this.doc.getElementById('lbIframe').style.display = 'none';
	this.doc.getElementById('lbPrev').style.display = 'none';
	this.doc.getElementById('lbNext').style.display = 'none';
	this.doc.getElementById('lbIframeContainer').style.display = 'none';
	this.doc.getElementById('lbDetailsContainer').style.display = 'none';
	this.doc.getElementById('lbNumberDisplay').style.display = 'none';
	if (this.navType == 2 || this.isLyteframe) {
		object = this.doc.getElementById('lbNavDisplay');
		object.innerHTML = '&nbsp;&nbsp;&nbsp;<span id="lbPrev2_Off" style="display: none;" class="' + this.theme + '">&laquo; prev</span><a href="#" id="lbPrev2" class="' + this.theme + '" style="display: none;">&laquo; prev</a> <b id="lbSpacer" class="' + this.theme + '">||</b> <span id="lbNext2_Off" style="display: none;" class="' + this.theme + '">next &raquo;</span><a href="#" id="lbNext2" class="' + this.theme + '" style="display: none;">next &raquo;</a>';
		object.style.display = 'none';
	}
	if (this.isLyteframe) {
		var iframe = myLytebox.doc.getElementById('lbIframe');
		var styles = this.frameArray[this.activeFrame][2];
		var aStyles = styles.split(';');
		for (var i = 0; i < aStyles.length; i++) {
			if (aStyles[i].indexOf('width:') >= 0) {
			  var w = aStyles[i].replace('width:', '');
        if (w.trim().indexOf('%') >= 0) {
          iframe.width = parseInt(screen.width * (parseInt(w) / 100));
        } else {
				  iframe.width = w.trim();
        }
      } else if (aStyles[i].indexOf('height:') >= 0) {
        var h = aStyles[i].replace('height:', '');
        if (h.trim().indexOf('%') >= 0) {
          iframe.height = parseInt(screen.height * (parseInt(h) / 100));
        } else {
				  iframe.height = h.trim();
        }
			} else if (aStyles[i].indexOf('scrolling:') >= 0) {
				var s = aStyles[i].replace('scrolling:', '');
				iframe.scrolling = s.trim();
			} else if (aStyles[i].indexOf('border:') >= 0) {
				// Not implemented yet, as there are cross-platform issues with setting the border (from a GUI standpoint)
				//var b = aStyles[i].replace('border:', '');
				//iframe.style.border = b.trim();
			}
		}
		this.resizeContainer(parseInt(iframe.width), parseInt(iframe.height));
	} else {
		imgPreloader = new Image();
		imgPreloader.onload = function() {
			var imageWidth = imgPreloader.width;
			var imageHeight = imgPreloader.height;
			if (myLytebox.autoResize) {
				var pagesize = myLytebox.getPageSize();
				var x = pagesize[2] - 150;
				var y = pagesize[3] - 150;
				if (imageWidth > x) {
					imageHeight = Math.round(imageHeight * (x / imageWidth));
					imageWidth = x; 
					if (imageHeight > y) { 
						imageWidth = Math.round(imageWidth * (y / imageHeight));
						imageHeight = y; 
					}
				} else if (imageHeight > y) { 
					imageWidth = Math.round(imageWidth * (y / imageHeight));
					imageHeight = y; 
					if (imageWidth > x) {
						imageHeight = Math.round(imageHeight * (x / imageWidth));
						imageWidth = x;
					}
				}
			}
			var lbImage = myLytebox.doc.getElementById('lbImage')
			lbImage.src = (myLytebox.isSlideshow ? myLytebox.slideArray[myLytebox.activeSlide][0] : myLytebox.imageArray[myLytebox.activeImage][0]);
			lbImage.width = imageWidth;
			lbImage.height = imageHeight;
			myLytebox.resizeContainer(imageWidth, imageHeight);
			imgPreloader.onload = function() {};
		}
		imgPreloader.src = (this.isSlideshow ? this.slideArray[this.activeSlide][0] : this.imageArray[this.activeImage][0]);
	}
};
LyteBox.prototype.resizeContainer = function(imgWidth, imgHeight) {
	this.wCur = this.doc.getElementById('lbOuterContainer').offsetWidth;
	this.hCur = this.doc.getElementById('lbOuterContainer').offsetHeight;
	this.xScale = ((imgWidth  + (this.borderSize * 2)) / this.wCur) * 100;
	this.yScale = ((imgHeight  + (this.borderSize * 2)) / this.hCur) * 100;
	var wDiff = (this.wCur - this.borderSize * 2) - imgWidth;
	var hDiff = (this.hCur - this.borderSize * 2) - imgHeight;
	if (!(hDiff == 0)) {
		this.hDone = false;
		this.resizeH('lbOuterContainer', this.hCur, imgHeight + this.borderSize*2, this.getPixelRate(this.hCur, imgHeight));
	} else {
		this.hDone = true;
	}
	if (!(wDiff == 0)) {
		this.wDone = false;
		this.resizeW('lbOuterContainer', this.wCur, imgWidth + this.borderSize*2, this.getPixelRate(this.wCur, imgWidth));
	} else {
		this.wDone = true;
	}
	if ((hDiff == 0) && (wDiff == 0)) {
		if (this.ie){ this.pause(250); } else { this.pause(100); } 
	}
	this.doc.getElementById('lbPrev').style.height = imgHeight + "px";
	this.doc.getElementById('lbNext').style.height = imgHeight + "px";
	this.doc.getElementById('lbDetailsContainer').style.width = (imgWidth + (this.borderSize * 2) + (this.ie && this.doc.compatMode == "BackCompat" && this.outerBorder ? 2 : 0)) + "px";
	this.showContent();
};
LyteBox.prototype.showContent = function() {
	if (this.wDone && this.hDone) {
		for (var i = 0; i < this.showContentTimerCount; i++) { window.clearTimeout(this.showContentTimerArray[i]); }
		if (this.outerBorder) {
			this.doc.getElementById('lbOuterContainer').style.borderBottom = 'none';
		}
		this.doc.getElementById('lbLoading').style.display = 'none';
		if (this.isLyteframe) {
			this.doc.getElementById('lbIframe').style.display = '';
			this.appear('lbIframe', (this.doAnimations ? 0 : 100));
		} else {
			this.doc.getElementById('lbImage').style.display = '';
			this.appear('lbImage', (this.doAnimations ? 0 : 100));
			this.preloadNeighborImages();
		}
		if (this.isSlideshow) {
			if(this.activeSlide == (this.slideArray.length - 1)) {
				if (this.autoEnd) {
					this.slideshowIDArray[this.slideshowIDCount++] = setTimeout("myLytebox.end('slideshow')", this.slideInterval);
				}
			} else {
				if (!this.isPaused) {
					this.slideshowIDArray[this.slideshowIDCount++] = setTimeout("myLytebox.changeContent("+(this.activeSlide+1)+")", this.slideInterval);
				}
			}
			this.doc.getElementById('lbHoverNav').style.display = (this.showNavigation && this.navType == 1 ? '' : 'none');
			this.doc.getElementById('lbClose').style.display = (this.showClose ? '' : 'none');
			this.doc.getElementById('lbDetails').style.display = (this.showDetails ? '' : 'none');
			this.doc.getElementById('lbPause').style.display = (this.showPlayPause && !this.isPaused ? '' : 'none');
			this.doc.getElementById('lbPlay').style.display = (this.showPlayPause && !this.isPaused ? 'none' : '');
			this.doc.getElementById('lbNavDisplay').style.display = (this.showNavigation && this.navType == 2 ? '' : 'none');
		} else {
			this.doc.getElementById('lbHoverNav').style.display = (this.navType == 1 && !this.isLyteframe ? '' : 'none');
			if ((this.navType == 2 && !this.isLyteframe && this.imageArray.length > 1) || (this.frameArray.length > 1 && this.isLyteframe)) {
				this.doc.getElementById('lbNavDisplay').style.display = '';
			} else {
				this.doc.getElementById('lbNavDisplay').style.display = 'none';
			}
			this.doc.getElementById('lbClose').style.display = '';
			this.doc.getElementById('lbDetails').style.display = '';
			this.doc.getElementById('lbPause').style.display = 'none';
			this.doc.getElementById('lbPlay').style.display = 'none';
		}
		this.doc.getElementById('lbImageContainer').style.display = (this.isLyteframe ? 'none' : '');
		this.doc.getElementById('lbIframeContainer').style.display = (this.isLyteframe ? '' : 'none');
		try {
			this.doc.getElementById('lbIframe').src = this.frameArray[this.activeFrame][0];
		} catch(e) { }
	} else {
		this.showContentTimerArray[this.showContentTimerCount++] = setTimeout("myLytebox.showContent()", 200);
	}
};
LyteBox.prototype.updateDetails = function() {
	var object = this.doc.getElementById('lbCaption');
	var sTitle = (this.isSlideshow ? this.slideArray[this.activeSlide][1] : (this.isLyteframe ? this.frameArray[this.activeFrame][1] : this.imageArray[this.activeImage][1]));
	object.style.display = '';
	object.innerHTML = (sTitle == null ? '' : sTitle);
	this.updateNav();
	this.doc.getElementById('lbDetailsContainer').style.display = '';
	object = this.doc.getElementById('lbNumberDisplay');
	if (this.isSlideshow && this.slideArray.length > 1) {
		object.style.display = '';
		object.innerHTML = "Image " + eval(this.activeSlide + 1) + " of " + this.slideArray.length;
		this.doc.getElementById('lbNavDisplay').style.display = (this.navType == 2 && this.showNavigation ? '' : 'none');
	} else if (this.imageArray.length > 1 && !this.isLyteframe) {
		object.style.display = '';
		object.innerHTML = "Image " + eval(this.activeImage + 1) + " of " + this.imageArray.length;
		this.doc.getElementById('lbNavDisplay').style.display = (this.navType == 2 ? '' : 'none');
	} else if (this.frameArray.length > 1 && this.isLyteframe) {
		object.style.display = '';
		object.innerHTML = "Page " + eval(this.activeFrame + 1) + " of " + this.frameArray.length;
		this.doc.getElementById('lbNavDisplay').style.display = '';
	} else {
		this.doc.getElementById('lbNavDisplay').style.display = 'none';
	}
	this.appear('lbDetailsContainer', (this.doAnimations ? 0 : 100));
};
LyteBox.prototype.updateNav = function() {
	if (this.isSlideshow) {
		if (this.activeSlide != 0) {
			var object = (this.navType == 2 ? this.doc.getElementById('lbPrev2') : this.doc.getElementById('lbPrev'));
				object.style.display = '';
				object.onclick = function() {
					if (myLytebox.pauseOnPrevClick) { myLytebox.togglePlayPause("lbPause", "lbPlay"); }
					myLytebox.changeContent(myLytebox.activeSlide - 1); return false;
				}
		} else {
			if (this.navType == 2) { this.doc.getElementById('lbPrev2_Off').style.display = ''; }
		}
		if (this.activeSlide != (this.slideArray.length - 1)) {
			var object = (this.navType == 2 ? this.doc.getElementById('lbNext2') : this.doc.getElementById('lbNext'));
				object.style.display = '';
				object.onclick = function() {
					if (myLytebox.pauseOnNextClick) { myLytebox.togglePlayPause("lbPause", "lbPlay"); }
					myLytebox.changeContent(myLytebox.activeSlide + 1); return false;
				}
		} else {
			if (this.navType == 2) { this.doc.getElementById('lbNext2_Off').style.display = ''; }
		}
	} else if (this.isLyteframe) {
		if(this.activeFrame != 0) {
			var object = this.doc.getElementById('lbPrev2');
				object.style.display = '';
				object.onclick = function() {
					myLytebox.changeContent(myLytebox.activeFrame - 1); return false;
				}
		} else {
			this.doc.getElementById('lbPrev2_Off').style.display = '';
		}
		if(this.activeFrame != (this.frameArray.length - 1)) {
			var object = this.doc.getElementById('lbNext2');
				object.style.display = '';
				object.onclick = function() {
					myLytebox.changeContent(myLytebox.activeFrame + 1); return false;
				}
		} else {
			this.doc.getElementById('lbNext2_Off').style.display = '';
		}		
	} else {
		if(this.activeImage != 0) {
			var object = (this.navType == 2 ? this.doc.getElementById('lbPrev2') : this.doc.getElementById('lbPrev'));
				object.style.display = '';
				object.onclick = function() {
					myLytebox.changeContent(myLytebox.activeImage - 1); return false;
				}
		} else {
			if (this.navType == 2) { this.doc.getElementById('lbPrev2_Off').style.display = ''; }
		}
		if(this.activeImage != (this.imageArray.length - 1)) {
			var object = (this.navType == 2 ? this.doc.getElementById('lbNext2') : this.doc.getElementById('lbNext'));
				object.style.display = '';
				object.onclick = function() {
					myLytebox.changeContent(myLytebox.activeImage + 1); return false;
				}
		} else {
			if (this.navType == 2) { this.doc.getElementById('lbNext2_Off').style.display = ''; }
		}
	}
	this.enableKeyboardNav();
};
LyteBox.prototype.enableKeyboardNav = function() { document.onkeydown = this.keyboardAction; };
LyteBox.prototype.disableKeyboardNav = function() { document.onkeydown = ''; };
LyteBox.prototype.keyboardAction = function(e) {
	var keycode = key = escape = null;
	keycode	= (e == null) ? event.keyCode : e.which;
	key		= String.fromCharCode(keycode).toLowerCase();
	escape  = (e == null) ? 27 : e.DOM_VK_ESCAPE;
	if ((key == 'x') || (key == 'c') || (keycode == escape)) {
		myLytebox.end();
	} else if ((key == 'p') || (keycode == 37)) {
		if (myLytebox.isSlideshow) {
			if(myLytebox.activeSlide != 0) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeSlide - 1);
			}
		} else if (myLytebox.isLyteframe) {
			if(myLytebox.activeFrame != 0) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeFrame - 1);
			}
		} else {
			if(myLytebox.activeImage != 0) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeImage - 1);
			}
		}
	} else if ((key == 'n') || (keycode == 39)) {
		if (myLytebox.isSlideshow) {
			if(myLytebox.activeSlide != (myLytebox.slideArray.length - 1)) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeSlide + 1);
			}
		} else if (myLytebox.isLyteframe) {
			if(myLytebox.activeFrame != (myLytebox.frameArray.length - 1)) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeFrame + 1);
			}
		} else {
			if(myLytebox.activeImage != (myLytebox.imageArray.length - 1)) {
				myLytebox.disableKeyboardNav();
				myLytebox.changeContent(myLytebox.activeImage + 1);
			}
		}
	}
};
LyteBox.prototype.preloadNeighborImages = function() {
	if (this.isSlideshow) {
		if ((this.slideArray.length - 1) > this.activeSlide) {
			preloadNextImage = new Image();
			preloadNextImage.src = this.slideArray[this.activeSlide + 1][0];
		}
		if(this.activeSlide > 0) {
			preloadPrevImage = new Image();
			preloadPrevImage.src = this.slideArray[this.activeSlide - 1][0];
		}
	} else {
		if ((this.imageArray.length - 1) > this.activeImage) {
			preloadNextImage = new Image();
			preloadNextImage.src = this.imageArray[this.activeImage + 1][0];
		}
		if(this.activeImage > 0) {
			preloadPrevImage = new Image();
			preloadPrevImage.src = this.imageArray[this.activeImage - 1][0];
		}
	}
};
LyteBox.prototype.togglePlayPause = function(hideID, showID) {
	if (this.isSlideshow && hideID == "lbPause") {
		for (var i = 0; i < this.slideshowIDCount; i++) { window.clearTimeout(this.slideshowIDArray[i]); }
	}
	this.doc.getElementById(hideID).style.display = 'none';
	this.doc.getElementById(showID).style.display = '';
	if (hideID == "lbPlay") {
		this.isPaused = false;
		if (this.activeSlide == (this.slideArray.length - 1)) {
			this.end();
		} else {
			this.changeContent(this.activeSlide + 1);
		}
	} else {
		this.isPaused = true;
	}
};
LyteBox.prototype.end = function(caller) {
	var closeClick = (caller == 'slideshow' ? false : true);
	if (this.isSlideshow && this.isPaused && !closeClick) { return; }
	this.disableKeyboardNav();
	this.doc.getElementById('lbMain').style.display = 'none';
	this.fade('lbOverlay', (this.doAnimations ? this.maxOpacity : 0));
	this.toggleSelects('visible');
	if (this.hideFlash) { this.toggleFlash('visible'); }
	if (this.isSlideshow) {
		for (var i = 0; i < this.slideshowIDCount; i++) { window.clearTimeout(this.slideshowIDArray[i]); }
	}
	if (this.isLyteframe) {
		 this.initialize();
	}
};
LyteBox.prototype.checkFrame = function() {
	if (window.parent.frames[window.name] && (parent.document.getElementsByTagName('frameset').length <= 0)) {
		this.isFrame = true;
		this.lytebox = "window.parent." + window.name + ".myLytebox";
		this.doc = parent.document;
	} else {
		this.isFrame = false;
		this.lytebox = "myLytebox";
		this.doc = document;
	}
};
LyteBox.prototype.getPixelRate = function(cur, img) {
	var diff = (img > cur) ? img - cur : cur - img;
	if (diff >= 0 && diff <= 100) { return 10; }
	if (diff > 100 && diff <= 200) { return 15; }
	if (diff > 200 && diff <= 300) { return 20; }
	if (diff > 300 && diff <= 400) { return 25; }
	if (diff > 400 && diff <= 500) { return 30; }
	if (diff > 500 && diff <= 600) { return 35; }
	if (diff > 600 && diff <= 700) { return 40; }
	if (diff > 700) { return 45; }
};
LyteBox.prototype.appear = function(id, opacity) {
	var object = this.doc.getElementById(id).style;
	object.opacity = (opacity / 100);
	object.MozOpacity = (opacity / 100);
	object.KhtmlOpacity = (opacity / 100);
	object.filter = "alpha(opacity=" + (opacity + 10) + ")";
	if (opacity == 100 && (id == 'lbImage' || id == 'lbIframe')) {
		try { object.removeAttribute("filter"); } catch(e) {}	/* Fix added for IE Alpha Opacity Filter bug. */
		this.updateDetails();
	} else if (opacity >= this.maxOpacity && id == 'lbOverlay') {
		for (var i = 0; i < this.overlayTimerCount; i++) { window.clearTimeout(this.overlayTimerArray[i]); }
		return;
	} else if (opacity >= 100 && id == 'lbDetailsContainer') {
		try { object.removeAttribute("filter"); } catch(e) {}	/* Fix added for IE Alpha Opacity Filter bug. */
		for (var i = 0; i < this.imageTimerCount; i++) { window.clearTimeout(this.imageTimerArray[i]); }
		this.doc.getElementById('lbOverlay').style.height = this.getPageSize()[1] + "px";
	} else {
		if (id == 'lbOverlay') {
			this.overlayTimerArray[this.overlayTimerCount++] = setTimeout("myLytebox.appear('" + id + "', " + (opacity+20) + ")", 1);
		} else {
			this.imageTimerArray[this.imageTimerCount++] = setTimeout("myLytebox.appear('" + id + "', " + (opacity+10) + ")", 1);
		}
	}
};
LyteBox.prototype.fade = function(id, opacity) {
	var object = this.doc.getElementById(id).style;
	object.opacity = (opacity / 100);
	object.MozOpacity = (opacity / 100);
	object.KhtmlOpacity = (opacity / 100);
	object.filter = "alpha(opacity=" + opacity + ")";
	if (opacity <= 0) {
		try {
			object.display = 'none';
		} catch(err) { }
	} else if (id == 'lbOverlay') {
		this.overlayTimerArray[this.overlayTimerCount++] = setTimeout("myLytebox.fade('" + id + "', " + (opacity-20) + ")", 1);
	} else {
		this.timerIDArray[this.timerIDCount++] = setTimeout("myLytebox.fade('" + id + "', " + (opacity-10) + ")", 1);
	}
};
LyteBox.prototype.resizeW = function(id, curW, maxW, pixelrate, speed) {
	if (!this.hDone) {
		this.resizeWTimerArray[this.resizeWTimerCount++] = setTimeout("myLytebox.resizeW('" + id + "', " + curW + ", " + maxW + ", " + pixelrate + ")", 100);
		return;
	}
	var object = this.doc.getElementById(id);
	var timer = speed ? speed : (this.resizeDuration/2);
	var newW = (this.doAnimations ? curW : maxW);
	object.style.width = (newW) + "px";
	if (newW < maxW) {
		newW += (newW + pixelrate >= maxW) ? (maxW - newW) : pixelrate;
	} else if (newW > maxW) {
		newW -= (newW - pixelrate <= maxW) ? (newW - maxW) : pixelrate;
	}
	this.resizeWTimerArray[this.resizeWTimerCount++] = setTimeout("myLytebox.resizeW('" + id + "', " + newW + ", " + maxW + ", " + pixelrate + ", " + (timer+0.02) + ")", timer+0.02);
	if (parseInt(object.style.width) == maxW) {
		this.wDone = true;
		for (var i = 0; i < this.resizeWTimerCount; i++) { window.clearTimeout(this.resizeWTimerArray[i]); }
	}
};
LyteBox.prototype.resizeH = function(id, curH, maxH, pixelrate, speed) {
	var timer = speed ? speed : (this.resizeDuration/2);
	var object = this.doc.getElementById(id);
	var newH = (this.doAnimations ? curH : maxH);
	object.style.height = (newH) + "px";
	if (newH < maxH) {
		newH += (newH + pixelrate >= maxH) ? (maxH - newH) : pixelrate;
	} else if (newH > maxH) {
		newH -= (newH - pixelrate <= maxH) ? (newH - maxH) : pixelrate;
	}
	this.resizeHTimerArray[this.resizeHTimerCount++] = setTimeout("myLytebox.resizeH('" + id + "', " + newH + ", " + maxH + ", " + pixelrate + ", " + (timer+.02) + ")", timer+.02);
	if (parseInt(object.style.height) == maxH) {
		this.hDone = true;
		for (var i = 0; i < this.resizeHTimerCount; i++) { window.clearTimeout(this.resizeHTimerArray[i]); }
	}
};
LyteBox.prototype.getPageScroll = function() {
	if (self.pageYOffset) {
		return this.isFrame ? parent.pageYOffset : self.pageYOffset;
	} else if (this.doc.documentElement && this.doc.documentElement.scrollTop){
		return this.doc.documentElement.scrollTop;
	} else if (document.body) {
		return this.doc.body.scrollTop;
	}
};
LyteBox.prototype.getPageSize = function() {	
	var xScroll, yScroll, windowWidth, windowHeight;
	if (window.innerHeight && window.scrollMaxY) {
		xScroll = this.doc.scrollWidth;
		yScroll = (this.isFrame ? parent.innerHeight : self.innerHeight) + (this.isFrame ? parent.scrollMaxY : self.scrollMaxY);
	} else if (this.doc.body.scrollHeight > this.doc.body.offsetHeight){
		xScroll = this.doc.body.scrollWidth;
		yScroll = this.doc.body.scrollHeight;
	} else {
		xScroll = this.doc.getElementsByTagName("html").item(0).offsetWidth;
		yScroll = this.doc.getElementsByTagName("html").item(0).offsetHeight;
		xScroll = (xScroll < this.doc.body.offsetWidth) ? this.doc.body.offsetWidth : xScroll;
		yScroll = (yScroll < this.doc.body.offsetHeight) ? this.doc.body.offsetHeight : yScroll;
	}
	if (self.innerHeight) {
		windowWidth = (this.isFrame) ? parent.innerWidth : self.innerWidth;
		windowHeight = (this.isFrame) ? parent.innerHeight : self.innerHeight;
	} else if (document.documentElement && document.documentElement.clientHeight) {
		windowWidth = this.doc.documentElement.clientWidth;
		windowHeight = this.doc.documentElement.clientHeight;
	} else if (document.body) {
		windowWidth = this.doc.getElementsByTagName("html").item(0).clientWidth;
		windowHeight = this.doc.getElementsByTagName("html").item(0).clientHeight;
		windowWidth = (windowWidth == 0) ? this.doc.body.clientWidth : windowWidth;
		windowHeight = (windowHeight == 0) ? this.doc.body.clientHeight : windowHeight;
	}
	var pageHeight = (yScroll < windowHeight) ? windowHeight : yScroll;
	var pageWidth = (xScroll < windowWidth) ? windowWidth : xScroll;
	return new Array(pageWidth, pageHeight, windowWidth, windowHeight);
};
LyteBox.prototype.toggleFlash = function(state) {
	var objects = this.doc.getElementsByTagName("object");
	for (var i = 0; i < objects.length; i++) {
		objects[i].style.visibility = (state == "hide") ? 'hidden' : 'visible';
	}
	var embeds = this.doc.getElementsByTagName("embed");
	for (var i = 0; i < embeds.length; i++) {
		embeds[i].style.visibility = (state == "hide") ? 'hidden' : 'visible';
	}
	if (this.isFrame) {
		for (var i = 0; i < parent.frames.length; i++) {
			try {
				objects = parent.frames[i].window.document.getElementsByTagName("object");
				for (var j = 0; j < objects.length; j++) {
					objects[j].style.visibility = (state == "hide") ? 'hidden' : 'visible';
				}
			} catch(e) { }
			try {
				embeds = parent.frames[i].window.document.getElementsByTagName("embed");
				for (var j = 0; j < embeds.length; j++) {
					embeds[j].style.visibility = (state == "hide") ? 'hidden' : 'visible';
				}
			} catch(e) { }
		}
	}
};
LyteBox.prototype.toggleSelects = function(state) {
	var selects = this.doc.getElementsByTagName("select");
	for (var i = 0; i < selects.length; i++ ) {
		selects[i].style.visibility = (state == "hide") ? 'hidden' : 'visible';
	}
	if (this.isFrame) {
		for (var i = 0; i < parent.frames.length; i++) {
			try {
				selects = parent.frames[i].window.document.getElementsByTagName("select");
				for (var j = 0; j < selects.length; j++) {
					selects[j].style.visibility = (state == "hide") ? 'hidden' : 'visible';
				}
			} catch(e) { }
		}
	}
};
LyteBox.prototype.pause = function(numberMillis) {
	var now = new Date();
	var exitTime = now.getTime() + numberMillis;
	while (true) {
		now = new Date();
		if (now.getTime() > exitTime) { return; }
	}
};
if (window.addEventListener) {
	window.addEventListener("load",initLytebox,false);
} else if (window.attachEvent) {
	window.attachEvent("onload",initLytebox);
} else {
	window.onload = function() {initLytebox();}
}
function initLytebox() { myLytebox = new LyteBox(); }

// end lightbox.js

// accordion.js v2.0
//
// Copyright (c) 2007 stickmanlabs
// Author: Kevin P Miller | http://www.stickmanlabs.com
// 
// Accordion is freely distributable under the terms of an MIT-style license.
//
// I don't care what you think about the file size...
//   Be a pro: 
//	    http://www.thinkvitamin.com/features/webapps/serving-javascript-fast
//      http://rakaz.nl/item/make_your_pages_load_faster_by_combining_and_compressing_javascript_and_css_files
//

/*-----------------------------------------------------------------------------------------------*/

if (typeof Effect == 'undefined') 
	throw("accordion.js requires including script.aculo.us' effects.js library!");

var accordion = Class.create();
accordion.prototype = {

	//
	//  Setup the Variables
	//
	showAccordion : null,
	currentAccordion : null,
	duration : null,
	effects : [],
	animating : false,
	
	//  
	//  Initialize the accordions
	//
	initialize: function(container, options) {
	  if (!$(container)) {
	    throw(container+" doesn't exist!");
	    return false;
	  }
	  
		this.options = Object.extend({
			resizeSpeed : 8,
			classNames : {
				toggle : 'accordion_toggle',
				toggleActive : 'accordion_toggle_active',
				content : 'accordion_content'
			},
			defaultSize : {
				height : null,
				width : null
			},
			direction : 'vertical',
			onEvent : 'click'
		}, options || {});
		
		this.duration = ((11-this.options.resizeSpeed)*0.15);

		var accordions = $$('#'+container+' .'+this.options.classNames.toggle);
		accordions.each(function(accordion) {
			Event.observe(accordion, this.options.onEvent, this.activate.bind(this, accordion), false);
      if (this.options.onEvent == 'click') {
        accordion.onclick = function() {return false;};
      }
      if (this.options.direction == 'horizontal') {
        var options = $H({width: '0px'});
      } else {
        var options = $H({height: '0px'});			
      }
      options.merge({display: 'none'});			
      this.currentAccordion = $(accordion.next(0)).setStyle(options);
		}.bind(this));
	},
	
	//
	//  Activate an accordion
	//
	activate : function(accordion) {
		if (this.animating) {
			return false;
		}
		
		this.effects = [];
	
		this.currentAccordion = $(accordion.next(0));
		this.currentAccordion.setStyle({
			display: 'block'
		});		
		
		this.currentAccordion.previous(0).addClassName(this.options.classNames.toggleActive);

		if (this.options.direction == 'horizontal') {
			this.scaling = $H({
				scaleX: true,
				scaleY: false
			});
		} else {
			this.scaling = $H({
				scaleX: false,
				scaleY: true
			});			
		}
			
		if (this.currentAccordion == this.showAccordion) {
		  this.deactivate();
		} else {
		  this._handleAccordion();
		}
	},
	// 
	// Deactivate an active accordion
	//
	deactivate : function() {
		var options = $H({
		  duration: this.duration,
			scaleContent: false,
			transition: Effect.Transitions.sinoidal,
			queue: {
				position: 'end', 
				scope: 'accordionAnimation'
			},
			scaleMode: { 
				originalHeight: this.options.defaultSize.height ? this.options.defaultSize.height : this.currentAccordion.scrollHeight,
				originalWidth: this.options.defaultSize.width ? this.options.defaultSize.width : this.currentAccordion.scrollWidth
			},
			afterFinish: function() {
				this.showAccordion.setStyle({
          height: 'auto',
					display: 'none'
				});				
				this.showAccordion = null;
				this.animating = false;
			}.bind(this)
		});    
    options.merge(this.scaling);

    this.showAccordion.previous(0).removeClassName(this.options.classNames.toggleActive);
    
		new Effect.Scale(this.showAccordion, 0, options);
	},

  //
  // Handle the open/close actions of the accordion
  //
	_handleAccordion : function() {
		var options = $H({
			sync: true,
			scaleFrom: 0,
			scaleContent: false,
			transition: Effect.Transitions.sinoidal,
			scaleMode: { 
				originalHeight: this.options.defaultSize.height ? this.options.defaultSize.height : this.currentAccordion.scrollHeight,
				originalWidth: this.options.defaultSize.width ? this.options.defaultSize.width : this.currentAccordion.scrollWidth
			}
		});
		options.merge(this.scaling);
		
		this.effects.push(
			new Effect.Scale(this.currentAccordion, 100, options)
		);

		if (this.showAccordion) {
			this.showAccordion.previous(0).removeClassName(this.options.classNames.toggleActive);
			
			options = $H({
				sync: true,
				scaleContent: false,
				transition: Effect.Transitions.sinoidal
			});
			options.merge(this.scaling);
			
			this.effects.push(
				new Effect.Scale(this.showAccordion, 0, options)
			);				
		}
		
    new Effect.Parallel(this.effects, {
			duration: this.duration, 
			queue: {
				position: 'end', 
				scope: 'accordionAnimation'
			},
			beforeStart: function() {
				this.animating = true;
			}.bind(this),
			afterFinish: function() {
				if (this.showAccordion) {
					this.showAccordion.setStyle({
						display: 'none'
					});				
				}
				$(this.currentAccordion).setStyle({
				  height: 'auto'
				});
				this.showAccordion = this.currentAccordion;
				this.animating = false;
			}.bind(this)
		});
	}
}
	
// end accordian.js


/***********************************************
* Contractible Headers script- � Dynamic Drive (www.dynamicdrive.com)
* This notice must stay intact for legal use. Last updated Mar 23rd, 2004.
* Visit http://www.dynamicdrive.com/ for full source code
***********************************************/

var enablepersist='off' //Enable saving state of content structure using session cookies? (on/off)
var collapseprevious='no' //Collapse previously open content when opening present? (yes/no)

if (document.getElementById){
  document.write('<style type=\"text/css\">')
  document.write('.switchcontent{display:none;}')
  document.write('</style>')
}

function getElementbyClass(classname){
  ccollect=new Array()
  var inc=0
  var alltags=document.all? document.all : document.getElementsByTagName('*')
  for (i=0; i<alltags.length; i++){
    if (alltags[i].className==classname)
      ccollect[inc++]=alltags[i]
  }
}

function contractcontent(omit){
  var inc=0
  while (ccollect[inc]){
    if (ccollect[inc].id!=omit) {
      ccollect[inc].style.display='none';
    }
    inc++;
  }
}

function expandcontent(cid){
  if (typeof ccollect!='undefined') {
    if (collapseprevious=='yes') {
      contractcontent(cid);
    }
    //document.getElementById(cid).style.display=(document.getElementById(cid).style.display!='block')? 'block' : 'none'
    if (document.getElementById(cid).style.display!='block') {
      document.getElementById("showindicator").innerHTML = "&nbsp;&ndash; Hide TOC";
      document.getElementById(cid).style.display = 'block';
    } else {
      document.getElementById("showindicator").innerHTML = "&nbsp;+ Show TOC";
      document.getElementById(cid).style.display = 'none';
    }
    document.getElementById("commenttext").style.display = 'none';
  }
}

function revivecontent(){
  contractcontent('omitnothing')
  selectedItem=getselectedItem()
  selectedComponents=selectedItem.split('|')
  for (i=0; i<selectedComponents.length-1; i++)
    document.getElementById(selectedComponents[i]).style.display='block'
}

function get_cookie(Name) { 
var search = Name + '='
var returnvalue = '';
if (document.cookie.length > 0) {
  offset = document.cookie.indexOf(search)
  if (offset != -1) { 
    offset += search.length
    end = document.cookie.indexOf(';', offset);
    if (end == -1) end = document.cookie.length;
      returnvalue=unescape(document.cookie.substring(offset, end))
  }
}
return returnvalue;
}

function getselectedItem(){
if (get_cookie(window.location.pathname) != ''){
  selectedItem=get_cookie(window.location.pathname)
  return selectedItem
}
  else
  return ''
}

function saveswitchstate(){
var inc=0, selectedItem=''
while (ccollect[inc]){
  if (ccollect[inc].style.display=='block')
    selectedItem+=ccollect[inc].id+'|'
    inc++
}

document.cookie=window.location.pathname+'='+selectedItem
}

function do_onload(){
  uniqueidn=window.location.pathname+'firsttimeload'
  getElementbyClass('switchcontent')
  if (enablepersist=='on' && typeof ccollect!='undefined'){
    document.cookie=(get_cookie(uniqueidn)=='')? uniqueidn+'=1' : uniqueidn+'=0' 
    firsttimeload=(get_cookie(uniqueidn)==1)? 1 : 0 //check if this is 1st page load
  if (!firsttimeload)
    revivecontent()
  }
}


if (window.addEventListener)
  window.addEventListener('load', do_onload, false)
else if (window.attachEvent)
  window.attachEvent('onload', do_onload)
else if (document.getElementById)
  window.onload=do_onload

if (enablepersist=='on' && document.getElementById)
  window.onunload=saveswitchstate

// end collapse.js