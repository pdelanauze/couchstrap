/**
 * Created with IntelliJ IDEA.
 * User: pat
 * Date: 12-05-10
 * Time: 1:52 PM
 * To change this template use File | Settings | File Templates.
 */
define(['underscore', 'backbone', 'lib/simple-json-schema'], function (_, Backbone, SimpleJsonSchema) {

  var BackboneSchemaModel = Backbone.Model.extend({
    schema: false,
    validate: function(attributes){
      var report = SimpleJsonSchema.validate(attributes, this.schema, true);

      if (!report.isValid){
        return report;
      }
    }
  });

  return BackboneSchemaModel;
});