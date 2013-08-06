//--------- basic_source.js --------//


define([], function() {
    "use strict";

    /**
     * Base class for sources.
     *
     * @constructor
     * @public
     */
    function BasicSource() {

        var _name, _data, _sliced;

        /**
         * Getter and setter for name.
         *
         * @param [name] {string}       The name of the source.
         *
         * @returns {string|BasicSource}
         * @public
         */
        this.name = function(name) {
            if (name !== undefined) {
                _name = name;
                return this;
            }
            return name;
        };

        /**
         * Getter and setter for data.
         *
         * @param [data] {Array}        The data of the source.
         *
         * @returns {Array|BasicSource}
         * @public
         */
        this.data = function(data) {
            if (data !== undefined) {
                _data = data;
                return this;
            }
            if (!_data) {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
            return _data;
        };

        /**
         * Getter and setter for sliced data.
         *
         * @param [sliced] {Array}      The sliced data for the source.
         *
         * @returns {Array|BasicSource}
         * @public
         */
        this.sliced = function(sliced) {
            if (sliced !== undefined) {
                _sliced = sliced;
                return this;
            }
            if (!_sliced) {
                throw "Source: no sliced data available. Use hasSliced() to avoid this error.";
            }
            return _sliced;
        };

        /**
         * Returns true if the source can provide sliced data.
         *
         * @returns {boolean}
         * @public
         */
        this.hasSliced = function() {
            return (_sliced) ? true : false;
        };

        /**
         * Calculates the borders (min, max values) of the data the source
         * provides.
         *
         * @returns {{xmin: Number, xmax: Number, ymin: Number, ymax: Number}}
         * @public
         */
        this.dataBorders = function() {
            if (!_data) {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
            return BasicSource.calculateBorders(_data);
        };

        /**
         * Calculates the borders (min, max values) of the sliced data the source
         * provides.
         *
         * @returns {{xmin: Number, xmax: Number, ymin: Number, ymax: Number}}
         * @public
         */
        this.sliceBorders = function() {
            if (!_sliced) {
                throw "Source: no sliced data available. Use hasSliced() to avoid this error.";
            }
            return BasicSource.calculateBorders(_sliced);
        };

        /**
         * Instruct the source to load data. This method is intended to be implemented
         * by subclasses of basic source.
         *
         * @param callback {Function}   Callback that retrieves the source after loading.
         *
         * @public
         */
        this.load = function(callback) {
            throw "Methon not implemented.";
        };

        /**
         * Instruct the source to load sliced data according to the
         * given start and end values. This method is intended to be implemented
         * by subclasses of basic source.
         *
         * @param start {Number}        The start value of the data slice.
         * @param end {Number}          The end value of the data slice.
         * @param callback {Function}   Callback that retrieves the source after slicing.
         *
         * @public
         */
        this.slice = function(start, end, callback) {
            throw "Methon not implemented.";
        };

    }

    /**
     * Function that calculates maximum and minimum values for the x and y axis of
     * a data array. The array is supposed to represent the x and y values according
     * to the following schema.
     *
     * [x1, y1, x2, x2, ... , xn, yn]
     *
     * @param array
     *
     * @returns {{xmin: Number, xmax: Number, ymin: Number, ymax: Number}}
     * @public
     * @static
     */
    BasicSource.calculateBorders = function(array) {
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
    };

    /**
     * Provides some partially randomized styles for plotting.
     *
     * @returns {{stroke: string, stroke_opacity: string}}
     * @public
     * @static
     */
    BasicSource.randomStyle = function() {
        var rand256 = function() {
            return Math.round(Math.random() * 255);
        };
        return  {
            stroke: 'stroke:rgb(' + rand256() + ',' + rand256() + ',' + rand256() + ')',
            stroke_opacity: 'stroke-opacity:0.85'
        };
    };

    return BasicSource;

});