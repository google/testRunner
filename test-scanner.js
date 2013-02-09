var DEBUG = false;

var XHRInBackground = {
    GET: function(url, callback, errback) {}
};

console.log("XHRInBackground ", XHRInBackground);

function xhrGET(url, callback, errback) {
    if (!this.proxy) {
        this.proxy = (new RemoteMethodCall.Requestor(XHRInBackground, ChannelPlate.DevtoolsTalker)).serverProxy();
    }
    this.proxy.GET(url, callback, errback);
}

var LayoutTests = [
 /*   {
        testParentURL: 'devtools.html',
        baseURL:  "http://localhost:9696",
        folders: [
            "/LayoutTests/inspector/console",
            "/LayoutTests/inspector/debugger",
            "/LayoutTests/inspector/editor",
            "/LayoutTests/inspector/elements",
            "/LayoutTests/inspector/extensions",
            "/LayoutTests/inspector/profiler",
            "/LayoutTests/inspector/styles",
            "/LayoutTests/inspector/timeline",
            "/LayoutTests/inspector",
       ]
    },
    {
        testParentURL: 'devtools.html',
        baseURL:  "http://127.0.0.1:8000",
        folders: [
            "/LayoutTests/http/tests/inspector",
       ]
    }, */
    {
        extension: true,
        testParentURL: 'mpbflbdfncldfbjicfcfbaikknnbfmae',
        baseURL: "http://localhost:8686/test",
        folders: ["/LayoutTests/Panel", "/LayoutTests/DocGen"]
    },
];

LayoutTests.forEach(function(layoutTest){
    layoutTest.folders.forEach(function(folder){
        scanFolder(layoutTest.baseURL, folder, layoutTest.testParentURL, layoutTest.extension);
    });
});

var parser = new DOMParser();
var unfetchedByURL = {};

function scanFolder(baseURL, folder, testParentURL, extension)
{
    var url = baseURL + folder + "/";
    xhrGET(url, function onload(html) {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = html;
            var links = doc.querySelectorAll("a");
            var linksFetched = [];
            console.log(links.length + ' in ' + url);
            for (var i = 0; i < links.length; ++i) {
                var href = links[i].getAttribute('href');
                var match = href.match(/[^\/]*\/([^\/]+\.html)$/);
                if (!match)
                    continue;
                linksFetched.push(href);
                var testCaseURL = baseURL;
                var indexLayoutTests = href.indexOf('/LayoutTests/');
                 testCaseURL += indexLayoutTests !== -1 ? href.substr(indexLayoutTests) : href;
                fetchExpectations(testCaseURL, testParentURL, extension);
            }
            console.log('fetching ' + linksFetched.length + ' in ' + url);
        },
        function onerror(message) {
          console.error(window.location + ": XHR "+url+" failed ", message);
        }
    );
}

if (DEBUG) {
    setInterval(function() {
        console.log(Object.keys(unfetchedByURL).length + " unfetched");
        console.log(Object.keys(unfetchedByURL).forEach(function(url){
            console.log('Unfetched[' + url + ']=' + unfetchedByURL[url]);
        }))
    }, 5000);    
}

function fetchExpectations(path, testParentURL, extension)
{
    var testCaseURL = path;
    var ext = path.lastIndexOf(".");
    path = path.substring(0, ext) + "-expected.txt";
    
    var chromiumSegment = "/LayoutTests/platform/chromium/";
    var chromiumPath = path.replace("/LayoutTests/", chromiumSegment);

    function filter(expectations) {
        unfetchedByURL[testCaseURL] = false;
                  
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
            expectedURL: path, 
            expected: filtered.join("\n"),
            testParentURL: testParentURL,
            extension: extension
        };
        window.parent.postMessage(["test", testExpectations], "*");
    }
    
    unfetchedByURL[testCaseURL] = true;

    xhrGET(chromiumPath, filter, function(msg) {
        if (msg === 404) {
                // If we don't find the expectations under chromium, try webkit proper
                xhrGET(path, filter, function(msg) {
                  console.warn("Failed to find expected results for test case "+path, msg);
                });     
        } else {
            // normal console.warn("Failed to load "+ url +" for chromiumPath "+chromiumPath, msg);
        }
    });
}


