// Sets up a façade for use as a public API in a component
// -------------------------------------------------------
// Notes:

// For example, with a component using safeReactiveProperties subject:

// A.subjects.load(this, 'methodFacade');
// this.methodFacade.map({
//   set: this.safeReactiveProperties.set,
//   get: this.safeReactiveProperties.get
// });

// From the outside, you can now call Component.get().

var wrapFunc = function (funcToWrap) {
  return function () {
    return funcToWrap.apply(this, arguments);
  };
};

// Takes an object and wraps its functions, adding them to `this`
var mapFuncs = function (map) {
  // console.log("===== METHOD FACADE =====");
  // console.log("=== map:", map, "context:", this);
  check(map, Match.Optional(Object));
  for (key in map) {
    if (!map.hasOwnProperty(key)) continue;
    this[key] = wrapFunc(map[key]);
  };
};

var methodFacade = {
  name: 'methodFacade',
  options: {
    loaded: mapFuncs,
    api: {
      map: mapFuncs
    }
  }
};

A.subjects.save(methodFacade);










