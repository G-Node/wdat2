// ---------- file: bus.js ---------- //

// Initialize the module wdat.widgets if it doesn't exist.
if (!window.wdat) {	window.wdat = {}; }
if (!window.wdat.api) { window.wdat.api = {}; }

/*
 * Constructor for the class EventBus. The event bus can be used to register and
 * fire events.
 */
wdat.api.EventBus = function() {
	// used by the uid generator
	this._counter = 1;
};

(function() {
	// Just a shortcut for the prototype
	var _proto = wdat.api.EventBus.prototype;

	// method definition

	/* Subscribe a function to a specific event.
	 * 
	 * Parameters:
	 *  - event: String		The event name.
	 *  - fn: Function		The function to call when events are published.
	 *  - uid: String		A unique id that is concatenated to the event, in order
	 *  					to create unique event names.
	 *  
	 * Return value:
	 *  - The event name (with concatenated id) 
	 */
	_proto.subscribe = function(event, fn, uid) {
		if (uid) {
			event += uid;
		}
		$(this).bind(event, fn);
		return event;
	};
	
	/* Unsubscribe a specific event.
	 * 
	 * Parameter:
	 *  - event: String		The event name.
	 *  - uid: String		A unique id that is concatenated to the event, in order
	 *  					to create unique event names.
	 * 
	 * Return value:
	 *  - None
	 */
	_proto.unsubscribe = function(event, uid) {
		if (uid) {
			event += uid;
		}
		$(this).unbind(event);
	};

	/* Fire a specific event.
	 * 
	 * Parameters:
	 *  - event: String		The event name.
	 *  - fn: Function		The function to call when events are published.
	 *  - uid: String		A unique id that is concatenated to the event, in order
	 *  					to create unique event names.
	 *  
	 * Return value:
	 *  - The event name (with concatenated id) 
	 */
	_proto.publish = function(event, params, uid) {
		if (uid) {
			event += uid;
		}
		$(this).trigger(event, params);
		return event;
	};
	
	/* Create a new unique id (uid).
	 * 
	 * Return value:
	 *  - The new unique identifier (String).
	 */
	_proto.uid = function() {
		return (this._counter++).toString();
	};

}());


// ---------- file: button.js ---------- //

// Initialize the module wdat.widgets if it doesn't exist.
if (!window.wdat) {	window.wdat = {}; }
if (!window.wdat.api) { window.wdat.api = {}; }

/* A button class. 
 * 
 * Parameter:
 *  - type: String		The button type. If the type is add, del, remove or select
 *  					a button with a suitable theme and label will be created. Otherwise
 *  					the constructor creates a default button with type as label.
 *  - bus: EventBus		The bus to publish and subscribe events on.
 *  - event: String		The event to fire if the button is pressed.
 * 
 * Depends On:
 *  - jQuery, wdat.api.EventBus
 */
wdat.api.Button = function(type, bus, event, eventData) {
	
	this.button = $('<button></button>');
	this.button.addClass("button");
	// determine the type
	var typecmp = type.toLowerCase();
	if (typecmp == 'add') {
		type = 'add';
		this.button.addClass('button-green').text('Add');
	} else if (typecmp == 'rem' || typecmp == 'remove') {
		type = 'rem';
		this.button.addClass('button-red').text('Remove');
	} else if (typecmp == 'del' || typecmp == 'delete') {
		type = 'del';
		this.button.addClass('button-red').text('Delete');
	} else if (typecmp == 'sel' || typecmp == 'select') {
		type = 'sel';
		this.button.text('Select');
	} else if (typecmp == 'edit') {
		type = 'edit';
		this.button.text('Edit');
	} else {
		this.button.text(type);
	}
	// register events
	this._bus = bus;
	this._event = event;
	if (!eventData) {
		eventData = type;
	}
	if (bus && event) {
		this.button.click(function() { bus.publish(event, eventData); });
	}
};

// Implementing buttons methods in their own scope. 
(function(){
	// Just a shortcut for the prototype
	var _proto = wdat.api.Button.prototype;
	
	/* Returns the button as a jQuery object.
	 * 
	 * Return value:
	 *  - The button (jQuery)
	 */
	_proto.toJQ = function() {
		return this.button;
	};
	
	/* Returns the button as a string.
	 * 
	 * Return value:
	 *  - the button as a string.
	 */
	_proto.toString = function() {
		return this.button.html();
	};
	
	/* Unregister the event used by the button from the event
	 * bus.
	 * 
	 * Return value:
	 *  - None
	 */
	_proto.unsubscribe = function() {
		this._bus.unsubscribe(this._event);
	};
}());// ---------- file: list.js ---------- //

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

}());// ---------- file: tree.js ---------- //

// Initialize the module wdat.widgets if it doesn't exist.
if (!window.wdat) { window.wdat = {}; }
if (!window.wdat.api) { window.wdat.api = {}; }

/* Constructor for the class VTree. VTree implements view to a dynamic tree. Each node of 
 * the tree can be expanded and collapsed. Further nodes can be appended and removed from
 * the tree.
 * 
 * Internally the tree is represented by nested div elements. Each div contains a span 
 * element as the textual representation of the node. 
 * 
 * <div id="1" class="tree-node [collapsed]">
 * 		<span>Node Label Root</span>
 * 		<div id="2" class="tree-node [tree-leaf]"><span>Node Label 2</span></div>
 * 		...
 * </div>
 * 
 * Parameters: 
 *  - name: String 		Individual name/id for the list (optional). 
 *  
 *  - bus: EventBus 	A bus handling events.
 * 
 *  - select: String 	The event to fire if an element should be selected. If select is
 *  					a falsy value, the list doesn't provide selection.
 * 
 * Depends on: 
 *  - jQuery, wdat.util.EventBus
 */
wdat.api.VTree = function(name, bus, select) {
	
	this._bus = bus;
	this._select = select;
	
	if (name) {
		this.name = name;
	} else {
		this.name = 'tree-' + bus.uid();
	}

	var search = $('#' + this.name);
	if(search.length == 1) {
		this.tree = search;
	} else {
		this.tree = $('<div />');
	}
	this.tree.attr('id', this.name).addClass('tree');
	
	var that = this;
	this._bus.subscribe(this._select, function(event, id) { that.toggleCollapse(id); that.toggleSelect(id, true); } );
};

// define trees methods in their own scope
(function(){
	
	/* Add a new node to the tree.
	 * 
	 * Parameter:
	 *  - parent_id: String		The id of the parent node, if this is a falsy value or the
	 *  						name of the tree the new node will be inserted at the root
	 *  						of the tree.
	 *  
	 *  - id: String			The id of the new node, if this is null a unique id will
	 *  						be created.
	 *  
	 *  - data: String			The textual representation of the node.
	 *  
	 *  - isleaf: Bool			Is the new node a leaf or a node (optional default true)?		
	 * 
	 */
	wdat.api.VTree.prototype.add = function(parent_id, id, data, isleaf) {
		if (!id) {
			id = this.name + '-' + this._bus.uid();
		}
		var parent;
		if (!parent_id || parent_id == this.name) {
			parent = this.tree;
		} else {
			parent = this.tree.find('#' + parent_id);
		}
		var elem = $('<div />').attr('id', id).addClass('tree-node');
		if (isleaf == null || isleaf == undefined || isleaf) {
			elem.addClass('tree-leaf');
		}
		var label = $('<span />').text(data);
		elem.append(label);
		parent.removeClass('tree-leaf').append(elem);
		
		var that = this;
		label.click( function() { that._bus.publish(that._select, id); });
		 
		return id;
	};

	/* Update the textual representation of a node.
	 * 
	 * Parameter:
	 *  - id: String		The id of the node to update.
	 *  
	 *  - data: String		The new textual representation of the node.
	 *  
	 * Return value:
	 *  - None
	 */
	wdat.api.VTree.prototype.update = function(id, data) {
		var elem = this.tree.find('#' + id).children('span');
		elem.text(data);
	};

	/* Remove a node and all his children from the tree.
	 * 
	 * Parameter:
	 *  - id: String		The id of the node to remove.
	 *  
	 *  - setleaf: Bool		Should the parent be marked as a leaf node if it no longer 
	 *  					has any children? (optional, default false)
	 *  
	 * Return value:
	 *  - None
	 */
	wdat.api.VTree.prototype.remove = function(id, setleaf) {
		var elem = this.tree.find('#' + id);
		var parent = elem.parent();
		elem.remove();
		if (setleaf && parent.children('div').length == 0) {
			parent.addClass('tree-leaf');
		}
	};

	/* Select a specific leaf of the tree. Nodes that don't 
	 * are marked as leafs can't be selected.
	 * 
	 * Parameter:
	 *  - id: String		The id of the node to be selected.
	 *  
	 *  - single: Boolean	If true all other currently selected nodes are
	 *  					deselected.
	 * 
	 * Return value:
	 *  - None
	 */
	wdat.api.VTree.prototype.select = function(id, single) {
		if (single) {
			this.tree.find('div.tree-leaf').each(function() { $(this).removeClass('selected'); });
		}
		var elem = this.tree.find('#' + id);
		if(elem.hasClass('tree-leaf')) {
			this.tree.find('#' + id).addClass('selected');
		}
	};

	/* Deselect a specific leaf of the tree. If called with an id of a non leaf node 
	 * or an unselected node this method has no effect.
	 * 
	 * Parameter:
	 *  - id: String		The id of the node to deselect.
	 *  
	 * Return value:
	 *  - None
	 */
	wdat.api.VTree.prototype.deselect = function(id) {
		this.tree.find('#' + id).removeClass('selected');
	};

	/*
	 * 
	 */
	wdat.api.VTree.prototype.toggleSelect = function(id, single) {
		if (single) {
			this.tree.find('div.tree-leaf').each(function() { $(this).removeClass('selected'); });
		}
		var elem = this.tree.find('#' + id);
		if(elem.hasClass('tree-leaf')) {
			this.tree.find('#' + id).toggleClass('selected');
		}
		return elem.hasClass('selected');
	};

	/*
	 * 
	 */
	wdat.api.VTree.prototype.expand = function(id, single) {
		if (single) {
			this.tree.find('div.tree-node').each(function() { $(this).addClass('collapsed'); });
		}
		this.tree.find('#' + id).removeClass('collapsed');
	};

	/*
	 * 
	 */
	wdat.api.VTree.prototype.collapse = function(id) {
		this.tree.find('#' + id).addClass('collapsed');
	};
	
	/*
	 * 
	 */
	wdat.api.VTree.prototype.toggleCollapse = function(id) {
		var elem = this.tree.find('#' + id);
		elem.toggleClass('collapsed');
		return elem.hasClass('collapsed');
	};

	/*
	 * 
	 */
	wdat.api.VTree.prototype.toJQ = function() {
		return this.tree;
	};

	/*
	 * 
	 */
	wdat.api.VTree.prototype.toString = function() {
		return this.tree.html();
	};

}());