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

    var default_units = {
        time: 'ms',
        signal: 'mV',
        sampling: 'Hz'
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
                    unit_type = t;
                    break;
                }

            }
        }

        if (unit_type === undefined) {
            throw "Unable to convert between " + orig_unit.toString() + " and " + new_unit.toString();
        }
        return Math.pow(10, (t_index - f_index) * 3)
    }

    /**
     * Converts a given frequency unit to corresponding time unit.
     *
     * @param f_unit  {String}     Units to convert from.
     *
     * @returns {String}           Resulting units in the time domain.
     * @public
     */
    function frequency_to_time(f_unit) {
        var f_index = supported_units['sampling'].indexOf(f_unit);
        if (!f_index) {
            throw f_index.toString() + " is not a supported frequency."
        }
        return supported_units['time'][-f_index + 2]
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
        convert:            convert,
        frequency_to_time:  frequency_to_time,
        supported_units:    supported_units,
        default_units:      default_units
    };
});