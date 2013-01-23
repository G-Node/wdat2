// ---------- file: application.js ---------- //

(function() {
  "use strict";

  var VERT_FREE_SPACE = 156;
  var VERT_SEARCH_BAR = 62;
  var CUSHIONING = 6;

  WDAT.app.initialize = function() {
    var selEvent = 'pmeta-select';
    var bus = new WDAT.api.EventBus();
    var api = new WDAT.api.DataAPI('NetworkResource', 'ResourceAdapter', bus);
    var pmeta = new WDAT.app.MetadataTree($('#metadata-tree'), api, bus, selEvent);
    bus.subscribe(selEvent, logSelection);
    pmeta.load();
    function logSelection(event, data) {
      var logMsg = "Selection: " + JSON.stringify(data) + "\n";
      $('.event-log').append(logMsg);
      console.log(logMsg);
    }
    WDAT.app.adjustLayout();
  };

  WDAT.app.adjustLayout = function() {
    var w = $(window);
    var vspace = w.height() - VERT_FREE_SPACE;
    var vsmall = (vspace * 0.33) - CUSHIONING;
    var vmedium = (vspace * 0.66) - CUSHIONING;
    var vlarge = vspace - CUSHIONING;
    $('#metadata-tree').css('height', vlarge);
    $('#property-list').css('height', vsmall);
    $('#data-list').css('height', vmedium);
    $('#main-content').css('height', vlarge - VERT_SEARCH_BAR);
  };

}());
