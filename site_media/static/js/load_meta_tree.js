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
                        var f1 = data * 1;
                        NODE.setAttribute("id", f1);
                        NODE.firstChild.setAttribute("href", "#");
                        var nod = "#"+f1;
                        //$.tree.reference("#sections").refresh(nod);
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
                //n_id = n_id.replace("_copy", "");
                var prop_url = '../../../metadata/properties_list/' + n_id + '/';
                $('#properties_area').load(prop_url, function() {
                    $('#properties_area').show();
                    }
                );
			},
            onmove : function (NODE,REF_NODE,TYPE,TREE_OBJ,RB) {
				$.ajax( { 
					type: "POST", 
					url: "../../../metadata/section_move/", 
					data: ({ selected_id:NODE.id, reference_id:REF_NODE.id, pos_type:TYPE, action:'section_move' }), 
                    success: function(data, status, XHR) { 
                        if ((data * 1) == 0) {
                            $.tree.rollback(RB);
                        }
                    },
				}); 
            },  
            oncopy : function (NODE,REF_NODE,TYPE,TREE_OBJ,RB) {
                // fix jstree returning id with "_copy" postfix
                var n_id = NODE.id;
                n_id = n_id.replace("_copy", "");
				$.ajax( { 
					type: "POST", 
					url: "../../../metadata/section_copy/", 
					data: ({ selected_id:n_id, reference_id:REF_NODE.id, pos_type:TYPE, action:'section_copy' }), 
                    success: function(data, status, XHR) {
                        var res = data.length;
                        if (res < 2) {
                            $.tree.rollback(RB);
                        }
                        else {
                            //var new_id = NODE.id + "_copy";
                            //var NEW_NODE = document.getElementById(new_id);
                            //NODE.setAttribute("id", res);
                            //TREE_OBJ.refresh();
                            //$.tree.refresh();
                            //var sec_tree = jQuery.parseJSON(data.replace(/&quot;/g, '"'));
                            //var p1 = 0;
                            //var p2 = 0;
                            //var num = "";
                            //p1 = data.search("[");
                            //p2 = data.search(",");
                            //num = data.substr(p1+1, p2-2);
                            //a.push(num);
                            leaf_update(data, NODE);
                        }
                    },
				}); 
            }  
		} 
	    });
        };
        function leaf_update(data, NODE) {
            var i = 0;
            var j = 0;
            var q1 = 0;
            var q2 = 0;
            var num = "";
            var a = ""; // templorary variable for processing
            var b = 0; // end position of the complex element
            var c = 0; // counter for DOM nodes
            var d = 0; // flag indicating simple/complex element (number of "[" or "]" inside)
            var n = data.length;
            var datastr = data;

            var p1 = datastr.search(/\[/);
            var p2 = datastr.search(/\]/);
            var p3 = datastr.search(/,/);
            if (p2 > p3) {
                num = datastr.substr(p1+1, p3-2);
            }
            else {
                num = datastr.substr(p1+1, p2-2);
            };
            NODE.setAttribute("id", num);
            datastr = datastr.substr(p3 + 2, n - p3 + 1);

            while (datastr.length > 2) {
                a = datastr;
                do {
                    q1 = a.search(/\[/);
                    q2 = a.search(/\]/);
                    if (q1 < q2 && q1 > -1) { 
                        j += 1;
                        a = a.substr(q1 + 1, a.length - q1 - 1);
                        b += q1 + 1;
                        d += 1;
                    }
                    else {
                        j -= 1;
                        a = a.substr(q2 + 1, a.length - q2 - 1);
                        b += q2 + 1;
                        d += 1;
                    };
                } while (j > 0);
                // if next element is complex
                if (d > 2) {
                    //searching for the end of next element (equal number of '][')
                    a = datastr.substr(0, b);
                    leaf_update(a, NODE.children[1].children[c]);
                    datastr = datastr.substr(b + 2, datastr.length - b - 2);
                }
                else {
                    p1 = datastr.search(/\[/);
                    p2 = datastr.search(/\]/);
                    p3 = datastr.search(/,/);
                    num = datastr.substr(p1+1, p2-2);
                    NODE.children[1].children[c].setAttribute("id", num);
                    i = p2 + 3;
                    datastr = datastr.substr(i, datastr.length - i + 1);
                };
                c += 1;
                d = 0;
                b = 0;
            };
        };

