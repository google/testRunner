// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("testDevtools begins %o", chrome);

var reloadedForTesting = false;

function loadTestRunnerScript() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../testRunner.js", false);
  xhr.send(null);
  return  xhr.responseText;
}

var testRunnerScript = loadTestRunnerScript();

function reloadForTesting() {
  console.log("injectedScript: ", testRunnerScript);
  reloadedForTesting = true;
  var clearAll = "if (window.InspectorTest) window.InspectorTest.removeSniffers();\n"
  clearAll += "delete window.InspectorTest;\n";
  clearAll += "delete window.results";
  var forWebInspector = {
      method: "evaluateInWebInspector",
      args: [clearAll, "clearAll.js"]
  };
  window.parent.postMessage(forWebInspector, "*")
  chrome.devtools.inspectedWindow.reload({injectedScript: testRunnerScript});
}

function beginTesting() {
  chrome.devtools.inspectedWindow.eval(
    "window.testRunner.forWebInspector", 
    function(forWebInspector) {
      console.log("beginTesting evaled forWebInspector "+forWebInspector.method, forWebInspector);
      if (forWebInspector) 
        window.parent.postMessage(forWebInspector, "*");
    });
}

function onNavigated(url){
  console.log("onNavigated "+url+' reloadedForTesting '+reloadedForTesting);
  if (reloadedForTesting) {
    reloadedForTesting = false;
    beginTesting();
  } else {
    reloadForTesting();
  }
}

function lookForEvaluateEvent(message) {
  console.log("lookForEvaluateEvent "+message.text);
  if (message.text .indexOf('testRunnerMessage:')=== 0) {
    beginTesting();
  }
}

function enableTesting() {
  //chrome.devtools.network.onNavigated.addListener(onNavigated);
  chrome.experimental.devtools.console.onMessageAdded.addListener(lookForEvaluateEvent);
}

chrome.devtools.inspectedWindow.eval(
  "window.location.href",
  function onEval(url) {
    console.log("url "+url);
    if (url.indexOf('/inspector/') !== -1) {  // We are the victim of testing
      enableTesting();
      chrome.devtools.panels.create("testRunner", "testRunnerIcon.png", "testRunnerPanel.html", function(panel) {
          panel.onShown.addListener(function (panel_window) {
            panel_window.addEventListener('message', function(event) {
              reloadForTesting();
            });
          });
      });
    }
  }
);

