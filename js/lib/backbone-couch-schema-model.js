/**
 * Created with IntelliJ IDEA.
 * User: pat
 * Date: 12-05-10
 * Time: 1:52 PM
 * To change this template use File | Settings | File Templates.
 */
define(['./backbone.couchdb', './backbone-schema-model'], function (Backbone, BackboneSchemaModel) {

  var couch = Backbone.couch.utils;

  var BackboneCouchSchemaModel = BackboneSchemaModel.extend({
    sync: couch.sync,
    idAttribute: '_id'
  });

  return BackboneCouchSchemaModel;
});