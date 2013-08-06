//--------- units.js ---------//

/*
 * This module provides some functions for unit conversion operations.
 */
define(function () {
    "use strict";

    var supported_units = {
        time: ['s', 'ms', 'us'],
        signal: ['V', 'mV', 'uV'],
        sampling: ['MHz', 'kHz', 'Hz']
    }

    /**
     * @returns {Number}           Conversion rate.
     * @public
     */
    function _getConversionRate(orig_unit, new_unit) {
        var unit_type, f_index, t_index;
        for (var t in supported_units) {
            if (supported_units.hasOwnProperty(t)) {
                f_index = supported_units[t].indexOf(orig_unit);
                t_index = supported_units[t].indexOf(new_unit);
                if ((f_index > -1) && (t_index > -1)) {
                    unit_type = supported_units[t];
                }

            }
        }

        if (unit_type === undefined) {
            throw "Unable to convert between" + orig_unit.toString() + " and " + new_unit.toString();
        }
        return Math.pow(10, (t_index - f_index) * 3)
    }

    /**
     * Converts a given value from one unit to another.
     *
     * @param value     {Number}   Float value to convert.
     * @param orig_unit {String}    Currents units.
     * @param new_unit  {String}    Units to convert to.
     *
     * @returns {Number}           Converted value.
     * @public
     */
    function convert(value, orig_unit, new_unit) {
        return _getConversionRate(orig_unit, new_unit) * value;
    }

    // return public parts of the module
    return {
        convert:     convert
    };
});