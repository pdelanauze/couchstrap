define(['backbone', 'underscore', 'modelbinding', 'application/utility', 'application/backbone-utility'], function (Backbone, _, ModelBinding, Utility, BackboneUtility) {

  var CouchDBReplicationApp = {
    Models:{},
    Collections:{},
    Views:{},
    Routers:{},
    Templates:{}
  };

  /**
   *
   * This replication document is kept locally in this database for tracking ( cancelling / etc. ) , and then forwards
   * the request to /_replicate.
   *
   * The _active_tasks channel should be monitored for removals..
   *
   */
  CouchDBReplicationApp.Models.Replication = Backbone.Model.extend({
    url:'/replications',
    defaults:{
      source:'',
      target:'',
      continuous:false,
      create_target:false,
      cancel:false,
      filter:'',
      query_params:{},
      doc_ids:[],
      proxy:'',
      headers:{}
    },
    destroy:function () {
      this.set({cancel:true});
      Backbone.Model.prototype.destroy.call(this);
    },
    validate:function (attributes) {
      var errors = {};
      var isValid = true;

      // It's persisted, so it's valid ...
      _.each(attributes, function (v, k) {
        switch (k) {
          case 'source':
            if (!v || v.trim().length == 0) {
              errors['source'] = 'is required';
              isValid = false;
            }
            break;
          case 'target':
            if (!v || v.trim().length == 0) {
              errors['target'] = 'is required';
              isValid = false;
            }
            break;
        }
      });

      if (!isValid) {
        return errors;
      }
    },
    /**
     * Sends this request to the replicator
     */
    sendToReplicator:function () {
      // First adapt the document so that its properly accepted by the replicator
      var model = this;
      var json = model.toJSON();
      var data = {
        source:json.source,
        target:json.target
      };
      if (json.continuous) {
        data.continuous = true;
      }
      if (json.create_target) {
        data.create_target = true;
      }
      if (json.filter && json.filter.trim().length > 0) {
        data.filter = json.filter;
      }
      if (json.query_params && _.size(json.query_params) > 0) {
        data.query_params = json.query_params;
      }
      if (json.doc_ids && _.size(json.doc_ids)) {
        data.doc_ids = json.doc_ids;
      }
      if (json.proxy && json.proxy.trim().length > 0) {
        data.proxy = json.query_params;
      }
      if (json.headers && _.size(json.headers)) {
        data.headers = json.headers;
      }

      $.ajax({
        url:'/_replicate',
        data:JSON.stringify(data),
        type:'POST',
        dataType:'json',
        success:function (data, textStatus, xhr) {
          console.log('replicator accepted', arguments);

          model.save({
            last_replicated_at: new Date().getTime(),
            status: data
          });

        }, error:function (xhr, textStatus, errorThrown) {
          var data = $.parseJSON(xhr.responseText);
          model.save({
            error:data.error,
            reason:data.reason
          });
        }
      });
    },
    /**
     * Can really only delete when it is continuous...
     */
    deleteFromReplicator:function () {
      var model = this;
      if (model.get('continuous')) {
        var json = model.toJSON();
        var data = {
          source:json.source,
          target:json.target,
          continuous:json.continuous,
          cancel:true
        };

        $.ajax({
          url:'/_replicate',
          data:JSON.stringify(data),
          type:'POST',
          dataType:'json',
          contentType:"application/json",
          success:function () {
            console.log('replicator deleted', arguments)
          }, error:function () {
            console.log('replicator deletion error', arguments);
          }
        });
      }
    },
    sync:function (method, model, options) {

      // First whether we should sync to the replicator database after saving this model
      if (!method !== 'read') {
        model.set({updated_at:new Date().getTime()})
      }

      if (method === 'delete') {
        options.success = function () {
          model.deleteFromReplicator();
        }
      } else if (method === 'create') {

        // Extend the success function of this saved model to trigger a request to the replicator
        options.success = function () {
          // Now update the replicator database
          model.sendToReplicator();
        }
      }

      return Backbone.sync(method, model, options);
    }
  });

  CouchDBReplicationApp.Collections.ReplicationCollection = Backbone.Collection.extend({
    model:CouchDBReplicationApp.Models.Replication,
    url:'/replications'
  });

  CouchDBReplicationApp.Views.ReplicationTableItemView = BackboneUtility.Views.TableItemView.extend({
    initialize:function (options) {
      BackboneUtility.Views.TableItemView.prototype.initialize.call(this, options);
    }
  });

  CouchDBReplicationApp.Views.ReplicationTableView = BackboneUtility.Views.TableView.extend({
    itemView:CouchDBReplicationApp.Views.ReplicationTableItemView,
    initialize:function (options) {
      BackboneUtility.Views.TableView.prototype.initialize.call(this, options);
    }
  });

  CouchDBReplicationApp.Views.ReplicationTableControlView = BackboneUtility.Views.TableControlView.extend({
    tableView:CouchDBReplicationApp.Views.ReplicationTableView,
    modelName:'replication',
    pluralModelName:'replications',
    columns:[
      {name:'Source', value:'source', type:'text'},
      {name:'Target', value:'target', type:'text'},
      {name:'Continuous', value:'continuous', type:'text'},
      {name:'Filter function', value:'filter', type:'text'},
      /*{name:'Query params', value:'query_params', type:'text'},
       {name:'Doc IDs', value:'doc_ids', type:'text'}*/
    ],
    initialize:function (options) {
      BackboneUtility.Views.TableControlView.prototype.initialize.call(this, options);
    }
  });

  CouchDBReplicationApp.Views.ReplicationEditItemView = BackboneUtility.Views.ModelEditView.extend({
    initialize:function (options) {

      this.formStructure = Utility.Templates.buildFormStructureFromModel(this.model.toJSON());

      // Remove the id, collection and rev fields from the form
      this.formStructure.fields = _.reject(this.formStructure.fields, function (i) {
        return i.name === '_rev' || i.name === 'collection';
      });

      this.formStructure.buttons.push({type:'button', humanName:'Cancel', 'class':'cancel'});

      BackboneUtility.Views.ModelEditView.prototype.initialize.call(this, options);
    }
  });

  CouchDBReplicationApp.Routers.ReplicationRouter = BackboneUtility.Routers.RESTishRouter.extend({
    modelName:'replication',
    pluralModelName:'replications',
    modelClass:CouchDBReplicationApp.Models.Replication,
    tableControlView:CouchDBReplicationApp.Views.ReplicationTableControlView,
    modelEditView:CouchDBReplicationApp.Views.ReplicationEditItemView,
    initialize:function (options) {
      BackboneUtility.Routers.RESTishRouter.prototype.initialize.call(this, options);
    }
  });

  return CouchDBReplicationApp;

});