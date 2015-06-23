var Objects = {}

function Atom(name) {
  this.name = name;
}

/* can work with groups
 *
var at = new FuzzyAtom('\_\.a\.([0-9]+)$', 1, function(gps) { return '_.a.'+gps[0]; })
var at = new FuzzyAtom('\_\.(a)\.([0-9]+)$', 2, function(gps) { return '_.'+gps[0]+'.'+gps[1]; })
 */

function FuzzyAtom(regexp, nb_groups, builder) {
  this.regexp = regexp;
  this.nb_groups = nb_groups;
  this.builder = builder;
}

// a fuzzy logic variable. Used for tests
FuzzyAtom.lvar = function(names) {
  var vars = (names instanceof Array)?names.join(''):names;
  return {name: new FuzzyAtom('^\_\.['+vars+']{1}\.[0-9]+$')};
};

FuzzyAtom.prototype.exec = function(s) {
  var match = new RegExp(this.regexp).exec(s);
  if( match !== null ) {
    if( this.builder !== undefined && 
        this.nb_groups !== undefined ) {
      if( this.nb_groups !== (match.length-1) ) {
        console.error('nb of groups do not match -> '+this.nb_groups);
        return null;
      }

      return this.builder(match.slice(1));
    } else {
      return match[0];
    }
  }
  return null;
}

function FuzzyMap(map, matched) {
  this.map = (map!==undefined)?map:{};
}

FuzzyMap.prototype.extend = function(id, matched) {
  var new_map = {};
  new_map[id] = matched;
  return new FuzzyMap(Objects.extend(this.map, new_map));
}

FuzzyMap.prototype.get = function(id, o) {
  var obj1 = this.map[id];
  var id_from_obj = function(map, o) {
    var p;
    for(p in map) {
      if( map.hasOwnProperty(p) ) {
        if( map[p] == o ) {
          return p;
        }
      }
    }
    return null;
  };
  var obj = this.map[id];
  var prev_id = id_from_obj(this.map, o);
  if( prev_id !== null && id == prev_id && obj == o ) { 
    return true;// same obj s already mapped to same id
  } else if( !obj && !prev_id ) {
    return false; // no object mapped for that id
  }
  return null; // different id or obj instance
};

Array.prototype.contains = function(x) {
  var i;
  for(i=0;i<this.length;i++) {
    if(this[i] == x) {
      return true;
    }
  }
  return false;
};

function Status(equals, fuzzy_map) {
  if (!(this instanceof Status)) {
    return new Status(equals, fuzzy_map);
  }
  this.status = equals;
  this.map = fuzzy_map;
};

Objects.equals = function(o1, o2) {
  var prop_count = function(o) {
    var i; var res = 0;
    for(i in o) {
      if( o.hasOwnProperty(i) ) res++;
    }
    return res;
  };
  var equals_aux = function(o1, o2, map) {
    if( o1 instanceof Array &&
        o2 instanceof Array ) {
      if( o1.length == o2.length ) {
        var i;
        var amap = map;
        for(i=0;i<o1.length;i++) {
          var new_status = equals_aux(o1[i], o2[i], amap);
          if(!new_status.status) {
            return Status(false, new_status.map);
          } else {
            amap = new_status.map;
          }
        }
        return Status(true, amap);
      }
      return Status(false, map);
    } else if( ((typeof(o1) === 'string' && o2 instanceof FuzzyAtom) ||
                (typeof(o2) === 'string' && o1 instanceof FuzzyAtom)) && map !== undefined ) {
      var p1 = (o1 instanceof FuzzyAtom)?o2:o1;
      var p2 = (o1 instanceof FuzzyAtom)?o1:o2;

      var atom = p2.exec(p1);
      if( !atom ) {
        return Status(false, map);
      } else {
        var o = map.get(atom, p2);
        if( o === true ) { // same fuzzy match
          return Status(true, map);
        } else if( o == false ) { // new fuzzy match
          return Status(true, map.extend(atom, p2));
        } else {
          return Status(false, map);// fuzzy atom do not correspond matching string
        }
      }
    } else if( o1 instanceof Object && o2 instanceof Object ) {
      if( prop_count(o1) == prop_count(o2) ) {
        var i;
        var amap = map;
        for(i in o1) {
          if( o1.hasOwnProperty(i) ) {
            var p2 = o2[i];
            if( p2 === undefined ) {
              return Status(false, map);
            } else {
              var new_status = equals_aux(o1[i], p2, amap);
              if( !new_status.status ) {
                return Status(false, new_status.map);
              } else {
                amap = new_status.map;
              }
            }
          }
        }
        return Status(true, amap);
      }
      return Status(false, map);
    } else {
      return Status(o1 == o2, map);
    }
  };
  return equals_aux(o1, o2, new FuzzyMap()).status;
};

Objects.to_string = function(o) {
  var obj_tostring = function(o) {
    var res = '{';
    for(i in o) {
      if( o.hasOwnProperty(i) ) {
        res += i+':'+Objects.to_string(o[i])+',';
      }
    }
    return res.substring(0, res.length-1)+'}';
  };
  var arr_tostring = function(o) {
    var i;
    var res = '[';
    for(i=0;i<o.length;i++) {
      if( i < (o.length-1) ) {
        res += Objects.to_string(o[i])+',';
      } else res += Objects.to_string(o[i]);
    }
    return res+']';
  };
  var atom_tostring = function(o) {
    if( typeof(o) === 'string' ) {
      return '"'+o+'"';
    } else {
      return ''+o;
    }
  };
  var fun_tostring = function(f) {
    return f.toString();
  };
  if( o instanceof Array ) {
    return arr_tostring(o);
  } else if( typeof(o) === 'function' ) {
    return fun_tostring(o);
  } else if( o instanceof Object ) {
    return obj_tostring(o);
  } else return atom_tostring(o);
};

Objects.extend = function(from, to) {
  var result = {};
  var p;
  for(p in from) {
    if( from.hasOwnProperty(p) ) {
      result[p] = from[p];
    }
  }
  for(p in to) {
    if( to.hasOwnProperty(p) ) {
      result[p] = to[p];
    }
  }
  return result;
};

Objects.merge = function() {
  var objs = Array.prototype.slice.call(arguments);

  return objs.reduce(Objects.extend, {});
};

function Pair(h, t) {
  this.fst = h;
  this.snd = t;
}

var pair = function(a,b) { return new Pair(a,b); }

// turn Arrays into Stream
var Arrays = {};

Arrays.head = function(a) {
  if( a instanceof Pair ) {
    return a.fst;
  } else {
    return a[0];
  }
};

Arrays.tail = function(a) {
  if( a instanceof Pair ) {
    return a.snd;
  } else {
    return a.slice(1);
  }
};

Arrays.cons = function(a,b) {
  if( b instanceof Array ) {
    return [a].concat(b);
  } else {
    return pair(a, b);
  }
};

Arrays.is_pair = function(a) {
  return (a instanceof Array && a.length > 0) ||
          a instanceof Pair;
};

Arrays.is_null = function(a) {
  return a instanceof Array && a.length === 0;
};

Arrays.is_array = function(a) {
  //return a instanceof Array; // not work with Pairs
  if( Arrays.is_null(a) ) {
    return true;
  } else if( Arrays.is_pair(a) ) {
    return arguments.callee(Arrays.tail(a));
  } else {
    return false;
  }
};

// ------------ TEST API ------------------------------------------------
var mk_test = function(proto, index) {
  var to_string = function(f) {
    return f.toString().replace(/[\n\r]/g, '');
  };
  var name = (proto.name !== undefined)?proto.name:'test_'+index;
  var tests = { };
  if( typeof(proto.body) !== 'function' ) {
    console.error('test '+name+' discarded.. Must be lazy !');
    return null;
  }
  /*
  if( proto.fresh !== undefined ) {// fresh
    var vars = proto.fresh.split(' ').reduce(function(code, v) { return (code.length===0)?'$'+v:code+', $'+v; }, '');
    var fresh_fn = 'return fresh("'+proto.fresh+'", function('+vars+') {';
    var test_fn = '('+to_string(proto.body)+')('+vars+')';
    var expected = typeof(proto.expected) === 'function'?
                    '('+to_string(proto.expected)+')('+vars+')':
                    Objects.to_string(proto.expected);
    var fresh_body = 'try { return assert_equals("'+name+'",'+test_fn+','+expected+'); } catch(e) { console.error("Exception raised during '+name+' -> "+e.stack); }';
    console.log('with FRESH', new Function((fresh_fn+fresh_body+'})')));
    console.log('with FRESH fresh_body', (fresh_body));
    return new Function(fresh_fn+fresh_body+'});');
  } else {
    var test_fn = '('+to_string(proto.body)+')()';
    var expected = typeof(proto.expected) === 'function'? // expected must be lazy when new classes
                    '('+to_string(proto.expected)+')()':  // are instanciated otherwise
                    Objects.to_string(proto.expected);    // the instanceof does not work..
    var test_body = 'try { return assert_equals("'+name+'", '+
                      test_fn+', '+
                      expected+'); } catch(e) { console.error("Exception raised during '+name+' -> "+e.stack); }';
    console.log('sans fresh whole function', new Function((test_body)))
    console.log('sans fresh test_body', (test_body));
    return new Function(test_body);
  }
  */
  function do_test ( ) {
    var handler = function ( ) {
      var expected = proto.expected.apply
          ? proto.expected
          : (function ( ) { return proto.expected; })
          ;
      try {
        return assert_equals(name, proto.body.apply(this, arguments), expected.apply(this, arguments));
      } catch (e) {
        console.error("Exception raised during", name, "-> ", e.stack);
      }
    };
    if (proto.fresh && proto.body && proto.body.call) {
      console.log('returning with fresh');
      return (function ( ) { return fresh(proto.fresh, handler); }).apply(this, arguments);
    } else {
      return handler.apply(this, arguments);
    }
  }
  /*
  function anonymous() {
    return fresh("x y",
      function($x, $y) {
        try {
          return assert_equals("test_0",
            (function ($x, $y) {
              return empty_bindings.unify($x, $y);
            })($x, $y),
            (function ($x, $y) {
              return new Bindings(mk_assoc($x.name,  $y));
            })($x, $y)
          );
        } catch(e) {
          console.error("Exception raised during test_0 -> "+e.stack);
        }
      })
    }
  */
  /* case 2, no fresh variables
  function anonymous() {
    try {
      return assert_equals("test_6",
        (function () {
          return run(function($q) {
            return choice($q, [1,2,3]);
          });
        })(),
        [1,2,3]
      );
    } catch(e) {
      console.error("Exception raised during test_6 -> "+e.stack);
    }
  }
  */

  tests[name] = do_test;
  return tests[name];
};

var assert_equals = function(test, result, expected) {
  try {
    if(! Objects.equals(result, expected) ) {
      console.error('ERROR : '+test+' -> '+Objects.to_string(result)+ ' != '+ Objects.to_string(expected));
      return false;
    }
  } catch(e) {
    console.error('EXCEPTION : '+test+' -> '+Objects.to_string(result)+ ' != '+ Objects.to_string(expected));
    console.error(e);
    return false;
  }
  return true;
};

var assert_all = function(name,tests, n) {
  var count = (n === undefined)?Number.MAX_VALUE:n;
  var result = tests.slice(0, count).map(mk_test).reduce(function(acc, f) {
    if( acc && f !== null ) {
      return f();
    } else {
      return false;
    }
  }, true);

  if( result ) {
    var nb_tests = (n<tests.length)?n:tests.length;
    console.log(name+' : ' + nb_tests + ' tests passed..');
  } else {
    console.log(name+' tests failed !');
  }
};

// lazy logic monad

var unit = function(x) { return x; }
var mzero = function() { return false; };

var succeed = function(s) { return unit(s); };
var fail = function(s) { return mzero(); };

var mplus = function(lhead, ltail) {
  if(!lhead) {
    return ltail();
  } else if( Arrays.is_pair(lhead) ) {
    var a = lhead.fst;
    var f0 = lhead.snd;
    return pair(a, function() { return mplus(f0(), ltail); });
  } else {
    return pair(lhead, ltail);
  }
};

var mbind = function() {
  var args = Array.prototype.slice.call(arguments);
  if( args.length === 0 ) {
    return mzero();
  } else if(args.length === 2) {
    var a = args[0];
    var g = args[1];
    if( !a ) {
      return mzero();
    } else if( Arrays.is_pair(a) ) {
      var b = a.fst;
      var f = a.snd;
      return mplus(g(b), function() { return mbind(f(), g); });
    } else {
     return g(a);
    }
  }
};

// anye
var disj = function(g1, g2) {
  return function(s) {
    return mplus(g1(s), function() { return g2(s); });
  };
};

// all
var conj = function() {
  var args = Array.prototype.slice.call(arguments);
  if( args.length == 0 ) {
    return succeed;
  } else if( args.length === 1 ) {
    var g = args[0];
    return g;
  } else {
    var g = args[0];
    return function(s) {
      return mbind(g(s), conj.apply(null, args.slice(1)));
    };
  }
};

// ---------------------------------------------- Knowledge Representation

// naming variable differently in order to use native map of javascript
// prevent name collisions
// global map with symbol -> number of instances !
var __var_map = {}

function LVar(name) {
  var count = __var_map[name];
  var new_count = (count === undefined)?0:count+1;
  this.name = '_.'+name+'.'+new_count;
  __var_map[name] = new_count;
};

var lvar = function(x) { return new LVar(x); };
var is_lvar = function(v) { return v instanceof LVar; };
// anonymous var..
var _ = function() { return lvar('_'); };

// create a scope with logical variables
var fresh = function(names, scope) {
  var vars = names.split(' ').map(lvar);
  return scope.apply(null, vars);
};

var lazy_fresh = function(names, scope) {
  return function() { return fresh(names, scope); };
};

// add unify inside Bindings class
// maybe rename it to Subst ?
// uses different indexing strategies  : redblack tree, native javascript associative arrays, ..
function Bindings(map) {
  if( map === undefined ) {
    this.map = {};
  } else {
    this.map = map;
  }
}

Bindings.prototype.extend = function(lvar, value) {
  var o = {};
  o[lvar.name] = value;
  return new Bindings(Objects.extend(this.map, o));
};

// defined as walk in minikaren
Bindings.prototype.lookup = function(lvar) {
  if( !is_lvar(lvar) ) {
    return lvar;
  }
  var result = this.map[lvar.name];
  return ( result !== undefined )? this.lookup(result) : lvar;
};

// improved lookup version
Bindings.prototype.lookup_star = function(lvar) {
  var v = this.lookup(lvar);
  var result;
  if( is_lvar(v) ) {
    result = v;
  } else if( Arrays.is_pair(v) ) {
    var _h = Arrays.head;
    var _t = Arrays.tail;
    result = Arrays.cons(this.lookup_star(_h(v)), this.lookup_star(_t(v)));
  } else {
    result = v;
  }
  return result;
};

Bindings.prototype.find = function(v) {
  var lvar = this.lookup(v);
  if( is_lvar(lvar) ) {
    return lvar;
  }
  if( Arrays.is_pair(lvar) ) {
    return Arrays.cons(Arrays.head(lvar), this.find(Arrays.tail(lvar)));
  } else {
    return lvar;
  }
};

// ---------------------------------------------- Unification

Bindings.prototype.unify = function(l, r) {
  var t1 = this.lookup(l);
  var t2 = this.lookup(r);
  if( Objects.equals(t1, t2) ) {
    return this;
  } else if( is_lvar(t1) ) {
    return this.extend(t1, t2);
  } else if( is_lvar(t2) ) {
    return this.extend(t2, t1);
  } else if( Arrays.is_pair(t1) && Arrays.is_pair(t2) ) {
    var b1 = this.unify(Arrays.head(t1), Arrays.head(t2));
    if( b1 ) {
      return b1.unify(Arrays.tail(t1), Arrays.tail(t2));
    }
  }
  return null;
};

var empty_bindings = new Bindings();

// ---------------------------------------------- Operational Logic

// ==
var eq_o = function(l,r) {
  return function(bindings) {
    var result = bindings.unify(l, r);
    if( result ) {
      return succeed(result);
    } else {
      return fail(bindings);
    }
  };
};

var run0 = function($q, goal, n) {
  var mk_array = function(res) {
    if(!res) {
      return []; // no answer
    } else if( Arrays.is_pair(res) ) {
      var result = [];
      var tmp = res;
      var count = (n!==undefined)?n:Number.MAX_VALUE;
      while( Arrays.is_pair(tmp) && count-- > 0 ) {
        result = result.concat(tmp.fst);
        tmp = tmp.snd();
      }
      if( count && tmp instanceof Bindings ) {
        result = result.concat(tmp);// append last result if not false
      }
      return result;
    } else {
      if( res instanceof Array ) { console.error('should not happen here ..'); }
      return [res];
    }
  };
  return mk_array(goal(empty_bindings)).map(
    function(bindings) {
      return bindings.lookup_star($q);
    });
};

var run = function(goal, n) {
  var $q = lvar('q');
  return run0($q, goal($q), n);
};

// ---------------------------------------------- Logic Programs

var conde = function() {
  var args = Array.prototype.slice.call(arguments);
  if( arguments.length > 0 ) {
    var op = args[0];
    var rest = args.slice(1);
    if( Arrays.is_pair(op) ) {
      return disj(conj.apply(null, op), conde.apply(null, rest));
    } else {
      return op;
    }
  } else {
    return fail;
  }
};

var choice = function($v, arr) {
  if( Arrays.is_null(arr) ) {
    return fail;
  }
  return disj(eq_o($v, Arrays.head(arr)), choice($v, Arrays.tail(arr)));
};

//var membero = choice;

var common_o = function(l,r,$q) {
  return conj(choice($q, l), function(s) { return choice($q, r)(s); });
};

var cons_o = function($a, $b, arr) {
  return eq_o(Arrays.cons($a,$b), arr);
};

var car_o = function($p, $a) {
  var $d = lvar('d');
  return eq_o(Arrays.cons($a, $d), $p);
};

var cdr_o = function($p, $d) {
  var $a = lvar('a');
  return eq_o(Arrays.cons($a, $d), $p);
};

var null_o = function($x) {
  return eq_o([], $x);
};

var pair_o = function($p) {
  var $a = lvar('a');
  var $d = lvar('d');
  return cons_o($a, $d, $p);
};

var append_o = function(a1, a2, a3) {
  var $h = lvar('h'); var $t = lvar('t'); var $a3p = lvar('a3p');
  return disj(conj(eq_o(a1, []), eq_o(a2,a3)),
               conj(cons_o($h, $t, a1),
                    cons_o($h, $a3p, a3),
                    function(s) { return append_o($t, a2, $a3p)(s); }));
};

var array_o = function($x) {
  return conde([null_o($x), succeed ],
               [pair_o($x), function(s) { 
                 var $d = lvar('d'); 
                 return conj(cdr_o($x, $d), array_o($d))(s); }],
               fail);
};

// array of array
var aoa_o = function($x) {
  return conde([null_o($x), succeed],
               [fresh('a', function($a) { return conj(car_o($x, $a), array_o($a)); }),
                fresh('d', function($d) { return conj(cdr_o($x, $d), function(s) { return aoa_o($d)(s); }); })],
               fail);
};

var twins_o = function(s) {
  var $x = lvar('x');
  //return conj(cons_o($x, $y, s),
              //cons_o($x, [], $y));
  return eq_o([$x,$x], s);
};

var arrayof_o = function(predo, $q) {
  return conde([null_o($q), succeed],
               [fresh('a', function($a) { return conj(car_o($q, $a), predo($a)); }),
                fresh('d', function($d) { return conj(cdr_o($q, $d), function(s) { return arrayof_o(predo, $d)(s); }); })],
               fail);
};

// array of twins
var aot_o = function($q) {
  return arrayof_o(twins_o, $q);
  //return conde([null_o($q), succeed],
               //[fresh('a', function($a) { return conj(car_o($q, $a), twins_o($a)); }),
                //fresh('d', function($d) { return conj(cdr_o($q, $d), function(s) { return aot_o($d)(s); }); })],
               //fail);
};

var eq_car_o = function($q, $x) {
  return car_o($q, $x);
};

var member_o = function($x, $q) {
  return conde([null_o($q), fail],
               [eq_car_o($q, $x), succeed],
               fresh('d', function($d) {
                 return conj(cdr_o($q, $d), function(s) { return member_o($x, $d)(s); });
               }));
};

var pmember_o = function($x, $q) {
  return conde([null_o($q), fail],
               [eq_car_o($q, $x), cdr_o($q, [])],
               fresh('d', function($d) {
                 return conj(cdr_o($q, $d),
                             function(s) { return pmember_o($x, $d)(s); });
               }));
};



// --------------------------------------------------- Tests
var mk_assoc = function(s, v) {
  var o = {};
  o[s] = v;
  return o;
};

assert_all('sokuza', [
{ fresh: 'x y',
  body: function($x, $y) { return empty_bindings.unify($x, $y); },
  expected: function($x, $y) { return new Bindings(mk_assoc($x.name,  $y)); }
},
{ fresh: 'x y', 
  body: function($x, $y) { return empty_bindings.unify($x, $y).unify($x, 1); },
  expected: function($x, $y) { return new Bindings(Objects.merge(mk_assoc($y.name, 1), mk_assoc($x.name,$y))); }
},
{ fresh: 'x y',
  body : function($x, $y) { return empty_bindings.unify($x, $y).unify($x, 1).find($x); },
  expected: 1
},
{ fresh: 'x y',
  body: function($x, $y) { return empty_bindings.unify([$x, $y], [$y, 1]); },
  expected: function($x, $y) { return new Bindings(Objects.merge(mk_assoc($y.name, 1), mk_assoc($x.name,$y))); }
},
{ fresh: 'q',
  body: function($q) { return run0($q, choice(2, [1,2,3])); },
  expected: function($q) { return [$q]; }
},
{ body : function() { return run(function($q) { return choice(10, [1,2,3]); }); },
  expected: []
},
{ body: function() { return run(function($q) { return choice($q, [1,2,3]); }); },
  expected: [1,2,3]
},
{ body: function() { return run(function($q) { return common_o([1,2,3], [3,4,5], $q); }); },
  expected: [3]
},
{ body: function() { return run(function($q) { return common_o([1,2,3], [3,4,1,7], $q); }); },
  expected: [1,3]
},
{ body: function() { return run(function($q) { return common_o([1,2,3], [3,4,1,7], $q); }); },
  expected: [1,3]
},
{ body: function() { return run(function($q) { return common_o([11,2,3], [13,4,1,7], $q); }); },
  expected: []
},
{ body: function() { return run(function($q) { return cons_o(1, [2,3], $q); }); },
  expected: [[1,2,3]]
},
{ body: function() { return run(function($q) { return cons_o($q, [2,3], [1,2,3]); }); },
  expected: [1]
},
{ body: function() { return run(function($q) { return cons_o(1, $q, [1,2,3]); }); },
  expected: [[2,3]]
},
{ body: function() { return run(function($q) { return append_o([1], [2], $q); }); },
  expected: [[1,2]]
},
{ body: function() { return run(function($q) { return append_o($q, [2,3], [1,2,3]); }); },
  expected: [[1]]
},
{ body: function() { return run(function($q) { return append_o([1], $q, [1,2,3]); }); },
  expected: [[2,3]]
},
{ body: function() { return run(function($q) { return append_o([1], [2], [1]); }); },
  expected: []
},
{ body: function() { return run(function($q) { var $x = lvar('x'); 
                                        return append_o($q, $x, [1,2,3,4,5]); }); },
  expected: [ [],
            [ 1 ],
            [ 1, 2 ],
            [ 1, 2, 3 ],
            [ 1, 2, 3, 4 ],
            [ 1, 2, 3, 4, 5 ] ]
},
{ body: function() {return run(function($q) { var $x = lvar('x'); 
                                            return append_o($x, $q, [1,2,3,4,5]); });  },
  expected: [ [ 1, 2, 3, 4, 5 ],
              [ 2, 3, 4, 5 ],
              [ 3, 4, 5 ],
              [ 4, 5 ],
              [ 5 ],
              [] ]
},
{ body: function() {return run(function($q) { var $x = lvar('x'); var $y = lvar('y');
                                            return conj(append_o($x, $y, [1,2,3,4,5]),
                                                        eq_o($q, [$x,$y]));  });  },
  expected: [ [ [],
              [ 1, 2, 3, 4, 5 ] ],
              [ [ 1 ], [ 2, 3, 4, 5 ] ],
              [ [ 1, 2 ], [ 3, 4, 5 ] ],
              [ [ 1, 2, 3 ], [ 4, 5 ] ],
              [ [ 1, 2, 3, 4 ], [ 5 ] ],
              [ [ 1, 2, 3, 4, 5 ], [] ] ]
}
]);

assert_all('reasoned schemer', [
{ name: '1.10',
  body: function() { return run(function($q) { return fail; }); },
  expected: []
},
{ name: '1.11',
  body: function() { return run(function($q) { return eq_o($q, 1); }); },
  expected: [1]
},
{ name: '1.12',
  body: function() { return run(function($q) { return conj(fail, eq_o($q, true)); }); },
  expected: []
},
{ name: '1.14',
  body: function() { return run(function($q) { return conj(succeed, eq_o($q, true)); }); },
  expected: [true]
},
{ name: '1.16',
  body: function() { return run(function($q) { return conj(succeed, eq_o($q, 'corn')); }); },
  expected: ['corn']
},
{ name: '1.17',
  body: function() { return run(function($q) { return conj(fail, eq_o($q, 'corn')); }); },
  expected: []
},
{ name: '1.18',
  body: function() { return run(function($q) { return conj(succeed, eq_o($q, false)); }); },
  expected: [false]
},
{ name: '1.22',
  body: function() { return run(function($q) { var x = false; return eq_o(true, x); }); },
  expected: []
},
{ name: '1.23',
  body: function() { return run(function($q) { var $x = lvar('x'); return conj(eq_o(true, $x), eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '1.26',
  body: function() { return run(function($q) { var $x = lvar('x'); return conj(eq_o($x, true), eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '1.27',
  body: function() { return run(function($q) { var $x = lvar('x'); return conj(eq_o($x, true), eq_o($q, true)); }); },
  expected: [true]
},
{ name: '1.28',
  fresh: 'q',
  body: function($q) { return run0($q, succeed); },
  expected: function($q) { return [$q]; }
},
{ name: '1.30',
  fresh: 'x y q',
  body: function($x, $y, $q) { return run0($q, eq_o(Arrays.cons($x, Arrays.cons($y, [])), $q)); },
  expected: function($x, $y, $q) { return [[$x, $y]]; }
},
{ name: '1.31',
  fresh: 't u q',
  body: function($t, $u, $q) { return run0($q, eq_o(Arrays.cons($t, Arrays.cons($u, [])), $q)); },
  expected: function($t, $u, $q) { return [[$t, $u]]; }
},
{ name: '1.34',
  body: function() { return run(function($q) { return conj(eq_o(false, $q), eq_o(true, $q)); }); },
  expected: []
},
{ name: '1.35',
  body: function() { return run(function($q) { return conj(eq_o(false, $q), eq_o(false, $q)); }); },
  expected: [false]
},
{ name: '1.36',
  body: function() { return run(function($q) { var $x = $q; return eq_o(true, $x); }); },
  expected: [true]
},
{ name: '1.37',
  fresh: 'x q',
  body: function($x, $q) { return run0($q, eq_o($x, $q)); },
  expected: function($x, $q) { return [$q]; }
},
{ name: '1.38',
  body: function() { return run(function($q) { var $x = lvar('x'); return conj(eq_o(true, $x), eq_o($x, $q)); }); },
  expected: [true]
},
{ name: '1.39',
  body: function() { return run(function($q) { var $x = lvar('x'); return conj(eq_o($x, $q), eq_o(true, $x)); }); },
  expected: [true]
},
{ name: '1.44',
  body: function() { return run(function($q) { return conde([fail, fail], fail); }); },
  expected: []
},
{ name: '1.45',
  fresh: 'q',
  body: function($q) { return run0($q, conde([fail, fail], succeed)); },
  expected: function($q) { return [$q]; }
},
{ name: '1.46',
  fresh: 'q',
  body: function($q) { return run0($q, conde([succeed, succeed], fail)); },
  expected: function($q) { return [$q]; }
},
{ name: '1.47',
  body: function() { return run(function($q) { return conde([eq_o('olive', $q), succeed],
                                                            [eq_o('oil', $q), succeed], fail); }); },
  expected: ['olive', 'oil']
},
{ name: '1.49',
  body: function() { return run(function($q) { return conde([eq_o('olive', $q), succeed], 
                                                            [eq_o('oil', $q), succeed], fail); }, 1); },
  expected: ['olive']
},
{ name: '1.50',
  fresh: 'q',
  body: function($q) { return run0($q, conde([eq_o('virgin', $q), fail],
                                                          [eq_o('olive', $q), succeed],
                                                          [succeed, succeed],
                                                          [eq_o('oil', $q), succeed], fail)); },
  expected: function($q) { return ['olive', $q, 'oil']; }
},
{ name: '1.52',
  body: function() { return run(function($q) { return conde([eq_o('extra', $q), succeed],
                                                         [eq_o('virgin', $q), fail],
                                                         [eq_o('olive', $q), succeed],
                                                         [eq_o('oil', $q), succeed],
                                                         fail); }, 2); },
  expected: ['extra', 'olive']
},
{ name: '1.53',
  body: function() { return run(function($q) { var $x = lvar('x'); var $y = lvar('y'); 
                                            return conj(eq_o('split', $x), 
                                                        eq_o('pea', $y),
                                                        function(s) { return eq_o([$x,$y],$q)(s); }); }); },
  expected: [['split', 'pea']]
},
{ name: '1.54',
  body: function() { return run(function($q) { var $x = lvar('x'); var $y = lvar('y'); 
                               return conj(conde([eq_o('split', $x), eq_o('pea', $y)],
                                                 [eq_o('navy', $x), eq_o('bean', $y)],
                                                 fail), function(s) { return eq_o([$x, $y], $q)(s); }); }); },
  expected: [['split', 'pea'], ['navy', 'bean']]
},
{ name: '1.55',
  body: function() { return run(function($q) { var $x = lvar('x'); var $y = lvar('y'); 
                               return conj(conde([eq_o('split', $x), eq_o('pea', $y)],
                                                 [eq_o('navy', $x), eq_o('bean', $y)],
                                                 fail), function(s) { return eq_o([$x, $y, 'soup'], $q)(s); }); }); },
  expected: [['split', 'pea', 'soup'], ['navy', 'bean', 'soup']]
},
{ name: '1.56',
  body: function() { return run(function($q) { var teacupo = function($x) {
                              return conde([eq_o('tea', $x), succeed],
                                           [eq_o('cup', $x), succeed],
                                           fail); }; return teacupo($q); }); },
  expected: ['tea', 'cup']
},
{ name: '1.57',
  body: function() { return run(function($q) { var $x = lvar('x'); var $y = lvar('y'); var teacupo = function($x) {
                              return conde([eq_o('tea', $x), succeed],
                                           [eq_o('cup', $x), succeed],
                                           fail); }; return conj(conde([conj(teacupo($x), eq_o(true, $y)), succeed],
                                                                       [eq_o(false, $x), eq_o(true, $y)],
                                                                       fail), function(s) { return eq_o([$x, $y], $q)(s); }); }); },
  expected: [['tea', true],['cup',true],[false,true]]
},
{ name: '1.58',
  fresh: 'x x1 x2',
  body: function($x, $x1, $x2) { 
    return run(function($q) { var $y = lvar('y'); var $z = lvar('z');
      return conj(conde([eq_o($y, $x), eq_o($z, $x1)],
                        [eq_o($y, $x2), eq_o($z, $x)],
                        fail), function(s) { return eq_o([$y, $z], $q)(s); }); }); },
  expected: function($x, $x1, $x2) { return [[$x, $x1],[$x2, $x]]; }
},
{ name: '1.59',
  fresh: 'x1 x2',
  body: function($x1, $x2) { 
    return run(function($q) { var $x = lvar('x'); var $y = lvar('y'); var $z = lvar('z');
      return conj(conde([eq_o($y, $x), eq_o($z, $x1)],
                        [eq_o($y, $x2), eq_o($z, $x)],
                        fail), 
                  eq_o(false, $x),
                  eq_o([$y, $z], $q)); }); },
  expected: function($x1, $x2) { return [[false, $x1], [$x2, false]]; }
},
{ name: '1.60',
  body: function() { return run(function($q) { 
          var a = eq_o(true, $q); var b = eq_o(false, $q);
          return b; }); },
  expected: [false]
},
{ name: '1.61',
  body: function() { return run(function($q) {
          var a = eq_o(true, $q);
          var b = fresh('x', function($x) {
            return conj(eq_o($x, $q), eq_o(false, $q)); });
          var c = conde([eq_o(true, $q), succeed],
                        eq_o(false, $q));
         return b; }); },
  expected: [false]
},
{ name: '2.2',
  fresh: 'x y',
  body: function($x, $y) { return run(function($q) { return eq_o([$x, $y], $q); }); },
  expected: function($x, $y) { return [[$x,$y]]; }
},
{ name: '2.6',
  body: function() { return run(function($q) { return car_o('acorn'.split(''), $q); }); },
  expected: 'a'
},
{ name: '2.7',
  body: function() { return run(function($q) { 
                       return conj(car_o('acorn'.split(''), 'a'), 
                                   eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '2.8',
  body: function() { return run(function($q) { 
                       return conj(car_o('acorn'.split(''), 'a'), 
                                   eq_o('pear', $q)); }); },
  expected: ['pear']
},
{ name: '2.11',
  body: function() { return run(function($q) { 
                       var $x = lvar('x'); var $y = lvar('y');
                       return conj(car_o(['grape', 'raisin', 'pear'], $x), 
                                   car_o([['a'], ['b'], ['c']], $y),
                                   eq_o(Arrays.cons($x,$y), $q)); }); },
  expected: [['grape', 'a']]
},
{ name: '2.15',
  body: function() { return run(function($q) { 
          var $v = lvar('v'); 
          return conj(cdr_o('acorn'.split(''), $v),
                      car_o($v, $q));
        }); },
  expected: ['c']
},
{ name: '2.18',
  body: function() { return run(function($q) {
          var $x = lvar('x');
          var $y = lvar('y');
          return conj(cdr_o(['grape','raisin','pear'], $x),
                      car_o([['a'], ['b'], ['c']], $y),
                      eq_o(Arrays.cons($x, $y), $q));
        }); },
  expected: [[['raisin', 'pear'], 'a']]
},
{ name: '2.19',
  body: function() { return run(function($q) { 
          return conj(cdr_o('acorn'.split(''), 'corn'.split('')),
                      eq_o(true, $q));
        }); },
  expected: [true]
},
{ name: '2.20',
  body: function() { return run(function($q) { return cdr_o('corn'.split(''), [$q, 'r', 'n']); }); },
  expected: ['o']
},
{ name: '2.21',
  body: function() { return run(function($q) { var $x = lvar('x');
          return conj(cdr_o($q, 'corn'.split('')),
            car_o($q, $x),
            eq_o('a', $x)); }); },
  expected: ['acorn'.split('')]
},
{ name: '2.22',
  body: function() { return run(function($q) { return cons_o('abc'.split(''), 'de'.split(''), $q); }); },
  expected: [['abc'.split(''), 'd', 'e']]
},
{ name: '2.23',
  body: function() { return run(function($q) { return cons_o($q, 'abc'.split(''), 'dabc'.split('')); }); },
  expected: ['d']
},
{ name: '2.24',
  body: function() { return run(function($q) { 
          var $x = lvar('x');
          var $y = lvar('y');
          var $z = lvar('z');
          return conj(eq_o(['e', 'a', 'd', $x], $q), cons_o($y, ['a', $z, 'c'], $q)); }); },
  expected: ['eadc'.split('')]
},
{ name: '2.25',
  body: function() { return run(function($q) { return cons_o($q, ['a', $q, 'c'], ['d', 'a', $q, 'c']); }); },
  expected: ['d']
},
{ name: '2.26',
  body: function() { return run(function($q) { var $x = lvar('x');
          return conj(eq_o(['d', 'a', $x, 'c'], $q), cons_o($x, ['a', $x, 'c'], $q)); }); },
  expected: ['dadc'.split('')]
},
{ name: '2.27',
  body: function() { return run(function($q) { var $x = lvar('x');
          return conj(cons_o($x, ['a', $x, 'c'], $q), eq_o(['d', 'a', $x, 'c'], $q)); }); },
  expected: ['dadc'.split('')]
},
{ name: '2.29',
  body: function() { return run(function($q) { 
          var $d = lvar('d'); var $x = lvar('x');
          var $y = lvar('y'); var $w = lvar('w'); 
          var $s = lvar('s');
          return conj(cons_o($w, 'ans'.split(''), $s),
                      cdr_o($q, $s), car_o($q, $x), eq_o('b', $x),
                      cdr_o($q, $d), car_o($d, $y), eq_o('e', $y)); }); },
  expected: ['beans'.split('')]
},
{ name: '2.32',
  body: function() { return run(function($q) { return conj(null_o(['grape', 'raisin', 'pear']), eq_o(true, $q)); }); },
  expected: []
},
{ name: '2.33',
  body: function() { return run(function($q) { return conj(null_o([]), eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '2.34',
  body: function() { return run(function($q) { return null_o($q); }); },
  expected: [[]]
},
{ name: '2.38',
  body: function() { return run(function($q) { return conj(eq_o('pear', 'plum'), eq_o(true, $q)); }); },
  expected: []
},
{ name: '2.52',
  fresh: 'x y',
  body: function($x, $y) { return run(function($q) { return eq_o(Arrays.cons($x, Arrays.cons($y, 'salad')), $q); }); },
  expected: function($x, $y) { return [pair($x, pair($y, 'salad'))]; }
},
{ name: '2.54',
  body: function() { return run(function($q) { return conj(pair_o(Arrays.cons($q,$q)), eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '2.55',
  body: function() { return run(function($q) { return conj(pair_o([]), eq_o(true, $q)); }); },
  expected: []
},
{ name: '2.57',
  body: function() { return run(function($q) { return pair_o($q); }); },
  expected: function() { 
    var $a = FuzzyAtom.lvar('a');
    var $d = FuzzyAtom.lvar('d');
    return [pair($a, $d)]; }
},
{ name: '2.58',
  fresh: 'q',
  body: function($q) { return run0($q, pair_o(Arrays.cons($q, 'pear'))); },
  expected: function($q) { return [$q]; }
},
{ name: '3.7',
  fresh: 'q',
  body: function($q) { return run0($q, array_o(['a', 'b', $q, 'd'])); },
  expected: function($q) { return [$q]; }
},
{ name: '3.10',
  body: function() { return run(function($q) { return array_o(Arrays.cons('a', Arrays.cons('b', Arrays.cons('c', $q)))); }, 1); },
  expected: [[]]
}, { name: '3.14',
  body: function() { return run(function($q) { return array_o(Arrays.cons('a', Arrays.cons('b', Arrays.cons('c', $q)))); }, 5) },
 expected: function() { 
              var $a1 = FuzzyAtom.lvar('a');
              var $a2 = FuzzyAtom.lvar('a');
              var $a3 = FuzzyAtom.lvar('a');
              var $a4 = FuzzyAtom.lvar('a');
              return [ [], [$a1], [$a1,$a2], [$a1,$a2,$a3], [$a1,$a2,$a3,$a4] ];
            }
},
{ name: '3.20',
  body: function() { return run(function($q) { return aoa_o($q); }, 1); },
  expected: [[]]
},
{ name: '3.21',
  body: function() { var $x = lvar('x'); var $y = lvar('y');
    return run(function($q) { return conj(aoa_o([['a', 'b'], [$x, 'c'], ['d', $y]]), eq_o(true, $q)); 
    }); },
  expected: [true]
},
{ name: '3.22',
  body: function() { var $x = lvar('x');
    return run(function($q) { return conj(aoa_o(pair(['a', 'b'], $x)), eq_o(true, $q)); 
    },1); },
  expected: [true]
},
{ name: '3.23',
  body: function() { return run(function($q) { return aoa_o(pair(['a','b'],pair(['c','d'],$q))); }, 1); },
  expected: [[]]
},
{ name: '3.24',
  body: function() { return run(function($q) { return aoa_o(pair(['a','b'],pair(['c','d'],$q))); },5); },
  expected: [ [], [[]], [[],[]], [[],[],[]], [[],[],[],[]] ]
},
{ name: '3.32',
  body: function() { return run(function($q) { return conj(twins_o(['tofu', 'tofu']), eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '3.33',
  body: function() { return run(function($q) { return twins_o(['tofu', $q]); }); },
  expected: ['tofu']
},
{ name: '3.38',
  body: function() { return run(function($q) { return aot_o(pair(['g','g'], $q)); },1); },
  expected: [[]]
},
{ name: '3.42',
  body: function() { return run(function($q) { return aot_o(pair(['g','g'], $q)); },5); },
  expected: function() {
    var $x1 = FuzzyAtom.lvar('x');
    var $x2 = FuzzyAtom.lvar('x');
    var $x3 = FuzzyAtom.lvar('x');
    var $x4 = FuzzyAtom.lvar('x');
    return [[], 
            [[$x1,$x1]], 
            [[$x1,$x1],[$x2,$x2]], 
            [[$x1,$x1],[$x2,$x2],[$x3,$x3]], 
            [[$x1,$x1],[$x2,$x2],[$x3,$x3],[$x4,$x4]]];
  }
},
{ name: '3.45',
  body: function() { return run(function($q) { 
    var $w = lvar('w'); var $x = lvar('x'); 
    var $y = lvar('y'); var $z = lvar('z');
    return conj(aot_o(pair(['g','g'], pair(['e', $w], pair([$x, $y], $z)))),
                function(s) { return eq_o([$w, [$x, $y], $z], $q)(s); }); }, 5); },
  expected: function() {
    var $y = FuzzyAtom.lvar('y');
    var $x1 = FuzzyAtom.lvar('x');
    var $x2 = FuzzyAtom.lvar('x');
    var $x3 = FuzzyAtom.lvar('x');
    var $x4 = FuzzyAtom.lvar('x');
    return [['e',[$y,$y],[]], 
            ['e',[$y,$y],[[$x1,$x1]]],
            ['e',[$y,$y],[[$x1,$x1],[$x2,$x2]]],
            ['e',[$y,$y],[[$x1,$x1],[$x2,$x2],[$x3,$x3]]],
            ['e',[$y,$y],[[$x1,$x1],[$x2,$x2],[$x3,$x3],[$x4,$x4]]]];
  }
},
{ name: '3.47',
  body: function() { return run(function($q) {  
          var $w = lvar('w'); var $x = lvar('x'); 
          var $y = lvar('y'); var $z = lvar('z');
          return conj(eq_o(pair(['g','g'],pair(['e',$w],pair([$x,$y],$z))), $q),
                      aot_o($q));
        }, 3); },
  expected: function() { 
    var $y = FuzzyAtom.lvar('y');
    var $x1 = FuzzyAtom.lvar('x');
    var $x2 = FuzzyAtom.lvar('x');
    return [[['g','g'],['e','e'],[$y,$y]],
            [['g','g'],['e','e'],[$y,$y],[$x1,$x1]],
            [['g','g'],['e','e'],[$y,$y],[$x1,$x1],[$x2,$x2]],];
  }
},
{ name: '3.49',
  body: function() { return run(function($q) { 
          var $w = lvar('w'); var $x = lvar('x'); 
          var $y = lvar('y'); var $z = lvar('z');
          return conj(eq_o(pair(['g','g'], pair(['e',$w], pair([$x,$y], $z))), $q),
                      arrayof_o(twins_o, $q));
        }, 3); },
  expected: function() { 
    var $y = FuzzyAtom.lvar('y');
    var $x1 = FuzzyAtom.lvar('x');
    var $x2 = FuzzyAtom.lvar('x');
    return [[['g','g'],['e','e'],[$y,$y]],
            [['g','g'],['e','e'],[$y,$y],[$x1,$x1]],
            [['g','g'],['e','e'],[$y,$y],[$x1,$x1],[$x2,$x2]]];
  }
},
{ name: '3.57',
  body: function() { return run(function($q) { return conj(member_o('olive', ['virgin', 'olive', 'oil']), eq_o(true, $q)); }); },
  expected: [true]
},
{ name: '3.58',
  body: function() { return run(function($q) { return member_o($q, ['hummus', 'with', 'pita']); }, 1); },
  expected: ['hummus']
},
{ name: '3.59',
  body: function() { return run(function($q) { return member_o($q, ['with', 'pita']); }, 1); },
  expected: ['with']
},
{ name: '3.60',
  body: function() { return run(function($q) { return member_o($q, ['pita']); }, 1); },
  expected: ['pita']
},
{ name: '3.61',
  body: function() { return run(function($q) { return member_o($q, []); }); },
  expected: []
},
{ name: '3.62',
  body: function() { return run(function($q) { return member_o($q, ['hummus', 'with', 'pita']); }); },
  expected: ['hummus', 'with', 'pita']
},
{ name: '3.66',
  body: function() { return run(function($q) { return member_o('e', ['pasta', $q, 'fagioli']); }, 1); },
  expected: ['e']
},
{ name: '3.69',
  body: function() { return run(function($q) { return member_o('e', ['pasta', 'e', $q, 'fagioli']); }, 1); },
  expected: function() { 
    var $q = FuzzyAtom.lvar('q');
    return [$q];
  }
},
{ name: '3.70',
  body: function() { return run(function($q) { return member_o('e', ['pasta', $q, 'e', 'fagioli']); }, 1); },
  expected: ['e']
},
{ name: '3.71',
  body: function() { return run(function($q) { 
    var $x = lvar('x'); var $y = lvar('y');
    return conj(member_o('e', ['pasta', $x, 'fagioli', $y]),
                eq_o([$x,$y], $q)); }); },
  expected: function() {
    var $x = FuzzyAtom.lvar('x');
    var $y = FuzzyAtom.lvar('y');
    return [['e', $y],[$x,'e']];
  }
},
{ name: '3.73',
  body: function() { return run(function($q) { return member_o('tofu', $q); }, 1); },
  expected: function() { 
    var $d = FuzzyAtom.lvar('d');
    return [pair('tofu', $d)];
  }
},
{ name: '3.76',
  body: function() { return run(function($q) { return member_o('tofu', $q); }, 5); },
  expected: function() { 
    var $a1 = FuzzyAtom.lvar('a');
    var $a2 = FuzzyAtom.lvar('a');
    var $a3 = FuzzyAtom.lvar('a');
    var $a4 = FuzzyAtom.lvar('a');
    var $d1 = FuzzyAtom.lvar('d');
    var $d2 = FuzzyAtom.lvar('d');
    var $d3 = FuzzyAtom.lvar('d');
    var $d4 = FuzzyAtom.lvar('d');
    var $d5 = FuzzyAtom.lvar('d');
    return [pair('tofu', $d1),
            pair($a1, pair('tofu', $d2)),
            pair($a1, pair($a2, pair('tofu', $d3))),
            pair($a1, pair($a2, pair($a3, pair('tofu', $d4)))),
            pair($a1, pair($a2, pair($a3, pair($a4, pair('tofu', $d5)))))];
  }
},
{ name: '3.80',
  body: function() { return run(function($q) { return pmember_o('tofu', $q); }, 5); },
  expected: function() { 
    var $a1 = FuzzyAtom.lvar('a');
    var $a2 = FuzzyAtom.lvar('a');
    var $a3 = FuzzyAtom.lvar('a');
    var $a4 = FuzzyAtom.lvar('a');
    return [['tofu'],
            [$a1,'tofu'],
            [$a1,$a2,'tofu'],
            [$a1,$a2,$a3,'tofu'],
            [$a1,$a2,$a3,$a4,'tofu']];
  }
}
]);
