// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// This function is serialized and runs in every iframe when testing extensions
// only. We test the window.location to add API only to the window being tested 
// and to the main WebInspetor window.
function injectedForExtensionTest(testURL, testParentURL, jsonSignalTokens) {
    var SignalTokens = JSON.parse(jsonSignalTokens);
    
    var path = window.location.pathname;
    var matchTestParentURL = (path.indexOf(testParentURL) !== -1);       
    var matchDevtoolsURL = (path.indexOf(SignalTokens.DEVTOOLS_PATH) !== -1);

    if (!matchDevtoolsURL && !matchTestParentURL)
        return; 
    
    (function(){
        var scripts = [
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/ChannelPlate/ChannelPlate.js",
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/ChannelPlate/RemoteMethodCall.js",
            "chrome-extension://klmlfkibgfifmkanocmdenpieghpgifl/PatientSelector.js",
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
                       console.log(loaded.length + " scripts loaded and ready"); 
                    }
                };
                document.getElementsByTagName('head')[0].appendChild(script);    
            });
            
        }
        // We cannot inject during reload-injection, crashes extension.
        window.addEventListener('DOMContentLoaded', appendScriptTags);
    }());
    
    function startServer() {
        var testCaseIFrame = document.createElement('iframe');
        testCaseIFrame.setAttribute('style', 'width:0;height:0;opacity:0');
        document.body.appendChild(testCaseIFrame);
        ChannelPlate.Parent(testCaseIFrame, testURL, function(rawPort){
            var server = new RemoteMethodCall.Responder(PatientSelector, rawPort);
        });
    }
    
    window.addEventListener('load', startServer);

    console.log("injectedForExtensionTest complete in " + window.location.href);
}
