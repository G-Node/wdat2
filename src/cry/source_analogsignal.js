//--------- source_analogsignal.js ---------//

define(['util/objects', 'util/strings', 'cry/basic_source'],
    function(objects, strings, BasicSource) {
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

        this.load = function(callback) {
            this.data(null);
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

                that.data([{data: array, style: _style}]);
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

                that.sliced([{data: array, style: _style}]);
                callback(that);
            }
        };


        this._init();
    }

    return SourceAnalogsignal;
});