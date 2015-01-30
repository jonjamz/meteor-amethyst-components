var loadReactiveProperties = function (properties) {
  if (!this._properties)
      this._properties = new ReactiveObject({});

  if (!this._propertySchemas)
    this._propertySchemas = {};

  if (!this._propertyDefaults)
    this._propertyDefaults = {};

  if (typeof properties !== 'undefined') {
    check(properties, Match.Where(function(x) {
        check(x, Object);
        var val;
        for (key in x) {
          if (!x.hasOwnProperty(key)) continue; // Skip this iteration
          check(key, String);
          val = x[key];
           check(val, Match.ObjectIncluding({
             default: Match.Any,
             schema: Match.Any
           }));
        }
        return true;
      })
    );

    var val;
    for (name in properties) {
      if (!properties.hasOwnProperty(name)) continue;
      val = properties[name];
      this._propertySchemas[name] = val.schema;
      this._properties.defineProperty(name, val.default);
      this._propertyDefaults[name] = val.default;
    };
  }
};

var deleteReactiveProperties = function () {
  delete this._properties;
  delete this._propertySchemas;
  delete this._propertyDefaults;
};

var setReactiveProperties = function (name, val) {
  var schema = this._propertySchemas[name];
  check(val, schema);
  this._properties[name] = val;
  return this; // Allow us to chain
};

var getReactiveProperties = function (name) {
  check(name, String);
  return this._properties[name];
};

var incrementReactiveProperties = function (name) {
  check(name, String);
  return this._properties[name]++;
};

var decrementReactiveProperties = function (name) {
  check(name, String);
  return this._properties[name]--;
};

var toggleReactiveProperties = function (name) {
  check(name, String);
  if (this._properties[name] === true) {
    return this._properties[name] = false;
  } else if (this._properties[name] === false) {
    return this._properties[name] = true;
  }
}

var setDefaultProperty = function (name) {
  check(name, String);
  return this._properties[name] = this._propertyDefaults[name];
};

var setAllDefaultProperties = function () {
  for (var prop in this._properties) {
    this._properties[prop] = this._propertyDefaults[prop];
  }
};

var safeReactiveProperties = {
  name: 'safeReactiveProperties',
  options: {
    loaded: loadReactiveProperties,
    unloaded: deleteReactiveProperties,
    api: {
      create: loadReactiveProperties,
      set: setReactiveProperties,
      get: getReactiveProperties,
      inc: incrementReactiveProperties,
      dec: decrementReactiveProperties,
      toggle: toggleReactiveProperties,
      setDefault: setDefaultProperty,
      setAllDefaults: setAllDefaultProperties
    }
  }
};

A.subjects.save(safeReactiveProperties);








