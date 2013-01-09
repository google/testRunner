
var tests = [];
var baseURL = "http://localhost:9696"
scanFolder("inspector/console");
scanFolder("inspector/debugger");
scanFolder("inspector/editor");
scanFolder("inspector/elements");
scanFolder("inspector/extensions");
scanFolder("inspector/profiler");
scanFolder("inspector/styles");
scanFolder("inspector/timeline");
scanFolder("inspector");

function request(method, url, callback, errback) {
    if (!this.requestCreator) {
        this.requestCreator = new ChannelPlate.RequestCreator(ChannelPlate.DevtoolsTalker);
    }
    this.requestCreator.request(method, [url], function() {
        if (arguments[0] === "Error") {
          var message = arguments[1];
          errback(url, message);
        } else {
          callback(url, arguments[0]);
        }
  });
}

var parser = new DOMParser();

function scanFolder(folder)
{
    var url = baseURL+"/LayoutTests/" + folder + "/";
    request('GET', url, function onload(urlIn, html) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = html;
            var links = doc.querySelectorAll("a");
            for (var i = 0; i < links.length; ++i) {
                var href = links[i].getAttribute('href');
                var match = href.match(/[^\/]*\/([^\/]+\.html)$/);
                if (!match)
                    continue;
                fetchExpectations(baseURL + href);
            }
        },
        function onerror(message) {
          console.error(window.location + ": XHR failed ", message);
        }
    );
}

function fetchExpectations(path, callback)
{
    var testCaseURL = path;
    var ext = path.lastIndexOf(".");
    path = path.substring(0, ext) + "-expected.txt";
    
    var chromiumSegment = "/LayoutTests/platform/chromium/";
    var chromiumPath = path.replace("/LayoutTests/", chromiumSegment);

    function filter(url, expectations) {  
        var expectationLines = expectations.split("\n");
        var filtered = [];
        for (var i = 0; i < expectationLines.length; ++i) {
            if (!expectationLines[i].indexOf("ALERT: ") ||
                !expectationLines[i].indexOf("CONSOLE MESSAGE: ")) {
                filtered = [];
                continue;
            }
            filtered.push(expectationLines[i]);
        }
        var testExpectations = {
            testCaseURL: testCaseURL, 
            expectedURL: url, 
            expected: filtered.join("\n")
        };
        console.log("added "+path);
        window.parent.postMessage(["test", testExpectations], "*");
    }
    
    fetch(chromiumPath, filter, function(url, msg) {
        if (msg === 404) {
                // If we don't find the expectations under chromium, try webkit proper
                fetch(path, filter, function(url, msg) {
                  console.warn("Failed to find expected results for test case "+path, msg);
                });     
        } else {
            console.warn("Failed to load "+ url +" for chromiumPath "+chromiumPath, msg);
        }
            
    });
}

function fetch(path, callback, errback)
{
    request('GET', path, callback, errback);
    return;
}

