// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// whenSelectorAll callback on selector+textMatch, either immediate or after future mutation  

window.PatientSelector = (function(){

    var PatientSelector = {
        debug: true,
        _textSelectorAll: function(nodes, textToMatch) {
               return nodes.reduce(function findTextMatching(nodes, node) {
                    if (node.textContent.indexOf(textToMatch) !== -1)
                        nodes.push(node);
                    return nodes;
                }, []);
        }, 
        _querySelectorAll: function(selector, textToMatch) {
            var nodeList = document.querySelectorAll(selector);
            var nodes = [];
            for (var i = 0; i < nodeList.length; i++) {
                nodes.push(nodeList[i]);
            }
            if (this.debug) 
                console.log("_querySelectorAll finds "+nodes.length+" matches for "+selector);
            if (textToMatch) {
                nodes = this._textSelectorAll(nodes, textToMatch);
                if (this.debug)
                    console.log("_querySelectorAll finds "+nodes.length+" matches for "+selector+" with text "+textToMatch);
            } 
            return nodes;
        },
        _whenSelectorHits: function(textToMatch, callback, mutationSummary) {
            var addedElements = mutationSummary[0].added;
            var hits = this._textSelectorAll(addedElements, textToMatch);
            if (hits.length)
                callback(hits);
        },
        whenSelectorAll: function(selector, textToMatch, callback) {
            var availableNodes = this._querySelectorAll(selector, textToMatch);
            if (availableNodes.length) {
                callback(availableNodes);
            } else {
                if (this.debug)
                    console.log("whenSelectorAll waiting for " + selector + " with text "+textToMatch);
                var observer;
                function disconnectOnFind(hits) {
                    observer.disconnect();
                    if (this.debug)
                        console.log("whenSelectorAll found "+hits.length +" for " + selector + " with text "+textToMatch);
                    callback(hits);
                }
                observer = new MutationSummary({
                    callback: this._whenSelectorHits.bind(this, textToMatch, disconnectOnFind),
                    queries: [
                        {element: selector}
                    ]
                });
            } 
        },
        _click: function(elt) {
            var event = document.createEvent("MouseEvent");
            event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            elt.dispatchEvent(event);
        },
        clickSelector: function(selector, textToMatch) {
            console.log("PatientSelector.clickSelector(" + selector + ', ' + textToMatch + ')');
            this.whenSelectorAll(selector, textToMatch, function(hits) {
                this._click(hits[0]);
            }.bind(this));
        },
    };
    
    return PatientSelector;
}());