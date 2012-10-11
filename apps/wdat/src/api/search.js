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

  // To ensure that there is some query string
  this.keywords = ''; 

  // There is a requirement for a global bus as well as a local bus.
  this.bus = bus;
  this.lBus = new WDAT.api.EventBus();
  
  // Create the query div. Contains text-field and the advanced options
  // handle.
  this._querydiv = $('<div class="query"></div>')
  this._textbox  = $('<input type="text" class='+
            '"textbox placeholder" value="'+
            SEARCH_PLACEHOLDER +'"></input>')
  this._advanced = $('<a class="advanced"></a>');
  this._advpanel = $('<div class="advpanel"></div>');
  $(this._advpanel).hide();  // Shouldn't be visible by default.

  $(this._querydiv).append(this._textbox);
  $(this._querydiv).append(this._advanced);

  this._container.append(this._querydiv);
  this._container.append(this._advpanel);

  // Create the go button
  var gobutton = new WDAT.api.Button('Go', this.lBus, 'go', 'blue');
  gobutton.toJQ().addClass('go');

  this._container.append(gobutton.toJQ());

  // On focus, adjust classes and value
  $(this._textbox).focus(function(){
      // First, add query-active class to querydiv
      $(that._querydiv).toggleClass('query-active', true);

      // Update classes and values for textbox
      if (this.value === SEARCH_PLACEHOLDER) {
        this.value = ''; 
        $(this).toggleClass('placeholder', false);
      }
  });

  // On blur, adjust classes and value
  $(this._textbox).blur(function() {
      // First, remove query-active class to querydiv
      $(that._querydiv).toggleClass('query-active', false);

      // Update classes and values for textbox
      if (this.value === '') {
        $(this).toggleClass('placeholder', true);
        this.value = SEARCH_PLACEHOLDER;
      } else { 
        $(this).toggleClass('placeholder', false);
      }

      // Publish KeywordsChanged event.
      that.lBus.publish('KeywordsChanged', this.value);
  });

  // On losing focus, trigger calc. of the keywords part of the search string.
  this.lBus.subscribe('KeywordsChanged', function (event, value) {
    var queryString = value, keywords 
      , pos = queryString.indexOf('--');

    if (queryString.length === 0) {
      keywords = '';
      return;
    }
    
    if (pos !== -1) {
      // Switches present in queryString
      keywords = queryString.substr(0, pos);
    } else {
      keywords = queryString;
    }

    // Pad with trailing spaces if not already done.
    if (keywords[keywords.length-1] !== ' ') {
      keywords += ' ';
    }

    that.keywords = keywords;
  });

  // On clicking the advanced button, emit an event on the localbus
  $(this._advanced).click(function () {
      that.lBus.publish('AdvancedButtonClick');
  });

  // On 'AdvancedButtonClick' on local bus, toggle the advpanel
  this.lBus.subscribe('AdvancedButtonClick', function () {
      that.toggleAdvanced();
  });

  // Prepare the advanced panel
  this.createAdvancedPanel();
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

  /* Toggle the visibility of the advanced panel. 
   *
   * :param forceShow allows you to cotrol.  True displays the panel, false
   * hides it.
   *
   * Return value: none
   */
  WDAT.api.VSearchBar.prototype.toggleAdvanced = function (forceShow) { 
    var panel = this._advpanel;

    // Only set width if it already hasn't been set
    if (!this._adv_width_set_flag) {
      var width = $(this._querydiv).width();
      $(panel).css('width', width + 'px');

      this._adv_width_set_flag = true;
    }
    
    if (forceShow !== undefined) {
      if (forceShow === true) {
        $(panel).slideDown();
      } else {
        $(panel).slideUp();
      }
    } else {
      $(panel).slideToggle();
    }
  };

  /* Create the advanced pane options.  This has been cordoned off to its own
   * function to make things easier to manage.  The constructor need not be so
   * concerned with the details of the advanced pane.
   */
  WDAT.api.VSearchBar.prototype.createAdvancedPanel = function () {
    var advpanel = this._advpanel
      , advtable = $('<table class="form"></table>')
      , tr, datewidget, datepicker;

    var TROW_TEMPLATE = '<tr><td class="label"></td><td class="widget"></td></tr>';
 
    // Animal textbox
    tr = $(TROW_TEMPLATE);
    tr.find('td.label').append($('<label for="search-adv-project">Project</label>'));
    tr.find('td.widget').append($('<input type=text id="search-adv-project" class="search-adv fixedwidth"></input>'));
    $(advtable).append(tr);
 
    // Animal textbox
    tr = $(TROW_TEMPLATE);
    tr.find('td.label').append($('<label for="search-adv-animal">Animal</label>'));
    tr.find('td.widget').append($('<input type=text id="search-adv-animal" class="search-adv fixedwidth"></input>'));
    $(advtable).append(tr);

    // Created textbox
    tr = $(TROW_TEMPLATE);
    datewidget = $('<input type=text id="search-adv-created"></input>');
    tr.find('td.label').append($('<label for="search-adv-created">Created (date)</label>'));
    tr.find('td.widget').append(datewidget);
    datepicker = new WDAT.api.DatePicker(datewidget);
    $(advtable).append(tr);

    $(advpanel).append(advtable);
  };
})();
