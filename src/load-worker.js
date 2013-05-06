//--------- load-worker.js ---------//

importScripts('js/require.js');

require(['main-worker'], function(init) {
    "use strict";
    init();
});
