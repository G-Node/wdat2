// ---------- file: list.js ---------- //

// Initialize the module wdat.widgets if it doesn't exist.
if (!window.wdat) { window.wdat = {}; }
if (!window.wdat.api) { window.wdat.api = {}; }

/* Constructor for the class VList. VList implements view to a dynamic list. Elements can 
 * be added, removed, edited and selected.  
 * 
 * Internally the list is represented by a table structure. This structure is created by the
 * list view itself.
 * 
 * <table class='list' id='name'> 
 * 		<tr id='id'><td class='list-data'>data</td>[<td class='list-buttons'>button list</td>]</tr> ...
 * <table>
 * 
 * Parameters: 
 *  - name: String 		Individual name/id for the list (optional). 
 *  
 *  - bus: EventBus 	Bus handling events.
 *   
 *  - remove: String 	The event name to publish if an remove event occurs. If remove is 
 *  					a falsy value, the list doesn't provide a remove button.
 *  
 *  - edit: String 		The event name to publish if an edit event occurs. If edit is 
 *  					a falsy value, the list doesn't provide a edit button.
 * 
 *  - select: String 	The event to fire if an element should be selected. If select is
 *  					a falsy value, the list doesn't provide selection.
 * 
 * Depends on: 
 *  - jQuery, wdat.util.EventBus, wdat.api.Button
 */
wdat.api.VList = function(name, bus, remove, edit, select) {

	this._bus = bus;
	
	if (name) {
		this.name = name;
	} else {
		this.name = 'list-' + bus.uid();
	}

	this._edit   = edit;
	this._remove = remove;
	this._select = select;

	this.list = $('<table></table>');
	this.list.attr('id', this.name).addClass('list');
};

// Define the methods of in their own scope
(function() {

	// method definition 

	/* Add a new item to the end of the list.
	 * 
	 * Parameter:
	 *  - id: String	The elements id (optional).
	 *  				If id is a falsy value, a unique id will be created.
	 *  
	 *  - data: String	The elements content.
	 *  
	 * Return value:
	 *  - The id of the added element.
	 */
	wdat.api.VList.prototype.add = function(id, data) {
		// crate an id if necessary
		if (!id) {
			id = this.name + '-id-' + this._bus.uid();
		}
		// create a table row with data and buttons
		var tr = $('<tr />').attr('id', id);
		var da = $('<td />').addClass('list-data').text(data);
		var bt = $('<td />').addClass('list-buttons');
		if (this._edit) {
			bt.append((new wdat.api.Button('edit', this._bus, this._edit, id)).toJQ()).append('&nbsp;');
		}
		if (this._select) {
			var that = this; // because of funny js scoping
			tr.click( function() {that._bus.publish(that._select, id); } );
		}
		if (this._remove) {
			bt.append((new wdat.api.Button('rem', this._bus, this._remove, id)).toJQ()).append('&nbsp;');
		}
		// put it all together
		tr.append(da);
		tr.append(bt);
		this.list.append(tr);
		// return the id
		return id;
	};
	
	/* Update the content of an existing list element.
	 * 
	 * Parameter:
	 *  - id: String	The elements id.
	 *  
	 *  - data: String	The elements content.
	 *  
	 * Return value:
	 *  - None
	 */
	wdat.api.VList.prototype.update = function(id, data) {
		var elem = $('#' + id);
		elem.find('td').fist().text(data);
	};

	/* Edit the content of an existing list element.
	 * 
	 * Parameter:
	 *  - id: String	The elements id.
	 * 
	 * Return value:
	 *  - None
	 */
	wdat.api.VList.prototype.edit = function(id) {
		// find element by id
		var elem = $('#' + id);
		// save old name
		var oldname = elem.find('td').first();
		oldname.detach();
		var buttons = elem.find('td').last();
		buttons.detach();
		// create input and replace old content
		var input = $('<input />').attr('type', 'text').attr('value', oldname.text());
		elem.append($('<td />').append(input)).append($('<td />'));
		input.focus().select();
		// listen on key events
		input.keyup(function(e) {
			if (e.keyCode == 13) {
				// ENTER: submit changes
				var newname = input.val();
				elem.empty().append(oldname.text(newname));
				elem.append(buttons);
			} if (e.keyCode == 27) {
				// ESC: restore old text
				elem.empty().append(oldname);
				elem.append(buttons);
			}
		});
	};

	/* Remove an element from the list.
	 * 
	 * Parameter:
	 *  - id: String	The id of the element to remove.
	 *  
	 * Return value:
	 *  - None
	 */
	wdat.api.VList.prototype.remove = function(id) {
		var elem = $('#' + id);
		elem.remove();
		return elem;
	};
	
	/* Select an element in the list.
	 * 
	 * Parameter:
	 *  - id: String	The id of the element to select.
	 *  
	 *  - single: Bool	Set to true if the selected element should be the 
	 *  				only selected element in the whole list.
	 *  
	 * Return value:
	 *  - None
	 */
	wdat.api.VList.prototype.select = function(id, single) {
		var elem = $('#' + id);
		if (single) {
			this.list.find('tr').each(function() {
				$(this).removeClass('selected');
			});
		}
		elem.addClass('selected');
	};
	
	/* Toggle the selection of an element in the list.
	 * 
	 * Parameter:
	 *  - id: String	The id of the element.
	 *  
	 * Return value:
	 *  - The selection state of the specified element.
	 */
	wdat.api.VList.prototype.toggleSelect = function(id) {
		var elem = $('#' + id);
		elem.toggleClass('selected');
		return elem.hasClass('selected');
	};

	/* Remove all elements from the list.
	 */
	wdat.api.VList.prototype.clear = function() {
		this.list.find('tr').each(function() {
			$(this).remove();
		});
	};

	/* Returns the list as a jQuery object.
	 * Use this method to include the list into your document.
	 * 
	 * Return value: - The list (jQuery)
	 */
	wdat.api.VList.prototype.toJQ = function() {
		return this.list;
	};

	/* Returns the list as a string.
	 * 
	 * Return value: - The list as a string.
	 */
	wdat.api.VList.prototype.toString = function() {
		return this.list.html();
	};

}());