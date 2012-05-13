/**
 * Created with IntelliJ IDEA.
 * User: pat
 * Date: 12-05-10
 * Time: 2:15 PM
 * To change this template use File | Settings | File Templates.
 */
define(['underscore', 'backbone', '../lib/utility', '../lib/backbone-utility', '../lib/backbone-schema-model'], function (_, Backbone, Utility, BackboneUtility, BackboneSchemaModel) {

  var TodoApp = {
    Models:{},
    Collections:{},
    Routers:{},
    App: {
      router: false
    }
  };

  TodoApp.Models.Todo = BackboneSchemaModel.extend({
    url: '/todos',
    schema:{
      description:'Todo item',
      type:'todo',
      properties:{
        name:{
          title:'Name',
          type:'string',
          required:true,
          'default':'What needs to be done?'
        },
        description:{
          title:'Description',
          type:'string'
        },
        createdAt:{
          title:'Creation date',
          type:'string',
          format: 'date-time'
        },
        completedAt:{
          title:'Completion date',
          type:'string',
          format: 'date-time'
        }
      }
    }
  });

  TodoApp.Collections.TodoCollection = Backbone.Collection.extend({
    model:TodoApp.Models.Todo,
    url: '/todos'
  });

  TodoApp.Routers.TodoRouter = BackboneUtility.Routers.RESTishRouter.extend({
    modelName:'todo',
    pluralModelName:'todos',
    modelClass:TodoApp.Models.Todo,
    initialize: function(opts){
      this.collection = new TodoApp.Collections.TodoCollection();
      BackboneUtility.Routers.RESTishRouter.prototype.initialize.call(this, opts);

      // Add the links to the application
      $('.navbar-fixed-top ul.nav').append('<li><a href="#/' + this.pluralModelName + '">' + Utility.String.capitalize(this.pluralModelName) + '</a></li>');
    }
  });

  return TodoApp;
});