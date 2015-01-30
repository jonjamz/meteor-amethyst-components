// Sets up Meteor.publish/Meteor.subscribe groups in components
// ------------------------------------------------------------
// Notes:

// Ideally, you'll construct the component once on the server, on server start
// that will allow you to do cool things like simple/automatic pagination
// For example, if (Meteor.isServer) new Component()

var subWithRef = function (name, options, onReady, onError) {
  var calledOptions = {};

  // Options can be a function that returns an object, or simply an object with
  // methods that return strings.
  if (typeof options !== 'function') {

    // Validate that options is an object, since it's not a function.
    if (Object.prototype.toString.call(options) !== '[object Object]')
      throw new Error("Options " + options + "must be an object or function!");

    // Loop through options and execute any functions.
    for (key in options) {
      if (!options.hasOwnProperty(key)) continue;
      calledOptions[key] = typeof options[key] === 'function' ?
        options[key].call(this) : options[key];
    };
  } else {

    // Options is a function. That means we need to call it to get the object inside,
    // because it's wrapped to preserve reactivity.
    calledOptions = options.call(this);
  }

  // Return sub.
  return Meteor.subscribe(name, calledOptions, {
    onReady: onReady,
    onError: onError
  });
};

var createPubSubs = function (obj) {
  check(obj,
    Match.Where(function (pubSubs) {
      check(pubSubs, Match.ObjectIncluding({uniqueName: String}));
      var val;

      // Iterate through pubSub groups and validate them
      for (key in pubSubs) {
        if (key === 'uniqueName' || !pubSubs.hasOwnProperty(key)) continue;
        val = pubSubs[key];
        check(key, Match.Optional(String));
        check(val, Match.ObjectIncluding({
          publish: Match.Optional(Function),
          subscribe: Match.Optional(Match.ObjectIncluding({
            start: Match.Optional(Boolean),
            reactive: Match.Optional(Boolean),
            options: Match.Optional(Match.OneOf(Object, Function)),
            onReady: Match.Optional(Function),
            onError: Match.Optional(Function)
          }))
        }));
      }
      return true;
    })
  );

  if (Meteor.isClient) {
    if (!this._subscriptions)
      this._subscriptions = {};
    if (!this.subscriptions)
      this.subscriptions = {};
  }

  // Iterate through pubSub groups and create them
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var val = obj[key];

    // Create a unique pub/sub name for the pair
    var pubSubName = obj.uniqueName + key;

    // Subscribe on client, publish on server
    if (Meteor.isClient) {
      if (val.subscribe) {
        this._subscriptions[key] = { // Store config so we can start it later
          context:    this,
          pubSubName: pubSubName,
          options:    val.subscribe.options || {},
          onReady:    val.subscribe.onReady || function () {},
          onError:    val.subscribe.onError || function () {}
        };
      }
    } else if (Meteor.isServer) { // Start it immediately on the server
      if (val.publish) {
        Meteor.publish(pubSubName, val.publish);
      }
    }
  }
};

var destroyPubSubs = function () {
  var val;
  for (key in this.subscriptions) {
    if (!this.subscriptions.hasOwnProperty(key)) continue;
    val = this.subscriptions[key];
    if (val.stop) val.stop();
  };
  delete this._subscriptions;
  delete this._subscriptionStatus;
};

var getSub = function (name) {
  if (this._subscriptions[name])
    return this._subscriptions[name];
};

var stopSub = function (name) {
  if (this.subscriptions[name])
    return this.subscriptions[name].stop();
};

var startSub = function (name) {
  if (this.subscriptions[name])
    this.subscriptions[name].stop();
  var config = this._subscriptions[name];
  return this.subscriptions[name] = subWithRef.call(
    config.context,
    config.pubSubName,
    config.options,
    config.onReady,
    config.onError
  );
};

var startSubReactive = function (name) {
  if (this.subscriptions[name])
    this.subscriptions[name].stop();
  var config = this._subscriptions[name];
  return this.subscriptions[name] = Deps.autorun(function () {
    subWithRef.call(
      config.context,
      config.pubSubName,
      config.options,
      config.onReady,
      config.onError
    )
  });
};

var pubSubs = {
  name: 'pubSubs',
  options: {
    loaded: createPubSubs,
    unloaded: destroyPubSubs,
    api: {
      create: createPubSubs,
      getSub: getSub,
      stopSub: stopSub,
      startSub: startSub,
      startSubReactive: startSubReactive
    }
  }
};

A.subjects.save(pubSubs);









