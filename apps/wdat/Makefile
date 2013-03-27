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
SRC_JS = 	$(wildcard src/*.js) \
	$(wildcard src/wdat/*.js) \
	$(wildcard src/wdat/mod.js)

#	$(wildcard src/mod/*.js) \
#	$(wildcard src/api/*.js) \
#	$(wildcard src/ui/*.js) \
#	$(wildcard src/app/*.js)

# sources that are also needed as separate files
SRC_JS_SEPARATE = src/wdat/api/network_resource.js

# web worker sources
SRC_JS_WORKER = src/wdat/api/data_api.js.worker

# all less sources
SRC_LESS = $(wildcard src/wdat/ui/*.less) \
	$(wildcard src/wdat/app/*.less)

# additonsal less sources
SRC_LESS_MAIN = $(wildcard src/*.less)

# compiled css sources
SRC_CSS = $(wildcard $(STATIC_CSS)/*.less)


# make uncompressed js files
wdat-api.js: $(SRC_JS) $(SRC_JS_ADD) $(SRC_JS_WORK)
	cat $(SRC_JS) > $(STATIC_JS)/wdat-api.js
	for i in $(SRC_JS_SEPARATE); do cp $$i $(STATIC_JS)/ ; done
	for i in $(SRC_JS_WORKER); do cp $$i $(STATIC_JS)/ ; done

# make compressed js files
wdat-api-min.js: wdat-api.js $(SRC_JS_ADD) $(SRC_JS_WORK)
	$(JSC) $(JSCARGS) $(STATIC_JS)/wdat-api.js > $(STATIC_JS)/wdat-api.min.js
	for i in $(SRC_JS_SEPARATE); do $(JSC) $(JSCARGS) $$i > $(STATIC_JS)/`basename $$i .js`.min.js ; done
	for i in $(SRC_JS_WORKER); do $(JSC) $(JSCARGS) $$i > $(STATIC_JS)/`basename $$i .js.worker`.min.js.worker ; done
	
# compile css files
wdat-api.css: $(SRC_LESS)
	cat $(SRC_LESS) > $(STATIC_CSS)/wdat-api.less
	cat $(SRC_LESS_MAIN) > $(STATIC_CSS)/main.less
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
