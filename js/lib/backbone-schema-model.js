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
    validate: function(attributes, options){

      if (!options){options = {};}
      _.defaults(options, {
        partialValidation: true
      });

      var report = SimpleJsonSchema.validate(attributes, this.schema, options.partialValidation);

      if (!report.isValid){
        return report;
      }
    }
  });

  return BackboneSchemaModel;
});