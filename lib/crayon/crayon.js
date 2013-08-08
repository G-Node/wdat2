// Copyright (c) 2013, German Neuroinformatics Node (G-Node)
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted under the terms of the BSD License. See
// LICENSE file in the root of the Project.



Function.prototype.inherits = function(parent) {
  if (typeof(parent.constructor) === 'function') {
    this.prototype = new parent();
    this.prototype.constructor = this;
    //this.prototype.parent = parent.prototype;
    this.parent = parent.prototype;
  } else {
    this.prototype = parent;
    this.prototype.constructor = this;
    // this.prototype.parent = parent;
    this.parent = parent;
  }
};
// ---------- file: version.js ---------- //


// Crayon main module cry
var cry; (function(cry) {
  "use strict";

  /**
   * The version of the crayon library.
   *
   * @define {string}
   */
  cry.version = "v0.3";

  /**
   * Activate or deactivate debug mode.
   *
   * @define {Boolean}
   */
  cry.debug = true;

})(cry || (cry = {}));

// ---------- file: cry/context.js ---------- //

// Augment module 'cry' and import d3 locally
var cry;
(function (cry, d3) {
    "use strict";

    /*******************************************************************************
     * Class cry.Context.
     * A context can be used by a renderer to draw a plot.
     *
     * @returns {Function} Constructor for Context.
     ******************************************************************************/
    cry.Context = (function () {

        /**
         * Constructor of the class cry.Context.
         * A context can be used by a renderer to draw a plot.
         *
         * @param parent    The parent svg element (D3).
         * @param name      The name of the context.
         * @param opt       Other options for the context: width, height, xmin, xmax,
         *                  padd, xticks, yticks, onselect.
         */
        function Context(parent, name, opt) {
            var opt = opt || {};
            // initialize d3 handle for svg
            this._svg = parent.append('g');
            this._svg.attr('class', 'context')
                .attr('id', name);
            this._name = name;
            // initialize private members
            this._width = Math.round(opt.width || parent.attr('width'));
            this._height = Math.round(opt.height || parent.attr('height'));
            this._padd = _adjustUp(opt.padd || 20);
            this._xmin = _adjustDown(opt.xmin || 0);
            this._xmax = _adjustUp(opt.xmax || this._width - ((this._padd * 2) + 10));
            this._ymin = _adjustDown(opt.ymin || 0);
            this._ymax = _adjustUp(opt.ymax || this._height - (this._padd * 2));
            this._xticks = (opt.xticks != undefined) ? Math.round(opt.xticks) : 10;
            this._yticks = (opt.yticks != undefined) ? Math.round(opt.yticks) : 5;
            // initialize scales using d3
            this._xScale = d3.scale.linear();
            this._xScale.domain([this._xmin, this._xmax])
                .range([this._padd + 10, this._width - this._padd]);
            this._yScale = d3.scale.linear();
            this._yScale.domain([this._ymin, this._ymax])
                .range([this._height - this._padd, this._padd]);
            // initialize x-axis using d3
            this._xAxis = d3.svg.axis();
            this._xAxis.scale(this._xScale)
                .orient('bottom')
                .ticks(this._xticks);
            this._xAxisSVG = this._svg.append("g");
            this._xAxisSVG.attr("transform", "translate(0," + (this._height - this._padd) + ")")
                .attr("class", "axis").call(this._xAxis);
            // initialize y-axis using d3
            this._yAxis = d3.svg.axis();
            this._yAxis.scale(this._yScale)
                .orient('left')
                .ticks(this._yticks);
            this._yAxisSVG = this._svg.append("g");
            this._yAxisSVG.attr("transform", "translate(" + (this._padd + 10) + ",0)")
                .attr("class", "axis").call(this._yAxis);
            // create a defs element
            this._defs = this._svg.selectAll('defs');
            if (this._defs.empty())
                this._defs = this._svg.append('defs');
            // init selection
            this._onselect = opt.onselect;
            this.initSelection();
        }

        /**
         * Getter for the svg element that represents the context.
         *
         * @returns {d3} The svg element representing the context.
         */
        Context.prototype.svg = function () {
            return this._svg;
        };

        /**
         * Getter for the defs element in the context.
         *
         * @returns {d3} The defs element of the context.
         */
        Context.prototype.defs = function () {
            return this._defs;
        };

        /**
         * Getter for the name of the context.
         *
         * @returns {string} The name of the context.
         */
        Context.prototype.name = function () {
            return this._name;
        };

        /**
         * Getter/setter for the xmin value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param xmin  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.xmin = function (xmin) {
            if (xmin !== undefined) {
                this._xmin = _adjustDown(xmin);
                this.redraw();
                return this;
            }
            return this._xmin;
        };

        /**
         * Getter/setter for the xmax value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param xmax  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.xmax = function (xmax) {
            if (xmax !== undefined) {
                this._xmax = _adjustUp(xmax);
                this.redraw();
                return this;
            }
            return this._xmax;
        };

        /**
         * Getter/setter for the ymin value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param ymin  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.ymin = function (ymin) {
            if (ymin !== undefined) {
                this._ymin = _adjustDown(ymin);
                this.redraw();
                return this;
            }
            return this._ymin;
        };

        /**
         * Getter/setter for the ymax value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param ymax  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.ymax = function (ymax) {
            if (ymax !== undefined) {
                this._ymax = _adjustUp(ymax);
                this.redraw();
                return this;
            }
            return this._ymax;
        };

        /**
         * Getter/setter for the xticks value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param xticks  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.xticks = function (xticks) {
            if (xticks !== undefined) {
                this._xticks = Math.round(xticks);
                this.redraw();
                return this;
            }
            return this._xticks;
        };

        /**
         * Getter/setter for the ytics value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param yticks  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.yticks = function (yticks) {
            if (yticks !== undefined) {
                this._yticks = Math.round(yticks);
                this.redraw();
                return this;
            }
            return this._yticks;
        };

        /**
         * Getter/setter for the width value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param width  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.width = function (width) {
            if (width !== undefined) {
                this._width = Math.round(width);
                this.redraw();
                return this;
            }
            return this._width;
        };

        /**
         * Getter/setter for the height value.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param height  {string}    The new value.
         *
         * @returns {string|Context} The value (getter) or the context itself (setter).
         */
        Context.prototype.height = function (height) {
            if (height !== undefined) {
                this._height = Math.round(height);
                this.redraw();
                return this;
            }
            return this._height;
        };

        /**
         * Getter/setter for the 'onselect' callback. If this handler is specified
         * the the context will provide a selection brush. Each time the selection changes
         * the callback will be invoked with the selected range as parameters.
         * If uses as setter it returns the context, this provides the possibility
         * of method chaining.
         *
         * @param onselect  {Function}    The new value.
         *
         * @returns {Context|Function} The value (getter) or the context itself (setter).
         */
        Context.prototype.onselect = function (onselect) {
            if (onselect !== undefined) {
                this._onselect = onselect;
                this.redraw();
                return this;
            }
            return this._onselect;
        };

        /**
         * Set multiple options.
         *
         * @param opt {Object}    An option object.
         *
         * @returns {Context} The context.
         */
        Context.prototype.options = function (opt) {
            if (opt) {
                if (opt.hasOwnProperty('width'))
                    this._width = Math.round(opt.width);
                if (opt.hasOwnProperty('height'))
                    this._height = Math.round(opt.height);
                if (opt.hasOwnProperty('xmin'))
                    this._xmin = _adjustDown(opt.xmin);
                if (opt.hasOwnProperty('xmax'))
                    this._xmax = _adjustUp(opt.xmax);
                if (opt.hasOwnProperty('ymin'))
                    this._ymin = _adjustDown(opt.ymin);
                if (opt.hasOwnProperty('ymax'))
                    this._ymax = _adjustUp(opt.ymax);
                if (opt.hasOwnProperty('xticks'))
                    this._xticks = Math.round(opt.xticks);
                if (opt.hasOwnProperty('yticks'))
                    this._yticks = Math.round(opt.yticks);
                this.redraw();
            }
            return this;
        };

        /**
         * Calculate x values in pixels from the real data.
         *
         * @param val {number} The value to turn into a pixel.
         *
         * @returns {number} The calculated pixels.
         */
        Context.prototype.xScale = function (val) {
            return this._xScale(val);
        };

        /**
         * Calculate y values in pixels from the real data.
         *
         * @param val {number} The value to turn into a pixel.
         *
         * @returns {number} The calculated pixels.
         */
        Context.prototype.yScale = function (val) {
            return this._yScale(val);
        };

        /**
         * Removes all plots from this context.
         *
         * @returns {Context} The context.
         */
        Context.prototype.clear = function () {
            this._svg.selectAll('.plot').remove();
            return this;
        };

        /**
         * Redraw the axis and the selection brush.
         *
         * @returns {Context} The context.
         */
        Context.prototype.redraw = function () {
            this._xScale.domain([this._xmin, this._xmax])
                .range([this._padd + 10, this._width - this._padd]);
            this._yScale.domain([this._ymin, this._ymax])
                .range([this._height - this._padd, this._padd]);

            this._xAxis.scale(this._xScale).ticks(this._xticks);
            this._xAxisSVG.attr("transform", "translate(0," + (this._height - this._padd) + ")")
                .call(this._xAxis);

            this._yAxis.scale(this._yScale).ticks(this._yticks);
            this._yAxisSVG.attr("transform", "translate(" + (this._padd + 10) + ",0)")
                .call(this._yAxis);

            this.initSelection();
            return this;
        };

        /**
         * Initialize or remove the selection brush depending on the existance of the
         * onselect callback.
         *
         * @returns {Context} The context.
         */
        Context.prototype.initSelection = function () {
            if (this._onselect) {
                if (!this._brush)
                    this._brush = d3.svg.brush();
                this._svg.attr('class', 'context brush').attr('style', 'pointer-events: all;');
                this._brush = d3.svg.brush();
                this._brush.x(this._xScale).on('brushend', this.onBrush());
                this._svg.call(this._brush);
                this._svg.selectAll('.background, .extent, .resize rect')
                    .attr("y", this._padd)
                    .attr("height", this._height - (2 * this._padd));
            } else {
                if (this._brush) {
                    this._brush.on('brushend', null);
                    this._brush = undefined;
                    this._svg.attr('class', 'context').attr('style', '');
                    this._svg.selectAll('.background, .extent, .resize rect').remove();
                }
            }
        };

        /**
         * Create a handler for brush events.
         * It checks if the selection has changed an invokes the onselect callback.
         *
         * @returns {Function} A handler for brush events.
         */
        Context.prototype.onBrush = function () {
            var that = this;
            var last = [this.xmin(), this.xmax()];
            return function () {
                var act = that.onselect();
                var ext = that._brush.extent();
                var x1pix = that.xScale(ext[0]);
                var x2pix = that.xScale(ext[1]);
                var diff = x2pix - x1pix;
                if (diff < 1) {
                    ext[0] = that.xmin();
                    ext[1] = that.xmax();
                }
                if (typeof (act) == 'function' && (ext[0] != last[0] || ext[1] != last[1])) {
                    act(ext[0], ext[1]);
                    last = ext;
                }
            };
        };

        /**
         * Adjust values.
         *
         * @param val {number} The value to adjust.
         *
         * @return {number} The adjusted value.
         */
        function _adjustUp(val) {
            var x = val;
            if (Math.abs(x) > 0) {
                x = Math.ceil(x);
            }
            return x;
        }

        /**
         * Adjust values.
         *
         * @param val {number} The value to adjust.
         *
         * @return {number} The adjusted value.
         */
        function _adjustDown(val) {
            var x = val;
            if (Math.abs(x) > 0) {
                x = Math.floor(x);
            }
            return x;
        }

        return Context;
    })(); // end class context

})(cry || (cry = {}), d3); // end module cry

// ---------- file: cry/plotmanager.js ---------- //

// Augment the module cry and import d3 locally.
var cry;
(function (cry, d3, $) {
    "use strict";

    /*******************************************************************************
     * Class PlotManager.
     * The plot manager is the central class of the crayon library, it handles data
     * sources, contexts and renderer.
     *
     * @returns {Function} Constructor for PlotManager
     ******************************************************************************/
    cry.PlotManager = (function () {

        /**
         * Constructor of the class PlotManager.
         *
         * @param svg {d3.selection}   An svg elements as d3 selection.
         */
        function PlotManager(svg) {
            // initialize d3 handle for svg
            if (typeof(svg) === 'string')
                this._svg = d3.select('#' + svg);
            else
                this._svg = svg;
            // structure for renderer:
            // {<name>: <renderer>, ...}
            this._renderer = {};
            // structure for contexts:
            // {<name>: <context>, ... }
            this._contexts = {};
            // sources
            // [{renderer: <name>, context: <name>, source: <source>}]
            this._sources = [];
            // geometry of the svg elment
            this._width = this._svg.attr('width');
            this._height = this._svg.attr('height');

            // the default context
            this._default;

            // calculated borders
            this._borders = null;

            // create a context for selections
            this._selconfig = {width: this._width, height: 100, yticks: 2,
                onselect: this._onselect()};
            this._selcontext = new cry.Context(this._svg, 'select', this._selconfig);
            this._selcontext.svg().attr("transform", "translate(0," + (this._height - this._selconfig.height) + ")");
        }

        /**
         * Plot all data from all sources using the configured renderer and context.
         */
        PlotManager.prototype.plot = function () {
            var count = 0,
                that = this,
                source;

            // load data from all sources
            for (var i = 0; i < this._sources.length; i++) {
                source = this._sources[i].source;
                source.load(handler);
            }

            function handler() {
                var tmp, source, sources, border, renderer, context;

                count += 1;
                if (count === that._sources.length) {
                    // calculate borders
                    if (!that._borders) {
                        var b = {xmin: Number.MAX_VALUE, xmax: Number.MIN_VALUE,
                            ymin: Number.MAX_VALUE, ymax: Number.MIN_VALUE};

                        for (var i = 0; i < that._sources.length; i++) {
                            source = that._sources[i].source;
                            border = source.dataBorders();
                            if (border.xmin < b.xmin) {
                                b.xmin = border.xmin;
                            }
                            if (border.xmax > b.xmax) {
                                b.xmax = border.xmax;
                            }
                            if (border.ymin < b.ymin) {
                                b.ymin = border.ymin;
                            }
                            if (border.ymax > b.ymax) {
                                b.ymax = border.ymax;
                            }
                        }

                        that._borders = b;
                    }

                    // iterate over contexts and set global borders and clear context
                    for (i in that._contexts) {
                        if (that._contexts.hasOwnProperty(i)) {
                            that._contexts[i].clear().options(that._borders);
                        }
                    }
                    that._selcontext.clear().options(that._borders);

                    // presort sources by renderer and context
                    var sorted = {};
                    for (i = 0; i < that._sources.length; i++) {
                        tmp = that._sources[i];

                        if (!sorted.hasOwnProperty(tmp.renderer)) {
                            sorted[tmp.renderer] = {};
                        }
                        if (!sorted[tmp.renderer.hasOwnProperty(tmp.context)]) {
                            sorted[tmp.renderer][tmp.context] = [];
                        }

                        sorted[tmp.renderer][tmp.context].push(tmp.source)
                    }

                    // iterate over presorted sources and plot them
                    for (i in sorted) {
                        renderer = that._renderer[i];

                        for (var j in sorted[i]) {
                            context = that._contexts[j];
                            sources = sorted[i][j];

                            renderer.render(context, sources)
                        }
                    }
                }
            }
        };

        /**
         * Plot only parts of the data.
         *
         * @param xmin {number}   The lower border.
         * @param xmax {number}   The upper border.
         */
        PlotManager.prototype.plotSlice = function (xmin, xmax) {
            var count = 0,
                that = this,
                source;

            // load data from all sources
            for (var i = 0; i < this._sources.length; i++) {
                source = this._sources[i].source;
                source.slice(xmin, xmax, handler);
            }

            function handler() {
                var tmp, source, sources, border, renderer, context;

                count += 1;
                if (count === that._sources.length) {
                    // calculate borders
                    var b = {xmin: Number.MAX_VALUE, xmax: Number.MIN_VALUE,
                             ymin: Number.MAX_VALUE, ymax: Number.MIN_VALUE};

                    for (var i = 0; i < that._sources.length; i++) {
                        source = that._sources[i].source;
                        border = source.sliceBorders();
                        if (border.xmin < b.xmin) {
                            b.xmin = border.xmin;
                        }
                        if (border.xmax > b.xmax) {
                            b.xmax = border.xmax;
                        }
                        if (border.ymin < b.ymin) {
                            b.ymin = border.ymin;
                        }
                        if (border.ymax > b.ymax) {
                            b.ymax = border.ymax;
                        }
                    }

                    // iterate over contexts and set global borders and clear context
                    for (i in that._contexts) {
                        if (that._contexts.hasOwnProperty(i)) {
                            that._contexts[i].clear().options(b);
                        }
                    }

                    // presort sources by renderer and context
                    var sorted = {};
                    for (i = 0; i < that._sources.length; i++) {
                        tmp = that._sources[i];

                        if (!sorted.hasOwnProperty(tmp.renderer)) {
                            sorted[tmp.renderer] = {};
                        }
                        if (!sorted[tmp.renderer.hasOwnProperty(tmp.context)]) {
                            sorted[tmp.renderer][tmp.context] = [];
                        }

                        sorted[tmp.renderer][tmp.context].push(tmp.source)
                    }

                    // iterate over presorted sources and plot them
                    for (i in sorted) {
                        renderer = that._renderer[i];

                        for (var j in sorted[i]) {
                            context = that._contexts[j];
                            sources = sorted[i][j];

                            renderer.render(context, sources, true)
                        }
                    }
                }
            }
        };

        /**
         * Create a new context.
         *
         * @param name {string}     Name of the new context.
         * @param options {object}  Some options, see cry.Context for more details.
         */
        PlotManager.prototype.createContext = function (name, options) {
            if (name && !this._contexts[name]) {
                // calculate height for contexts and clear contexts
                var ncontext = 1;
                for (var i in this._contexts) {
                    this._contexts[i].clear();
                    ncontext += 1;
                }
                var height = (this._height - this._selconfig.height) / ncontext;
                // iterate over contexts and set height
                for (var i in this._contexts) {
                    this._contexts[i].height(height);
                }

                // define context options
                var opt = options || {};

                // check if context is the default context
                if (!this._default || opt.isdefalt)
                    this._default = name;

                // create new context
                opt.width = this._width;
                opt.height = height;
                this._contexts[name] = new cry.Context(this._svg, name, opt);

                // position contexts
                var k = 0;
                for (var i in this._contexts) {
                    this._contexts[i].svg().attr("transform", "translate(0," + (height * k) + ")");
                    k += 1;
                }
            }
        };

        /**
         * Remove an existing context.
         * TODO: make also the default context removable
         *
         * @param name {string} The name of context to remove.
         */
        PlotManager.prototype.removeContext = function (name) {
            // find and remove contexts
            var removed = false;
            var ncontext = 0;
            for (var i in this._contexts) {
                if (this._contexts[i].name() == name) {
                    this._contexts[i].svg().remove();
                    delete this._contexts[i];
                    removed = true;
                } else {
                    ncontext += 1;
                }
            }
            if (removed) {
                // remove also all sources connected to the context
                var i = 0;
                while (i < this._sources.length) {
                    if (this._sources[i].context == name) {
                        this._sources.splice(i, 1);
                    } else {
                        i += 1;
                    }
                }

                // calculate height for each remaining context
                var height = (this._height - this._selconfig.height) / ncontext;
                // iterate over contexts and set height
                var k = 0;
                for (var i in this._contexts) {
                    this._contexts[i].height(height);
                    this._contexts[i].svg().attr("transform", "translate(0," + (height * k) + ")");
                    k += 1;
                }
            }
        };

        /**
         * Add a new renderer to the plot manager.
         *
         * @param name {string}       The name of the renderer.
         * @param renderer {Renderer} The renderer object.
         */
        PlotManager.prototype.addRenderer = function (name, renderer) {
            if (name && !this._renderer[name]) {
                this._renderer[name] = renderer;
            }
        };

        /**
         * Remove a renderer from the plot manager.
         *
         * @param name {string}   The name of the renderer to remove
         */
        PlotManager.prototype.removeRenderer = function (name) {
            if (this._renderer.hasOwnProperty(name)) {

                delete this._renderer[name];

                // remove also all sources connected to the renderer
                var i = 0;
                while (i < this._sources.length) {
                    if (this._sources[i].renderer == name) {
                        this._sources.splice(i, 1);
                    } else {
                        i += 1;
                    }
                }
            }
        };

        /**
         * Add a new source to the manager.
         *
         * @param source {Source}   The source to add.
         * @param context {string}  The name of the context on which to draw the data from the source.
         * @param renderer {string} The name of the renderer to use for the data.
         */
        PlotManager.prototype.addSource = function (source, context, renderer) {
            if (this._contexts[context] && this._renderer[renderer]) {
                this._borders = null;
                this._sources.push({context: context, renderer: renderer, source: source});
            }
        };

        /**
         * Remove a source from the manager.
         *
         * @param name {string}   The name of the source to remove.
         */
        PlotManager.prototype.removeSource = function (name) {
            var i = 0;
            while (i < this._sources.length) {
                if (this._sources[i].source.name() == name) {
                    this._sources.splice(i, 1);
                } else {
                    i += 1;
                }
            }
        };

        /**
         * Creates a hander for selection events of a context.
         *
         * @returns {Function}  A select handler.
         */
        PlotManager.prototype._onselect = function () {
            if (!this._onselectHandler) {
                var that = this;
                this._onselectHandler = function (xmin, xmax) {
                    that.plotSlice(xmin, xmax);
                };
            }
            return this._onselectHandler;
        };


        return PlotManager;
    })();

})(cry || (cry = {}), d3, jQuery); // end module cry

// ---------- file: cry/renderer.js ---------- //


// Augment module 'cry'
var cry;
(function (cry) {
    "use strict";

    /*******************************************************************************
     * Class cry.Renderer.
     * This is just a base implementation without real rendering funcionality, that
     * serves as super class for other renderers.
     *
     * @returns {Function} Constructor for Renderer.
     ******************************************************************************/
    cry.Renderer = (function () {

        /**
         * Constructor of the class Renderer.
         *
         * @constructor @this Renderer
         *
         * @param type {string}   A type name for the renderer e.g. signal, spike or event.
         */
        function Renderer(type) {
            this._class = 'renderer-' + (Math.random() * Math.pow(2, 32)).toString(32);
            this._classes = ['plot', type, this._class].join(' ');
            this._contexts = {};
        }

        /**
         * Clear all plots from all contexts.
         */
        Renderer.prototype.clear = function () {
            for (var i in this._contexts) {
                if (this._contexts.hasOwnProperty(i)) {
                    var context = this._contexts[i];
                    context.svg().selectAll('.' + this._class).remove();
                }
            }
        };

        /**
         * Draw plots on contexts.
         *
         * @param context {Context} The context to draw on.
         * @param sources {Source}   The data source.
         * @param [sliced] {Boolean}  If true, render sliced data.
         */
        Renderer.prototype.render = function (context, sources, sliced) {
            this._contexts[context.name()] = context;
            // this is just a stub
        };

        return Renderer;
    })(); // end class renderer

    /*******************************************************************************
     * Class cry.SingnalRenderer.
     * A renderer for drawing analog signals
     *
     * @returns {Function} Constructor for SignalRenderer
     ******************************************************************************/
    cry.SignalRenderer = (function () {

        /**
         * Constructor for the class SignalRenderer.
         *
         * @constructor @this SignalRenderer
         */
        SignalRenderer.inherits(cry.Renderer);
        function SignalRenderer() {
            SignalRenderer.parent.constructor.call(this, 'signal');
        }

        /**
         * Draw analog signals using the data from the specified source.
         *
         * @param context {Context}         The context to draw on.
         * @param sources Array.{Source]    The source providing the data for the plot.
         * @param [sliced] {Boolean}        Plot sliced data (optional).
         *
         * @public
         */
        SignalRenderer.prototype.render = function (context, sources, sliced) {

            var alldata = [],
                data, plot, style;

            // remember this context
            this._contexts[context.name()] = context;

            // collect data from sources
            if (sliced) {
                for (var i = 0; i < sources.length; i++) {
                    alldata = alldata.concat(sources[i].sliced());
                }
            } else {
                for (i = 0; i < sources.length; i++) {
                    alldata = alldata.concat(sources[i].data());
                }
            }

            if (alldata.length > 0) {
                for (i = 0; i < alldata.length; i += 1) {
                    data = alldata[i].data;
                    style = alldata[i].style;
                    if (!style)
                        style = 'stroke:black';
                    plot = context.svg().append('path')
                        .attr('class', this._classes)
                        .attr('style', style);

                    var d = new Array(data.length), x, y;
                    for (var j = 1; j < data.length; j += 2) {
                        x = context.xScale(data[j - 1]);
                        y = context.yScale(data[j]);
                        if (j == 1) {
                            d[0] = "M" + x.toFixed(1);
                            d[1] = y.toFixed(1);
                        } else {
                            d[j - 1] = "L" + x.toFixed(1);
                            d[j] = y.toFixed(1);
                        }
                    }
                    d = d.join(' ');
                    plot.attr('d', d);
                }
            }
        };

        return SignalRenderer;
    })(); // end class SignalRenderer


    /*******************************************************************************
     * Class SpikeRenderer.
     * A renderer for drawing spike trains.
     *
     * @returns {Function} Constructor for SpikeRenderer
     ******************************************************************************/
    cry.SpikeRenderer = (function () {

        /**
         * Constructor for the class Spike renderer.
         *
         * @constructor @this SpikeRenderer
         */
        SpikeRenderer.inherits(cry.Renderer);
        function SpikeRenderer() {
            SpikeRenderer.parent.constructor.call(this, 'spike');
        }

        /**
         * Draw spiketrains using the given context and data source.
         *
         * @param context {Context}         The context to draw on.
         * @param sources Array.{Source}    The source providing the data for the plot.
         * @param [sliced] {Boolean}        Plot sliced data (optional).
         */
        SpikeRenderer.prototype.render = function (context, sources, sliced) {

            var alldata = [],
                data, plot;

            // collect data from sources
            if (sliced) {
                for (var i = 0; i < sources.length; i++) {
                    alldata = alldata.concat(sources[i].sliced());
                }
            } else {
                for (i = 0; i < sources.length; i++) {
                    alldata = alldata.concat(sources[i].data());
                }
            }

            context.defs().selectAll('.' + this._class).remove();

            if (alldata.length > 0) {

                var yrange = context.ymax() - context.ymin();
                var ystep = yrange / alldata.length;
                var markheight = (context.height() / alldata.length) * 0.8;

                for (i = 0; i < alldata.length; i += 1) {
                    data = alldata[i].data;

                    // create marker
                    SpikeRenderer.addMarker(context.defs(), 'spikemarker-' + i, markheight, alldata[i].style);

                    // create path
                    plot = context.svg().append('path')
                        .attr('class', this._classes)
                        .attr('marker-mid', 'url(#spikemarker-' + i + ')');

                    var d = new Array(data.length), x, y;
                    for (var j = 1; j < data.length; j += 2) {
                        x = context.xScale(data[j - 1]);
                        y = context.yScale(context.ymin() + (ystep * i));
                        if (j == 1) {
                            d[0] = "M" + x.toFixed(1);
                            d[1] = y.toFixed(1);
                        } else {
                            d[j - 1] = "L" + x.toFixed(1);
                            d[j] = y.toFixed(1);
                        }
                    }
                    d = d.join(' ');
                    plot.attr('d', d);
                }
            }
        };

        /**
         * Add a marker for a spiketrain to the defs of a context.
         *
         * @param defs    The defs element of the context.
         * @param name    The name of the marker.
         * @param height  Height of the marker.
         * @param style   The style to apply on the marker.
         */
        SpikeRenderer.addMarker = function (defs, name, height, style) {
            var sty = style;
            if (!sty)
                sty = 'stroke:black;stroke-opacity:0.8';
            defs.append('marker')
                .attr('id', name)
                .attr('markerWidth', 1).attr('markerHeight', height * -1)
                .append('line')
                .attr('stroke-width', 1).attr('fill', 'none')
                .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', height * -1)
                .attr('style', sty);
        };


        return SpikeRenderer;
    })(); // end class SpikeRenderer

})(cry || (cry = {})); // end module cry

// ---------- file: cry/renderer.js ---------- //


// Augment module 'cry'
var cry;
(function (cry) {
    "use strict";

    /*******************************************************************************
     * Class cry.Source.
     * A source provides data used that can be plotted by a renderer. A source returns
     * data as array of objects with te following structure:
     *
     * [
     *  {data: array, style: string, name: string},
     *  ...
     * ]
     *
     * The data field contains a 1d-array with x and y values. [x1, y1, x2, y2, ..., xn, yn].
     * The style string provides a valid value for the SVG style attribute (optional).
     * The name string might or might not be used by a renderer to  label the plot (optional).
     *
     * @returns {Source} Constructor for a Source
     ******************************************************************************/
    cry.Source = (function () {

        var scount = 0;

        /**
         * Constructor for the class source.
         *
         * @constructor
         * @this {Source}
         *
         * @param name {string}   The name of the source (optional).
         */
        function Source(name) {
            this._name = name || 'source-' + (scount += 1);
            this._data = [];
            this._sliced = [];
            this._dataReady = false;
            this._slicedReady = false;
        }

        /**
         * Returns the name of the source.
         *
         * @returns {string} The name of the source.
         */
        Source.prototype.name = function () {
            return this._name;
        };

        /**
         * Crates a string representing the object.
         *
         * @returns {string} A string representation of the object.
         */
        Source.prototype.toString = function () {
            return "Source: " + this._name;
        };

        /**
         * Load data into the source.
         */
        Source.prototype.load = function (callback) {
            // implement this in subclass
            console.log("Source.load(): unimplemented method.");
        };

        /**
         * Check if data are loaded.
         *
         * @returns {Boolean} True if loaded, false otherwise.
         */
        Source.prototype.hasData = function () {
            return this._dataReady;
        };

        /**
         * Return all data of this source - if data are available.
         *
         * @returns {Array} An array of data objects.
         */
        Source.prototype.data = function () {
            if (!this._dataReady) {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
            return this._data;
        };

        /**
         * Calculates the borders for all data.
         *
         * @returns {{xmin, xmax, ymin, ymax}} An object containing all min and max values.
         */
        Source.prototype.dataBorders = function () {
            if (!this._dataReady) {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
            return _borders(this._data);
        };

        /**
         * Slice data and invoke callback when done.
         *
         * @param start {number}      The start of the slice.
         * @param end {number}       The end of the slice.
         * @param callback {Function} A callback that is invoked when the sliced data
         *                            are available.
         */
        Source.prototype.slice = function (start, end, callback) {
            if (this._dataReady) {
                this._slicedReady = false;
                // set defaults for start and end
                var border = this.dataBorders();
                var start = start || border.xmin;
                var end = end || border.xmax;
                // prepare array
                delete this._sliced;
                this._sliced = new Array(this._data.length);
                // make slice
                var d, s, startpos, endpos;
                for (var i = 0; i < this._data.length; i += 1) {

                    d = this._data[i];
                    s = {style: d.style, name: d.name};
                    startpos = 0;
                    endpos = d.data.length - 1;

                    for (var j = 0; j < d.data.length - 1; j += 2) {
                        if (d.data[j] < start) {
                            startpos = j;
                        } else if (d.data[j] > end) {
                            endpos = j;
                            break;
                        }
                    }

                    if (d.data instanceof ArrayBufferView) { // typed arrray
                        s.data = d.data.subarray(startpos, endpos);
                    } else {                                 // normal array
                        s.data = d.data.slice(startpos, endpos);
                    }

                    this._sliced[i] = s;
                }

                this._slicedReady = true;
                if (typeof(callback) == 'function')
                    callback(this);
            } else {
                throw "Source: no data available. Use hasData() to avoid this error.";
            }
        };

        /**
         * Return all sliced data of this source - if such data are available.
         * The method will throw an error if the slicing is not done and the requested
         * data are not available.
         *
         * @returns {Array} The sliced data of this source.
         */
        Source.prototype.sliced = function () {
            if (this._slicedReady) {
                return this._sliced;
            }
            throw "Source: no sliced data available. Use hasSliced() to avoid this error.";
        };


        /**
         * Calculates the borders for sliced data.
         *
         * @returns {{xmin, xmax, ymin, ymax}} An object containing all min and max values.
         */
        Source.prototype.sliceBorders = function () {
            if (this._slicedReady) {
                return _borders(this._sliced);
            }
            throw "Source: no sliced data available. Use hasSliced() to avoid this error.";
        };

        /**
         * Check for sliced data.
         *
         * @returns {Boolean} True if sliced data are available, false otherwise.
         */
        Source.prototype.hasSliced = function () {
            return this._slicedReady;
        };

        /**
         * Calculate the min and max values of an array of data objects.
         * For internal use only.
         *
         * @param data {Array}    Array of data objects.
         *
         *  @returns {{xmin, xmax, ymin, ymax}} An object containing all min and max values.
         */
        function _borders(data) {
            var border = {xmin: Number.MAX_VALUE, xmax: Number.MIN_VALUE,
                ymin: Number.MAX_VALUE, ymax: Number.MIN_VALUE};

            for (var i = 0; i < data.length; i += 1) {

                var d = data[i].data;

                for (var j = 1; j < d.length; j += 2) {
                    var x = d[j - 1], y = d[j];

                    if (x < border.xmin)
                        border.xmin = x;
                    else if (x > border.xmax)
                        border.xmax = x;

                    if (y < border.ymin)
                        border.ymin = y;
                    else if (y > border.ymax)
                        border.ymax = y;
                }
            }
            return border;
        }

        return Source;
    })(); // end class Source

    /*******************************************************************************
     * Class cry.RandomSignal.
     * Source for random analog signals, that can be used as test data.
     *
     * @returns {Function} Constructor for RandomSignal
     ******************************************************************************/
    cry.RandomSignal = (function () {

        /**
         * Constructor for the class RandomSignal.
         *
         * @constructor
         * @extends {Source} @this {RandomSignal}
         *
         * @param xmax    The maximum x value.
         * @param ymax    The maximum y value.
         * @param size    The number of data points per signal.
         * @param num     The number of signals.
         */
        RandomSignal.inherits(cry.Source);
        function RandomSignal(xmax, ymax, size, num) {
            RandomSignal.parent.constructor.call(this);
            this._xmax = xmax || 100;
            this._ymax = ymax || 1000;
            this._size = size || 1000;
            this._num = num || 1;
        }

        /**
         * Load data into the source.
         *
         * @param callback {Function} A callback that is invoked when loading is done.
         */
        RandomSignal.prototype.load = function (callback) {
            if (!this._dataReady) {
                this._data = new Array(this._num);
                for (var i = 0; i < this._num; i += 1) {
                    var s = _randStyle();
                    var d = new Float32Array(this._size * 2);
                    var x = 0;
                    var y;
                    var xstep = this._xmax / this._size;

                    var a1 = this._ymax,
                        phi1 = (Math.random() * Math.PI),
                        o1 = Math.PI * ((Math.random() * 5 + 5) / this._xmax);
                    var a2 = (Math.random() * this._ymax / 5),
                        phi2 = (Math.random() * Math.PI),
                        o2 = Math.PI * ((Math.random() * 50 + 50) / this._xmax);
                    for (var j = 1; j < this._size * 2; j += 2) {
                        y = Math.sin(x * o1 + phi1) * a1 + Math.sin(x * o2 + phi2) * a2;
                        d[j - 1] = x;
                        d[j] = y;
                        x += xstep;
                    }
                    this._data[i] = {data: d, style: s};
                }
                this._dataReady = true;
            }
            callback(this);
        };

        /**
         * Random style for the signal data.
         * Private function for internal use only.
         *
         * @returns A string with style information.
         */
        function _randStyle() {
            var rand256 = function () {
                return Math.round(Math.random() * 255);
            };
            return 'stroke:rgb(' + rand256() + ',' + rand256() + ',' + rand256() + ')';
        }

        return RandomSignal;
    })(); // end class RandomSignal


    /*******************************************************************************
     * Class cry.RandomSpikes.
     * Source for random spike trains, that can be used as test data.
     *
     * @returns {Function} Constructor for RandomSpikes
     ******************************************************************************/
    cry.RandomSpikes = (function () {

        /**
         * Constructor for the class RandomSpikes.
         *
         * @constructor
         * @extends {Source} @this {RandomSpikes}
         *
         * @param xmax    The maximum x value.
         * @param size    The number of data points per signal.
         * @param num     The number of signals.
         */
        RandomSpikes.inherits(cry.Source);
        function RandomSpikes(xmax, size, num) {
            RandomSpikes.parent.constructor.call(this);
            this._xmax = xmax || 100;
            this._size = size || 1000;
            this._num = num || 1;
        }

        RandomSpikes.prototype.load = function (callback) {
            if (!this._dataReady) {
                this._data = new Array(this._num);
                for (var i = 0; i < this._num; i += 1) {
                    var s = _randStyle();
                    var d = new Float32Array(this._size * 2);
                    var x = 0;
                    var xstep = (this._xmax / this._size) * 2;
                    for (var j = 1; j < this._size * 2; j += 2) {
                        x += Math.random() * xstep;
                        d[j - 1] = x;
                        d[j] = 0.01;
                    }
                    this._data[i] = {data: d, style: s};
                }
                this._dataReady = true;
            }
            callback(this);
        };

        /**
         * Random style for the spike data.
         * Private function for internal use only.
         *
         * @returns A string with style information.
         */
        function _randStyle() {
            var rand256 = function () {
                return Math.round(Math.random() * 255);
            };
            return 'stroke:rgb(' + rand256() + ',' + rand256() + ',' + rand256() + ');stroke-opacity:0.85';
        }

        return RandomSpikes;
    })(); // end class RandomSpikes

})(cry || (cry = {})); // end module cry

