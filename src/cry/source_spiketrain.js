//-------- source_spiketrain.js ---------//

define(['util/objects', 'util/strings', 'api/bus', 'cry/basic_source'],
    function(objects, strings, Bus, BasicSource) {
    "use strict";

    var _count = 0;

    /**
     * Source for spike trains.
     *
     * @param api
     * @param data
     * @param style
     * @param val
     *
     * @constructor
     * @extends {BasicSource}
     * @public
     */
    function SourceSpiketrain(api, data, style, val) {

        var _api = api,
            _url, _style, _val;

        BasicSource.apply(this,[]);

        this._init = function() {
            _count++;
            if (style) {
                _style = style;
            } else {
                var rand_style = BasicSource.randomStyle();
                _style = rand_style.stroke + ";" + rand_style.stroke_opacity;
            }
            _val = val || _count;
            if (data.type === 'spiketrain' && data.id) {
                var id = strings.urlToID(data.id);
                _url = '/electrophysiology/spiketrain/' + id;

                var name = objects.deepGet(data, 'name' || 'Spiketrain-' + _count)
                this.name(name);
            }
        };

        this.load = function(callback) {
            this.data(null);
            _api.getData(handler, _url, {max_points: 10000});

            var that = this;
            function handler(response) {
                var data = response['primary'][0]['data'],
                    times = data['times']['data'],
                    array, index;

                array = new Float32Array(times.length * 2);
                for (var i = 0; i < times.length; i++) {
                    index = i * 2;
                    array[index] = times[i];
                    array[index + 1] = _val;
                }

                that.data([{data: array, style: _style}])
                callback(that);
            }
        };

        this.slice = function(start, end, callback) {
            this.sliced(null);

            var options = {max_points: 10000};
            if (start) options.start = start;
            if (end) options.end = end;

            _api.getData(handler, _url, options);

            var that = this;
            function handler(response) {
                var data = response['primary'][0]['data'],
                    times = data['times']['data'],
                    array, index;

                array = new Float32Array(times.length * 2);
                for (var i = 0; i < times.length; i++) {
                    index = i * 2;
                    array[index] = times[i];
                    array[index + 1] = _val;
                }

                that.sliced([{data: array, style: _style}]);
                callback(that);
            }
        };

        this._init();
    }

    return SourceSpiketrain;
});
