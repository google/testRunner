// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// This function is serialized and runs in every iframe when testing extensions
// only. We test the window.location to add API only to the window being tested 
// and to the main WebInspetor window.
function injectedForExtensionTest(testURL, testParentURL, jsonSignalTokens) {
    var SignalTokens = JSON.parse(jsonSignalTokens);
    
    var path = window.location.href;
    var matchDevtoolsURL = (path.indexOf(SignalTokens.DEVTOOLS_PATH) !== -1);
    var matchTestParentURL = (window.location.host.indexOf(testParentURL) !== -1);       
    
console.log("injectedForExtensionTest testParentURL " + testParentURL + ' vs ' +path);
    if (!matchDevtoolsURL && !matchTestParentURL)
        return; 
    
    (function(){
        var scripts = [
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/ChannelPlate/ChannelPlate.js",
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/ChannelPlate/RemoteMethodCall.js",
            "chrome-extension://mpbflbdfncldfbjicfcfbaikknnbfmae/test/LayoutTests/PatientSelector.js",
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/mutation-summary/mutation_summary.js"
        ];
        var loaded = [];
        function appendScriptTags() {
            window.removeEventListener('load', appendScriptTags);
            scripts.forEach(function(src) {
                var script = document.createElement('script');
                script.src = src;
                script.onload = function() {
                    loaded.push(script.src);
                    if (loaded.length === scripts.length) {
                       console.log(loaded.length + " scripts loaded and ready", loaded); 
                    }
                };
                document.getElementsByTagName('head')[0].appendChild(script);    
            });
            
        }
        // We cannot inject during reload-injection, crashes extension.
        window.addEventListener('DOMContentLoaded', appendScriptTags);
    }());
    
    if (matchDevtoolsURL) {

      function createTestCaseIframe() {
        var testCaseIFrame = document.createElement('iframe');
        testCaseIFrame.setAttribute('style', 'width:0;height:0;opacity:0');
        document.body.appendChild(testCaseIFrame);
        return testCaseIFrame;
      }

      function startServer() {
        var testCaseServer;
        ChannelPlate.Listener(testURL, function(rawPort, iframeURL){
            testCaseServer = new RemoteMethodCall.Responder(PatientSelector, rawPort);
            console.log('start ChannelPlate server in ' + window.location.href + ' for iframe ' + iframeURL);
        });
        // Add frame for test case
        var testCaseIFrame = createTestCaseIframe();
        testCaseIFrame.src = testURL;
        console.log("startServer completed, appended iframe " + testURL);
      }
      
      window.addEventListener('extensionsRegistered', startServer);
      console.log("injectedForExtensionTest found devtoolsURL, waiting for extensionsRegister " + window.location.href);

    } else if (matchTestParentURL) {
        // then we are in one of the devtools extension iframes
        function startListener() {
          var testServer;
          ChannelPlate.Listener("chrome-extension://ggimboaoffjaeoblofehalflljohnfbl", function(rawPort, iframeURL){
              testServer = new RemoteMethodCall.Responder(PatientSelector, rawPort);
              console.log("injectedForExtensionTest started server to " + iframeURL + " from " + window.location.href);
          });
          console.log("injectedForExtensionTest started listener in extension URL " + window.location.href);
        }
        window.addEventListener('load', startListener);
    }
}
