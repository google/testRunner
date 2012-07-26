// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

function reloadForTesting() {
  window.postMessage("reloadForTesting", "*");
}

window.addEventListener('load', function() {
  var runTestElt = document.querySelector('.runTest');
  runTestElt.addEventListener('click', reloadForTesting);
});

