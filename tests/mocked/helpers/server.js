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

define(['require', 'sinon'],function(require){

  // Private properties and attributes
  // ---------------------------------
  var _server = null, // server emulation
      _user,          // user "persona" being simulated
      _mocks = [];    // mocks currently active

  // Predefined user types (aka "personas")
  // --------------------------------------
  var USERS = [
    {
      name: 'basic',
      mocks: [
        { method: 'GET', url: '/api/me',         response: [ 200, {'Content-Type': 'application/json'}, '{}' ] },
        { method: 'GET', url: '/api/config',     response: [ 200, {'Content-Type': 'application/json'}, '{"oae-principals":{"user":{"defaultLanguage":"tdd"}}}' ] },
        { method: 'GET', url: '/api/ui/widgets', response: [ 200, {'Content-Type': 'application/json'}, '{}' ] }
      ]
    }
  ];


  // Private methods and functions
  // -----------------------------

  // Begin mocking requests
  var _start = function() {

    // If there's already a server running, stop it.
    // (In effect, `start()` acts like a reset.)
    if (_server) { _stop(); }

    // Create the fake server object.
    _server = sinon.fakeServer.create();

    // Go ahead and set up the mocks we're using.
    _mocks.forEach(function(mock){
      _server.respondWith(mock.method, mock.url, mock.response);
    })

    // Even though we don't (yet) expose the filter
    // functionality to callers, we do need it internally.
    // When we're mocking a widget, we're going to see a
    // bunch of AJAX requests. Some of them we'll want to
    // provide mock responses (e.g. API requests), but
    // others will be for loading assets (e.g. widget
    // templates) and we don't want to mock those.
    // Filters are the hook we use to tell sinon whether
    // to provide a mock response or to simply pass the
    // AJAX request through.
    _server.xhr.useFilters = true;

    // We only use a single filter function currently.
    // That function checks every AJAX request against
    // the array of requests that are being mocked. If
    // if doesn't find a match, then it tells sinon to
    // pass the request through for normal handling.
    // Confusingly (at least, based on the name), the
    // filter function should return `true` if the
    // request should not be mocked.
    _server.xhr.addFilter(function(method,url,async,username,password){

      // Return `false` if there is no matching mock.
      return !_mocks.some(function(m){
        // First check. The method has to match.
        if (method.toUpperCase() !== m.method.toUpperCase()) {
          return false;
        }
        // Second check. Simple string match.
        if ((typeof m.url === 'string') &&
            (url.toUpperCase() !== m.url.toUpperCase())) {
          return false;
        }

        // Final check. RegExp match.
        return url.match(m.url);
      })
    });

    // When a mock is available, we want sinon to respond
    // right away. There's no need to wait for a timeout
    // or for the code to explicitly respond.
    _server.autoRespond = true;
    _server.autoRespondAfter = 0;
  }

  // Stop mocking requests
  var _stop = function() {
    _server.restore();
    _server = null;
  }

  // Add a mock for a given method and URL (either a string or RegExp)
  var _addMock = function(mock) {
    
    // Before blindly processing the new mock, make sure it doesn't
    // conflict with an existing mock or is already in place.
    var existingMock = null; _mocks.some(function(m) {
      return ((m.method === mock.method) && (m.url.toString() === mock.url.toString())) ?
        ((existingMock = m), true) : false;
    })

    // If there's an existing mock for this request, update the
    // response. Otherwise, simply add the new one to the list.
    if (existingMock) {
      existingMock.response = mock.response;
    } else {
      _mocks.push(mock);
    }
  }

  // Simulate a particular type of user
  var _setUser = function(user) {

    // If no specific user persona is provided,
    // use an empty string.
    _user = user || '';

    // Look for the requested user in the array
    // of defined user types.
    var userInfo = null; USERS.some(function(u) {
      return (u.name === _user) ? ((userInfo = u), true) : false;
    });

    // If we found a pre-defined user, set up the
    // dummy responses.
    if (userInfo) {
      userInfo.mocks.forEach(function(mock){
        _addMock(mock);
      })
    }
  };
  
  // Module to return on creation
  // ----------------------------

  return {
    start: function() {
      _start();
      return this;
    },
    stop: function() {
      _stop();
      return this;
    },
    user: function(_s) {
      if (!arguments.length) return _user;
      _setUser(_s);
      return this;
    },
    mock: function(_o) {
      if (arguments.length) {
        _addMock(_o);
      }
      return this;
    },
    clear: function() {
      _mocks = [];
      return this;
    }
  };
});
