// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// whenSelectorAll callback on selector+textMatch, either immediate or after future mutation  

window.PatientSelector = (function(){

    var DEBUG = true;
    function doc() {
        return document.location.href.split('/').pop();
    }

    var PatientSelector = {

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
            if (DEBUG) 
                console.log("....PatientSelect._querySelectorAll finds "+nodes.length+" matches for "+selector);
            if (textToMatch) {
                nodes = this._textSelectorAll(nodes, textToMatch);
                if (DEBUG)
                    console.log("....PatientSelect._querySelectorAll finds "+nodes.length+" matches for "+selector+" with text "+textToMatch);
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
                if (DEBUG)
                    console.log("....PatientSelect.whenSelectorAll waiting for " + selector + " with text "+textToMatch + ' in ' + doc());
                var observer;
                function disconnectOnFind(hits) {
                    observer.disconnect();
                    if (DEBUG)
                        console.log("....PatientSelect.whenSelectorAll found "+hits.length +" for " + selector + " with text "+textToMatch);
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

        _click: function(elt, callback) {
            var event = document.createEvent("MouseEvent");
            event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            elt.dispatchEvent(event);
            if (callback)
                callback();
        },

        clickSelector: function(selector, textToMatch, callback) {
            console.log("....PatientSelector.clickSelector(" + selector + ', ' + textToMatch + ')');
            this.whenSelectorAll(selector, textToMatch, function(hits) {
                this._click(hits[0], callback);
                if (DEBUG) 
                    console.log("....PatientSelect.clickSelector hit")
            }.bind(this));
        },

        proxies: {},
        postId: 0,

        _createProxy: function(url, onMessage) {
            var frames = document.querySelectorAll('iframe');
            for(var i = 0; i < frames.length; i++) {
                console.log("....PatientSelector._createProxy checking " + url + " against " + frames[i].src);
                if (frames[i].src.indexOf(url) !== -1) {
                    return new ChannelPlate.Talker(frames[i].contentWindow, onMessage);        
                }
            }
        },

        proxyTo: function(url, proxied, callback, errback) {
            console.log("....PatientSelector.proxyTo " + url, proxied);
            function onMessage(message) {
                console.log("....PatientSelector.proxyTo.onMessage ", message);
                callback(message.data);
            }
            var proxy = this.proxies[url] = this.proxies[url] || this._createProxy(url, onMessage);
            if (proxy) {
                console.log("....PatientSelector.proxyTo.postMessage", proxied);
                proxy.postMessage([this.postId++].concat(proxied));
            } else {
                console.error("PatientSelector.proxyTo no frame matches " + url);
            }
        }
    };
    
    return PatientSelector;
}());