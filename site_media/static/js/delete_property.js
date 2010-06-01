    function delete_property(prop_id) {
		var resp = $.ajax( { 
			type: "POST", 
			url: '../../../metadata/property_delete/', 
			data: ({ prop_id:prop_id, action:'property_delete' }), 
            success: function(data) { 
                var t = $.tree.focused(); 
                if(t.selected) {
                    var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                    $('#properties_area').load(load_url, function() {
                    })
                }
            },
		});
     };
