require.config({
  paths:{
    'jquery':'application/jquery.min',
    'underscore':'application/underscore',
    'backbone':'application/backbone',
    'backbone.marionette': 'application/backbone.marionette',
    'synapse': 'application/synapse'
  }
});

require([
  'jquery',
  'application/jquery.couch',
  'application/sha1',
  'application/plugins',
  'underscore',
  'backbone',
  'backbone.marionette',
  'application/backbone-couchdb',
  'synapse',
  'synapse/hooks/jquery',
  'synapse/hooks/backbone-model'
], function ($, jQueryCouch, sha1, plugins, _, Backbone, Marionette, backboneCouchDb,
        Synapse, jQueryHook, BackboneModelHook) {

  console.log(arguments);

  // TODO You need to configure these to point to the right database / couch application
  Backbone.couch_connector.config.db_name = 'soca-sass-boilerplate';
  Backbone.couch_connector.config.ddoc_name = 'soca-sass-boilerplate';
  Backbone.couch_connector.config.view_name = 'by_type';

  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%-([\s\S]+?)%>/g,
    escape      : /<%=([\s\S]+?)%>/g
  };

  Synapse.addHooks(jQueryHook, BackboneModelHook);

  var WebApp = new Marionette.Application();
  WebApp.addInitializer(function(options){
    console.log('Marionette App starting', arguments);
  });

  WebApp.start({});

});