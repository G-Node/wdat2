#
# Definitions
#

# js compiler
JSC = node r.js
JSCARGS = -o optimize=none logLevel=2 baseUrl=src
#JSCARGS = -o logLevel=2 baseUrl=src

# target dir for js files
JS_DIR = static/js

# css compiler
CSSC = lessc
CSSCARGS = -s
# target dir for css files
CSS_DIR = static/css


# javascript sources
JS_SRC  = $(wildcard src/api/*.js) \
	$(wildcard src/util/*.js)

JS_MAIN = src/main.js src/main-worker.js

JS_BUILD = $(patsubst src%.js, static%.js, $(JS_MAIN))

JS_DEP  = lib/d3/d3.min.js \
	lib/jquery-ui/jquery-ui.min.js \
	lib/jquote/jquery.jqote2.min.js \
	lib/requirejs/require.min.js

# css sources and images
LESS_SRC = $(wildcard src/*.less) \
	$(wildcard src/ui/*.less)

LESS_BUILD = static/main.css

CSS_DEP = lib/jquery-ui/jquery-ui.min.css \
	lib/jquery-ui/images \
	lib/crayon/crayon.css \
	lib/reset/reset.css \
	img/*

#
# Targets
#

all: js jsdep less cssdep

# make javascript files and dependencies
js: $(JS_BUILD)

$(JS_BUILD): $(JS_MAIN) $(JS_SRC)
	@$(JSC) $(JSCARGS) name=$(notdir $(basename $@)) out=$@
	@cp src/load-worker.js static/load-worker.js

jsdep: $(JS_DEP)
	@mkdir -p $(JS_DIR)
	@for i in $(JS_DEP); do cp $$i $(JS_DIR)/`basename $$i` ; done

# make less and css files and dependencies
less: $(LESS_BUILD)

$(LESS_BUILD): $(LESS_SRC)
	@cat $(LESS_SRC) > static/tmp.less
	@$(CSSC) $(CSSCARGS) static/tmp.less $(LESS_BUILD)
	@rm -f static/tmp.less

cssdep: $(CSS_DEP)
	@mkdir -p $(CSS_DIR)
	@for i in $(CSS_DEP); do cp -r $$i $(CSS_DIR)/`basename $$i` ; done

.PHONY: clean
clean:
	@rm -fr $(CSS_DIR) $(JS_DIR) $(JS_BUILD) $(LESS_BUILD) static/load-worker.js
