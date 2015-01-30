// Specify how to handle different types of errors from one place
// --------------------------------------------------------------

// Use this in place of a typical err, res callback to cut out the extra step
// Imagine, you could send all logs to a remote logger just by changing one line of code
var logifer = function (msg, func) {
  return function (err, res) {
    if (typeof err !== 'undefined' && err !== null && err.stack) {
      if (typeof msg === 'string') { // msg is optional.
        console.log(msg, err, err.stack);
      } else {
        console.log(err, err.stack);
      }
    } else {
      return func(res);
    }
  };
};

// Log and flash an HTML element if err
var flashifer = function (el, msg, func) {
  var that = this;
  return function (err, res) {
    if (typeof err !== 'undefined' && err !== null && err.stack) {
      if (that.RMS__animations) that.RMS__animations.flash(el);
      if (typeof msg === 'string') { // msg is optional.
        console.log(msg, err, err.stack);
      } else {
        console.log(err, err.stack);
      }
    } else {
      return func(res);
    }
  };
};

var loaded = function (options) {};

var errors = {
  name: 'errors',
  options: {
    loaded: loaded,
    api: {
      logifer: logifer,
      flashifer: flashifer
    }
  }
};

A.subjects.save(errors);