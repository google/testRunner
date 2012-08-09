// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("testDevtools begins %o", chrome);

chrome.devtools.panels.create("testRunner", "testRunnerIcon.png", "testRunnerPanel.html", function(panel) {
  panel.onShown.addListener(function (panel_window) {
    console.log("testRunnerPanel onShown");
  });
});

