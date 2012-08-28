JS_COMPILER = uglifyjs

JS_API_FILES =	src/api/event_bus.js \
		src/api/button.js \
		src/api/list.js \
		src/api/tree.js

CSS_API_FILES =	src/main/main.css \
		src/api/button.css \
		src/api/list.css \
		src/api/tree.css \

wdat.js: $(JS_API_FILES)
	cat $(JS_API_FILES) > static/wdat-api.js

wdat.css: $(CSS_API_FILES)
	cat $(CSS_API_FILES) > static/wdat-api.css

wdat: wdat.js wdat.css

.PHONY: clean
clean:
	rm static/wdat-api.js static/wdat-api.css
