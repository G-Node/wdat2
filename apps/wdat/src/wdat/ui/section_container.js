// ---------- file: section_container.js ---------- //

var wdat; (function(wdat, $) {
  "use strict";

  /*****************************************************************************************
   * Class SectionContainer.
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button, wdat.Container
   *
   * @returns {SectionContainer}
   ****************************************************************************************/
  wdat.SectionContainer = (function() {

    SectionContainer.inherits(wdat.Container);

    /**
     * Constructor for class SectionContainer.
     *
     * @param id {string,Object}  Name/ID for this individual section view or a jQuery object representing
     *                            an empty div that will be used as the container for the view.
     * @param bus {Bus}           A bus handling events.
     *
     * @constructor @this {SectionContainer}
     */
    function SectionContainer(id, bus) {
      var empty = "No section selected";
      SectionContainer.parent.constructor.call(this, id, bus, null, 'section-container',
                                               SectionContainer.TEMPLATE, empty);
    }

    /**
     * Refresh the content (see wdat.Container).
     */
    SectionContainer.prototype.refresh = function() {
      // section overview
      var html = this._jq.children('.section').empty();
      if (this._data) {
        var val = objGetRecursive(this._data, 'name') || 'n.a.';
        var field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Name:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'odml_type') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Type:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'tree_position') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Position:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'description') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Description:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'safety_level') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Savety Level:');
        field.children('.field-val').text(val);
        html.append(field);

        val = objGetRecursive(this._data, 'date_created') || 'n.a.';
        field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-name').text('Date Created:');
        field.children('.field-val').text(val);
        html.append(field);
      } else {
        var field = $(SectionContainer.FIELD_TEMPLATE);
        field.children('.field-val').text(this._empty);
        html.append(field);
      }
    };

    SectionContainer.TEMPLATE = '<div><h1>Section</h1><div class="section"></div>' +
                                '<div class="properties"></div></div>';

    SectionContainer.FIELD_TEMPLATE = '<div class="field"><div class="field-name"></div>' +
                                    '<div class="field-val"></div></div>';

    return SectionContainer;
  })();

  /*****************************************************************************************
   * Constructor for the class PropertyContainer.
   *
   * Depends on: jQuery, wdat.Bus, wdat.Button, wdat.Container
   *
   * @returns {PropertyContainer}
   ****************************************************************************************/
  wdat.PropertyContainer = (function() {

    PropertyContainer.inherits(wdat.ParentContainer);

    /**
     * Constructor for the class PropertyContainer.
     *
     * @param id (String, Obj)   Name/ID for this property container or a jQuery object representing
     *                           an empty div that will be used as the container for the view.
     * @param bus (Bus)          A bus handling events.
     * @param act
     *
     * @constructor @this {PropertyContainer}
     */
    function PropertyContainer(id, bus, act) {
      PropertyContainer.parent.constructor.call(this, id, bus, act, 'property-container');
    }

    /**
     * Refresh the content (see wdat.ParentContainer).
     */
    PropertyContainer.prototype.refresh = function() {
      // create primary content
      var html = this._jq.children('.primary').empty();
      var val = this._data.name;
      html.append($('<span class="head">').text(val));
      html.append($('<span class="head-add">').text(' = '));
      for ( var i in this._children) {
        val = this._children[i].name;
        html.children('.head-add').append(i == 0 ? val : ', ' + val);
      }
      val = objGetRecursive(this._data, 'uncertainty');
      if (val)
        html.children('.head-add').append('; +/- ' + val);
      // create secondary content
      html = this._jq.children('.secondary').empty();
      val = '';
      for ( var i in this._children) {
        val += (i == 0 ? this._children[i].name : ', ' + this._children[i].name);
      }
      var field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Values:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'unit') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Unit:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'uncertainty') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Uncertainty:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'data_type') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Data Type:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'definition') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Definition:');
      field.children('.field-val').text(val);
      html.append(field);

      val = objGetRecursive(this._data, 'date_created') || 'n.a.';
      field = $(wdat.SectionContainer.FIELD_TEMPLATE);
      field.children('.field-name').text('Date Created:');
      field.children('.field-val').text(val);
      html.append(field);
      // create buttons
      html = this._jq.children('.buttons').empty();
      var btn;

      btn = new wdat.Button(null, 'more', this._bus, this._expandHandler());
      html.append(btn.jq());

      for ( var i in wdat.Container.ACTIONS) {
        var act = wdat.Container.ACTIONS[i];
        if (this._actions.hasOwnProperty(act)) {
          var click = this._actions[act];
          btn = new wdat.Button(null, act + '_small', this._bus, click, this._data);
          html.append(btn.jq());
        }
      }
    };

    /**
     * Refresh the content (see wdat.ParentContainer).
     */
    PropertyContainer.prototype.refreshChildren = function() {
      this.refresh();
    };

    return PropertyContainer;
  })();

})(wdat || (wdat = {}), jQuery);
