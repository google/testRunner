var scannerServer = "./";

var tests = [];
var skipList = [
    // HALT
    "inspector/console/console-api-on-call-frame.html",

    // FAILED
    "inspector/console/console-dir-global.html",
    "inspector/console/console-log-toString-object.html",
    "inspector/console/console-uncaught-exception-in-eval.html",
    "inspector/elements/edit-dom-actions.html",
    "inspector/elements/highlight-node-scaled.html",
    "inspector/elements/highlight-node-scroll.html",
    "inspector/elements/highlight-node.html",
    "inspector/elements/highlight-svg-root.html",
    "inspector/network-status-non-http.html",
    "inspector/storage-panel-dom-storage-update.html",
    "inspector/styles/inject-stylesheet.html",
    "inspector/styles/protocol-css-regions-commands.html",
    "inspector/styles/region-style-crash.html",
    "inspector/styles/styles-disable-then-enable-overriden-ua.html",
    "inspector/styles/styles-url-linkify.html",
    "inspector/styles/vendor-prefixes.html",
    "inspector/timeline/timeline-event-dispatch.html",
    "inspector/timeline/timeline-frames.html",
    "inspector/timeline/timeline-network-resource.html",
    "inspector/timeline/timeline-paint.html",
    "inspector/timeline/timeline-receive-response-event.html",

    // TIMEOUT
    "inspector/profiler/cpu-profiler-profiling-without-inspector.html",
    "inspector/profiler/heap-snapshot-inspect-dom-wrapper.html",
    "inspector/timeline/timeline-network-received-data.html",
];

var SignalTokens = {
    COMPLETE: "InspectorTest.testComplete: ",
    OUTPUT: "InspectorTest.testOutput: ",
    RESULT: "InspectorTest.addResult: ",
    INFO: "InspectorTest.info: ",
    CLEAR: "InspectorTest.clearResults: ",
    PATIENT_SELECTOR: "PatientSelectorAPI",
    DEVTOOLS_WINDOW: "DevtoolsWindowTestAPI",
    EXTENSION_WINDOW: "ExtensionWindowTestAPI",
    DEVTOOLS_PATH: 'inspector/front-end/devtools.html'
};

var TestRunnerPanel = { 
    tests: [],
   
    initialize: function() {
        this.attachListeners();
        this.availableFlags = ko.observableArray([]);
        this.selectedFlags = ko.observableArray([]);
        this.restore();
        ko.applyBindings(TestRunnerPanel);
    },

    setFilter: function(value) {
        document.querySelector('.filterValue').value = value;
    },

    getFilter: function() {
        return document.querySelector('.filterValue').value.trim();
    },

    addDebugFlag: function(flag) {
        var exists = this.availableFlags().some(function(existingFlag) {
            return (existingFlag.name === flag.name);
        });
        if (!exists) {
            this.availableFlags.push(flag);
            if (flag.selected == 'true') 
                this.selectedFlags.push(flag);
        }
    },

    selectedForDebug: function() {
        return this.selectedFlags().map(function(flag){
            return flag.name;
        });
    },

    restore: function() {
        var prevParameters = localStorage.getItem('testRunner');
        if (prevParameters) {
            prevParameters = JSON.parse(prevParameters);
            TestRunnerPanel.setFilter(prevParameters.filter);
            this.availableFlags = ko.observableArray(prevParameters.availableFlags);
            this.selectedFlags = ko.observableArray(prevParameters.selectedFlags);
        }
    },

    save: function() {
        var parameters = {
            filter: this.getFilter(),
            availableFlags: this.availableFlags.slice(0),
            selectedFlags: this.selectedFlags.slice(0)
        };
        localStorage.setItem('testRunner', JSON.stringify(parameters));
    },
};

TestRunnerPanel.loadTests = function loadTests() {
    console.log("loadTests");
    TestRunnerPanel.unfilteredTotalTests = 0;
    TestRunnerPanel.filteredTotalTests = 0;
    document.getElementById("outline").removeChildren();
    TestRunnerPanel.treeOutline = new TreeOutline(document.getElementById("outline"));

    document.getElementById("pass").textContent = 0;
    document.getElementById("skip").textContent = 0;
    document.getElementById("fail").textContent = 0;
    document.getElementById("timedout").textContent = 0;
    document.getElementById("remaining").textContent  = 0;

    this.tests = [];

    if (window.testScannerIframe) 
        document.body.removeChild(window.testScannerIframe);
    window.testScannerIframe = document.createElement("iframe");
    window.testScannerIframe.src = scannerServer + "test-scanner.html";
    document.body.appendChild(window.testScannerIframe);

    this.save();
};

TestRunnerPanel.addTest = function(model) {
    var view = new TestView(model);
    this.tests.push({model: model, view: view});
    document.getElementById("remaining").textContent = this.tests.length;
    if (this.isStateRan())
        this.stateLoaded();
}

TestRunnerPanel.run = function(debug)
{  
    if (this.isStateRan()) {
        this.loadTests();
        setTimeout(TestRunnerPanel.run.bind(this, debug), 1000);
    }
    this.stateRunning()
    this.runTests(debug);
};

TestRunnerPanel.runTests = function runTests(debug)
{
    this.debug = debug;
    this.runNextTest();
};

TestRunnerPanel.interrupt = function() {
    this.stateInterrupted();
    if (this.currentTestRunner) {
        this.currentTestRunner.interrupt();
    }
}

/*
            +--------------Load/Run/Debug-------+
            \/                                  |
  States: Loaded----Run/Debug---> Running -> Ran  <-+
                     |                        |
                    Interrupt                 |
                             +--> Interrupted +
 */
TestRunnerPanel.stateLoaded = function()
{
    document.body.classList.remove('ranTests');
}; 

TestRunnerPanel.stateInterrupted = function()
{
    document.body.classList.add('interrupted');
    document.body.classList.remove('runningTests');
};

TestRunnerPanel.isStateInterrupted = function() {
    return document.body.classList.contains('interrupted')
};

TestRunnerPanel.stateRunning = function() {
    document.body.classList.add('runningTests');
};

TestRunnerPanel.stateRan = function() {
    document.body.classList.remove('interrupted');
    document.body.classList.remove('runningTests');
    document.body.classList.add('ranTests');  
};

TestRunnerPanel.isStateRan = function() {
    return document.body.classList.contains('ranTests')
};


TestRunnerPanel.runNextTest = function runNextTest(lastResult)
{
    if (lastResult) {
        var element = document.getElementById(lastResult);
        element.textContent = parseInt(element.textContent) + 1;

        element = document.getElementById("remaining");
        element.textContent = '' + this.tests.length;
        if (window.debug) {
            document.getElementById("debug").textContent = "Debug";
            return;
        }
    }
    if (!this.isStateInterrupted()) {
        var test = this.tests.shift();
        if (test) {
          this.currentTestRunner = new TestRunner(test.model, test.view, runNextTest.bind(this));
          this.currentTestRunner.run(this.debug);
          return;  
        }
    } 
    delete this.currentTestRunner;
    this.stateRan();
}

TestRunnerPanel.attachListeners = function attachListeners() {
    document.querySelector('.load').addEventListener('click', function(){
        TestRunnerPanel.loadTests();
    });document.querySelector('.run').addEventListener('click', function(){
        TestRunnerPanel.run();
    });
    document.querySelector('.debug').addEventListener('click', function(){
        TestRunnerPanel.run(true);
    });    
    document.querySelector('.interrupt').addEventListener('click', function(){
        TestRunnerPanel.interrupt();
    });
    console.log("attachListeners complete")
}

function TestModel(testData) {
    this.url = testData.testCaseURL;
    this.expectedURL = testData.expectedURL;
    this.expected = testData.expected;
    this.testParentURL = testData.testParentURL;
    this.extension = testData.extension;
}

function TestView(testModel) {
    this._testModel = testModel;

    this._treeElement = new TreeElement(this._testModel.expectedURL);
    TestRunnerPanel.treeOutline.appendChild(this._treeElement);
    this._treeElement.onselect = this.onTreeElementSelect.bind(this);
}

TestView.prototype = {
    skipped: function() {  
       this._treeElement.title = this._testModel.expectedURL + ": SKIPPED"; 
    },

    onTreeElementSelect: function () 
    {
        var baseEndSentinel = '/inspector/';
        var baseChars = this._testModel.expectedURL.indexOf(baseEndSentinel) + baseEndSentinel.length;
        if (baseChars > 0) 
            TestRunnerPanel.setFilter(this._testModel.expectedURL.substr(baseChars));
    },

    _showDiff: function(actual) {
        var baseLines = difflib.stringAsLines(this._testModel.expected);
        var newLines = difflib.stringAsLines(actual);
        var sm = new difflib.SequenceMatcher(baseLines, newLines);
        var opcodes = sm.get_opcodes();
        var lastWasSeparator = false;

        for (var idx = 0; idx < opcodes.length; idx++) {
            var code = opcodes[idx];
            var change = code[0];
            var b = code[1];
            var be = code[2];
            var n = code[3];
            var ne = code[4];
            var rowCount = Math.max(be - b, ne - n);
            var topRows = [];
            var bottomRows = [];
            for (var i = 0; i < rowCount; i++) {
                if (change === "delete" || (change === "replace" && b < be)) {
                    var lineNumber = b++;
                    this._treeElement.appendChild(new TreeElement("- [" + lineNumber + "] " + baseLines[lineNumber]));
                }

                if (change === "insert" || (change === "replace" && n < ne)) {
                    var lineNumber = n++;
                    this._treeElement.appendChild(new TreeElement("+ [" + lineNumber + "] " + newLines[lineNumber]));
                }

                if (change === "equal") {
                    b++;
                    n++;
                }
            }
        }
    },

    running: function() {
        this._treeElement.listItemElement.addStyleClass("running");
        console.log("begin "+this._testModel.expectedURL);
    },

    restyle: function(status) {
        this._treeElement.title = this._testModel.expectedURL + ": " + status.toUpperCase();
        this._treeElement.listItemElement.addStyleClass(status);
        console.log("end " + status + " "  + this._testModel.expectedURL);
        this.done = true;
        return status;
    },

    update: function(actual) {
        this._treeElement.listItemElement.removeStyleClass("running");
        if (this.done) {
            throw new Error("We're done already with "+this._testModel.expectedURL)
        }
        if (!actual) {
            return this.restyle('timedout');
        } else if (actual === this._testModel.expected || actual === this._testModel.expected + "\n") {
            return this.restyle('pass');
        } else {
            this._showDiff(actual);
            var link = new TreeElement('expected');
            link.onselect = function() {
                window.open(this._testModel.expectedURL);
            }.bind(this)
            this._treeElement.appendChild(link);
            return this.restyle('fail');
        }
    },
};

function TestRunner(testModel,  testView, next)
{
    this._testModel = testModel;
    this._testView = testView;
    this._next = next;

    this._pendingMessages = [];
    this._onMessageAdded = this._onMessageAdded.bind(this);
}

TestRunner.commands = {
    _metaServer: function() {
        if (!this.backgroundProxy) {
            this.backgroundProxy = (new RemoteMethodCall.Requestor(BackgroundServerAPI, ChannelPlate.DevtoolsTalker)).serverProxy();
        }
        return this.backgroundProxy;
    },
    unblock: function(frameURL) {
        console.log("TestRunner.commands.unblock "+frameURL);
        chrome.devtools.inspectedWindow.eval('AsyncMachine.unblock()', {frameURL: frameURL}, function(result) {
            console.log("TestRunner.commands.unblock "+result);
        });
    },
    screenshot: function(resultNumber, surround, callback) {
        this._metaServer().screenshot(chrome.devtools.inspectedWindow.tabId, function(dataURL) {
            var result = surround.replace('screenshot', dataURL);
            TestRunnerPanel.currentTestRunner.actual = TestRunnerPanel.currentTestRunner.actual.replace('commandResult ' + resultNumber, result);
            console.log('screenshot for ' + resultNumber + ' with surround ' + surround, result.substring(0,50));
            callback();
        });
    },
    output: function(url, callback) {
        console.log("TestRunner.commands.output " + url);
        var request = { 
            url: url,
            content: TestRunnerPanel.currentTestRunner.actual 
        };
        // send directly to devtools-save
        chrome.extension.sendMessage('jmacddndcaceecmiinjnmkfmccipdphp', request, function maybeSaved(response){
            console.log("TestRunner.commands.output response ", response);
            callback();
        });
    },
    registerDebugFlag: function(name, value) {
        TestRunnerPanel.addDebugFlag({name: name, selected: value});
    }
}

TestRunner.prototype = {

    run: function(debug)
    {
        if (!debug) {
            var skipMe = skipList.some(function(path){
                return (this._testModel.expectedURL.indexOf(path) !== -1);
            }.bind(this)) 

            if (skipMe) {
                this._testView.skipped();
                this._next("skip");
                return;
            }
        }
        this._testView.running();
        this._listenForResults();
        this._reloadWithTestScripts(debug);
    },

    _listenForResults: function() {
        chrome.experimental.devtools.console.onMessageAdded.addListener(this._onMessageAdded);
    },

    _metaOperationToken: "function",
    _metaOperationCounter: 0,

    _metaResult: function(resultNumber, result) {
        console.log("_metaResult for " + resultNumber, result.substring(100));
        this.actual = this.actual.replace('commandResult '+resultNumber, result);
    },

    _metaFailure: function(resultNumber, result) {
       console.error("_metaFailure for " + resultNumber, result); 
    },

    _metaOperation: function(resultNumber, fncString) {
        var invoke = '(' + fncString + '(\"' + this._testModel.url + '\",' + resultNumber + '));';
        eval(invoke);
    },

    _checkForMetaOperations: function(text) {
        var command = text.indexOf(this._metaOperationToken);
        if (command === 0) {
            var op = this._metaOperationCounter++;
            this._metaOperation(op, text)
            return 'commandResult ' + op + '\n';
        } else {
            return text;    
        }
    },

    _onMessageAdded: function(message) {
        var mark = message.text.indexOf(SignalTokens.RESULT);
        if (mark !== -1) {
            this.actual = this.actual || "";
            var actualLine = message.text.substring(mark + SignalTokens.RESULT.length) + '\n'; 
            this.actual += this._checkForMetaOperations(actualLine);
        } else {
          mark = message.text.indexOf(SignalTokens.COMPLETE);
          if (mark !== -1) {
            this.actual += '\n';
            this.notifyDone(this.actual);
          } else {
            mark = message.text.indexOf(SignalTokens.INFO);
            if (mark !== -1) {
                var nv = message.text.substring(mark + SignalTokens.INFO.length);
                var segments = nv.split(' ');
                var name = segments[0];
                var value = segments[1] === 'true' ? true : false;
                TestRunner.commands.registerDebugFlag(name, value);
            }
          }
        }
    },

    _reloadWithTestScripts: function(debug) {

       var runInEveryDebuggeeFrame = injectedForInspectorTest;
       if (this._testModel.extension) {
            runInEveryDebuggeeFrame = injectedForExtensionTest;
       }

        if (!debug)  {
            // No parameter to notifyDone signals timedout
            this._watchDog = setTimeout(this.notifyDone.bind(this), 10000);
        }
        
        var argsAsString = '\"' + this._testModel.url + '\", \"';
        argsAsString += this._testModel.testParentURL +'\", \'';
        argsAsString += JSON.stringify(SignalTokens) + '\'';
        if (debug) {
           argsAsString += ', \'' + JSON.stringify(TestRunnerPanel.selectedForDebug().concat(['DebugLogger'])) + '\'';
        }
        var reloadOptions = {
            ignoreCache: true, 
            injectedScript:  '(' + runInEveryDebuggeeFrame + '(' + argsAsString + ')' +')',
          };
        chrome.devtools.inspectedWindow.reload(reloadOptions);
    },

    interrupt: function() {
        this.notifyDone();
    },

    notifyDone: function(actual)
    {
        if (TestRunnerPanel.debugDiffs) console.log("actual", actual);
        chrome.experimental.devtools.console.onMessageAdded.removeListener(this._onMessageAdded); 
        clearTimeout(this._watchDog);
        var pass = this._testView.update(actual);    
        this._next(pass);
    },
}

function onMessageFromTestScanner(event)
{
    var signature = event.data;
    if (!signature.shift) 
        return;
    var method = signature.shift();
    if (method === 'test') {
        var testData = signature[0];
        var model = new TestModel(testData);
        var filterText = TestRunnerPanel.getFilter();
        var reFilter = filterText ? new RegExp(filterText) : null;
        TestRunnerPanel.unfilteredTotalTests++;
        if (reFilter) {
            if (!reFilter.test(model.expectedURL))
                return;
        }
        TestRunnerPanel.filteredTotalTests;
        TestRunnerPanel.addTest(model);
    }
}
window.addEventListener("message", onMessageFromTestScanner, true);

function onload()
{
console.log("onload calling initialize");
    TestRunnerPanel.initialize();

    var queryParamsObject = {};
    var queryParams = window.location.search;
    if (!queryParams)
        return;
    var params = queryParams.substring(1).split("&");
    for (var i = 0; i < params.length; ++i) {
        var pair = params[i].split("=");
        queryParamsObject[pair[0]] = pair[1];
    }
    if ("filter" in queryParamsObject)
        TestRunnerPanel.setFilter(queryParamsObject["filter"]);
}
window.addEventListener('load', onload);




