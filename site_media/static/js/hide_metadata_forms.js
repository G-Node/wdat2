function hide_metadata_forms(form_class) {
    if (form_class == "edit-property") {
        $('#add-property').hide();
        $('#add-dataset').hide();
        $('#add-datafile').hide();
        $('#add-timeseries').hide();
    };
    if (form_class == "add-dataset") {
        $('#add-property').hide();
        $('#edit-property').hide();
        $('#add-datafile').hide();
        $('#add-timeseries').hide();
    };
    if (form_class == "add-property") {
        $('#edit-property').hide();
        $('#add-dataset').hide();
        $('#add-datafile').hide();
        $('#add-timeseries').hide();
    };
    if (form_class == "add-datafile") {
        $('#add-property').hide();
        $('#add-dataset').hide();
        $('#edit-property').hide();
        $('#add-timeseries').hide();
    };
    if (form_class == "add-timeseries") {
        $('#add-property').hide();
        $('#add-dataset').hide();
        $('#edit-property').hide();
        $('#add-datafile').hide();
    };
};

