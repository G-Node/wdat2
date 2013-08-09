//--------- source_analogsignal.js ---------//

define(['util/objects', 'util/strings', 'util/units', 'cry/basic_source'],
    function(objects, strings, units, BasicSource) {
    "use strict";

    var _count = 0;

    /**
     * Source for analogsignals.
     *
     * @param api
     * @param data
     * @param [style]
     *
     * @constructor
     * @extends {BasicSource}
     * @public
     */
    function SourceAnalogsignal(api, data, style) {

        var _api = api,
            _url, _style;

        BasicSource.apply(this, []);

        this._init = function() {
            if (style) {
                _style = style;
            } else {
                var rand_style = BasicSource.randomStyle();
                _style = rand_style.stroke;
            }
            if (data.type === 'analogsignal' && data.id) {
                var id = strings.urlToID(data.id);
                _url  = '/electrophysiology/analogsignal/' + id;

                var name  = objects.deepGet(data, 'name') || 'Analogsignal-' + _count++;
                this.name(name);
            }
        };

        this._data_convertor = function(data) {
            var sampling = data['sampling_rate'],
                signal = data['signal'],
                tstart = data['t_start'],
                ut = units.default_units['time'],
                us = units.default_units['signal'],
                uf = units.default_units['sampling'],
                array, t, index, interv;

            array = new Float32Array(signal['data'].length * 2);
            t = units.convert(tstart['data'], tstart['units'], ut);

            interv = 1 / units.convert(sampling['data'], sampling['units'], uf);
            interv = units.convert(interv, units.frequency_to_time(uf), ut);

            for (var i = 0; i < signal['data'].length; i++) {
                index = i * 2;
                array[index] = t;
                array[index + 1] = units.convert(signal['data'][i], signal['units'], us);
                t += interv;
            }
            return array
        }

        this.load = function(callback) {
            this.data(null);
            _api.getData(handler, _url, {max_points: 1000});

            var that = this;
            function handler(response) {
                var response_data = response['primary'][0]['data'];
                that.data([{data: that._data_convertor(response_data), style: _style}]);
                callback(that)
            }
        };

        this.slice = function(start, end, callback) {
            this.sliced(null);

            var options = {max_points: 1000};
            if (start) options.start = start;
            if (end) options.end = end;
            _api.getData(handler, _url, options);

            var that = this;
            function handler(response) {

                if (!response['error']) {
                    var response_data = response['primary'][0]['data'];
                    that.sliced([{data: that._data_convertor(response_data), style: _style}]);
                } else {
                    that.sliced([{data: [], style: _style}]);
                }

                callback(that);
            }
        };

        this._init();
    }

    return SourceAnalogsignal;
});
