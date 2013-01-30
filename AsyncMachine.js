// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com



var AsyncMachine = {
  ops: [],
  pushOp: function(fnc, opt_args) {
    var args = Array.prototype.slice.apply(arguments);
    args.shift();
    args.push(this.runOp.bind(this));
    this.ops.push({fnc: fnc, args: args});
  },
  runOp: function(prevResult) {
    if (prevResult) {
      console.log("test result: " + prevResult);
    }
    var op = this.ops.shift();
    if (op) {
      var fncName = op.fnc.toString().match(/function.*?{/);
      console.log("Running test operation " + fncName, op);
      op.fnc.apply(this, op.args);
    } else {
      console.log("Test Operations Completed")
    }
  }

};
