//--------- resource_adapter.js ---------//

/*
 * Provides the class ResourceAdapter
 */
define(['util/strings', 'util/objects', 'api/model_helpers'], function (strings, objects, model_helpers) {
    "use strict";

    /**
     * Translates responses from the NetworkResource into a more convenient
     * format that is used inside the application and vice versa.
     *
     * @constructor
     */
    function ResourceAdapter() {

        var SECURITY_LEVEL_NUM = {1: 'public', 2: 'friendly', 3: 'private'} ,
            SECURITY_LEVEL_STR = {'public': 1, 'friendly': 2, 'private': 3};

        /**
         * Translate date from the NetworkResource.
         *
         * @param response {{primary: *, secondary: *}} A response object with primary
         *                                              and secondary data.
         *
         * @returns {{primary: *, secondary: *}} Adapted response object.
         *
         * @public
         */
        this.adaptFromResource = function(response) {

            var adapted_data = {primary: [], secondary: {}} ,
                error, message;

            // adapt primary data
            for (var i = 0; i < response.primary.length; i++) {
                var data = response.primary[i]['data'];
                if (data['error']) {
                    error = data['error'];
                    message = data['message'];
                    break;
                } else {
                    for (var j = 0; j < data.length; j++) {
                        adapted_data.primary.push(_adaptSingleResponse(data[j]));
                    }
                }
            }

            // adapt secondary data
            for (i = 0; i < response.secondary.length; i++) {
                data = response.secondary[i]['data'];
                if (data['error']) {
                    error = data['error'];
                    message = data['message'];
                    break;
                } else {
                    for (j = 0; j < data.length; j++) {
                        var tmp = _adaptSingleResponse(data[j]);
                        adapted_data.secondary[tmp.id] = tmp;
                    }
                }
            }

            if (error) {
                adapted_data.error = error;
                adapted_data.message = message;
            }

            return adapted_data;
        };

        /**
         * Translate data from the application, so it can be used by the
         * NetworkResource.
         *
         * @param data {Object}
         *
         * @returns {{data: Object, url: String}}
         *
         * @public
         */
        this.adaptFromApplication = function(data) {

            var adapted = {} ,
                url, category, type, num_id;

            // make url
            if (data.id) {
                var part_id = strings.segmentId(data.id);
                num_id      = part_id.id;
                type        = part_id.type || data.type;
                category    = part_id.category || model_helpers.category(type);
            } else {
                type        = data.type;
                category    = data.category || model_helpers.category(type);
            }

            if (!type) throw "Unable to generate URL without type";

            url = strings.makeBaseURL(category, type, num_id);

            // adapt data
            if (type === 'value') {
                adapted.data = data['name'];
            } else {
                adapted.name = data['name'];
            }
            adapted = objects.deepMerge(adapted, data['fields']);
            adapted = objects.deepMerge(adapted, data['data']);

            adapted.safety_level = SECURITY_LEVEL_STR[data['fields']['safety_level']] || 3;
            delete adapted.date_created;

            for (var p in data['parents']) {
                if (data['parents'].hasOwnProperty(p)) {
                    var tmp = strings.segmentId(data['parents'][p]);
                    adapted[p] = tmp.id;
                }
            }

            return {data: adapted, url: url};
        };

        /**
         * Translates a single element returned by the NetworkResource.
         *
         * @param element {Object}
         *
         * @returns {Object}
         *
         * @private
         */
        function _adaptSingleResponse(element) {
            var adapted = {} ,
                fields, parted_id, id;

            fields = element['fields'];

            id = strings.urlOmitHost(element['permalink']);
            parted_id = strings.segmentId(id);

            adapted.id = id;
            adapted.type = parted_id.type;
            adapted.category = parted_id.category;
            adapted.plotable = model_helpers.isPlotable(adapted.type);
            adapted.owner = strings.urlOmitHost(fields['owner']);

            var template = model_helpers.template(adapted.type);

            // adapt fields
            adapted.fields = {};
            for (var f in template.fields) {
                if (template.fields.hasOwnProperty(f)) {
                    if (f === 'name') {
                        if (adapted.type === 'value') {
                            adapted.name = fields['data'];
                        } else {
                            adapted.name = fields['name'];
                        }
                    } else if (f === 'safety_level') {
                        adapted.fields[f] = SECURITY_LEVEL_NUM[fields['safety_level']];
                    } else {
                        adapted.fields[f] = fields[f];
                    }
                }
            }

            // adapt children
            adapted.children = {};
            for (var ch in template.children) {
                if (template.children.hasOwnProperty(ch)) {
                    adapted.children[ch] = [];
                    for (var i = 0; i < fields[ch].length; i++) {
                        adapted.children[ch][i] = strings.urlOmitHost(fields[ch][i]);
                    }
                }
            }

            // adapt parents
            adapted.parents = {};
            for (var p in template.parents) {
                if (template.parents.hasOwnProperty(p)) {
                    if (fields[p]) {
                        adapted.parents[p] = strings.urlOmitHost(fields[p]);
                    } else {
                        adapted.parents[p] = null;
                    }
                }
            }

            // adapt data
            adapted.data = {};
            for (var d in template.data) {
                if (template.data.hasOwnProperty(d)) {
                    if (fields[d]) {
                        adapted.data[d] = fields[d];
                    }
                }
            }

            return adapted;
        }
    }

    return ResourceAdapter;
});
