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
      create_target:true,
      cancel:false,
      filter:'',
      query_params:{},
      doc_ids:[],
      proxy:'',
      headers:{},
      updated_at:new Date()
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
        contentType:'application/json',
        success:function (data, textStatus, xhr) {
          var now = new Date();

          model.unset('error');
          model.unset('reason');

          if (model.get('continuous')) {
            model.set({
              replication_id:data._local_id,
              last_replication_status:'Continuous replication started at ' + now
            });
          } else if (data.history && data.history.length > 0) {
            model.set({
              session_id:data.session_id,
              last_replication_status:_.template('Wrote <%= docs_written %> out of <%= docs_read %> read. ' +
                      '<%= doc_write_failures %> failed to be written. ' +
                      'Replication started at <%= start_time %> and ended at <%= end_time %>. ', data.history[0])
            });
          }

          model.save({
            last_replicated_at:new Date(),
            last_result:data
          }, {
            ignoreReplicator:true
          });

        }, error:function (xhr, textStatus, errorThrown) {
          var data = $.parseJSON(xhr.responseText);
          model.unset('last_replication_status');
          model.save({
            error:data.error,
            reason:data.reason
          }, {
            ignoreReplicator:true
          });
        }
      });
    },
    /**
     * Can really only delete when it is continuous...
     */
    deleteFromReplicator:function (opts) {
      var model = this;
      if (model.get('continuous')) {
        var json = model.toJSON();
        var data = {
          source:json.source,
          target:json.target,
          create_target:json.create_target,
          cancel:true,
          continuous:model.get('continuous'),
          replication_id:json.replication_id
        };

        $.ajax({
          url:'/_replicate',
          data:JSON.stringify(data),
          type:'POST',
          dataType:'json',
          contentType:"application/json",
          success:function () {
            if (opts.success) {
              opts.success(model);
            }
          }, error:function () {
            if (opts.error) {
              opts.error(model);
            }
          }
        });
      } else {
        if (opts.success) {
          opts.success(model);
        }
      }
    },
    sync:function (method, model, options) {

      // First whether we should sync to the replicator database after saving this model
      if (method === 'update' || method === 'create') {

        model.set({
          updated_at:new Date()
        });

        // Extend the success function of this saved model to trigger a request to the replicator
        if (!options.ignoreReplicator) {
          // We're using a 'complete' callback here otherwise the success callback from backbone-couchdb gets
          // overwritten
          options.complete = function () {
            // Now update the replicator database
            model.sendToReplicator();
          }
        }
      }

      if (method === 'delete' && !options.ignoreReplicator) {
        model.deleteFromReplicator({
          success:function (model) {
            return Backbone.sync(method, model, options);
          },
          error:function (model) {
            console.log('Detected an error trying to delete the replication entry from the couchdb replicator', arguments);
            return Backbone.sync(method, model, options);
          }
        });
      } else {
        return Backbone.sync(method, model, options);
      }
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
      {name:'Filter', value:'filter', type:'text'},
      {name:'Updated at', value:'updated_at', type:'text'},
      /*{name:'Query params', value:'query_params', type:'text'},
       {name:'Doc IDs', value:'doc_ids', type:'text'}*/
    ],
    initialize:function (options) {
      BackboneUtility.Views.TableControlView.prototype.initialize.call(this, options);
      _.bindAll(this, 'render');
    }
  });

  CouchDBReplicationApp.Views.ReplicationEditItemView = BackboneUtility.Views.ModelEditView.extend({
    template:_.template($("#replication-form-template").html()),
    handleFileAttachments:false,
    events:{
      'click .push-pull-replication .btn.push-replication':'togglePushReplication',
      'click .push-pull-replication .btn.pull-replication':'togglePullReplication'
    },
    initialize:function (options) {
      BackboneUtility.Views.ModelEditView.prototype.initialize.call(this, options);

      this.model.bind('change', this.render);
      _.bindAll(this, 'togglePushReplication', 'togglePullReplication');
    },
    renderForm:function () {
      BackboneUtility.Views.ModelEditView.prototype.renderForm.call(this);

      // Add the push / pull popover explanations
      this.$('.push-pull-replication .btn[rel="popover"]').popover();

      var m = this.model;

      if (m.get('target') === Backbone.couch_connector.config.db_name) {
        $(this.el).removeClass('push-replication').addClass('pull-replication');
        this.$('.control-group.push-pull-replication .btn-group .btn').removeClass('active').filter('.pull-replication').addClass('active');
      } else {
        $(this.el).removeClass('pull-replication').addClass('push-replication');
        this.$('.control-group.push-pull-replication .btn-group .btn').removeClass('active').filter('.push-replication').addClass('active');
      }
    },
    doSave:function () {
      if ($(this.el).hasClass('push-replication')) {
        this.model.set({source:Backbone.couch_connector.config.db_name});
      } else {
        this.model.set({target:Backbone.couch_connector.config.db_name, create_target:false});
      }

      var submitButton = this.$(':input[type=submit]');
      var statusContainer = this.$('.replication-status-container').empty();
      submitButton.button('loading');

      this.model.save(null, {success:function () {
        submitButton.button('complete');
        _.delay(function () {
          submitButton.button('reset');
        }, 1500);
      }});

      return false;
    },
    render:function () {
      BackboneUtility.Views.ModelEditView.prototype.render.call(this);

      var statusContainer = this.$('.replication-status-container');
      var m = this.model;

      if (m.isNew()){
        $(this.el).addClass('new-state');
      } else {
        $(this.el).removeClass('new-state');
      }

      // Also render some status messages
      if (statusContainer.length == 0) {
        statusContainer = $('<div class="control-group replication-status-container"></div>').insertAfter(this.$('form legend:first'));
      } else {
        statusContainer.empty();
      }

      if (m.get('last_replication_status')) {
        statusContainer.prepend(_.template('<div class="alert alert-success fade in">' +
                '<a class="close" data-dismiss="alert">×</a>' +
                '<h4 style="text-transform: capitalize;">Replication succeeded</h4>' +
                '<%= last_replication_status %>' +
                '</div>', {
          last_replication_status:m.get('last_replication_status')
        }));
      }

      if (m.get('error')) {
        statusContainer.prepend(_.template('<div class="alert alert-error fade in">' +
                '<a class="close" data-dismiss="alert">×</a>' +
                '<h4 style="text-transform: capitalize;">Replication error: <%= error %></h4>' +
                '<%= reason %>' +
                '</div>', {
          reason:m.get('reason'),
          error:m.get('error')
        }));
      }

      return this;
    },
    close:function () {
      this.$('.push-pull-replication .btn[rel="popover"]').popover('hide');
      return BackboneUtility.Views.ModelEditView.prototype.close.call(this);
    },
    togglePushReplication:function () {
      $(this.el).removeClass('pull-replication').addClass('push-replication');
      return true;
    },
    togglePullReplication:function () {
      $(this.el).removeClass('push-replication').addClass('pull-replication');
      return true;
    }
  });

  CouchDBReplicationApp.Routers.ReplicationRouter = BackboneUtility.Routers.RESTishRouter.extend({
    modelName:'replication',
    pluralModelName:'replications',
    modelClass:CouchDBReplicationApp.Models.Replication,
    tableControlView:CouchDBReplicationApp.Views.ReplicationTableControlView,
    modelEditView:CouchDBReplicationApp.Views.ReplicationEditItemView,
    initialize:function (options) {

      this.collection = new (CouchDBReplicationApp.Collections.ReplicationCollection.extend({
        model:this.modelClass
      }))(); // Quick hack to make sure that we see all models during development...

      BackboneUtility.Routers.RESTishRouter.prototype.initialize.call(this, options);

    },
    listItems:function (params) {
      BackboneUtility.Routers.RESTishRouter.prototype.listItems.call(this, params);
      $('.navbar-fixed-top ul.nav').children('li').removeClass('active').filter('.replications').addClass('active');
    }
  });

  return CouchDBReplicationApp;

});