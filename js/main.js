require.config({
  paths:{
    'jquery':'application/jquery.min',
    'underscore':'application/underscore',
    'backbone':'application/backbone',
    'backbone.marionette': 'application/backbone.marionette',
    'modelbinding': 'application/backbone.modelbinding',
    'less': 'application/less-1.3.0',
    'bootstrap': 'application/bootstrap'
  }
});

require([
  'jquery',
  'less',
  'bootstrap',
  'application/jquery.couch',
  'application/sha1',
  'application/plugins',
  'underscore',
  'backbone',
  'application/backbone-couchdb',
  'modelbinding',
  'application/couchdb-replication-app'
], function ($, less, boostrap, jQueryCouch, sha1, plugins, _, Backbone, backboneCouchDb, ModelBinding, CouchDBReplicationApp) {

  console.log(arguments);

  // TODO You need to configure these to point to the right database / couch application
  Backbone.couch_connector.config.db_name = 'couchstrap';
  Backbone.couch_connector.config.ddoc_name = 'couchstrap';
  Backbone.couch_connector.config.view_name = 'by_type';
  Backbone.couch_connector.config.global_changes = true;

  ModelBinding.Configuration.configureAllBindingAttributes("name");

  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%-([\s\S]+?)%>/g,
    escape      : /<%=([\s\S]+?)%>/g
  };

  $(function(){

    var replicationRouter = new CouchDBReplicationApp.Routers.ReplicationRouter({
      parentContainerSelector: '#replication-app-container'
    });

    Backbone.history.start();

  });


});