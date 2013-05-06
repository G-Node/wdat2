//--------- file: model_helper.js ---------//

/*
 * This module defines helper functions for the data model.
 */
define(['util/objects'], function(objects) {
    "use strict";

    /**
     * Find the matching category for specific type using the internal model definition.
     *
     * @param type {String}   The type of a data object e.g. section, segment or analogsignal
     *
     * @return {String} The corresponding category e.g. metadata or electrophysiology
     *
     * @public
     */
    function category(type) {

        var t = type.toLowerCase();

        if (_def.metadata.hasOwnProperty(t)) {
            return 'metadata';
        } else if (_def.ephys.container.hasOwnProperty(t)) {
            return 'electrophysiology';
        } else if (_def.ephys.plotable.hasOwnProperty(t)) {
            return 'electrophysiology';
        } else {
            throw "Parameter type = '" + t + "' is not a known type";
        }
    }

    // just a local var that serves as a cache.
    var _templateCache = {};

    /**
     * Get the matching template for a specific type defined in the model definition. This template should
     * never be manipulated or used directly as a representation for a model instance.
     *
     * @param type {string}   The type of a data object e.g. section, segment or analogsignal
     *
     * @return {Object} The corresponding template object.
     *
     * @public
     */
    function template(type) {
        var t = type.toLowerCase();
        // try to get template from cache
        if (!_templateCache[t]) {

            var tmpl ,
                merged;

            // get the definition for the type
            if (_def.metadata.hasOwnProperty(t))
                tmpl = _def.metadata[t];
            else if (_def.ephys.container.hasOwnProperty(t))
                tmpl = _def.ephys.container[t];
            else if (_def.ephys.plotable.hasOwnProperty(t))
                tmpl = _def.ephys.plotable[t];

            // merge with template and _def.all
            if (tmpl) {
                merged = objects.deepCopy(tmpl);
                merged = objects.deepMerge(merged, _def.all, true);
                _templateCache[t] = merged;
            } else {
                throw "Parameter type = '" + t + "' is not a known type";
            }

        }

        return _templateCache[t];
    }

    /**
     * Get all defined fields for a specific type.
     *
     * @param type {string}   Object with all defined fields or 'undefined' if no such type or no fields
     *                        are specified.
     *
     * @return {Object} An object with all defined fields.
     *
     * @public
     */
    function fields(type) {
        var tmpl = template(type);
        return tmpl.fields;
    }

    /**
     * Get all defined data fields for a specific type.
     *
     * @param type {string}   The type of a data object.
     *
     * @return {Object} An object with all defined data.
     *
     * @public
     */
    function data(type) {
        var tmpl = template(type);
        return tmpl.data;
    }

    /**
     * Get all defined parents for a specific type.
     *
     * @param type {string}   The type of a data object.
     *
     * @return {Object} An object with all defined parents.
     */
    function parents(type) {
        var tmpl = template(type);
        return tmpl.parents;
    }

    /**
     * Get all defined children for a specific type.
     *
     * @param type {string}   The type of a data object.
     *
     * @return {Object} Object with all defined children.
     *
     * @public
     */
    function children(type) {
        var tmpl = template(type);
        return tmpl.children;
    }

    /**
     * Determine by its type if a data object is plotable, using the definitions
     * in _def.
     *
     * @param type {string}     The type of a data object e.g. section, segment or analogsignal
     *
     * @return {Boolean} True if the object is plotable, false otherwise
     *
     * @public
     */
    function isPlottable(type) {
        var t = type.toLowerCase();
        return _def.ephys.plotable.hasOwnProperty(t);
    }

    /**
     * Crates a new object from a certain type with all the defaults set.
     *
     * TODO Handle defaults for data (not needed yet because ephys types are never created in the web gui)
     *
     * @param type {string}     The type of a data object e.g. section, segment or analogsignal
     *
     * @return {Object} A new object from a certain type.
     *
     * @public
     */
    function create(type) {
        var val , i ,
            obj = {} ,
            tmpl = template(type);

        if (tmpl) {
            if (tmpl.fields) {
                obj.fields = {};
                for (i in tmpl.fields) {
                    if (tmpl.fields.hasOwnProperty(i)) {
                        val = tmpl.fields[i].value;

                        if (val === undefined) {
                            val = null;
                        }

                        if (i == 'name') {
                            obj.name = val;
                        } else {
                            obj.fields[i] = val;
                        }
                    }
                }
            }

            obj.parents = {};
            for (i in tmpl.parents) {
                if (tmpl.parents.hasOwnProperty(i)) {
                    obj.parents[i] = null;
                }
            }

            obj.children = {};
            for (i in tmpl.children) {
                if (tmpl.children.hasOwnProperty(i)) {
                    obj.children[i] = [];
                }
            }
        }

        return obj;
    }


    /**
     * @type {Array} Array with all ephys types
     * @private
     */
    var _types;

    /**
     * Returns an array containing all ephys type names.
     *
     * @return {Array} All type names of ephys data types.
     */
    function ephysTypes() {
        if (!_types) {

            _types = [];

            var i;
            for (i in _def.ephys.container) {
                if (_def.ephys.container.hasOwnProperty(i)) {
                    _types.push(i);
                }
            }
            for (i in _def.ephys.plotable) {
                if (_def.ephys.plotable.hasOwnProperty(i)) {
                    _types.push(i);
                }
            }
        }

        return _types;
    }

    /**
     * All model definitions as object structure.
     * Container, plotable, metadata and all will be defined later in this file
     *
     * @type {{ephys: {container: null, plotable: null}, metadata: null, all: null}}
     * @private
     */
    var _def = {ephys: { container: null, plotable: null}, metadata: null, all: null};

    // definitions for all models
    _def.all = {
        fields: {
            safety_level:           {type: 'option',  options: {'public': 'Public', 'friendly': 'Friendly', 'private': 'Private'}},
            date_created:           {type: 'text', readonly: true}
        }
    };

    // definitions for metadata models
    _def.metadata = {

        section : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                odml_type:          {type: 'int', label: 'Type', obligatory: true, min: 0, value: 0},
                tree_position:      {type: 'int', label: 'Position', obligatory: true, min: 0, value: 0}
            },
            children : {
                property_set:       {type: 'property', label: 'Properties'},
                block_set:          {type: 'block', label: 'Blocks'},
                section_set:        {type: 'section', label: 'Sections'}
            },
            parents : {
                parent_section:     {type: 'section', label: 'Section'}
            }
        },

        property : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                unit:               {type: 'text', max: 10 },
                uncertainty:        {type: 'text'},
                dtype:              {type: 'text', label: 'Data Type'},
                definition:         {type: 'ltext'}
            },
            children : {
                value_set:          {type: 'value', label: 'Values'}
            },
            parents : {
                section:            {type: 'section'}
            }
        },

        value : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 1, max: 100}
            },
            children : {},
            parents : {
                parent_property:    {type: 'property'}
            }
        }

    };

    // definition of neo container models
    _def.ephys.container = {

        block : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                index:              {type: 'int', obligatory: true, min: 0, value: 0},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'},
                filedatetime:       {type: 'date'},
                recdatetime:        {type: 'date'}
            },
            children : {
                segment_set:        {type: 'segment'},
                recordingchannelgroup_set: {type: 'recordingchannelgroup'}
            },
            parents : {
                section:            {type: 'section'}
            }
        },

        segment : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                index:              {type: 'int', obligatory: true, min: 0, value: 0},
                file_origin:        {type: 'text'},
                filedatetime:       {type: 'date'},
                recdatetime:        {type: 'date'}
            },
            children : {
                analogsignal_set:       {type: 'analogsignal'},
                irsaanalogsignal_set:   {type: 'irsaanalogsignal'},
                analogsignalarray_set:  {type: 'analogsignalarray'},
                spiketrain_set:     {type: 'spiketrain'},
                spike_set:          {type: 'spike'},
                event_set:          {type: 'event'},
                eventarray_set:     {type: 'eventarray'},
                epoch_set:          {type: 'epoch'},
                epocharray_set:     {type: 'epocharray'}
            },
            parents : {
                block:              {type: 'block'}
            }
        },

        unit : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            children : {
                spiketrain_set:     {type: 'spiketrain'},
                spike_set:          {type: 'spike'},
                recordingchannel:   {type: 'recordingchannel'}
            },
            parents :               {}
        },

        recordingchannel : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'},
                coordinate:         {type: 'text'},
                index:              {type: 'int', min: 0 , value: 0}
            },
            children : {
                unit_set:           {type: 'unit'},
                analogsignal_set:   {type: 'analogsignal'},
                irsaanalogsignal_set: {type: 'irsaanalogsignal'}
            },
            parents : {
                recordingchannelgroup: {type: 'recordingchannelgroup'}
            }
        },

        recordingchannelgroup : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'},
                channel_names:      {type: 'text'},
                channel_indexes:    {type: 'text'}
            },
            children : {
                recordingchannel_set:   {type: 'recordingchannel'},
                analogsignalarray_set:  {type: 'analogsignalarray'}
            },
            parents : {
                block:              {type: 'block'}
            }
        }

    };

    // definition of neo models containing data
    _def.ephys.plotable = {
        spike: {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data: {
                time:               {type: 'num'},
                waveform:           {type: 'datafile'},
                sampling_rate:      {type: 'num'},
                left_sweep:         {type: 'num'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'},
                unit:               {type: 'unit'}
            }
        },

        spiketrain: {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data: {
                times:              {type: 'num'},
                waveforms:          {type: 'datafile'},
                sampling_rate:      {type: 'num'},
                t_start:            {type: 'num'},
                t_stop:             {type: 'num'},
                left_sweep:         {type: 'num'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'},
                unit:               {type: 'unit'}
            }
        },

        event: {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'},
                label:              {type: 'text'}
            },
            data: {
                time:               {type: 'num'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'}
            }
        },

        epoch : {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'},
                label:              {type: 'text'}
            },
            data : {
                duration:           {type: 'num'},
                time:               {type: 'num'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'}
            }
        },

        analogsignal : {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data : {
                signal:             {type: 'datafile'},
                sampling_rate:      {type: 'num'},
                t_start:            {type: 'num'}
            },
            children :              {},
            parents : {
                segment:            {type: 'segment'},
                recordingchannel:   {type: 'recordingchannel'}
            }
        },

        irsaanalogsignal : {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data: {
                times:              {type: 'num'},
                samples:            {type: 'datafile'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'}
            }
        },

        eventarray : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                labels:             {type: 'text'},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data : {
                times:              {type: 'num'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'}
            }
        },

        epocharray : {
            fields: {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                labels:             {type: 'text'},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data: {
                times:              {type: 'datafile'},
                durations:          {type: 'datafile'}
            },
            children:               {},
            parents: {
                segment:            {type: 'segment'}
            }
        },

        analogsignalarray : {
            fields : {
                name:               {type: 'text', obligatory: true, min: 3, max: 100},
                description:        {type: 'ltext'},
                file_origin:        {type: 'text'}
            },
            data : {
                analogsignal_set:   {type: 'datafile'},
                sampling_rate:      {type: 'num'},
                t_start:            {type: 'num'}
            },
            children :              {},
            parents : {
                segment:            {type: 'segment'}
            }
        }
    };

    //
    // return public parts of the module
    //
    return {
        category:   category ,
        template:    template ,
        field:      fields ,
        data:       data ,
        parents:    parents ,
        children:   children ,
        isPlotable: isPlottable ,
        ephyTypes:  ephysTypes ,
        create:     create
    };

});
