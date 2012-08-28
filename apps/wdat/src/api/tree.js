// ---------- file: tree.js ---------- //

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