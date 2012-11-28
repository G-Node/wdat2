# js compiler
JSC = uglifyjs
JSCARGS = --no-copyright
# css compiler
CSSC = lessc
CSSCARGS = 

# target dir for js files
STATIC_JS = static
# target dir for css files
STATIC_CSS = static

# all js sources
SRC_JS = $(wildcard src/main/*.js) $(wildcard src/api/*.js) $(wildcard src/api/data/*.js)
# sources that are also needes as separate files
SRC_JS_ADD = src/api/data/network_resource.js 

# web worker sources
SRC_JS_WORK = src/api/data/data_api.js.worker

# all less sources
SRC_LESS = $(wildcard src/api/less/*.less)
# additonsal less sources
SRC_LESS_ADD = $(wildcard src/main/*.less)
# compiled css sources
SRC_CSS = $(wildcard $(STATIC_CSS)/*.less)


# make uncompressed js files
wdat-api.js: $(SRC_JS) $(SRC_JS_ADD) $(SRC_JS_WORK)
	cat $(SRC_JS) > $(STATIC_JS)/wdat-api.js
	for i in $(SRC_JS_ADD); do cp $$i $(STATIC_JS)/ ; done
	for i in $(SRC_JS_WORK); do cp $$i $(STATIC_JS)/ ; done

# make compressed js files
wdat-api-min.js: wdat-api.js $(SRC_JS_ADD) $(SRC_JS_WORK)
	$(JSC) $(JSCARGS) $(STATIC_JS)/wdat-api.js > $(STATIC_JS)/wdat-api.min.js
	for i in $(SRC_JS_ADD); do $(JSC) $(JSCARGS) $$i > $(STATIC_JS)/`basename $$i .js`.min.js ; done
	for i in $(SRC_JS_WORK); do $(JSC) $(JSCARGS) $$i > $(STATIC_JS)/`basename $$i .js.worker`.min.js.worker ; done
	
# compile css files
wdat-api.css: $(SRC_LESS)
	cat $(SRC_LESS) > $(STATIC_CSS)/wdat-api.less
	cat $(SRC_LESS_ADD) > $(STATIC_CSS)/main.less
	$(CSSC) $(CSSCARGS) $(STATIC_CSS)/wdat-api.less > $(STATIC_CSS)/wdat-api.css
	$(CSSC) $(CSSCARGS) $(STATIC_CSS)/main.less > $(STATIC_CSS)/main.css
	rm $(STATIC_CSS)/wdat-api.less $(STATIC_CSS)/main.less

# make uncompressed js and css files
wdat: wdat-api.js wdat-api.css

# make all
all: wdat-api.js wdat-api.css wdat-api-min.js

.PHONY: clean
clean:
	rm -f $(STATIC_CSS)/*.less $(STATIC_JS)/wdat-api.css \
	$(STATIC_JS)/main.css $(STATIC_JS)/*.js.worker $(STATIC_JS)/*.js
