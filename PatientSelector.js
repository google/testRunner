// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// whenSelectorAll callback on selector+textMatch, either immediate or after future mutation  

window.PatientSelector = (function(){

    var DEBUG = true;
    
    function doc() {
        return document.location.href.split('/').pop();
    }

    // http://www.kirupa.com/html5/get_element_position_using_javascript.htm
    // modified
    function getPosition(element, toParent) {
        var xPosition = 0;
        var yPosition = 0;
  
        while(element && element !== toParent) {
            xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
            yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
            element = element.offsetParent;
        }
        return { x: xPosition, y: yPosition };
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
            var m = /^\| (.*)/.exec(selector);
            if (m) {
                selector = m[1];
                target = this.hits[0];
            } else {
                target = document;
            }
            var nodeList;
            try {
                nodeList = target.querySelectorAll(selector);
            } catch (exc) {
                console.error("....PatientSelector._querySelectorAll query failed for " + selector + ": " + exc, target);
            }
            var nodes = [];
            for (var i = 0; i < nodeList.length; i++) {
                nodes.push(nodeList[i]);
            }
            if (DEBUG) 
                console.log("....PatientSelector._querySelectorAll finds "+nodes.length+" matches for "+selector);
            if (textToMatch) {
                nodes = this._textSelectorAll(nodes, textToMatch);
                if (DEBUG)
                    console.log("....PatientSelector._querySelectorAll finds "+nodes.length+" matches for "+selector+" with text "+textToMatch);
            } 
            return this.hits = nodes;
        },

        ancestor: function(selector, callback) {
            var hit = this.hits[0];
            var parent = hit.parentElement;
            while (parent) {
                var hit = parent.querySelector(selector);
                console.log("....PatientSelector.ancestor(" + selector + ")  %o " + (hit ? "hit" : "miss"), parent);
                if (hit) {
                    this.hits[0] = hit;
                    callback();
                    return;
                }
                parent = parent.parentElement;
            }
            this.hits = [];
            callback();
        },

        _whenSelectorHits: function(textToMatch, callback, mutationSummary) {
            console.log("....PatientSelector._whenSelectorHits mutationSummary ", mutationSummary);
            var addedElements = mutationSummary[0].added;
            this.hits = this._textSelectorAll(addedElements, textToMatch);
            if (this.hits.length)
                callback();
        },

        whenSelectorAll: function(selector, textToMatch, callback) {
            this.hits = this._querySelectorAll(selector, textToMatch);
            if (this.hits.length) {
                callback();
            } else {
                if (DEBUG)
                    console.log("....PatientSelector.whenSelectorAll waiting for " + selector + " with text "+textToMatch + ' in ' + doc());
                var observer;
                function disconnectOnFind(hits) {
                    observer.disconnect();
                    if (DEBUG)
                        console.log("....PatientSelector.whenSelectorAll found "+PatientSelector.hits.length +" for " + selector + " with text "+textToMatch);
                    callback();
                }
                observer = new MutationSummary({
                    callback: this._whenSelectorHits.bind(this, textToMatch, disconnectOnFind),
                    queries: [
                        {element: selector}
                    ]
                });
                rawObserver = new MutationObserver(function(){console.log("MutationObserver");});

                rawObserver.observe(document, {subtree: true});
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
            this.whenSelectorAll(selector, textToMatch, function() {
                this._click(PatientSelector.hits[0], callback);
                if (DEBUG) 
                    console.log("....PatientSelector.clickSelector hit ", PatientSelector.hits[0])
            }.bind(this));
        },

        selectTokenInSource: function(editorTokens, callback) {
            console.log("....PatientSelector.selectTokenInSource(" + editorTokens.length + " editorTokens) ", editorTokens);
            function next(hits) {
                var token = editorTokens.shift();
                var selector = 'span.cm-' + token.type;
                var text = token.text;
                    
                if (editorTokens.length) {
                    PatientSelector.whenSelectorAll(selector, text, next)    
                } else {
                    console.log('....PatientSelector.selectTokenInSource seeking pre ancestor of ', PatientSelector.hits);
                    PatientSelector.ancestor('pre', function() {
                        if (!PatientSelector.hits.length) {
                            console.error('....PatientSelector,selectTokenInSource ancestor selection failed', PatientSelector);
                            callback();
                        }
                        // select within the previous hit
                        var tokenElt = PatientSelector._querySelectorAll('| ' + selector, text)[0];

                        var xy = getPosition(tokenElt);
                        xy.x = xy.x + Math.round(tokenElt.offsetWidth/2);
                        xy.y = xy.y + Math.round(tokenElt.offsetHeight/2);
                        var mousemove = document.createEvent("MouseEvent");
                        mousemove.initMouseEvent('mousemove', true, true, window, 0, 
                            0, 0, xy.x, xy.y, 
                            false, false, false, false, 0, null);
                        tokenElt.dispatchEvent(mousemove);
                        console.log('....PatientSelector.selectTokenInSource mousemove(' + xy.x + ',' + xy.y + ') sent to %o', tokenElt);
                        PatientSelector.hits = [tokenElt];
                        callback(); 
                    });
                }
            }
            next();
        },

        clickTokenInSource: function(editorTokens, callback) {
            PatientSelector.selectTokenInSource(editorTokens, function() {
                PatientSelector._click(PatientSelector.hits[0], callback);
            });
        },

        evaluateInPage: function(expr, callback) {
            chrome.devtools.inspectedWindow.eval(expr, callback);
        },

        reloadPage: function(callback) {
            chrome.devtools.inspectedWindow.reload();
            callback();
        },

        //------------------------------------------------------------------------------------
        // For addressing command to extension iframes

        proxies: {},
        postId: 0,
        proxyHandlers: [],

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
            this.proxyHandlers[++this.postId] = {url: url, onResponse: callback, onError: errback};
        
            function onMessage(message) {
                console.log("....PatientSelector.proxyTo.onMessage ", message.data);
                var payload = message.data;
                var postId = payload.shift();
                var method = payload.shift();
                var status = payload.shift();
                var handlers = this.proxyHandlers[postId];
                if (status === 'Error')
                    handlers.onError(payload);
                else 
                    handlers.onResponse(payload);
            }
            var proxy = this.proxies[url] = this.proxies[url] || this._createProxy(url, onMessage.bind(this));
            if (proxy) {
                console.log("....PatientSelector.proxyTo.postMessage", proxied);
                proxy.postMessage([this.postId].concat(proxied));
            } else {
                console.error("PatientSelector.proxyTo no frame matches " + url);
            }
        }
    };
    
    return PatientSelector;
}());