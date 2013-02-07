// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

var DEBUG = false;


var ScreenShotInBackground = {};

ScreenShotInBackground.screenshot = function(tabId, callback, errback) {
   console.log("ScreenShotInBackground.screenshot " + tabId);
   chrome.tabs.get(tabId, function(tab) {
      chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}, callback);
   });
};

