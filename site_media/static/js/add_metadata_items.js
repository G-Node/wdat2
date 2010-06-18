    function add_property() {
        var t = $.tree.focused(); 
        if(t.selected) {
            var prop_url = '../../../metadata/property_add/' + t.selected[0].id + '/';
            var new_title = $(document.getElementById("id_add_form_prop_title")).attr('value');
            var new_value = $(document.getElementById("id_add_form_prop_value")).attr('value');
            $('#form-add-property').load(
                prop_url, 
                {section_id:t.selected[0].id, prop_title:new_title, prop_value:new_value, action:'property_add'}, 
                function(response, status, xhr) {
                    var t1 = $(document.getElementById("add-prop-success-identifier")).attr('value');
                    if (t1 != "0") {
                        var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                        $('#properties_area').load(load_url, function() {
                            $('#add-property').hide();
                        })
                    }
                }
            ); 
            var t1 = $(document.getElementById("add-prop-success-identifier")).attr('value');
            if (t1 == "0") {
                $('#add-property').show();
            };
        }
        else alert('Please select a section first');
        };
    function link_object(obj_type) {
        var t = $.tree.focused(); 
        if(t.selected) {
            if (obj_type == "dataset") {
                var prop_url = '../../../metadata/dataset_link/' + t.selected[0].id + '/';
                var post_str = '{';
                $('#id_dataset_form_datasets :selected').each(function(i, selected){
                    post_str += '"dataset' + i + '":' + '"' + $(selected).val() + '", ';
                });
                post_str += '"action":"dataset_link"}';
                var post_data = jQuery.parseJSON(post_str);
                $('#form-link-dataset').load(
                    prop_url, 
                    post_data,
                    function(response, status, xhr) {
                        var t1 = $(document.getElementById("link-dataset-success-identifier")).attr('value');
                        if (t1 != "0") {
                            var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                            $('#properties_area').load(load_url, function() {
                                $('#add-dataset').hide();
                            })
                        }
                    }
                ); 
            };
            if (obj_type == "datafile") {
                var prop_url = '../../../metadata/datafile_link/' + t.selected[0].id + '/';
                var post_str = '{';
                $('#id_datafile_form_datafiles :selected').each(function(i, selected){
                    post_str += '"datafile' + i + '":' + '"' + $(selected).val() + '", ';
                });
                post_str += '"action":"datafile_link"}';
                var post_data = jQuery.parseJSON(post_str);
                $('#form-link-datafile').load(
                    prop_url, 
                    post_data,
                    function(response, status, xhr) {
                        var t1 = $(document.getElementById("link-datafile-success-identifier")).attr('value');
                        if (t1 != "0") {
                            var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                            $('#properties_area').load(load_url, function() {
                                $('#add-datafile').hide();
                            })
                        }
                    }
                ); 
            };
            if (obj_type == "timeseries") {
                var prop_url = '../../../metadata/timeseries_link/' + t.selected[0].id + '/';
                var post_str = '{';
                $('#id_timeseries_form_timeseries :selected').each(function(i, selected){
                    post_str += '"timeseries' + i + '":' + '"' + $(selected).val() + '", ';
                });
                post_str += '"action":"timeseries_link"}';
                var post_data = jQuery.parseJSON(post_str);
                $('#form-link-timeseries').load(
                    prop_url, 
                    post_data,
                    function(response, status, xhr) {
                        var t1 = $(document.getElementById("link-timeseries-success-identifier")).attr('value');
                        if (t1 != "0") {
                            var load_url = '../../../metadata/properties_list/' + t.selected[0].id + '/';
                            $('#properties_area').load(load_url, function() {
                                $('#add-timeseries').hide();
                            })
                        }
                    }
                ); 
            };
        }
        else alert('Please select a section first');
        };
