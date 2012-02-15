require.config({
  paths:{
    'jquery':'application/jquery.min',
    'underscore':'application/underscore',
    'backbone':'application/backbone',
    'backbone.marionette': 'application/backbone.marionette',
    'modelbinding': 'application/backbone.modelbinding',
    'less': 'application/less-1.2.2'
  }
});

require([
  'jquery',
  'less',
  'application/jquery.couch',
  'application/sha1',
  'application/plugins',
  'underscore',
  'backbone',
  'application/backbone-couchdb',
  'modelbinding'
], function ($, less, jQueryCouch, sha1, plugins, _, Backbone, backboneCouchDb, ModelBinding) {

  console.log(arguments);

  // TODO You need to configure these to point to the right database / couch application
  Backbone.couch_connector.config.db_name = 'soca-sass-boilerplate';
  Backbone.couch_connector.config.ddoc_name = 'soca-sass-boilerplate';
  Backbone.couch_connector.config.view_name = 'by_type';
  Backbone.couch_connector.config.global_changes = true;

  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%-([\s\S]+?)%>/g,
    escape      : /<%=([\s\S]+?)%>/g
  };

});