// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

var testRunnerOrigin = "http://localhost:8002"; 
var testRunnerPath = "/Source/WebCore/inspector/front-end/test-runner.html";

function createTestRunnerFrame() {
  var iframe = document.createElement('iframe');
  iframe.src = testRunnerOrigin + testRunnerPath;
  iframe.classList.add("testRunner");
  document.body.appendChild(iframe);
  window.removeEventListener('load', createTestRunnerFrame);        
}


function onReply(arg) {
  console.log("eval complete "+arg);
}


function navigateInspectedPage(url) {

  function navigateTo(url) {  // runs in WebInspector
    console.log("navigateTo " + url);
    PageAgent.navigate(url);
    function onNavigated() {
      console.log("onNavigated to " + url);
      WebInspector.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.OnLoad, onNavigated, this);
    }
    WebInspector.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.OnLoad, onNavigated, this);
  }

  function onSentNavigate() {
    var testRunnerIframe = document.querySelector('.testRunner');
    testRunnerIframe.contentWindow.postMessage(['loadCompleted'], '*');
  }

  var str = '(' + navigateTo + ')(\"' + url + '\" );';
  chrome.devtools.inspectedWindow.eval(str, onSentNavigate);
  console.log("evaluated "+str);
}

function onMessage(event) {

  var signature = event.data;
  var method = signature.shift();

  console.log('onMessage method: ' + method + ' signature: %o', signature, event); // check source origin
  
  if (method === 'navigateInspectedPage') {
    var testPageURL = signature.shift();
    navigateInspectedPage(testPageURL);
  } else {
    // From test-runner to our debuggee
    var repost = "window.postMessage(" + event.data + "," + testRunnerOrigin + ")";
    chrome.devtools.inspectedWindow.eval(repost, onReply);  
  }
  
}

window.addEventListener('message', onMessage);
window.addEventListener('load', createTestRunnerFrame);
