// ------------------ file: search_bar.js ---------//

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* VSearchBar. */

WDAT.api.VSearchBar = function(name, bus) {
  var SEARCH_PLACEHOLDER = "Search..."
    , that = this;

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
  this._querydiv = $('<div class="query"></div>')
  this._textbox  = $('<input type="text" class='+
            '"textbox placeholder" value="'+
            SEARCH_PLACEHOLDER +'"></input>')
  this._advancedBtn = $('<a href="#" class="advanced"></a>');
  this._advpanel = $('<div class="advpanel hidden"></div>');

  $(this._querydiv).append(this._textbox);
  $(this._querydiv).append(this._advancedBtn);

  this._container.append(this._querydiv);
  this._container.append(this._advpanel);

  // Create the go button
  var gobutton = new WDAT.api.Button('Go', this.lBus, 'go', 'blue');
  gobutton.toJQ().addClass('go');

  this._container.append(gobutton.toJQ());

  // On focus, adjust classes and value
  $(this._textbox).focus(function(){
      // First, add query-active class to querydiv
      $(this._querydiv).toggleClass('query-active', true);

      // Update classes and values for textbox
      if (this.value === SEARCH_PLACEHOLDER) {
        this.value = ''; 
        $(this).toggleClass('placeholder', false);
      }
  });

  // On blur, adjust classes and value
  $(this._textbox).blur(function() {
      // First, remove query-active class to querydiv
      $(this._querydiv).toggleClass('query-active', false);

      // Update classes and values for textbox
      if (this.value === '') {
        $(this).toggleClass('placeholder', true);
        this.value = SEARCH_PLACEHOLDER;
      }
  });
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
