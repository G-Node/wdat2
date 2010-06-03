    function add_property() {
        var t = $.tree.focused(); 
        if(t.selected) {
            var prop_url = '../../../metadata/property_add/' + t.selected[0].id + '/';
            var new_title = $(document.getElementById("id_add_form_prop_title")).attr('value');
            var new_value = $(document.getElementById("id_add_form_prop_value")).attr('value');
            $('#add-property').load(
                prop_url, 
                {section_id:t.selected[0].id, prop_title:new_title, prop_value:new_value, action:'property_add'}, 
                function(response, status, xhr) {
                    var t1 = $(document.getElementById("add-prop-success-identifier")).attr('value');
                    if (t1 != "0") {
                        var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                        $('#properties_area').load(load_url, function() {
                            $('#add-property').toggle();
                        })
                    }
                }
            ); 
        }
        else alert('Please select a section first');
        };
    function link_dataset() {
        var t = $.tree.focused(); 
        if(t.selected) {
            var prop_url = '../../../metadata/dataset_link/' + t.selected[0].id + '/';
            // create a string with POST data with selected datasets (foreach?)
            // var sets = {};
            $('#form-link-dataset').load(
                prop_url, 
                {section_id:t.selected[0].id, action:'dataset_link'}, 
                function(response, status, xhr) {
                    var t1 = $(document.getElementById("link-dataset-success-identifier")).attr('value');
                    if (t1 != "0") {
                        var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                        $('#properties_area').load(load_url, function() {
                            $('#form-link-dataset').toggle();
                        })
                    }
                }
            ); 
        }
        else alert('Please select a section first');
        };
