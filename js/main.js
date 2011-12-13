require.config({
  paths: {
    'jquery': 'application/jquery.min',
    'underscore': 'application/underscore',
    'backbone': 'application/backbone'
  }
});

require([
  'jquery',
  'application/jquery.couch',
  'application/sha1',
  'application/plugins',
  'underscore',
  'backbone'
], function ($, jQueryCouch, sha1, underscore, backbone) {

  console.log(arguments);

});