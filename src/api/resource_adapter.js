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

        var SECURITY_LEVEL_NUM = model_helpers.SECURITY_LEVEL_NUM ,
            SECURITY_LEVEL_STR = model_helpers.SECURITY_LEVEL_STR;

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
                if (response.primary[i]['error']) {
                    error = response.primary[i]['error'];
                    message = response.primary[i]['message'];
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
                if (response.secondary[i]['error']) {
                    error = response.secondary[i]['error'];
                    message = response.secondary[i]['message'];
                    break;
                } else {
                    for (j = 0; j < data.length; j++) {
                        var tmp = _adaptSingleResponse(data[j]);
                        adapted_data.secondary[tmp.id] = tmp;
                    }
                }
            }

            // sort primary data
            adapted_data.primary.sort(_compareObject);

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
            delete adapted.shared_with;

            for (var p in data['parents']) {
                if (data['parents'].hasOwnProperty(p)) {
                    var tmp = strings.segmentId(data['parents'][p]);
                    adapted[p] = tmp.id;
                }
            }

            return {data: adapted, url: url};
        };

        /**
         * Translate data from the application, so it can be used by the
         * NetworkResource.
         *
         * @param data {Object}     An ACL object like
         *                          data = {
         *                              "id": "/metadata/section/39487",
         *                              "safety_level": 3,
         *                              "shared_with": {
         *                                  "bob": 1, "anita": 2
         *                              }
         *                          }
         *
         * @returns {{data: Object, url: String}}
         *
         * @public
         */
        this.adaptFromACL = function(data) {
            var adapted = {}, url;

            if (!data.id) throw "Unable to generate URL without ID";
            var path = strings.segmentId(data.id);
            if (path.id === undefined || path.type === undefined || path.category === undefined) {
                throw "ID of an object is not correct. Should be like '/metadata/section/39487'";
            }
            url = '/' + path.category + '/' + path.type + '/' + path.id + '/acl/';

            if (data.safety_level === undefined && data.shared_with === undefined) {
                throw "No ACL information provided, request is cancelled."
            }

            if (!(data.safety_level === undefined)) {
                adapted['safety_level'] = data.safety_level;
            }
            if (!(data.shared_with === undefined)) {
                adapted['shared_with'] = data.shared_with;
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

            adapted.shared_with = fields['shared_with'];

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


        /**
         * Compare two objects for sorting.
         *
         * @private
         */
        function _compareObject(prev, next) {
            if (prev.name && next.name) {
                return _comparePrimitive(prev.name, next.name);
            } if (prev.name) {
                return -1;
            } if (next.name) {
                return 1;
            } else {
                return _comparePrimitive(prev.id, next.id);
            }
        }

        /**
         * Compare two primitive types for sorting.
         *
         * @private
         */
        function _comparePrimitive(prev, next) {
            if (prev < next) {
                return -1;
            } else if (prev > next) {
                return 1;
            } else {
                return 0;
            }
        }
    }

    return ResourceAdapter;
});
