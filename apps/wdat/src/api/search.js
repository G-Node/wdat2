// ------------------ file: search_bar.js ---------//

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* VSearchBar. */

WDAT.api.VSearchBar = function(name, bus) {
  // Initialize name and the container element
  if (typeof name === 'string') {  // name is a string
    this._container = $('<div class="search-bar"></div>').attr('id', name);
    this.name = name;
  } else if (typeof name === 'object') { // assume it is a jQuery object
    this._container = name;
    this._container.addClass('search-bar');
    this.name = name.attr('id');
  }

  // There is a requirement for a global bus as well as a local bus.
  this.bus = bus;
  this.lBus = new WDAT.api.EventBus();
  
  // Create the query div. Contains text-field and the advanced options
  // handle.
  var querydiv = $('<div class="query"></div>')
    , textbox  = $('<input type="text" class="textbox" value="I tried so hard and got so far.  Till the end, it doesnt matter"></input>')
    , advanced = $('<a href="#" class="advanced"></a>');

  $(querydiv).append(textbox);
  $(querydiv).append(advanced);

  this._container.append(querydiv);

  // Create the go button
  var gobutton = new WDAT.api.Button('Go', this.lBus, 'go', 'blue');
  gobutton.toJQ().addClass('go');

  this._container.append(gobutton.toJQ());
};

(function () {
  /* Returns the container div as a jQuery object.
   * Use this method to include the search bar into your document.
   *
   * Return value:
   *  jQuery Object
   */ 
  WDAT.api.VSearchBar.prototype.toJQ = function () {
    return this._container;
  };
})();
