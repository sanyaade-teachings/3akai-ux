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

// This file sets up a mocked environment for OAE widget
// development and testing. It can be loaded as a RequireJS
// module in a browser, e.g.
//
//     <script data-main='dev.js' src='require-jquery.js'></script>

// Handle the preliminary setup within a closure to avoid messing
// with the global name space.

(function(){
  
  // Set up the default list of paths for the various components.
  // Note that we're doing this in a local variable rather than
  // directly in the `require.config()` parameter object. That
  // lets us change the paths at run time before setting up RequireJS.
  // In particular, as we can see below, it lets us dynamically add
  // a specific widget under test to the path config.
  
  var paths = {
    /* regular third party libraries */
    'bootstrap'                : 'shared/vendor/js/bootstrap',
    'trimpath'                 : 'shared/vendor/js/trimpath',
    'underscore'               : 'shared/vendor/js/underscore',
    'text'                     : 'shared/vendor/js/requirejs/require.text',
    'bootstrap.modal'          : 'shared/oae/js/bootstrap-plugins/bootstrap.modal',
    'jquery.browse-focus'      : 'shared/oae/js/jquery-plugins/jquery.browse-focus',
    'jquery.clip'              : 'shared/oae/js/jquery-plugins/jquery.clip',
    'jquery.dnd-upload'        : 'shared/oae/js/jquery-plugins/jquery.dnd-upload',
    'jquery.infinitescroll'    : 'shared/oae/js/jquery-plugins/jquery.infinitescroll',
    'jquery.jeditable-focus'   : 'shared/oae/js/jquery-plugins/jquery.jeditable-focus',
    'jquery.list-options'      : 'shared/oae/js/jquery-plugins/jquery.list-options',
    'jquery.update-picture'    : 'shared/oae/js/jquery-plugins/jquery.update-picture',
    'bootstrap.clickover'      : 'shared/vendor/js/bootstrap-plugins/bootstrapx.clickover',
    'jquery.autosuggest'       : 'shared/vendor/js/jquery-plugins/jquery.autoSuggest',
    'jquery.encoder'           : 'shared/vendor/js/jquery-plugins/jquery.encoder',
    'jquery.fileSize'          : 'shared/vendor/js/jquery-plugins/jquery.fileSize',
    'jquery.form'              : 'shared/vendor/js/jquery-plugins/jquery.form',
    'jquery.notify'            : 'shared/vendor/js/jquery-plugins/jquery.bootstrap.notify',
    'jquery.parseurl'          : 'shared/vendor/js/jquery-plugins/jquery.parseurl.oae-edited',
    'jquery.properties-parser' : 'shared/vendor/js/jquery-plugins/jquery.properties-parser',
    'jquery.serializeObject'   : 'shared/vendor/js/jquery-plugins/jquery.serializeObject',
    'jquery.timeago'           : 'shared/vendor/js/jquery-plugins/jquery.timeago',
    'jquery.validate'          : 'shared/vendor/js/jquery-plugins/jquery.validate',
    'jquery-ui'                : 'shared/vendor/js/jquery-ui/jquery-ui.custom',
    'globalize'                : 'shared/vendor/js/l10n/globalize',
    /* OAE core and API libraries */
    'oae.api.authentication'   : 'shared/oae/api/oae.api.authentication',
    'oae.api.comment'          : 'shared/oae/api/oae.api.comment',
    'oae.api.config'           : 'shared/oae/api/oae.api.config',
    'oae.api.content'          : 'shared/oae/api/oae.api.content',
    'oae.api.discussion'       : 'shared/oae/api/oae.api.discussion',
    'oae.api.group'            : 'shared/oae/api/oae.api.group',
    'oae.api.i18n'             : 'shared/oae/api/oae.api.i18n',
    'oae.api'                  : 'shared/oae/api/oae.api',
    'oae.api.l10n'             : 'shared/oae/api/oae.api.l10n',
    'oae.api.profile'          : 'shared/oae/api/oae.api.profile',
    'oae.api.user'             : 'shared/oae/api/oae.api.user',
    'oae.api.util'             : 'shared/oae/api/oae.api.util',
    'oae.api.widget'           : 'shared/oae/api/oae.api.widget',
    'oae.bootstrap'            : 'shared/oae/api/oae.bootstrap',
    'oae.core'                 : 'shared/oae/api/oae.core',
    /* l10n resources */
    'cultures'                 : 'shared/vendor/js/l10n/cultures',
    /* required templates */
    'activity'                 : 'shared/oae/macros/activity',
    'list'                     : 'shared/oae/macros/list',
    'autosuggest'              : 'shared/oae/macros/autosuggest',
    /* third party libraries used  for testing */
    'mocha'                    : 'tests/mocked/libs/mocha',
    'chai'                     : 'tests/mocked/libs/chai',
    'sinon'                    : 'tests/mocked/libs/sinon',
    'sinon-chai'               : 'tests/mocked/libs/sinon-chai',
    'chai-jquery'              : 'tests/mocked/libs/chai-jquery',
    'Ractive'                  : 'tests/mocked/libs/Ractive',
    /* code used for testing */
    'widget'                   : 'tests/mocked/helpers/widget',
    'server'                   : 'tests/mocked/helpers/server',
    'cssformat'                : 'tests/mocked/helpers/cssformat',
    'jsformat'                 : 'tests/mocked/helpers/jsformat'
    /* standard core widgets here */
  };
  
  // Now we can look for query string parameters and
  // dynamically add any required paths based on which
  // widgets we're testing.

  var match = /[?&]widget=([^&]*)/.exec(window.location.search);
  widget = match && decodeURIComponent(match[1]);
  if (!widget) {
    // If we didn't find a specific widget in the URL query string,
    // look in the user agent. (Sorry, but it seems to be the only
    // way to pass parameters from grunt all the way to phantomjs.)
    match = window.navigator.userAgent.match(/widget=([^&]*)/);
    widget = match && match[1];
  }
  if (widget) {
    paths[widget] = 'node_modules/oae-core/'+widget;
  }

  // Configure RequireJS with the information we've set up.
  require.config({
    baseUrl: '../..',
    urlArgs: 'v='+(new Date()).getTime(),  // Prevent Requirejs from caching libraries
    paths: paths,
    shim: {
      'underscore': {
        exports: '_'
      },
      'jquery': {
        exports: '$'
      }
    }
  });

})();

require(['widget!' + widget, 'Ractive'], function(widget, Ractive){

  // Put the widget in the global namespace so it can be
  // accessed easily from the console.
  window.w = widget;

  var methods = ['GET', 'POST', 'PUT', 'DELETE'];

  // Create the model for managing the page interactions.
  var ractive = new Ractive({
      el: 'dev-controls',
      template: '#template',
      data: {
        showSettings: {},
        widgetData: {},
        mocks: [],
        dirty: false,
        editing: false,
        newconfig: false,
        methods: methods,
        method: methods[0],
        headers: '{"Content-Type":"application/json"}'
      }
  });
window.r = ractive;
  ractive.set('mocks', widget.mocks().map(function(m){
    return $.extend(true, {active: true}, m)
  }));
  if (localStorage.getItem('mockdev')) { ractive.set('saved',true); }
  
  var loadWidget = function() {
    // Load the widget into the page.
    widget.load('widget-container', ractive.get('showSettings'), ractive.get('widgetData'));
  }
  
  loadWidget();

  ractive.on({
    remove: function(evt){
      var mocks = this.get('mocks');
      mocks.splice(evt.index.idx,1);
      this.set({
        mocks: mocks,
        dirty: true
      });
    },
    new: function(){
      this.set('editing', true);
    },
    cancel: function(){
      this.set('editing', false);
    },
    add: function(){
      var mocks = this.get('mocks');
      var response = [
        parseInt(this.get('status'),10),
        JSON.parse(this.get('headers')),
        this.get('response')
      ];
      mocks.push({
        active: true,
        method: this.get('method'),
        url: this.get('url'),
        response: response
      })
      this.set({
        mocks: mocks,
        dirty: true,
        editing: false
      })
    },
    reload: function(){
      loadWidget();
      this.set('newconfig', false);
    },
    update: function(){
      var mocks = this.get('mocks');
      widget.clear();
      mocks.forEach(function(m){
        if (m.active) { widget.mock(m); }
      })
      widget.restart();
      this.set('dirty', false);
    },
    store: function(){
      var config = {
        mocks: this.get('mocks'),
        showSettings: this.get('showSettings'),
        widgetData: this.get('widgetData')
      }
      localStorage.setItem('mockdev',JSON.stringify(config));
      this.set('saved',true);
    },
    load: function(){
      var config = JSON.parse(localStorage.getItem('mockdev'));
      this.set('mocks',config.mocks);
      this.set('showSettings',config.showSettings);
      this.set('widgetData',config.widgetData);
      this.set('dirty',true);
      this.set('newconfig',true);
    },
    clear: function(){
      localStorage.removeItem('mockdev');
      this.set('saved',false);
    },
    toggle: function(evt){
      this.set('dirty',true);
    },
    changeConfig: function(evt){
      this.set('showSettings', JSON.parse($('#settings').val()));
      this.set('widgetData', JSON.parse($('#data').val()));
      this.set('newconfig',true);
    }
  });

  $('#reload').on('click', function(){
    loadWidget();
  })
});