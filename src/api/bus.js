//--------- bus.js ---------//

/*
 * Defines a message bus class.
 * Depends on jquery (can't be used in workers)
 */
define(['env'], function (env) {
    "use strict";

    /**
     * Class Bus. The event bus can be used to register and fire events.
     *
     * Logging:
     *    If env.debug = true the bus will write every event to the console.
     *
     * Error handling:
     *    If the event data object contains a field 'error' with a not false
     *    the object will be passed to the method 'onerror(event, data)' and publishing of
     *    the event will be canceled if 'onerror' returns a false.
     *
     * @constructor
     */
    function Bus() {

        var _counter = 1 ,
            _states  = {};

        /**
         * Subscribe a function to a specific event.
         *
         * @param event {String}        The event name.
         * @param callback {Function}   The function to call when events are published.
         * @param [uid] {String}          A unique id that is concatenated to the event, in order
         *                              to create unique event names.
         */
        this.subscribe = function(event, callback, uid) {
            var e = event;

            if (uid) e += uid;
            $(this).bind(e, callback);

            if (env.debug) {
                if (_states.hasOwnProperty(e))
                    console.log('Bus (DEBUG): subscribe for state ' + e);
                else
                    console.log('Bus (DEBUG): subscribe for event ' + e);
            }
        };

        /**
         * Unsubscribe a specific event.
         *
         * @param event {String}    The event name.
         * @param [uid] {String}      A unique id that is concatenated to the event, in order
         *                          to create unique event names.
         */
        this.unsubscribe = function(event, uid) {
            var e = event;

            if (uid) e += uid;
            $(this).unbind(e);

            if (env.debug) {
                if (_states.hasOwnProperty(e))
                    console.log('Bus (DEBUG): unsubscribe from state ' + e);
                else
                    console.log('Bus (DEBUG): unsubscribe from event ' + e);
            }
        };

        /**
         * Publish an event to all registered listeners.
         *
         * @param event {String}    The event name.
         * @param data {Object}     The data object.
         * @param [uid] {String}    Unique identifier.
         */
        this.publish = function(event, data, uid) {
            var e = event;

            if (uid) e += uid;

            if (!_states.hasOwnProperty(e)) {
                if (this.onerror(event, data)) {
                    if (env.debug) {
                        var d = data || 'none';
                        console.log('Bus (DEBUG): publish event ' + e + ' // data = ' + JSON.stringify(d));
                    }
                    $(this).trigger(e, data);
                } else {
                    if (env.debug) {
                        var d = data || 'none';
                        console.log('Bus (DEBUG): event not published due to errors // data = ' + JSON.stringify(d));
                    }
                }
            } else {
                throw 'Unable to publish data for a state, use the state() method instead.';
            }
        };

        /**
         * Get or set a certain state.
         *
         * @param state {String}    The name of the state.
         * @param [data] {Object}   The new representation of the state. If set it will
         *                          change the state and notify all subscribed functions.
         *
         * @return {Object} The current representation of the state.
         */
        this.state = function(state, data) {
            var current = null;

            if (data !== undefined) {

                _states[state] = data;
                current = data;
                $(this).trigger(state, data);

                if (env.debug) {
                    console.log('Bus (DEBUG): change state ' + state + ' to: ' + JSON.stringify(data))
                }

            } else {
                if (_states.hasOwnProperty(state)) {
                    current = _states[state];
                } else {
                    console.log('Bus (WARN): no such state ' + state);
                }
            }

            return current;
        };

        /**
         * Returns a unique identifier.
         *
         * @returns {String} A unique identifier.
         */
        this.uid = function() {
            return (_counter++).toString();
        };

        /**
         * Handles data containing errors.
         * Set this handler in order to change error handling behavior.
         *
         * @param event {Object}    The event object.
         * @param data {Object}     The data object.
         *
         * @returns {boolean} True if event should be published or false to interrupt.
         */
        this.onerror = function(event, data) {
            if (data && data.error === true) {
                console.log('Bus (ERROR): event = ' + event.type + ' // error' + data.response || data.error);
                return false;
            }
            return true;
        };

    }

    return Bus;
});
