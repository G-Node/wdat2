        $(document).ready(function() {
            $('#edit-details-toggle').click(function() {
                $('#edit-details').toggle();
                $('#edit-details').autoscroll();
                return false;
            });
            if ($('#edit-details .error').length) {
                $('#edit-details').show();
                $('#edit-details .error').autoscroll();
            };
            $('#change-privacy-toggle').click(function() {
                $('#change-privacy').toggle();
                $('#change-privacy').autoscroll();
                return false;
            });
            if ($('#change-privacy .error').length) {
                $('#change-privacy').show();
                $('#change-privacy .error').autoscroll();
            }
        });
