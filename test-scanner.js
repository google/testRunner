
var tests = [];
var baseURL = "http://localhost:9696"
scanFolder("inspector/console");
// scanFolder("inspector/debugger");
scanFolder("inspector/editor");
scanFolder("inspector/elements");
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
          console.error("XHR Failed for "+url, message);
          errback(message);
        } else {
          callback(arguments[0]);
        }
  });
}
/*
function request(method, url, callback, errback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = callback;
    xhr.onerror = errback;
    xhr.open(method, url);
    if (method === "PROFFIND") 
      xhr.responseType = "document";
    xhr.send(null);  
}
*/

var parser = new DOMParser();

function scanFolder(folder)
{
    var url = baseURL+"/LayoutTests/" + folder + "/";
    request('GET', url, function onload(html) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = html;
            var links = doc.querySelectorAll("a");
            for (var i = 0; i < links.length; ++i) {
                var link = links[i].href;
                var match = link.match(/[^\/]*\/([^\/]+\.html)$/);
                if (!match)
                    continue;
                var path = "/LayoutTests/" + folder + "/" + match[1];
                fetchExpectations(link);
            }
        },
        function onerror(message) {
          console.error(window.location + ": XHR failed ", message);
        }
    );
}

function fetchExpectations(path, callback)
{
    var ext = path.lastIndexOf(".");
    path = path.substring(0, ext) + "-expected.txt";
    
    var chromiumSegment = "/LayoutTests/platform/chromium/";
    var chromiumPath = path.replace("/LayoutTests/", chromiumSegment);

    function filter(webkitPath) {
        if (this.status === 404) {
            if (this.path.indexOf(chromiumSegment) !== -1) {
                // If we don't find the expectations under chromium, try webkit proper
                fetch(path, filter, function() {
                  console.warn("Failed to load "+path);
                });                
            }
            return;
        }
            
        var expectations = this.responseText;
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
        var test = [path, filtered.join("\n")];
        console.log("added "+path);
        window.parent.postMessage(["test", test], "*");
    }
    
    fetch(chromiumPath, filter, function() {
            console.warn("Failed to load "+path);
    });
}

function fetch(path, callback, errback)
{
    var xhr = new XMLHttpRequest();
    xhr.onload = callback;
    xhr.onerror = errback;
    xhr.path = path;
    xhr.open("GET", path);
    xhr.send(null);
}

