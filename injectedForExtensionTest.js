// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// This function is serialized and runs in every iframe when testing extensions
// only. We test the window.location to add API only to the window being tested
// and to the main WebInspetor window.
function injectedForExtensionTest(testURL, testParentURL, jsonSignalTokens, selectedForDebug) {
    var SignalTokens = JSON.parse(jsonSignalTokens);

    var path = window.location.href;
    var matchDevtoolsURL = (path.indexOf(SignalTokens.DEVTOOLS_PATH) !== -1);
    var matchTestParentURL = (window.location.host.indexOf(testParentURL) !== -1);
    var matchTestURL = testURL === path;

    if (!matchDevtoolsURL && !matchTestParentURL && !matchTestURL)
        return;

    var debugFlags = window.DebugLogger = selectedForDebug ? JSON.parse(selectedForDebug) : [];

    var debug = debugFlags.indexOf('injectedForExtensionTest') !== -1;

    if (debug) {
      console.log("injectedForExtensionTest "+ matchTestParentURL + " testParentURL " + testParentURL + ' vs ' +path);
      console.log("injectedForExtensionTest "+ matchTestURL + " testURL " + testURL + ' vs ' +path);
      console.log("injectedForExtensionTest testParentURL " + testParentURL + ' vs ' +path);
      console.log('injectedForExtensionTest debugFlags ' + debug, debugFlags);
    }

    if (matchTestURL)
      return;

    (function(){
        var scripts = [
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/ChannelPlate/ChannelPlate.js",
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/ChannelPlate/RemoteMethodCall.js",
            "chrome-extension://mpbflbdfncldfbjicfcfbaikknnbfmae/DebugLogger.js",
            "chrome-extension://mpbflbdfncldfbjicfcfbaikknnbfmae/keymaster/keymaster.js",
            "chrome-extension://mpbflbdfncldfbjicfcfbaikknnbfmae/test/LayoutTests/PatientSelector.js",
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/mutation-summary/mutation_summary.js"
        ];
        var loaded = [];
        function appendScriptTags() {
            window.removeEventListener('load', appendScriptTags);

            var notLoaded = scripts.slice(0);
            var loadOne = function(src) {
              var script = document.createElement('script');
              script.src = src;
              script.onload = function() {
                loaded.push(script.src);
                if (loaded.length === scripts.length) {
                    DebugLogger.register('injectedForExtensionTest', function(flag){
                      return debug = (typeof flag === 'boolean') ? flag : debug;
                    });
                  if (debug) {
                    console.log("injectedForExtensionTest: " + loaded.length + " scripts loaded and ready", loaded);
                  }
                } else {
                  loadNext();
                }
              };
              document.getElementsByTagName('head')[0].appendChild(script);
            }
            var loadNext = function() {
              loadOne(notLoaded.shift());
            }
            loadNext();
        }

        function onLoad() {
          appendScriptTags();
        }

        // We cannot inject during reload-injection, crashes extension.
        window.addEventListener('DOMContentLoaded', onLoad);
    }());

    if (matchDevtoolsURL) {

      function createTestCaseIframe() {
        var testCaseIFrame = document.createElement('iframe');
        testCaseIFrame.setAttribute('style', 'width:0;height:0;opacity:0');
        document.body.appendChild(testCaseIFrame);
        return testCaseIFrame;
      }

      function startTestCaseServer() {
        var testCaseServer;
        ChannelPlate.Listener(testURL, function(rawPort, iframeURL){
            testCaseServer = new RemoteMethodCall.Responder(PatientSelector, rawPort);
            if (debug) console.log('injectedForExtensionTest startTestCaseServer in ' + window.location.href + ' for iframe ' + iframeURL);
        });
        // Add frame for test case
        var testCaseIFrame = createTestCaseIframe();
        testCaseIFrame.src = testURL;
        if (debug) console.log("injectedForExtensionTest startTestCaseServer completed, appended iframe " + testURL);
      }

      function startProxyServers(event) {
        var extensionInfos = event.data;
        var started;
        extensionInfos.forEach(function(info){
          if (info.startPage.indexOf(testParentURL) !== -1) {
            ChannelPlate.Listener(info.startPage, function(rawPort, iframeURL){
              PatientSelector.createProxy(rawPort, iframeURL);
              if (debug) console.log('injectedForExtensionTest.startProxyServers in ' + window.location.href + ' for extension iframe ' + iframeURL);
              if (!started) {
                startTestCaseServer();
                started = true;
              }
            });
            if (debug) console.log('injectedForExtensionTest.startProxyServers listening for ' + info.startPage);
          }
        });
      }

      window.addEventListener('extensionsRegistering', startProxyServers);
      if (debug) console.log("injectedForExtensionTest found devtoolsURL, waiting for extensionsRegistering " + window.location.href);

    } else if (matchTestParentURL) {
        // then we are in one of the devtools extension iframes

      function startResponder() {
        window._testRunnerService = {};
        window._testRunnerService.responder  = new RemoteMethodCall.Responder(PatientSelector);
        window._testRunnerService.channelPlate = new ChannelPlate.ChildIframe(window._testRunnerService.responder.onMessage);
        window._testRunnerService.responder.accept(window._testRunnerService.channelPlate.port);
        window.removeEventListener('load', startResponder);
        if (debug) console.log("injectedForExtensionTest.startListener in extension URL " + window.location.href);
      }

      function onLoad() {
        startResponder();
      }
      window.addEventListener('load', onLoad);
    }
}
