var first_o = function($q, $f) {
  var $r = lvar('r');
  return cons_o($f, $r, $q);
};

var second_o = function($q, $s) {
  var $f = lvar('f');
  var $r = lvar('r');
  var $t = lvar('t');
  return conj(cons_o($f, $r, $q),
              cons_o($s, $t, $r));
};

var last_o = function($q, $l) {
  return conde([null_o($q), fail],
               [cdr_o($q, []), first_o($q, $l)],
               fresh('d', function($d) {
                 return conj(cdr_o($q, $d),function(s) { return last_o($d, $l)(s); }); }));
};

var third_o = function($q, $u) {
  var $f = lvar('f');
  var $r = lvar('r');
  var $s = lvar('s');
  var $t = lvar('t');
  var $v = lvar('v');
  return conj(cons_o($f, $r, $q),
              cons_o($s, $t, $r),
              cons_o($u, $v, $t));
};

var on_right = function($x, $y, $l) {
  var $fst = lvar('fst');
  var $rst = lvar('rst');
  var $snd = lvar('snd');
  return conj(cons_o($fst, $rst, $l),
              first_o($rst, $snd),
              conde([eq_o($fst, $x), eq_o($snd, $y)],
                    function(s) { return on_right($x,$y,$rst)(s); }));
};

var next_to = function($x, $y, $l) {
  return disj(on_right($x, $y, $l),
              on_right($y, $x, $l));
}

var zebra = function($q) {
  return conj(
    eq_o([_(),_(),[_(),_(),'milk',_(),_()],_(),_()], $q),
    eq_o($q, [['norwegian', _(), _(), _(), _()], _(), _(), _(), _()]),
    next_to([_(), _(), _(), _(), 'blue'], ['norwegian', _(), _(), _(), _()], $q),
    on_right([_(), _(), _(), _(), 'ivory'], [_(), _(), _(), _(), 'green'], $q),
    member_o(['englishman', _(), _(), _(),'red'], $q),
    member_o([_(), 'kools', _(), _(),'yellow'], $q),
    member_o(['spaniard', _(), _(),'dog', _()], $q),
    member_o([_(), _(),'coffee',_(),'green'], $q),
    member_o(['ukrainian',_(),'tea',_(),_()], $q),
    member_o([_(),'luckystrikes','oj',_(),_()], $q),
    member_o(['japanese','parliaments',_(),_(),_()], $q),
    member_o([_(),'oldgolds',_(),'snails',_()], $q),
    next_to([_(),_(),_(),'horse',_()],[_(),'kools',_(),_(),_()], $q),
    next_to([_(),_(),_(),'fox',_()],[_(),'chesterfields',_(),_(),_()], $q));
};

assert_all('zebra', [
    {
      body : function() { return run(function($q) { return zebra($q); }); },
      expected : function() {
        var $_1 = FuzzyAtom.lvar('_');
        var $_2 = FuzzyAtom.lvar('_');
        return [[["norwegian","kools",$_1,"fox","yellow"],
                 ["ukrainian","chesterfields","tea","horse","blue"],
                 ["englishman","oldgolds","milk","snails","red"],
                 ["spaniard","luckystrikes","oj","dog","ivory"],
                 ["japanese","parliaments","coffee",$_2,"green"]]];
      }
    },
    {
      body : function() { return run(function($q) {
               var $h = lvar('h');
               return conj( zebra($h),
                            member_o([$q, _(), _(), 'zebra', _()], $h) );
             }); },
      expected : ['japanese']
    }
]);

