/*!
 * Copyright 2013 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// To keep the actual test code as clean as possible, it would be
// best to abstract out all the asynchronous stuff required to get
// a widget up and running the the test scaffold. (Otherwise, the
// the tests themselves will have to manage callbacks and such.)
// The easiest (only?) clean way to do that is by implementing a
// requirejs plugin, so that's what we're doing here. Widgets
// can then be loaded with standard requirejs syntax, e.g.:
//
//     require('widget!footer', function(footer) {
//       /* do something to test the footer widget */
//     })
//
// To load the footer widget.
//
// Widget loading is necessarily asynchronous because it has
// to go through several stages. First grab the manifest. Then
// read it to identify the template. Then load the template.
// Then scan it for external CSS and JavaScript files. Then
// load those files. And so on. We need to defer testing
// until all the pieces are in place. By setting up a requirejs
// plugin, we can control when requirejs thinks our module
// is loaded. (It won't proceed to the test code until then.)
// So we simply won't tell requirejs that we're done until
// everything is ready (or until we've encountered an error
// that blocks progress).
//
// The object this module returns will have several properties.
//
// * `.html`: The HTML template for the widget with any
//   external CSS style sheet and JavaScript file references
//   removed. (So the HTML can be safely manipulated by test
//   code without worrying about triggering the loading of
//   external resources.) If no HTML template could be found,
//   this property will be an empty string.
// * `.cssStyleSheets`: An array of objects representing any
//   external CSS style sheets referenced by the HTML template.
//   Objects in the array will have a `.path` property which
//   contains the URL and a `.content` property which contains
//   the style sheet itself. If no external styles sheets are
//   identified, this array will be empty.
// * `.jsScripts`: An array of objects representing any external
//   JavaScript files referenced by the HTML template.
//   Objects in the array will have a `.path` property which
//   contains the URL and a `.content` property which contains
//   the JavaScript itself. If no external JavaScript files are
//   identified, this array will be empty.
//
// In addition, there are methods to control the mocked API
// functionality. The first is `.mock()`, which mocks a specific
// AJAX request by returning a defined response. The method
// expects a single object as its parameter, that object should
// have properties:
//
// * `.method`: e.g. `"GET"` or `"POST"`.
// * `.url`: either a string or a RegExp object that matches
//    the request to mock.
// * `.response`: either an array of `[status, {headers}, 'data']`
//   or a function. See [SinonJS documentation](http://sinonjs.org/docs/)
//   for details.
//
// The method returns the widget object so that it may be chained
//
// The second method is `.clear()`, which deletes any previously
// added mocks. It should be called to reset the mocking server to
// a known state. It returns the widget object itself so that it
// may be chained.
//
// The final method is `.restart()`, which restarts the mocking
// server. It should be called after all mocks are in place.
//
// A scenario for using these methods might look like:
//
//     var w = require('widget!example');
//     w.clear()
//       .mock({
//         method:   'GET',
//         url:      '/api/ex1',
//         response: [200, {'Content-Type': 'application/json'}, '{"prop1":"value1"}']
//       })
//       .mock({
//         method:   'GET',
//         url:      '/api/ex2',
//         response: [200, {'Content-Type': 'application/json'}, '{"prop2":"value2"}']
//       })
//       .restart();
//
// After executing the code above, the server will be prepared
// to respond to the indicated API requests with the defined
// data.
//
// There are methods to load and unload the widget content in the
// page. They can be called at the start and end of each test.
//
// * `.load()`: load the widget in a test container `<div>` on the
//   page. If `#widget-container` already exists on the page, it
//   will be used; otherwise this method will create it an append
//   it to the page body.
// * `.unload()`: Remove widget from the page __*only*__ if a prior
//   call to `.load()` created a `#widget-container`. If load was
//   not called or if `#widget-container` existed before the call
//   to `.load()`, this method has no effect.

define(['require', 'server'], function(require, server){

  // Private properties and attributes
  // ---------------------------------

  // Properties of the widget we want to track.
  var _moduleName,           // The widget's name
      _parentRequire,        // Main requirejs functionality
      _onload,               // Callback function when widget is ready
      _config,               // Requirejs configuration
      _manifestPath,         // URL for the widget's manifest.json file
      _manifest,             // The widget's actual manifest
      _htmlPath,             // URL for the widget's template
      _html = '',            // The HTML template for the manifest
      _cssStyleSheets = [],  // Any CSS style sheets referenced by the template
      _jsScripts = [],       // Any external JavaScript files referenced by the template
      _container,            // Inserted `<div>` element to hold widget contents
      _styles = [];          // Inserted styles

  // `$.Deferred()` objects we use to track asynchronous loading
  var _manifestLoading,
      _htmlLoading,
      _cssLoading,
      _jsLoading;

  // Regular expressions to extract style sheets and script files
  // from HTML content. These aren't especially fancy, so if widget
  // authors go crazy, they'll need revision. They should handle
  // normal cases, though.
  var CSS_REGEXP_STR = '<link.*rel=[",\']stylesheet.*href=[",\'](.*)[",\'].*\\s\/>',
      JS_REGEXP_STR  = '<script\\s.*src=[",\'](.*)[",\'].*</script>';

  // Regular express for absolute path to static HTML macros. We only
  // need this when running unit tests from the local file system.
  // See `._getMacro()` below for more details.
  var MACRO_REGEXP = /^\/shared\/oae\/macros\//i;

  // Private methods and functions
  // -----------------------------

  // Get files (e.g. CSS stylesheets and JavaScript references)
  // from a string containing HTML content. Note that the
  // regular expression is passed as a string rather than a
  // RegExp object. That's so we can reuse the regexp in
  // different contexts (e.g. `/g` or not) without modifying
  // it directly.
  var _getFileNames = function(htmlString, regexString) {
    var filenames = [];
    var match = htmlString.match(RegExp(regexString,'i'));
    if (match) {
      filenames = match.slice(1);
    }
    return filenames;
  }

  // Remove tags that include filenames from HTML text. Note
  // that the regular expression is passed as a string rather
  // than a RegExp object.
  var _stripFileNames = function(htmlString, regexString) {
    return htmlString.replace(RegExp(regexString,'gi'),'')
  }
  
  // Retrieve contents for an array of files and resolve
  // a $.Deferred() when they're available.
  var _retrieveFiles = function(files, deferred) {

    var requireFiles = files.map(function(file) {
      return file.requirePath;
    });
  
    // Use require.js to fetch the files.
    require(requireFiles, function(){
    
      // All the file contents are conveniently stored
      // in the arguments "array". We do need to save
      // a local copy, though, since `arguments` will
      // be redefined in callbacks.
      var contents = arguments;
    
      // Now map the simple array of filenames into
      // a new array that includes both the filename
      // and its contents.
      deferred.resolve(files.map(function(file, idx) {
        return {path: files[idx].path, content: contents[idx]};
      }));
    },function(){

      // If there was an error in retrieving the files,
      // resolve the deferred accordingly.
      deferred.reject();
    })
  }

  // Get a macro file.
  var _getMacro = function(req) {
  
    // Various components reference the UI macros with an
    // absolute URL rather than a relative one. When requirejs
    // sees an absolute URL, it doesn't check its config
    // for a potential remapping. That's a problem for
    // unit testing, since the project will probably not
    // be located in the root of the file system or domain.
    // We'll have to intercept these requests and turn them
    // into relative URLs so the requirejs mapping will kick
    // in and find the files for us.
    var macro = req.url.replace(MACRO_REGEXP, ''),
        url = _parentRequire.toUrl(macro);
  
    $.ajax(url)
      .success(function(data) {
        req.respond(200, {'Content-Type': 'text/html'}, data)
      })
      .error(function(xhr) {
        req.respond(404, {}, '')
      });
  }

  // Helper function to load widget assets on page
  var _loadWidget = function() {

    // See if a container already exists. If so, there's no
    // need to add one.
    var container = document.getElementById('widget-container');

    if (!container) {
      _container = document.createElement('div');
      _container.id = 'widget-container';
      _container.style.visibility = 'hidden';
      document.body.appendChild(_container);
      container = _container;
    }

    container.innerHTML = _html;

    if (_cssStyleSheets.length > _styles.length) {
      _cssStyleSheets.forEach(function(sheet){
        var style = document.createElement('style');
        style.innerHTML = sheet.content;
        document.body.appendChild(style);
        _styles.push(style);
      })
    }
    
    _jsScripts.forEach(function(js) {
      js.content();
    })

  }

  var _unloadWidget = function() {
    if (_container) {
      _container.parentNode.removeChild(_container);
      _container = null;
      _styles.forEach(function(style){
        style.parentNode.removeChild(style);
      })
      _styles = [];
    }
  }

  // Steps to handle widget loading and setup, in order
  // --------------------------------------------------
  
  // ## Step 1: Set up the mock server
  var _mockServer = function() {
    // Before we start loading up the widget assets, we
    // need a mocking server in place. That's because
    // eventually we're going to load the widget's JavaScript
    // and that module will undoubtedly require oae.core
    // functionality, etc., which can trigger a bunch of
    // API calls. If we're not ready to mock those calls,
    // they'll fail, and our widget test code won't be
    // happy.
    //
    // The (currently) commented-out line below is only
    // needed for running tests from the local file
    // system. See `.getMacro()` above for details.
    server
      .user('basic')
//      .mock({ method: 'GET', url: MACRO_REGEXP, response: _getMacro })
      .start();

    // Now that's in place, we can start loading the widget.
    _loadManifest();
  }

  // ## Step 2: Get the manifest for the widget
  var _loadManifest = function() {

    // The entry point to a widget is its manifest file. Create
    // a URL for that file leveraging the requirejs configuration/
    _manifestPath = _parentRequire.toUrl(_moduleName + '/manifest.json');

    // Go ahead and request the manifest file.
    _manifestLoading = $.ajax(_manifestPath);

    // And once that's done go to the next step.
    _manifestLoading.done(_manifestLoaded);

    // If we can't get a manifest, return empty-handed.
    _manifestLoading.fail(_manifestFailed)
  }

  // ## Step 3: Process a manifest retrieved from the server
  var _manifestLoaded = function(manifestData) {

    // The manifest data in the response may be embedded
    // in a text string (if loaded from the local file
    // system) or it may already be converted to a JSON
    // object.

    _manifest = (typeof manifestData === 'string') ?
                  JSON.parse(manifestData) : manifestData;

    // Once we have the manifest, we can get the HTML.
    _loadHtml();
  }

  // ## Step 3b: Handle an error retrieving the manifest
  var _manifestFailed = function(rsp) {

    // As of version 1.9, jQuery considers an empty
    // response to be an error (even if the status is
    // 200). That's technically correct, but we want
    // to distinquish between empty responses and other
    // errors to help make diagnosing test failures
    // easier. So we'll check for that case below.
    if (rsp.status === 200) {
      // If the response was okay, but jQuery still
      // triggered an error, then it was unable to parse
      // the response as valid JSON. Before we bail,
      // we can set the manifest to an empty object.
      _manifest = {};
    }

    // In any case, at this point we've done all
    // we can do.
    _widgetLoaded();
  }

  // ## Step 4: Get the HTML template
  var _loadHtml = function() {

    // Make sure the manifest at least includes a source file.
    if (!_manifest.src) {
      // If not, we've done all we can do.
      _widgetLoaded();
    }
    _htmlPath = _parentRequire.toUrl(_moduleName + '/' + _manifest.src);
    
    // Go ahead and request the manifest file.
    _htmlLoading = $.ajax(_htmlPath);
    
    // And once that's done go to the next step.
    _htmlLoading.done(_htmlLoaded);

    // If we can't get the template, bail out.
    _htmlLoading.fail(_widgetLoaded);

  }

  // ## Step 5: Process a loaded HTML template
  var _htmlLoaded = function(html) {
    _html = html;

    // Now get the remaining assets
    _loadAssets();
  }

  // ## Step 6: Request the CSS and JavaScript assets
  var _loadAssets = function() {

    // We've got the HTML for the widget, look for any
    // CSS stylesheets referenced in the template.
    _cssStyleSheets = _getFileNames(_html, CSS_REGEXP_STR);
    // And remove them from the HTML.
    _html = _stripFileNames(_html, CSS_REGEXP_STR);
    
    // Same thing, except for JavaScript files.
    _jsScripts = _getFileNames(_html, JS_REGEXP_STR);
    _html = _stripFileNames(_html, JS_REGEXP_STR);

    // Now that we've identified the style sheets and
    // script files, let's go ahead and fetch them. We
    // set up a couple of `$.Deferred` objects to track
    // when the files are available.
    _cssLoading = $.Deferred(),
    _jsLoading = $.Deferred();

    // To retrieve the files, map the array of simple
    // filenames into the correct require.js path and
    // use that result as the `require()` dependency
    // array.
    _retrieveFiles(_cssStyleSheets.map(function(css) {
      return {
        path: css,
        requirePath: 'text!' + _moduleName + '/' + css
      };
    }), _cssLoading);
    
    // JavaScript files need a different requirejs
    // path.
    _retrieveFiles(_jsScripts.map(function(js) {
      return {
        path: js,
        requirePath: _moduleName + '/' + js.replace(/.js$/, '')
      };
    }), _jsLoading);
    
    // The `$.Deferred` resolutions update our data.
    _cssLoading.done(_cssLoaded);
    _jsLoading.done(_jsLoaded);
    
    // That's it; return what we found (even if there
    // was an error).
    $.when(_cssLoading, _jsLoading).then(_widgetLoaded, _widgetLoaded);
  }

  // ## Step 7: Handle retrieved CSS content
  var _cssLoaded = function(newCss) {
    _cssStyleSheets = newCss;
  }

  // ## Step 8: Handle retrieved JavaScript files
  var _jsLoaded = function(newJs) {
    _jsScripts = newJs;
  }

  // ## Step 9: Complete the loading process
  var _widgetLoaded = function() {
    // We can now tell requirejs that we're done.
    _onload({
      manifest:       _manifest,
      html:           _html,
      cssStyleSheets: _cssStyleSheets,
      jsScripts:      _jsScripts,
      clear:   function()  { server.clear().user('basic'); return this;},
      mock:    function(m) { server.mock(m); return this;},
      restart: function()  { server.start; return this;},
      load:   _loadWidget,
      unload: _unloadWidget
    })
  }

  // The main module that requirejs will access
  // ------------------------------------------
  return {
    
    // Since this is a require.js plugin, we need a `load()` method
    // for requirejs to call. This is where the widget loader does
    // its work.
    load: function (widgetName, parentRequire, onload, config) {

      // Save a copy of the input parameters.
      _moduleName    = widgetName;
      _parentRequire = parentRequire;
      _onload        = onload;
      _config        = config;

      // And start things off by loading the manifest
      _mockServer();
    }
  };
});
