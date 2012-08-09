// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

function setTestCaseURL() {
  // Put the URL into the UI
  function onURL(url) {
    var testCaseURL = document.querySelector(".testCaseURL");
    testCaseURL.value = url;
  }
  // Reach into the devtools web app can find out what window it is inspecting
  chrome.devtools.inspectedWindow.eval("WebInspector.inspectedPageURL", onURL);
}

function getTestCaseURL() {
  return document.querySelector(".testCaseURL").value;
}

function getTestingScript(testCaseURL) {

  // This function will be sent as source into the to-be-tested-devtools
  function addFrameBeforeLoad(testCaseURL) {
    console.log("addFrameBeforeLoad "+testCaseURL);
    function onDOMContentLoaded() {
      // inspectedWindow.eval() operates on the iframe we add, so don't recurse
      if (document.body.id === "-webkit-web-inspector") {
        console.log("onDOMContentLoaded into "+window.location+" with id "+document.body.id+" for test "+testCaseURL);
        var iframe = document.createElement('iframe');
        iframe.src = testCaseURL;
        iframe.classList.add("testRunner");
        document.body.appendChild(iframe);
        window.removeEventListener('DOMContentLoaded', onDOMContentLoaded);        
      }
    }

    window.addEventListener('DOMContentLoaded', onDOMContentLoaded);
  }

  return "(" + addFrameBeforeLoad + ")(\"" + testCaseURL + "\");";
}

function reloadForTesting(testCaseURL) {
  var injectedTestingScript = getTestingScript(testCaseURL);
  console.log("injectedScript: ", injectedTestingScript);
  chrome.devtools.inspectedWindow.reload({injectedScript: injectedTestingScript});
}

function runTest() {
  var url = getTestCaseURL();
  if (url) {
    reloadForTesting(url);
  }
}

window.addEventListener('load', function() {
  document.querySelector('.runTest').addEventListener('click', runTest);   
  document.querySelector('.setTestCaseURL').addEventListener('click', setTestCaseURL);   
});

