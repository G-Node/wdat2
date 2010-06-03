        function load_meta_tree(par_type) {
	    $("#sections").tree({
		ui : {theme_name : "apple"},
		callback : { 
			oncreate : function (NODE, REF_NODE, TYPE, TREE_OBJ, RB) {
                //if(TYPE != "inside") REF_NODE = $(REF_NODE).parent("li:eq(0)");
                var pi = TREE_OBJ.parent(NODE).attr('id')
                // n_id is always empty here unless assigned on the server side
				var n_id =  NODE.id;
				var n_name = TREE_OBJ.get_text(NODE);
				var resp = $.ajax( { 
					type: "POST", 
					url: "../../../metadata/section_add/", 
					data: ({ new_id:n_id, new_name:n_name, parent_id:pi, parent_type:par_type, action:'section_add' }), 
                    success: function(data) { 
                        NODE.setAttribute("id", data);
                        NODE.firstChild.setAttribute("href", "#");
                        var f1 = data * 1;
                        var nod = "#"+f1;
                        $.tree.reference("#sections").refresh(nod);
                        $.tree.focused().select_branch(nod);
                        $.tree.focused().rename();
                    },
				}); 
			}, 
			onrename : function (NODE, TREE_OBJ, RB) {
                //alert(NODE.id);
				var n_id =  NODE.id;
				var n_name = TREE_OBJ.get_text(NODE);
				$.ajax( { 
					type: "POST", 
					url: "../../../metadata/section_edit/", 
					data: ({ new_id:n_id, new_name:n_name, action:'section_edit' }), 
				}); 
			},
			ondelete : function (NODE, TREE_OBJ, RB) {
				var n_id =  NODE.id;
				$.ajax( { 
					type: "POST", 
					url: "../../../metadata/section_delete/", 
					data: ({ node_id:n_id, action:'section_delete' }), 
				}); 
			},  
			onselect : function (NODE, TREE_OBJ) {
                $('#properties_area').hide();
				var n_id =  NODE.id;
                var prop_url = '../../../metadata/properties_list/' + n_id + '/';
                $('#properties_area').load(prop_url, function() {
                    $('#properties_area').show();
                    }
                );
			},  
		} 
	    });
        };

