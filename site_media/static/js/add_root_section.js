function add_root_section(par_id, par_type) {
		var resp = $.ajax( { 
			type: "POST", 
			url: "../../../metadata/section_add/", 
			data: ({ new_name:'root section', parent_id:par_id, parent_type:par_type, action:'section_add' }), 
            success: function() { 
                location.reload();
            },
		}); 
};

