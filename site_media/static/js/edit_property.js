    function edit_property(prop_id, action) {
        var prop_url = '../../../metadata/property_edit/' + prop_id + '/';
        if(action == 'update') {
            var new_title = $(document.getElementById("id_edit_form_prop_title")).attr('value');
            var new_value = $(document.getElementById("id_edit_form_prop_value")).attr('value');
            var new_description = $(document.getElementById("id_edit_form_prop_description")).attr('value');
            var new_comment = $(document.getElementById("id_edit_form_prop_comment")).attr('value');
            $('#edit-property').load(
                prop_url, 
                {prop_title:new_title, prop_value:new_value, prop_description:new_description, prop_comment:new_comment, action:'update_form'}, 
                function() {
                    var t1 = $(document.getElementById("edit-prop-success-identifier")).attr('value');
                    if (t1 != "0") {
                        var t = $.tree.focused(); 
                        if(t.selected) {
                            var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                            $('#properties_area').load(load_url, function() {
                            })
                        }
                        $('#edit-property').hide();
                    }
                }
            ); 
        }
        else {
            $('#edit-property').load(
                prop_url, 
                {action:'get_form'}, 
                function() {
                    $('#add-property').hide();
                    $('#edit-property').show();
                    $('#edit-property').autoscroll();
                }
            ); 
        }
    };
