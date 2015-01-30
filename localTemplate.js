// Copies a template and allows it to be configured within a component
// -------------------------------------------------------------------
// Notes:

// The pattern so far for handling client/server is to no-op the client-only functions
// if on the server (wrap with condition on the inside), and wrap anything modifying a
// client-only global with a condition on the outside (like Template below)
// Template.events and Template.helpers will be unique for each copy of a template

if (Meteor.isClient) {

  var _storedTemplateFuncs = {};

  var _oldTemplateDefine = Template.__define__;

  // Wrap Template.__define__ to store template functions in the local scope
  Template.__define__ = function (name, raw_func) {
    _storedTemplateFuncs[name] = raw_func;
    return _oldTemplateDefine(name, raw_func);
  };

  // Get a copy of a template with randomized name
  var getTemplateCopy = function (copyOf) {
    var name = copyOf + '__' + Random.hexString(12);
    _storedTemplateFuncs[name] = _storedTemplateFuncs[copyOf];
    Template.__define__(name, _storedTemplateFuncs[copyOf]);
    return {
      template: Template[name],
      alias: name
    };
  };

}

// Combine template and "this" so we get access to the local subject APIs
var bindExtendedContext = function (func, context) {
  newFunc = function () {
    var newContext = {};
    for (key in this) {
      if (!this.hasOwnProperty(key)) continue;
      newContext[key] = this[key];
    }
    for (key in context) {
      if (!context.hasOwnProperty(key)) continue;
      newContext[key] = context[key];
    }
    return func.apply(newContext, arguments);
  };
  return newFunc;
};

var createLocalTemplate = function (obj) {

  // Setup even if it's just A.subjects.load without any args
  if (!this._templates && Meteor.isClient)
    this._templates = {};
  if (!this._templateAliases && Meteor.isClient)
    this._templateAliases = {};

  if (typeof obj !== 'undefined' && Meteor.isClient) {
    check(obj, Match.ObjectIncluding({
      template: String,
      events: Match.Optional(Object),
      helpers: Match.Optional(Object),
      created: Match.Optional(Function),
      rendered: Match.Optional(Function),
      destroyed: Match.Optional(Function),
      preserve: Match.Optional(Match.OneOf(Array, Object))
    }));

    // Make the copy of the template, adding helpers and events
    if (!Template[obj.template])
      throw new Error('Template ' + obj.template + ' not defined!');
    var templateCopy = getTemplateCopy(obj.template);

    // Store reference to unique template locally
    this._templates[obj.template] = templateCopy.template;

    // Store the name of the unique template locally
    this._templateAliases[obj.template] = templateCopy.alias;

    if (obj.helpers) {
      for (key in obj.helpers) {
        if (!obj.helpers.hasOwnProperty(key)) continue;
        if (typeof obj.helpers[key] === 'string') {
          this._templates[obj.template][key] = obj.helpers[key];
        } else if (typeof obj.helpers[key] === 'function') {
          this._templates[obj.template][key] = bindExtendedContext(obj.helpers[key], this);
        } else {
          throw new Error('Helper ' + key + ' for ' + obj.template + ' must be a function or string!');
        }
      }
    }

    if (obj.events) {
      var boundEventHandlers = {};
      for (key in obj.events) {
        if (!obj.events.hasOwnProperty(key)) continue;
        boundEventHandlers[key] = bindExtendedContext(obj.events[key], this);
      }
      this._templates[obj.template].events = boundEventHandlers;
    }

    if(obj.renderAreas) {
      var self = this;
      this._areas = {};
      this._areaDep = new Deps.Dependency(); // TODO: replace this by reactiveObject;
      for (aid in obj.renderAreas) {
        this._areas[obj.renderAreas[aid]] = [];
        this._templates[obj.template].renderArea = function(area) {
          self._areaDep.depend();
          return new Handlebars.SafeString(Meteor.render(function() {
            var str = '';
            _.each(self._areas[area], function(fun) {
              str += 'fun';
            });
            return str;
          }));
        };
      }
    }

    // Add the rest of the schtuff...
    if (obj.created) this._templates[obj.template].created = bindExtendedContext(obj.created, this);
    if (obj.rendered) this._templates[obj.template].rendered = bindExtendedContext(obj.rendered, this);
    if (obj.destroyed) this._templates[obj.template].destroyed = bindExtendedContext(obj.destroyed, this);
    if (obj.preserve) this._templates[obj.template].preserve = obj.preserve;

    return {
      template: obj.template,
      namespace: '_templates'
    };
  }
};

var getStatic = function (template, data) {
  check(name, String);
  check(data, Match.Optional(Object));
  var safeData = data || {};
  return this._templates[template](data);
};

var getReactive = function (template) {
  return Meteor.render(this._templates[template]);
};

var getAlias = function (template) {
  return this._templateAliases[template];
};

var loadInto = function(layout, where, template) {
  // console.log("LOAD", this, "INTO", layout);
  layout._loadIntoArea(where, this._templates[template]); //getReactive(template));
  // return $(where)[0].innerHtml = getReactive(template);
};

var appendInto = function(layout, where, template) {
  layout._appendIntoArea(where, this._templates[template]); //getReactive(template));
  // return $(where).append(getReactive(template));
};

var prependInto = function(layout, where, template) {
  layout._prependIntoArea(where, this._templates[template]); //getReactive(template));
  // return $(where).prepend(getReactive(template));
};

var _loadIntoArea = function(area, reactive) {
  this._areas[area] = [reactive];
  this._areaDep.changed();
};

var _prependIntoArea = function(area, reactive) {
  this._areas[area].push(reactive); // TODO: of course, this should go to the beginning of the table
  this._areaDep.changed();
};

var _appendIntoArea = function(area, reactive) {
  this._areas[area].push(reactive);
  this._areaDep.changed();
};

var localTemplate = {
  name: 'localTemplate',
  options: {
    loaded: createLocalTemplate,
    api: {
      create: createLocalTemplate,
      getStatic: getStatic,
      getReactive: getReactive,
      getAlias: getAlias,
      loadInto: loadInto,
      appendInto: appendInto,
      prependInto: prependInto,
      _loadIntoArea: _loadIntoArea,
      _prependIntoArea: _prependIntoArea,
      _appendIntoArea: _appendIntoArea,
    }
  }
};

A.subjects.save(localTemplate);










