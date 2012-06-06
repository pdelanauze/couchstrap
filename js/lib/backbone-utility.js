define(['jquery', 'underscore', 'backbone', 'modelbinder', 'lib/utility'], function ($, _, Backbone, BackboneModelBinder, Utility) {

  var BackboneUtility = {
    Views:{},
    Routers:{}
  };

  /**
   * Represents a row in a table view.
   *
   */
  BackboneUtility.Views.TableItemView = Backbone.View.extend({
    className:'table-item-view',
    tagName:'tr',
    modelName:'',
    pluralModelName:'',
    template:null,
    columns:[],
    events:{},
    bindings: false,
    initialize:function (options) {

      _.extend(this, options);
      _.bindAll(this, 'render', 'doDelete', 'close');

      _.defaults(this.events, {
        'submit form[method="DELETE"]':'doDelete'
      });
      this.delegateEvents();

      this.model.bind('remove', this.close);

      // Create the template
      if (!this.template) {
        var json = this.model.toJSON();
        var template = '';
        _.each(this.columns, function (column) {
          template += '<td class="' + column.value + '" name="' + column.value + '"></td>';
        });
        template += '<td class="table-cell-actions">' +
                '<a class="btn btn-small btn-primary edit" href="#/' + this.pluralModelName + '/edit">Edit</a>' +
                '<form action="#/' + this.pluralModelName + '" method="DELETE"><button type="submit" class="btn btn-small btn-danger delete">Delete</button></form> ' +
                '</td>';

        this.template = _.template(template);
      }

      $(this.el).addClass(this.modelName + '-table-item-view').html(this.template(this.model.toJSON()));
      this.render();

      // If we have no bindings already defined, generate them for the table's columns
      if (!this.bindings){
        this.bindings = {};
        _.each(this.columns, function(column){
          this.bindings[column.value] = '[name="' + column.value + '"]';
        }, this);
      }
      if (!this.modelBinder){
        this.modelBinder = new BackboneModelBinder();
      }

      this.modelBinder.bind(this.model, this.el, this.bindings);
    },
    render:function () {
      this.$('a.edit').attr('href', '#/' + this.pluralModelName + '/' + this.model.get('_id') + '/edit');
      this.$('.btn.delete').closest('form').attr('action', '#/' + this.pluralModelName + '/' + this.model.get('_id'));
      return this;
    },
    doDelete:function () {
      if (confirm('Are you sure ?')) {
        this.model.destroy();
      }
      return false;
    },
    close:function () {
      this.remove();
      this.unbind();
      this.modelBinder.unbind(this);
    }
  });

  /**
   * Represents the actual table HTML element used to represent a collection's contents.
   */
  BackboneUtility.Views.TableView = Backbone.View.extend({
    className:'table table-striped vertical-middle ',
    tagName:'table',
    modelName:'',
    pluralModelName:'',
    columns:[],
    itemView:BackboneUtility.Views.TableItemView,
    events:{},
    initialize:function (options) {

      _.extend(this, options);
      $(this.el).addClass(this.modelName + '-table-view');

      _.bindAll(this, 'render', 'itemAdded');
      this.collection.bind('add', this.itemAdded);
      this.collection.bind('reset', this.render);

      if (!this.columns || this.columns.length == 0) {
        var schema = this.collection.model.prototype.schema;
        // Prep the columns for the table control view
        if (schema) {
          // Generate the three first from the model's schema
          for (var key in schema.properties) {
            // Ignore id, rev and type keys
            if (key !== '_id' && key !== 'type' && key !== '_rev') {
              this.columns.push({name:Utility.String.capitalize(key), value:key});
            }
            if (this.columns.length == 3) {
              break;
            }
          }
        } else {
          console.log('Unable to dynamically generate column names, implement or inform the user to create his own');
        }
      }

      // Pre-render
      $(this.el).html(Utility.Templates.renderTableStructure({
        columns:this.columns,
        showMore:{
          label:'More ' + this.pluralModelName,
          href:'#/' + this.pluralModelName + '/p2'
        },
        showLess:{
          label:'Previous ' + this.pluralModelName,
          href:'#/' + this.pluralModelName + '/p1'
        }
      }));

    },
    render:function () {
      var tbody = this.$('tbody:first').empty();
      this.collection.each(this.itemAdded);
      return this;
    },
    itemAdded:function (model) {
      var itemView = new this.itemView({
        modelName:this.modelName,
        pluralModelName:this.pluralModelName,
        columns:this.columns,
        model:model
      }).render();

      this.$('tbody:first').append(itemView.el);
    },

    close:function () {
      this.remove();
      this.unbind();
    }
  });

  /**
   * Responsible for controlling the table, for example pagination, sorting, etc.
   * Also encapsulates the table view, therefore allowing for additional ux elements, such as pagination, sorting,
   * a new item link, etc.
   *
   */
  BackboneUtility.Views.TableControlView = Backbone.View.extend({
    className:'table-control-view',
    modelName:'',
    pluralModelName:'',
    columns:[],
    tableView:BackboneUtility.Views.TableView,
    tableViewInstance:null,
    template:null,
    initialize:function (options) {

      _.extend(this, options);
      $(this.el).addClass(this.modelName + '-table-control-view');

      if (!this.template) {
        this.template = _.template('<div class="pull-right control top">' +
                '<a href="#/' + this.pluralModelName + '/new" class="btn btn-primary"><i class="icon-plus"></i> New ' + this.modelName + '</a>' +
                '</div>' +
                '<div class="table-container"></div>');
      }

      if (!this.tableViewInstance) {
        // TODO Should be able to remove _.extend here, they are all the same attributes... Test it
        this.tableViewInstance = new this.tableView(_.extend(options, {
          columns:this.columns,
          modelName:this.modelName,
          pluralModelName:this.pluralModelName
        }));
      }

      _.bindAll(this, 'render', 'updateTableInfo');
      this.collection.on('pagechanged', this.updateTableInfo);
    },
    render:function () {
      this.tableViewInstance.render();
      var t = this.template();
      $(this.el).empty().html(t).find('.table-container:first').append(this.tableViewInstance.el);

      return this;
    },
    updateTableInfo:function (options) {

      var hasMore = false;
      var hasItemsNotShown = false;

      // We can either receive an object with an offset and totalRows, which, if we do have, is sufficient to
      // determine whether we have more records that can be loaded in the future
      // Otherwise, let's estimate their values
      if (!options.offset){
        var itemCount = this.collection.length;
        var theoreticalOffsetStart = (options.page - 1) * options.limit;
        var theoreticalOffsetStop = theoreticalOffsetStart + options.limit;

        if (itemCount >= theoreticalOffsetStart && itemCount <= theoreticalOffsetStop){
          // It's between the page that we should be, all records from start should be displayed..
          if (itemCount === theoreticalOffsetStop){
            hasMore = true;
          }
        } else if (options.page > 1){
          // There are probably previous records
          hasItemsNotShown = true;
        }
      } else if (options.offset < options.totalRows){
        hasMore = true;
      }

      var href = '#/' + this.pluralModelName + '/p' + (options.page ? options.page + 1 : 2);
      if (options.limit) {
        href = href.concat('/l' + options.limit);
      }

      this.$('.btn.show-more').attr('href', href);

      if (hasMore) {
        this.$('.btn.show-more').show();
      } else {
        this.$('.btn.show-more').hide();
      }

      if (hasItemsNotShown) {
        var lessHref = '#/' + this.pluralModelName + '/p' + (options.page - 1);
        this.$('.btn.show-less').attr('href', lessHref).show();
      } else {
        this.$('.btn.show-less').hide();
      }
    },
    close:function () {
      this.remove();
      this.unbind();
      this.collection.off('pagechanged', this.updateTableInfo);
    }
  });

  BackboneUtility.Views.ModelEditView = Backbone.View.extend({
    className:'model-edit-view',
    modelName:'',
    pluralModelName:'',
//    formStructure:{},
    events:{},
    initialize:function (options) {

      _.defaults(options, {
        formStructure: {}
      });

      _.extend(this, options);
      $(this.el).addClass(this.modelName + '-model-edit-view');

      _.defaults(this.events, {
        'submit form':'doSave',
        'reset form':'doReset',
        'click .btn.cancel':'doCancel',
        'click .btn.delete':'doDelete',
      });

      _.bindAll(this, 'render', 'renderForm',
              'doSave', 'doReset', 'doCancel', 'close', 'modelError',
              'modelChanged', 'doDelete');

      this.model.bind('remove', this.close);
      this.model.bind('change', this.modelChanged);
      this.model.bind('error', this.modelError);

      this.delegateEvents();

      var data = this.model.toJSON();
      if (this.model.isNew()) {
        data.id = 'new';
      }

      this.renderForm();
    },
    renderForm:function () {
      var ctx = this;

      if (!this.template) {
        _.defaults(this.formStructure, {
          action:'#/' + this.pluralModelName + '/new',
          method:'POST',
          recordId:this.model.get('_id'),
          fields:[],
          buttons:[]
        });

        if (this.formStructure.fields.length == 0) {
          if (this.model.schema) {
            Utility.Templates.buildFormStructureFromSchema(this.model.toJSON(), this.model.schema, this.formStructure, {
              humanName:this.modelName
            });
          } else {
            Utility.Templates.buildFormStructureFromModel(this.model.toJSON(), this.formStructure, {
              humanName:this.modelName
            });
          }

        } else {
          _.each(this.formStructure.fields, function (field) {
            _.defaults(field, {
              idPrefix:ctx.modelName
            });
          });
        }

        $(this.el).empty().html(Utility.Templates.renderForm(this.formStructure));
      } else {
        $(this.el).empty().html(this.template({model:this.model.toJSON()}));
      }

      if (!this.modelBinder){
        this.modelBinder = new BackboneModelBinder();
      }

      if (!this.bindings){
        this.bindings = {};
        _.each(this.formStructure.fields, function(field){
          this.bindings[field.name] = '[name="' + field.name + '"]';
        }, this);
      }

      this.modelBinder.bind(this.model, this.el, this.bindings);
    },
    render:function () {
      return this;
    },
    modelChanged:function (model, event) {

      // Remove the validation errors from the view on the specific attributes
      if (event && event.changes){
        _.each(event.changes, function (v, k) {
          this.$(':input[name="' + k + '"]').removeClass('error').
              closest('.control-group').removeClass('error').
              find('.help-inline').text('');
        }, this);
      }

      // Enable / disable the submit button based on whether the UI has an error class
      // This is because a model's attributes wont be changed if they are not valid, hence we cannot reliably
      // make a model.isValid() check, as it will validate against valid attributes only, and therefore always return
      // true ;)
      if (this.$(':input.error').length === 0) {
        this.$(':input[type="submit"]').removeAttr('disabled');
      }

      return this;
    },
    modelError:function (model, report) {

      var ctx = this;

      ctx.$(':input[type="submit"]').attr('disabled', 'disabled');

      _.each(report.errors, function (v) {
        ctx.$(':input[name="' + v.property + '"]').addClass('error').
            closest('.control-group').addClass('error').
            find('.help-inline').text(v.error);
      });

      return this;
    },
    doSave:function () {
      var ctx = this;
      try {
        this.model.save(null, {
          success:function () {
            ctx.close();
            window.location.href = '#/' + ctx.pluralModelName;
          }
        });
      } catch (e) {
        // TODO Fix me ... If something wrong happens, we should display a message to the user...
        console.log('error', e);
      }

      return false;
    },
    doReset:function () {
      if (!this.model.hasChanged() || confirm((this.modelName.charAt(0).toUpperCase() + this.modelName.substring(1)) + ' has unsaved changes, discard?')) {
        return true;
      } else {
        return false;
      }
    },
    doCancel:function () {
      if (!this.model.hasChanged() || confirm((this.modelName.charAt(0).toUpperCase() + this.modelName.substring(1)) + ' has unsaved changes, discard?')) {
        this.close();
        window.location.href = '#/' + this.pluralModelName;
      }
    },
    doDelete:function () {
      if (!this.model.isNew() && confirm('Really delete ?')) {
        this.model.destroy();
        this.close();
        window.location.href = '#/' + this.pluralModelName;
      }
      return false;
    },
    close:function () {
      this.remove();
      this.unbind();
      this.modelBinder.unbind(this);
    }
  });

  BackboneUtility.Views.AttachmentModelEditView = BackboneUtility.Views.ModelEditView.extend({
    initialize:function (options) {

      BackboneUtility.Views.ModelEditView.prototype.initialize.call(this, options);

      _.defaults(this.events, {
        'click .btn.delete-attachment':'doDeleteAttachment'
      });

      var ctx = this;

      // Attach drag events on the element
      var cancelDefaults = function (e) {
        e.stopPropagation();
        e.preventDefault();
      };

      this.el.addEventListener('dragover', function (e) {
        cancelDefaults(e);
        ctx.dragOver(e);
      }, false);

      this.el.addEventListener('dragleave', function (e) {
        cancelDefaults(e);
        ctx.dragLeave(e);
      }, false);

      this.el.addEventListener('drop', function (e) {
        cancelDefaults(e);
        ctx.dragDrop(e);
      }, false);

      _.bindAll(this, 'renderAttachments', 'doDeleteAttachment', 'dragOver', 'dragLeave', 'dragDrop');
      this.model.bind('change:_attachments', this.renderAttachments);

      this.dragLeave = _.debounce(this.dragLeave, 1200);

    },

    renderForm:function () {
      BackboneUtility.Views.ModelEditView.prototype.renderForm.call(this);
      this.renderAttachments();
    },

    renderAttachments:function () {
      var m = this.model;

      if (this.$('.file-attachment-handler-overlay').length === 0) {
        // Add the overlay item onto the DOM
        $(this.el).addClass('handle-file-attachments').append($('<div class="file-attachment-handler-overlay modal-backdrop"><h2>Drop it!</h2></div>'));
      }

      var attachments = m.get('_attachments');
      var attachmentViews = [];
      var attachmentViewTemplate = _.template('<p class="model-attachment-view" style="text-align: right;" data-id="<%= id %>">' +
          '<span class="pull-left">' +
          '<% if (url){ %>' +
          '<a target="blank" href="<%= url %>"><%= id %></a>' +
          '<% } else { %>' +
          '<%= id %>' +
          '<% } %>' +
          '</span>' +
          '<button type="button" class="btn btn-danger delete-attachment">Delete</button>' +
          '</p>')
      _.each(attachments, function (v, k) {
        attachmentViews.push(attachmentViewTemplate({
          id:k,
          url:v.digest ? ('/' + Backbone.couch.options.database + '/' + m.get('_id') + '/' + k) : false,
          attachment:v
        }));
      });

      if (attachmentViews.length > 0) {
        var attachmentsListContainer = this.$('.model-attachments-view');
        if (attachmentsListContainer.length === 0) {
          var attachmentsContainerTemplate = _.template('<div class="control-group attachments-control-group">' +
              '<label class="control-label">Attachments</label> ' +
              '<div class="controls"><div class="model-attachments-view"></div></div> ' +
              '</div>')();

          attachmentsListContainer = $(attachmentsContainerTemplate).
              insertBefore(this.$('form:first .form-actions')).
              find('.model-attachments-view');

        } else {
          attachmentsListContainer.empty();
        }

        attachmentsListContainer.append(attachmentViews.join(''));
      } else {
        this.$('.attachments-control-group').remove();
      }

      return this;
    },
    doDeleteAttachment:function (e) {
      var id = $(e.target).closest('.model-attachment-view').data('id');
      delete this.model.get('_attachments')[id];
      this.model.trigger('change:_attachments');
      return false;
    },

    dragOver:function (e) {
      $(this.el).addClass('drag-over');
      this.dragLeave(e);
    },
    dragLeave:function (e) {
      $(this.el).removeClass('drag-over');
    },
    dragDrop:function (e) {
      var ctx = this;
      var model = ctx.model;
      var dropTarget = $(ctx.el);
      var files = e.target.files || e.dataTransfer.files;

      dropTarget.removeClass('drag-over');

      _.each(files, function (file) {
        var reader = new FileReader();

        reader.onloadend = function () {
          var attachments = {};

          var data = Utility.File.getBase64FromDataURL(reader.result);
          var attachments = model.get('_attachments');
          if (!attachments) {
            model.set({_attachments:{}});
            attachments = model.get('_attachments');
          }

          attachments[file.name] = {
            content_type:file.type,
            data:data
          };

          model.trigger('change:_attachments');
        };

        reader.readAsDataURL(file);
      });
    }
  });

  BackboneUtility.Views.AppView = Backbone.View.extend({
    initialize: function(opts){
      this.collection = opts.collection;
      _.defaults(this, {
        className:'app-view',
        activeView:null,
        appName:null,
      });
      _.extend(this, opts);
      _.bindAll(this, 'showView');

      if (!this.appName){
        this.appName = new Date().getTime();
      }
    },
    showView: function(newView){
      if (this.activeView){
        this.activeView.close();
      }
      this.activeView = newView;
      this.$el.append(this.activeView.el);
      this.updateCssStatus();
    },
    updateCssStatus:function () {
      // Set this application as the active one
      var body = $(document.body);
      var appContainerMatch = new RegExp(/-app$/);
      var currentAppClass = this.appName + '-app';
      var bodyClasses = body.attr('class') || '';

      // Remove app classes that don't correspond to the current one
      _.each(bodyClasses.split(' '), function (klass) {
        if (appContainerMatch.test(klass) && klass !== currentAppClass) {
          body.removeClass(klass);
        }
      });
      body.addClass(currentAppClass);
      return this;
    }
  });

  /**
   * This AppView revolves around the assumption that the listview is always loaded and the editview needs to be
   * reconstructed. (TODO)
   *
   * @type {*}
   */
  BackboneUtility.Views.CrudAppView = BackboneUtility.Views.AppView.extend({

    initialize: function(opts){
      BackboneUtility.Views.AppView.prototype.initialize.apply(this, arguments);
      _.defaults(this, {
        editItemView: null,
        listView: null,
      });
      _.extend(this, opts);

      // Add the editItemView and listView
      this.$el.append(this.listView.el);
      this.$el.append(this.editItemView.el);

      this.editItemView.$el.hide();
    }

  });

  /**
   * The base scaffold router
   *
   * Requires:
   * - collection: The collection of the models being managed
   * - modelClass: The class of the model that's being managed
   * - parentContainer: The HTML element
   * @type {*}
   */
  BackboneUtility.Routers.ScaffoldRouter = Backbone.Router.extend({
    initialize: function(opts){
      _.defaults(this, {
        collection: null,
        modelClass: null,
        parentContainer: null
      });
      _.extend(this, opts);
    }
  });

  BackboneUtility.Routers.ScaffoldViewBasedRouter = BackboneUtility.Routers.ScaffoldRouter.extend({
    initialize:function (opts) {
      BackboneUtility.Routers.ScaffoldRouter.prototype.initialize.apply(this, arguments);

      _.defaults(this, {
        modelName:'',
        pluralModelName:'',
        tableControlViewClass:BackboneUtility.Views.TableControlView,
        modelEditViewClass:BackboneUtility.Views.ModelEditView,

        tableColumns:[],

        limit:20,
        page:1,

        appView:null,
      });

      _.extend(this, opts);

      // Set the routes
      this.route(this.pluralModelName, this.pluralModelName + 'List', this.listItems);
      this.route(this.pluralModelName + '/*splat', this.pluralModelName + 'ListSplat', this.listItems);
      this.route(this.pluralModelName + '/new', this.modelName + 'New', this.newItem);
      this.route(this.pluralModelName + '/:id/edit', this.modelName + 'Edit', this.editItem);

      if (!this.appView) {
        this.appView = new BackboneUtility.Views.AppView({el:this.parentContainer});
        this.appView.render();
      }
    },

    listItems:function (query) {

      var ctx = this;
      var shouldAddToCollection = false;

      // Parse the query parameters, such as page and limit options
      if (query) {
        var queries = query.split('/');
        _.each(queries, function (q) {
          var matches = q.match(/^(p|l)([0-9]+)$/);
          if (matches) {
            switch (matches[1]) {
              case 'p':
                var newPage = parseInt(matches[2]);
                if (newPage > ctx.page) {
                  shouldAddToCollection = true;
                }
                ctx.page = newPage;
                break;
              case 'l':
                ctx.limit = parseInt(matches[2]);
                break;
            }
          }
        });
      }

      var listView = new this.tableControlViewClass({
        collection:this.collection,
        modelName:this.modelName,
        pluralModelName:this.pluralModelName,
        columns:this.tableColumns
      });

      // Prepare the fetch options for the collection
      var fetchOpts = {
        limit:ctx.limit || 20,
        add:shouldAddToCollection,
        success:function (coll, results) {
          ctx.collection.trigger('pagechanged', {
            page:ctx.page,
            limit:fetchOpts.limit
            /*totalRows:response.total_rows,
            offset:response.offset*/
          });
        }
      };
      if (this.page) {
        fetchOpts.skip = (this.page - 1) * fetchOpts.limit;
      }

      this.collection.fetch(fetchOpts);
      listView.render();
      this.appView.showView(listView);
    },
    newItem:function () {
      var model = null;
      this.collection.each(function (item) {
        if (item.isNew()) {
          model = item;
        }
      });

      // Create a model if we didn't find a new one already in the list
      if (!model) {
        model = new this.modelClass();
      }

      var newItemView = new this.modelEditViewClass({
        model:model,
        modelName:this.modelName,
        pluralModelName:this.pluralModelName
      });
      newItemView.render();

      this.appView.showView(newItemView);
    },
    editItem:function (id) {
      var ctx = this;
      var model = this.collection.get(id);

      var renderEditItem = function () {
        var editItemView = new ctx.modelEditViewClass({
          model:model,
          modelName:ctx.modelName,
          pluralModelName:ctx.pluralModelName
        });
        editItemView.render();
        ctx.appView.showView(editItemView);
      };

      // Fetch from the server if this model is not yet in the collection
      if (!model) {
        model = new this.modelClass({'_id':id});
        model.fetch({
          success:function () {
            renderEditItem();
          },
          error:function () {
            // TODO Flash an error message here, saying it doesnt exist, or render a 404 view
            ctx.navigate("#/" + ctx.pluralModelName);
          }
        });
      } else {
        renderEditItem();
      }
    }

  });

  /**
   *
   *
   */
  BackboneUtility.Routers.RESTishRouter = Backbone.Router.extend({

    possibleStateClasses:[],
    routes:{},
    collection:null,

    newItemView:null,
    editItemView:null,
    listView:null,

    parentContainerSelector:null,
    newItemContainer:null,
    editItemContainer:null,
    listItemsContainer:null,

    modelName:'',
    pluralModelName:'',
    modelClass:null,
    tableControlView:BackboneUtility.Views.TableControlView,
    modelEditView:BackboneUtility.Views.ModelEditView,

    tableColumns: [],

    limit:20,
    page:1,

    initialize:function (options) {

      _.extend(this, options);
      var parentEl = this.getParentElement();
      _.defaults(this, {
        editItemContainer:$('<div class="state edit-state edit-' + this.modelName + '-container"></div>').appendTo(parentEl),
        newItemContainer:$('<div class="state new-state new-' + this.modelName + '-container"></div>').appendTo(parentEl),
        listItemsContainer:$('<div class="state list-state list-' + this.pluralModelName + '-container"></div>').appendTo(parentEl)
      });

      this.possibleStateClasses.push('list-state',
              'edit-state',
              'new-state');

      this.route(this.pluralModelName, this.pluralModelName + 'List', this.listItems);
      this.route(this.pluralModelName + '/*splat', this.pluralModelName + 'ListSplat', this.listItems);
      this.route(this.pluralModelName + '/new', this.modelName + 'New', this.newItem);
      this.route(this.pluralModelName + '/:id/edit', this.modelName + 'Edit', this.editItem);

      var schema = this.modelClass.prototype.schema;

      // Prep the columns for the table control view
      if (this.tableColumns.length === 0 && schema){
        // Generate the three first from the model's schema
        for(var key in schema.properties){
          // Ignore id, rev and type keys
          if (key !== '_id' && key !== 'type' && key !== '_rev'){
            this.tableColumns.push({name: Utility.String.capitalize(key), value: key});
          }
          if (this.tableColumns.length == 3){
            break;
          }
        }
      }

    },
    switchToStateClass:function (el, newClass) {
      // Set this application as the active one
      var body = $(document.body);
      var appContainerMatch = new RegExp(/-app$/);
      var currentAppClass = this.modelName + '-app';
      var bodyClasses = body.attr('class') || '';
      _.each(bodyClasses.split(' '), function(klass){
        if (appContainerMatch.test(klass) && klass !== currentAppClass){
          body.removeClass(klass);
        }
      });
      body.addClass(currentAppClass);

      $(el).removeClass(this.possibleStateClasses.join(' ')).addClass(newClass);
      return this;
    },
    getParentElement:function () {
      return $(this.parentContainerSelector);
    },
    listItems:function (query) {

      var ctx = this;
      var shouldAddToCollection = false;
      if (query) {
        var queries = query.split('/');
        _.each(queries, function (q) {
          var matches = q.match(/^(p|l)([0-9]+)$/);
          if (matches) {
            switch (matches[1]) {
              case 'p':
                var newPage = parseInt(matches[2]);
                if (newPage > ctx.page) {
                  shouldAddToCollection = true;
                }
                ctx.page = newPage;
                break;
              case 'l':
                ctx.limit = parseInt(matches[2]);
                break;
            }
          }
        });
      }

      var fetchOpts = {
        limit:ctx.limit || 20,
        add:shouldAddToCollection,
        success:function () {
          ctx.listView.updateTableInfo({
            page:ctx.page,
            limit:fetchOpts.limit
          });
        }
      };
      if (this.page) {
        fetchOpts.skip = (this.page - 1) * fetchOpts.limit;
      }

      this.collection.fetch(fetchOpts);

      var parent = this.getParentElement();
      this.switchToStateClass(parent, 'list-state');

      if (!this.listView) {
        this.listView = new this.tableControlView({
          collection:this.collection,
          modelName: this.modelName,
          pluralModelName: this.pluralModelName,
          columns: this.tableColumns
        }).render();

        $(this.listItemsContainer, parent).append(this.listView.el);
      }
    },
    newItem:function () {
      var parent = this.getParentElement();
      var model = null;
      this.collection.each(function (item) {
        if (item.isNew()) {
          model = item;
        }
      });

      if (!model) {
        model = new this.modelClass();
      }

      if (this.editItemView){
        this.editItemView.close();
        this.editItemView = null;
      }

      if (!this.newItemView){
        this.newItemView = new this.modelEditView({
          model:model,
          modelName:this.modelName,
          pluralModelName:this.pluralModelName
        }).render();

        $(this.newItemContainer, parent).append(this.newItemView.el);
      }

      this.switchToStateClass(parent, 'new-state');
    },
    editItem:function (id) {
      var ctx = this;
      var parent = this.getParentElement();
      var model = this.collection.get(id);

      var renderEditItem = function () {
        ctx.editItemView = new ctx.modelEditView({
          model:model,
          modelName:ctx.modelName,
          pluralModelName:ctx.pluralModelName
        }).render();

        $(ctx.editItemContainer, parent).append(ctx.editItemView.el);
      };

      if (this.editItemView) {
        this.editItemView.close();
        this.editItemView = null;
      }

      // Fetch from the server if this model is not yet in the collection
      if (!model) {
        model = new this.modelClass({'_id':id});
        model.fetch({
          success:function () {
            renderEditItem();
          },
          error:function () {
            ctx.navigate("#/" + ctx.pluralModelName);
          }
        });
      } else {
        renderEditItem();
      }

      this.switchToStateClass(parent, 'edit-state');
    }
  });

  return BackboneUtility;

});