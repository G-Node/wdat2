var wdat;
(function(wdat, $) {
  "use strict";

  wdat.SignalSourceHardcode = SignalSourceHardcode;

  SignalSourceHardcode.inherits(cry.Source);

  function SignalSourceHardcode(lower, upper) {

    SignalSourceHardcode.parent.constructor.call(this);

    var _signals = wdat.hardcodeSignals;
    var _step    = wdat.hardcodeInterval;
    var _styles  = wdat.hardcodeStyles;
    var _lower   = (lower || 0);
    var _upper   = (upper || _signals.length);

    this.load = function(callback) {
      if (!this._dataReady) {
        this._data = [];

        for (var i = _lower; i <= _upper; i += 1) {
          var s = _styles[i];
          var d = new Float32Array(_signals[i].length * 2);
          var x = 0;
          var y;

          for (var j = 1; j < d.length; j += 2) {
            y = parseFloat(_signals[i][Math.floor(j/2)]);
            d[j - 1] = x;
            d[j]     = y;
            x += _step;
          }

          this._data.push({data: d, style: s});
        }

        this._dataReady = true;
      }
    };

  }


})(wdat || (wdat = {}), jQuery);
