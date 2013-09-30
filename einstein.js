var fish = function($q) {
  return conj(
      eq_o([_(),_(),[_(),_(),'milk',_(),_()],_(),_()], $q),
      eq_o($q, [['norwegian', _(), _(), _(), _()], _(), _(), _(), _()]),
      next_to(['norwegian',_(),_(),_(),_()],[_(),_(),_(),_(),'blue'], $q),
      on_right([_(), _(), _(), _(), 'green'], [_(), _(), _(), _(), 'white'], $q),
      member_o(['englishman', _(), _(), _(),'red'], $q),
      member_o([_(), 'dunhill', _(), _(),'yellow'], $q),
      member_o(['swedish', _(), _(), 'dog',_()], $q),
      member_o([_(), 'blue master', 'beer', _(),_()], $q),
      member_o([_(), 'pall mall', _(), 'bird',_()], $q),
      member_o(['danish', _(), 'tea', _(),_()], $q),
      member_o([_(), _(), 'coffee', _(),'green'], $q),
      member_o(['german', 'prince', _(), _(),_()], $q),
      next_to([_(),_(),_(),'horse',_()],[_(),'dunhill',_(),_(),_()], $q),
      next_to([_(),'blend',_(),_(),_()],[_(),_(),_(),'cat',_()], $q),
      next_to([_(),'blend',_(),_(),_()],[_(),_(),'water',_(),_()], $q) );
};

assert_all('einstein', [
    {
      body : function() { return run(function($q) { return fish($q); }); },
      expected : function() {
        var $_ = FuzzyAtom.lvar('_');

        return [[["norwegian","dunhill","water","cat","yellow"],
                 ["danish","blend","tea","horse","blue"],
                 ["englishman","pall mall","milk","bird","red"],
                 ["german","prince","coffee",$_,"green"],
                 ["swedish","blue master","beer","dog","white"]]];
      }
    },
    {
      body : function() { return run(function($q) {
               var $h = lvar('h');
               return conj( fish($h),
                            member_o([$q, _(), _(), 'fish', _()], $h) );
             }); },
      expected : ['german']
    }
]);
