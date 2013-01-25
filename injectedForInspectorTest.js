// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// This function is serialized and runs in the DevtoolsExtended window
// to support WebKit LayoutTests for WebInspector

function injectedForInspectorTest(testURL, testParentURL, jsonSignalTokens) {
    (function(){
        // This first part runs in every frame, before any other code
        window.dispatchStandaloneTestRunnerMessages = true;
        window.SignalTokens = JSON.parse(jsonSignalTokens);
        if (window.location.href !== testURL) {
            window.opener = true; // lie so InspectorFrontEndAPI listens for our messages
        } else {
            // Runs only in test-script iframe
            window.testRunner = { // impl API called by test suite running in the iframe
                dumpAsText: function(){ },
                waitUntilDone: function(){},
                closeWebInspector: function() { },
                notifyDone: function() { },
                evaluateInWebInspector: function(callId, script) {
                    window.parent.postMessage(["evaluateForTest", callId, script], "*");
                    if (!window.sentActualHeader) {
                        window.sentActualHeader = true;
                        var actualHeader = 'InspectorTest.addResult(unescape(\"' + escape(document.body.innerText + '\n') + '\"))';
                        window.parent.postMessage(["evaluateForTest", 99, actualHeader],"*");
                    }
                },
                display: function() { }
            };
            // Called after InspectorTest is created, see inspector-test.js
            // Runs in WebInspector window
            window.initialize_monkeyPatchInspectorTest = function() {
                InspectorTest.Output = {  
                    testComplete: function() 
                    {
                        WebInspector.consoleTrue.log(SignalTokens.COMPLETE, InspectorTest.completeTestCallId);
                    },
                    addResult: function(text) 
                    {
                        WebInspector.consoleTrue.log(SignalTokens.RESULT + text);
                    },
                    clearResults: function() 
                    {
                        WebInspector.consoleTrue.log(SignalTokens.CLEAR);
                    }
                };
            }
        }
        // Runs only in WebInspector window
        function monkeyPatch() {
            // save console since inspector-test.js will run in this window and overwrite our console.
            WebInspector.consoleTrue = {
                    log: console.log.bind(console),
                    error: console.error.bind(console),
                    info: console.info.bind(console),
            };
            WebInspector.evaluateForTestInFrontend = function(callId, script)
            {
                window.isUnderTest = true;
                function invokeMethod()
                {
                    try {
                        script = script + "//@ sourceURL=evaluateInWebInspector" + callId + ".js";
                        var result = window.eval(script);
                        var message = typeof result === "undefined" ? "\"<undefined>\"" : JSON.stringify(result);
                        WebInspector.consoleTrue.log("WebInspector eval result:", message)
                    } catch (e) {
                        WebInspector.consoleTrue.error("WebInspector eval error:" + e, e.stack);
                    }
                }
                InspectorBackend.runAfterPendingDispatches(invokeMethod);
            };

            WebInspector.navigatePage = function(callback) {
                WebInspector.consoleTrue.log("InspectorLoaded");
                // navigate the victim page to our testURL
                var navigated = WebInspector.ResourceTreeModel.EventTypes.InspectedURLChanged;
                function evaluateInConsole(code) {
                    WebInspector.consoleView.visible = true;
                    WebInspector.consoleView.prompt.text = code;
                    var event = document.createEvent("KeyboardEvent");
                    event.initKeyboardEvent("keydown", true, true, null, "Enter", "");
                    WebInspector.consoleView.prompt.proxyElement.dispatchEvent(event);
                }
                var webInspectorRequiredThis = {
                  onNavigated: function(event) {
                    var url = event.data;
                    WebInspector.consoleTrue.log("testRunner: page navigated to ", url);
                    if (url === testURL) {
                        WebInspector.resourceTreeModel.removeEventListener(
                            navigated, 
                            webInspectorRequiredThis.onNavigated, 
                            webInspectorRequiredThis
                        );
                        callback();
                    } else {
                        evaluateInConsole('window.location=\"' + testURL + '\";', "test");
                        WebInspector.consoleTrue.log('testRunner repeat window.location to  ' + testURL);
                    }
                  }
                }
                // Like ExtensionServer.js
                WebInspector.resourceTreeModel.addEventListener(
                    navigated, 
                    webInspectorRequiredThis.onNavigated, 
                    webInspectorRequiredThis
                );
                evaluateInConsole('window.location=\"' + testURL + '\"', "test");
                WebInspector.consoleTrue.log('testRunner window.location to  ' + testURL);
            }
        }
            
        window.addEventListener('load', function checkForInspector(){

            function addTestFrame(testURL) {
                var iframe = document.createElement('iframe');
                iframe.setAttribute('style', 'width:0;height:0;opacity:0');
                document.body.appendChild(iframe);
                window.opener = iframe.contentWindow; 

                function wasLoaded() {
                    WebInspector.navigatePage(function() {
                        iframe.setAttribute('src', testURL);
                    });
                }
                return wasLoaded;
            }

            var path = window.location.pathname;
            var matchTestParentURL = (path.indexOf(testParentURL) !== -1);
             console.log('testRunner found load event in ' + path + " and it " + (matchTestParentURL ? "matches":" does NOT match") );
            
            if (window.WebInspector) {  // this part only runs in one frame and on load  
                console.log('testRunner found WebInspector event in '+window.location);
                monkeyPatch();
                if (matchTestParentURL) {  // then we are testing devtools and we need to wait longer
                    WebInspector.notifications.addEventListener('InspectorLoaded', addTestFrame(testURL));
                } else { //  we are testing an extension
                    delete window.opener;
                }
            } else {
                if (matchTestParentURL) {
                    addTestFrame(testURL)();
                }
            }
        });
    }());
}

