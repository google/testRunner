// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

function concatObjects() {
  var obj = {};
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    Object.keys(arg).forEach(function(key){
      obj[key] = arg[key];
    });
  }
  return obj;
}

var BackgroundServerAPI = concatObjects(XHRInBackground, ScreenShotInBackground);