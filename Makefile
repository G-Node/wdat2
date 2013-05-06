#
# Definitions
#

# js compiler
JSC = node r.js
JSCARGS = -o optimize=none logLevel=2 baseUrl=site_media/static appDir=src
# target dir for js files
JS_DIR = static/js

# css compiler
CSSC = lessc
CSSCARGS =
# target dir for css files
CSS_DIR = static/css


# javascript sources
JS_SRC  = $(wildcard src/api/*.js) \
	$(wildcard src/util/*.js)

JS_MAIN = ./src/main.js ./src/main-worker.js

JS_BUILD = $(patsubst src%.js, static%.js, $(JS_MAIN))

JS_DEP  = lib/d3/d3.js \
	lib/jquery/jquery.js \
	lib/jquery-ui/jquery-ui.js \
	lib/requirejs/require.js

# css sources and images
LESS_SRC =

LESS_BUILD = static/css/main.css

CSS_DEP = lib/jquery-ui/jquery-ui.css \
	lib/jquery-ui/images \
	lib/crayon/crayon.css

#
# Targets
#

all: jssrc jsdep cssdep

# make javascript files and dependencies
jssrc: $(JS_BUILD)

$(JS_BUILD): $(JS_MAIN) $(JS_SRC)
	@$(JSC) $(JSCARGS) name=$(notdir $(basename $@)) out=$@
	@cp src/load-worker.js static/load-worker.js

jsdep: $(JS_DEP)
	@mkdir -p $(JS_DIR)
	@for i in $(JS_DEP); do cp $$i $(JS_DIR)/`basename $$i` ; done

# make less and css files and dependencies

cssdep: $(CSS_DEP)
	@mkdir -p $(CSS_DIR)
	@for i in $(CSS_DEP); do cp -r $$i $(CSS_DIR)/`basename $$i` ; done

.PHONY: clean
clean:
	@rm -fr $(CSS_DIR) $(JS_DIR) $(JS_BUILD)
