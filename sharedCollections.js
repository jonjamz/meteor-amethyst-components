// Sets up Meteor.Collections private to the scope of all components
// -----------------------------------------------------------------
// Notes:

// Components will share collections with the same name, unless `local` = true.
// On the client, where only some components will be instantiated at a time,
// we won't have all our collections or subscriptions loaded on startup.

// Using collections this way in Meteor, you must rely on allow and deny rules, not
// Meteor methods.

// If you're building your entire app with Amethyst, this subject will prevent
// global database variables (inaccessible from the browser console).

// You can define the database setup for all collections in a global config object,
// and then reference that config in all components when they use A.subjects.load()
// to prevent code duplication. Or, create all collections in a single component.

var collections = {};
this.__db = function () { // Dev visibility
  return collections;
};

var createSharedCollection = function (name, options) {
  if (!collections.hasOwnProperty(name))
    collections[name] = new Meteor.Collection(name, options);
};

var loadSharedCollections = function () { // Takes a list of collection objects
  if (arguments.length > 0) {
    var obj;
    for (var i = arguments.length - 1; i >= 0; i--) {
      obj = arguments[i];

      // You don't have to pass any object into load if you just want access to shared collections
      // But you should pass names for the sake of declaring what you're using
      if (!!obj) {
        check(obj, Match.ObjectIncluding({
          name: String,
          local: Match.Optional(Boolean), // Makes a null collection
          options: Match.Optional(Match.ObjectIncluding({
            connection: Match.Optional(Match.OneOf(Object, null)),
            idGeneration: Match.Optional(String),
            transform: Match.Optional(Function)
          })),
          allow: Match.Optional(Object),
          deny: Match.Optional(Object)
        }));

        // Pretty much always check if required object exists instead of overwriting it
        if (!this._collections)
          this._collections = {};

        // Give the option to create a local, unsynchronized db
        if (obj.hasOwnProperty('local') && obj.local === true) {
          this._collections[obj.name] = new Meteor.Collection(null, obj.options);
        } else {
          createSharedCollection(obj.name, obj.options);
        }
      }
    };
  }
};

// i.e. this.sharedCollections('name').find(...).fetch()
var getSharedCollectionRef = function (name) {
  if (this._collections.hasOwnProperty(name)) return this._collections[name];
  return collections[name];
};

var sharedCollections = {
  name: 'sharedCollections',
  options: {
    loaded: loadSharedCollections,
    api: getSharedCollectionRef // Function on API is possible
  }
};

A.subjects.save(sharedCollections);










