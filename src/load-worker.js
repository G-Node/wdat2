//--------- load-worker.js ---------//

importScripts('js/require.min.js');

require(['main-worker'], function(init) {
    "use strict";
    init();
});
