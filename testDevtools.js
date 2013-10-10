// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("testDevtools begins %o", chrome);

chrome.devtools.panels.create("testRunner", "testRunnerIcon.png", "testRunnerPanel.html", function(panel) {
  panel.onShown.addListener(function (panel_window) {
    console.log("testRunnerPanel onShown");
  });
});

chrome.devtools.panels.sources.createSidebarPane("testRunner", function(extensionPane) {
  console.log("testRunner sidebar created ", extensionPane);
  extensionPane.setPage("testRunnerPanel.html");
  //extensionPane.setHeight("26px");
  extensionPane.onShown.addListener(function(win) {
    console.log("extensionPane onShown, win: ", win);
    runtimeStatus.extensionPaneWindow = win;
  });
});