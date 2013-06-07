//--------- source_analogsignal.js ---------//

define(['util/objects', 'util/strings', 'api/bus'], function(objects, strings, Bus) {
    "use strict";

    var _count = 0;

    /**
     *
     * @param api DataAPI
     * @param data Object
     * @constructor
     */
    function SourceAnalogsignal(api, data, style) {

        var _api = api,
            _bus, _name, _url, _data, _sliced, _style;

        this._init = function() {
            _style = style || _randStyle();
            if (data.type === 'analogsignal' && data.id) {
                var id = strings.urlToID(data.id);
                _url  = '/electrophysiology/analogsignal/' + id;
                _name = objects.deepGet(data, 'name') || 'Analogsignal-' + _count++;
            }
        };

        this.name = function() {
            return _name;
        };

        this.load = function(callback) {
            _data = undefined;
            _api.getData(handler, _url, {max_points: 1000});

            var that = this;
            function handler(response) {
                var data   = response['primary'][0]['data'],
                    interv = 1 / data['sampling_rate']['data'],
                    signal = data['signal']['data'],
                    tstart = data['t_start']['data'],
                    array, t, index;

                array = new Float32Array(signal.length * 2);
                t = tstart;
                for (var i = 0; i < signal.length; i++) {
                    index = i * 2;
                    array[index] = t;
                    array[index + 1] = signal[i];
                    t += interv;
                }

                _data = [{data: array, style: _style}];
                callback(that)
            }
        };

        this.data = function() {
            if (!_data) {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
            return _data;
        };

        this.dataBorders = function() {
            if (!_data) {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
            return _borders(_data);
        };

        this.slice = function(start, end, callback) {
            _sliced = undefined;

            var options = {max_points: 1000};
            if (start) options.start = start;
            if (end) options.end = end;
            _api.getData(handler, _url, options);

            var that = this;
            function handler(response) {
                var data   = response['primary'][0]['data'],
                    interv = 1 / data['sampling_rate']['data'],
                    signal = data['signal']['data'],
                    tstart = data['t_start']['data'],
                    array, t, index;

                array = new Float32Array(signal.length * 2);
                t = tstart;
                for (var i = 0; i < signal.length; i++) {
                    index = i * 2;
                    array[index] = t;
                    array[index + 1] = signal[i];
                    t += interv;
                }

                _sliced = [{data: array, style: _style}];
                callback(that);
            }
        };

        this.sliced = function() {
            if (!_sliced) {
                throw "Source: no sliced data available. Use hasSliced() to avoid this error.";
            }
            return _sliced;
        };

        this.hasSliced = function() {
            return (_sliced) ? true : false;
        };

        this.sliceBorders = function() {
            if (!_sliced) {
                throw "Source: no sliced data available. Use hasSliced() to avoid this error.";
            }
            return _borders(_sliced);
        };

        this._init();
    }

    function _borders(array) {
        /** @type {{xmin: Number, xmax: Number, ymin: Number, ymax: Number}} */
        var borders = {xmin: Number.MAX_VALUE, xmax: Number.MIN_VALUE,
                       ymin: Number.MAX_VALUE, ymax: Number.MIN_VALUE};

        for (var i = 0; i < array.length; i += 1) {

            var d = array[i].data;

            for (var j = 1; j < d.length; j += 2) {
                var x = d[j - 1], y = d[j];

                if (x < borders.xmin)
                    borders.xmin = x;
                else if (x > borders.xmax)
                    borders.xmax = x;

                if (y < borders.ymin)
                    borders.ymin = y;
                else if (y > borders.ymax)
                    borders.ymax = y;
            }
        }

        return borders;
    }

    function _randStyle() {
        var rand256 = function() {
            return Math.round(Math.random() * 255);
        };
        return 'stroke:rgb(' + rand256() + ',' + rand256() + ',' + rand256() + ')';
    }

    return SourceAnalogsignal;
});