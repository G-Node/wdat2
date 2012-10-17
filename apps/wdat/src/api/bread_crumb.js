// ---------- file: bread_crumb.js ---------- //

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* Constructor for the class VBreadCrumb. VBreadCrumb implements a bread crumb 
 * navigation bar. Elements can be added to the navigation bar. Each element 
 * is represented by a button which sends a selection event when clicked.
 * 
 * Elements are Objects with the following properties:
 * 
 *  - Minimal element: {id: <id>, name: <name>}
 *
 *    If the the id is missing a unique identifier will be created. If the 
 *    name is missing the id will be used as a name. 
 * 
 * Parameters: 
 *  - name: String, Obj.      The id of the list or a jQuery object.
 *  
 *  - bus: EventBus           Bus for handling events.
 * 
 * Depends on: 
 *  - jQuery, WDAT.api.EventBus, WDAT.api.Button
 */
WDAT.api.VBreadCrumb = function(name, bus) {
  // initialize name and and jQuery object as _navi
  if (typeof name === 'string') { // name is a string
    this._navi = $('<div class="bread-crumb"></div>').attr('id', name);
    this.name = name;
  } else if (typeof name === 'object') { // name is a jQuery object
    this._navi = name;
    this._navi.addClass('bread-crumb');
    this.name = this._navi.attr('id');
  }
  this.bus = bus;
  this.event = this.name + '-select';
  var that = this;
  this.bus.subscribe(this.event, function(event, data) {
    that._navi.children().removeClass('selected');
    that._navi.children('#' + that._toId(data)).addClass('selected');
  });
};

// define the tab folders methods in their own scope
(function() {

  /* Add a new element to the navigation bar. If pos is not set the element will
   * be appended to the end of the navigation bar. If the position is specified 
   * all elements beginning at this position will be removed and the element 
   * will be appended to the end of the navigation bar.
   * 
   * Parameter:
   *  - tab: Object       Object representing the navigation bar element.
   *
   *  - pos: Number       The position where to add the new element. All elements after the 
   *                      specified position will be deleted.
   * 
   * Return value:
   *    The inserted element or null if nothing has been inserted.
   */
  WDAT.api.VBreadCrumb.prototype.add = function(elem, pos) {
    // generate an id if not present
    if (!elem.id) elem.id = this.bus.uid();
    if (!elem.name) elem.name = elem.id;
    // check if id is already used
    if (!this.has(elem)) {
      // remove all elements after the given position
      if (pos != null) this.remove(pos);
      // add new element
      var button = new WDAT.api.Button(elem.name, this.bus, this.event, null, elem);
      button.toJQ().attr('id', this._toId(elem));
      button.toJQ().addClass('selected');
      this._navi.children().removeClass('selected');
      this._navi.append(button.toJQ());
      return elem;
    } else {
      return null;
    }
  };

  /* Remove all elements from the bread crumb bar beginning at the given position. 
   * 
   * Parameter:
   *  - pos: Number        The position from where to delete all elements.
   *
   * Return value:
   *    None
   */
  WDAT.api.VBreadCrumb.prototype.remove = function(pos) {
    var elements = this._navi.children();
    if (!pos)
      pos = 0;
    if (pos < elements.length) {
      elements.each(function(i) {
        if (i >= pos)
          $(this).remove();
      });
    }
  };

  /* Checks if an element is in the bread crumb bar.
   * 
   * Parameter:
   *  - elem: String, Obj.    The id of an element or the element itself.
   *
   * Return value:
   *    True if the element is in the bread crumb bar, false otherwise.
   */
  WDAT.api.VBreadCrumb.prototype.has = function(elem) {
    return (elem && this._navi.children('#' + this._toId(elem)).length > 0);
  };

  /* Get the position of an element inside the bread crumb bar.
   * 
   * Parameter:
   *  - elem: String, Obj     The id of an element or the element itself.
   *
   * Return value:
   *    The position of the element inside the bar or -1 if not found.
   */
  WDAT.api.VBreadCrumb.prototype.pos = function(elem) {
    var pos = -1;
    if (elem) {
      var id = this._toId(elem);
      this._navi.children().each(function(i) {
        if (pos < 0 && $(this).attr('id') == id) 
          pos = i;
      });
    }
    return pos;
  };

  /* Helper function for the creation of unique ids.
   * For internal use only.
   */
  WDAT.api.VBreadCrumb.prototype._toId = function(id) {
    var result;
    if (id.id)
      result = this.name + '-' + id.id.toString();
    else
      result = this.name + '-' + id.toString();
    return result;
  };

}());
