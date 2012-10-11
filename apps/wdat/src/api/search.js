// ------------------ file: search_bar.js ---------//

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* VSearchBar.  Constructor.
 *
 * Implements a search bar that has facilities for advanced search parameters.
 * Search parameters are finally condensed into a single searchString that is
 * used to make the query.  Advanced options are in the form of a drop-down
 * panel.
 *
 * Parameters:
 *  - name: String, obj.  The name of the search bar or a jQuery object into
 *                        which to introduce the search bar.
 *
 *  - bus: EventBus       Bus to which we publish events for autocompletion and
 *                        search invocation
 *  Note: 
 *    autocomplete has not been implemented yet because it is difficult to
 *    imagine the servers responses and work it out.  When the development of
 *    the main application starts, implementing autocomplete should be top
 *    priority. 
 *
 *  Depends on:
 *    jQuery, WDAT.util.EventBus, WDAT.api.Button
 * */

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

  /* buildSearchString() : build a search string from all the advanced options
   * and writes it to the textbox.  Also, publishes a "SearchStringChanged"
   * event which has the string as part of the eventData object.
   */
  WDAT.api.VSearchBar.prototype.buildSearchString = function () {
    var options = $('.search-adv')
      , i, searchString = "", keywords, property, value, operator, checkop;

    keywords = this.keywords;

    for (i=0; i<options.length; i++) {
      // This extracts after 'search-adv'
      property = $(options[i]).attr('id').substring(11); 
      value = $(options[i]).val();

      if (value === '') {
        // Simply go to the next thing
        continue;
      }

      checkop = value.charAt(0);
      operator = '=';

      if (checkop === '>' || checkop === '<' || checkop === '=') {
        // If the value specifies an operator, don't use the default
        operator = '';
      }

      searchString += '--' + property + operator + value  + ' ';
    }

    searchString = keywords + searchString;

    // Update the value in the main search box
    $(this._textbox).val(searchString);

    // To tell all listeners that there has been a changes
    $(this._textbox).blur(); 
  };

  /* Create the advanced pane options.  This has been cordoned off to its own
   * function to make things easier to manage.  The constructor need not be so
   * concerned with the details of the advanced pane.
   */
  WDAT.api.VSearchBar.prototype.createAdvancedPanel = function () {
    var that = this
      , advpanel = this._advpanel
      , advtable = $('<table class="form"></table>')
      , tr, inp, datewidget, datepicker;

    var TROW_TEMPLATE = '<tr><td class="label"></td><td class="widget"></td></tr>';
 
    /* Note: Since all the inputs have the same class 'search-adv', it would
     * probably make more sense to handle events on a '.search-adv' selector.
     * The not-so-obvious problem with this approach is that selection and
     * invocation can only be done after the DOM has been fully manipulated.
     * Since that time cannot be easily adjudged, each input element has been
     * made into a jQuery object and handled separately.
     *
     *
     * Note: The inputs have their ids as 'search-adv-' followed by the
     * respective opiton that will be in the search string.  Eg.  
     * the input search-adv-project will be embedded in the search string as 
     * "--project=<<value>>".  Take care when you are adding new inputs.
     */

    var changeCallback = function () {
      // Is called on all keyup or blur events on the input controls.
      that.buildSearchString();
    };

    // Project textbox
    tr = $(TROW_TEMPLATE);
    inp =  $('<input type=text id="search-adv-project" class="search-adv fixedwidth"></input>');
    tr.find('td.label').append($('<label for="search-adv-project">Project</label>'));
    tr.find('td.widget').append(inp);
    $(inp).keyup(changeCallback);
    $(inp).blur(changeCallback);
    $(advtable).append(tr);
 
    // Animal textbox
    tr = $(TROW_TEMPLATE);
    inp = $('<input type=text id="search-adv-animal" class="search-adv fixedwidth"></input>');
    tr.find('td.label').append($('<label for="search-adv-animal">Animal</label>'));
    tr.find('td.widget').append(inp);
    $(inp).keyup(changeCallback);
    $(inp).blur(changeCallback),
    $(advtable).append(tr);

    // Created textbox
    tr = $(TROW_TEMPLATE);
    datewidget = $('<input class="search-adv" type=text id="search-adv-created"></input>');
    tr.find('td.label').append($('<label for="search-adv-created">Created (date)</label>'));
    tr.find('td.widget').append(datewidget);
    datepicker = new WDAT.api.DatePicker(datewidget);
    $(datewidget).keyup(changeCallback);
    $(datewidget).blur(changeCallback);
    $(advtable).append(tr);

    $(advpanel).append(advtable);
  };
})();
