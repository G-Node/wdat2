// ------------------ file: modal.js ---------//

// Initialize the module WDAT.widgets if it doesn't exist.
if (!window.WDAT) window.WDAT = {};
if (!window.WDAT.api) window.WDAT.api = {};

/* VModal.  Constructor */
WDAT.api.VModal = function (name, bus, eventData) {
  var that = this;

  this.bus = bus; 
  this.showing = false;
  this.eventprefix = 'ModalToggle-';
  this.eventData = (eventData === undefined) ? {} : eventData;

  // Initialize the name and container elements
  if (typeof name === 'string') { // name is a string
    this._glasspane = $('<div class="glasspane"></div>').attr('id', name + '-glasspane');
    this._modal = $('<div class="modal"></div>').attr('id', name);
    this.name = name;

    // insert the modal into the glasspane
    $(this._glasspane).append(this._modal);
    
    // append the glasspane to the document
    $('body').append(this._glasspane);

  } else if (typeof name === 'object') { // assume it is a jQuery object
    $(name).addClass('modal');
    this.name = $(name).attr('id');
    this._glasspane = $('<div class="glasspane"></div>').attr('id', this.name + '-glasspane');
    this._modal = name;
    
    // wrap the glasspane around the modal
    $(this._modal).wrap(this._glasspane);
  }

  $(this._modal).hide();
  $(this._glasspane).hide();
};

(function () {
  var proto = WDAT.api.VModal.prototype;
  
  /* Returns a jQuery object that encapsulates the modal div.  All additions to
   * the modal window must be made through this object. */
  proto.getModal = function() {
    return this._modal;
  };

  proto.show = function () {
    if (this.showing) { return; }

    $(this._glasspane).fadeIn();
    $(this._modal).slideDown();

    this.showing = true;

    this.eventData.visible = true;

    // publish an event
    this.bus.publish(this.eventprefix + this.name, this.eventData);
  };

  proto.hide = function () {
    if (!this.showing) { return; }

    $(this._modal).slideUp();
    $(this._glasspane).fadeOut();

    this.showing = false;

    this.eventData.visible = false;

    // publish an event
    this.bus.publish(this.eventprefix + this.name, this.eventData);
  };

  proto.toggle = function (forceShow) {
    if (forceShow !== undefined) {
      // If forceShow defined, do as the flag says.
      if (forceShow === true) {
        this.show();
      } else {
        this.hide();
      }
    } else {
      // If not defined, toggle after figuring out current state.
      if (this.showing) {
        this.hide();
      } else {
        this.show();
      }
    }
  };
})();

