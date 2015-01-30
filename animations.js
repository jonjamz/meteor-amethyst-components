// A set of shared animations that can be run on component UI items
// ----------------------------------------------------------------
var runTimes = function(func, times) { // TODO: put this in a different subject
  var ran = 0, max = !!times ? times : 1;
  return function () {
    if (ran === max) return func = null;
    ran++;
    return func.apply(this, arguments);
  };
};

var flash = function (selector, callback) {
  if (Meteor.isServer) return;
  var cb = !!callback ? callback : function () {};
  $(selector).fadeIn(function () {
    $(this).delay(2000).fadeOut(cb);
  });
};

var memoFirstBgColor = {};
var memoFirstColor = {};

// Get the color of the selector in a non-hover, non-focus state
var getOriginalCSS = function (selector, attribute) {
  var clone = $(selector)
    .clone(true)
    .css({
    'position':'fixed',
    'top': '-9999px',
    'left': '0px',
    'width': '20px',
    'height': '20px'
    })
    .insertAfter(selector);
  var val = $(clone).css(attribute);
  clone.remove(); // Destroy the element
  return val;
};

var bgColorFlash = function (selector, color) {
  if (Meteor.isServer) return;
  if (!memoFirstBgColor[selector])
    memoFirstBgColor[selector] = getOriginalCSS(selector, 'background-color');
  var firstColor = memoFirstBgColor[selector];
  $(selector).animate({
    backgroundColor: color
  }, 200, function() {
    $(this).stop(true, false).delay(200).animate({
      backgroundColor: firstColor
    }, 1600);
  });
};

var textColorFlashUntilClick = function (selector, color) {
  if (Meteor.isServer) return;
  if (!memoFirstColor[selector])
    memoFirstColor[selector] = getOriginalCSS(selector, 'color');
  var firstColor = memoFirstColor[selector];
  $(selector).animate({
    color: color
  }, 200, function() {
    $(this).css({
      'text-shadow': '0 0 10px ' + color
    });
    $(this).click(runTimes(function() {
      $(this).css({
        'text-shadow': 'none'
      });
      $(this).stop(true, false).animate({
        color: firstColor
      }, 1600);
    }));
  });
}

var loaded = function () {
  if (Meteor.isServer) return;
  if (typeof jQuery === 'undefined')
    throw new Error("jQuery is required for the animations subject!");
};

var animations = {
  name: 'RMS__animations',
  options: {
    loaded: loaded,
    api: {
      flash: flash,
      bgColorFlash: bgColorFlash,
      textColorFlashUntilClick: textColorFlashUntilClick
    }
  }
};

A.subjects.save(animations);







