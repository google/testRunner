// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com



var AsyncMachine = {
  ops: [],
  pushOp: function(fnc, opt_args) {
    var args = Array.prototype.slice.apply(arguments);
    args.shift();
    var resultProcessor;
    if (typeof args[args.length - 1] === 'function') {
        resultProcessor = args.pop();
      }
    args.push(this.runOp.bind(this));
    this.ops.push({fnc: fnc, args: args, resultProcessor: resultProcessor});
  },
  runOp: function(prevResult) {
    if (this.resultProcessor) {
        prevResult = this.resultProcessor(prevResult);
      }
    if (prevResult) {
      console.log("InspectorTest.addResult: " + prevResult);
    }
    var op = this.ops.shift();
    if (op) {
      this.resultProcessor = op.resultProcessor;
      var fncName = op.fnc.toString().match(/function.*?{/);
      console.log("Running test operation " + fncName, op);
      op.fnc.apply(this, op.args);
    } else {
      console.log("InspectorTest.testComplete: Test Operations Completed")
    }
  }

};
