/**
 * Created with IntelliJ IDEA.
 * User: pat
 * Date: 12-05-10
 * Time: 2:15 PM
 * To change this template use File | Settings | File Templates.
 */
define(['underscore', 'backbone', '../lib/utility', '../lib/backbone-utility', '../lib/backbone-couch-schema-model', '../lib/backbone.couchdb'],
    function (_, Backbone, Utility, BackboneUtility, BackboneCouchSchemaModel, Backbone) {

  var TodoApp = {
    Models:{},
    Collections:{},
    Routers:{},
    App: {
      router: false
    }
  };

  TodoApp.Models.Todo = BackboneCouchSchemaModel.extend({
    // TODO Introduce a app-config dependency that contains all the configuration options of the application, such as the url of the couchdb server
    defaults: {
      type: 'todo',
      name: ''
    },
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

  TodoApp.Collections.TodoCollection = Backbone.couch.Collection.extend({
    model:TodoApp.Models.Todo,
    change_feed: true,
    couch: function() {
      return {
        view: Backbone.couch.options.design + '/by_type',
        key: 'todo',
        include_docs: true
      }
    },
    initialize: function(){
      this._db = Backbone.couch.db(Backbone.couch.options.database);
    }
    // _db:Backbone.couch.db(Backbone.couch.options.database) // Set a runtime...
  });

  TodoApp.Routers.TodoRouter = BackboneUtility.Routers.ScaffoldViewBasedRouter.extend({
    modelName:'todo',
    pluralModelName:'todos',
    modelClass:TodoApp.Models.Todo,
    parentContainer: $("#apps-container").append('<div class="todo-app-container"></div>'),
    initialize: function(opts){
      BackboneUtility.Routers.ScaffoldViewBasedRouter.prototype.initialize.apply(this, arguments);
      this.collection = new TodoApp.Collections.TodoCollection();
    }
  });

  return TodoApp;
});