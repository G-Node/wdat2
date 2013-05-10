//--------- button.js ---------//

/*
 * TODO module description.
 */
define(['util/classes', 'ui/widget'], function (classes, Widget) {
    "use strict";

    //classes.inherit(Button, Widget);

    /**
     * Constructor for the class Button.
     *
     * @param id (String, Obj)          Id or jQuery object that represents the button (optional).
     * @param label (String)            The label for the button. This might also be a name of a
     *                                  predefined button class (see PREDEF_BUTTONS).
     * @param bus (Bus)                 Bus for events.
     * @param click (String, Function)  Event string or function that is propagated by clicks.
     *                                  If click is an event the whole button object is passed
     *                                  to the event.
     * @param data (Any)                Some data that is passed along with events.
     *
     *
     * @constructor
     * @extends {Widget}
     * @public
     */
    function Button(id, label, bus, click, data) {

        var _bus, _data, _click;

        Widget.apply(this, [id, '<button>', 'wdat-button']);

        /**
         * @private
         */
        this._init = function() {
            //Button.parent.constructor.call(this, id, '<button>', 'wdat-button');

            _bus  = bus;
            _data = data;

            if (_PREDEF_BUTTONS[label]) {
                var pre = _PREDEF_BUTTONS[label];
                this.jq().button(pre.def);

                if (pre.click) {
                    this.jq().click(pre.click);
                }
            } else {
                this.jq().button({text: true, label: label});
            }
            this.click(click || this.id());
        };

        /**
         * Getter and setter for data, that is associated with the button.
         *
         * @param [data] {Object|String}    New data to set.
         *
         * @return {Object|String|Button} The data associated with the button (getter) or
         *                                the button object (setter)
         * @public
         */
        this.data = function(data) {
            if (data !== undefined) {
                _data = data;
                return this;
            }
            return _data;
        };

        /**
         * Getter or setter for click events.
         *
         * @param [click] {String|Function} Event string or function that is propagated by
         *                                  clicks. If click is an event the whole button
         *                                  object is passed to the event.
         *
         * @return {Function|Button} The function that handles the click event (getter) or
         *                           the button object.
         * @public
         */
        this.click = function(click) {
            if (click !== undefined) {

                if (this._click) {
                    this.jq().unbind('click', this._click);
                }

                if (typeof click === 'function') {
                    _click = click;
                } else {
                    _click = function() {
                        _bus.publish(click.toString(), _data);
                    };
                }

                this.jq().click(_click);
                return this;
            }
            return _click;
        };

        /**
         * Disable or enable the button.
         *
         * @param [disabled] {Boolean}  The new disable status to set.
         *
         * @returns {Boolean|Button} The disabled status of the button (getter) or the
         *                           button object (setter)
         * @public
         */
        this.disable = function(disabled) {
            if (disabled !== undefined) {
                this.jq().button("option", "disabled", disabled);
                return this;
            }
            return this.jq().button("option", "disabled");
        };

        // initialize the button
        this._init();
    }

    /**
     * Some predefined button configurations
     */
    var _PREDEF_BUTTONS = {
      add:        {def: {text: true, label: "Add", icons: { primary: "ui-icon-plusthick"}}},
      add_small:  {def: {text: false, icons: { primary: "ui-icon-plusthick"}}},
      del:        {def: {text: true, label: "Remove", icons: { primary: "ui-icon-minusthick"}}},
      del_small:  {def: {text: false, icons: { primary: "ui-icon-minusthick"}}},
      sel:        {def: {text: true, label: "Select", icons: { primary: "ui-icon-check"}}},
      sel_small:  {def: {text: false, icons: { primary: "ui-icon-check"}}},
      edit:       {def: {text: true, label: "Edit", icons: { primary: "ui-icon-wrench"}}},
      edit_small: {def: {text: false, icons: { primary: "ui-icon-wrench"}}},
      ok:         {def: {text: true, label: "OK"}},
      save:       {def: {text: true, label: "Save"}},
      quit:       {def: {text: true, label: "Cancel"}},
      more:       {def: {text: false, icons: { primary: "ui-icon-triangle-1-s"}},
                   click: _toggleimg("ui-icon-triangle-1-s", "ui-icon-triangle-1-n")}
    };

    /**
     * Toggle images. For internal use only
     *
     * @param first (String)     CSS identifier (jQuery UI button) for the first image.
     * @param second (String)   CSS identifier (jQuery UI button) for the second image.
     *
     * @returns {Function}
     */
    function _toggleimg(first, second) {
      return function() {
        var b = $(this);
        if (b.button("option", "icons").primary == first)
          b.button("option", "icons", { primary: second});
        else
          b.button("option", "icons", { primary: first});
      };
    }

    return Button;
});
