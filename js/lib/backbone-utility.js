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
    initialize:function (options) {

      _.defaults(this, {
        modelName:'',
        pluralModelName:'',
        template:null,
        columns:[],
        events:{},
        bindings:false
      });

      _.extend(this, options);
      _.bindAll(this, 'render', 'doDelete', 'close');

      _.defaults(this.events, {
        'submit form[method="DELETE"]':'doDelete'
      });
      this.delegateEvents();

      this.model.on('remove', this.close, this);

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
      this.model.off(null, null, this);
      this.modelBinder.unbind();
    }
  });

  /**
   * Represents the actual table HTML element used to represent a collection's contents.
   */
  BackboneUtility.Views.TableView = Backbone.View.extend({
    className:'table table-striped vertical-middle ',
    tagName:'table',
    initialize:function (options) {

      _.defaults(this, {
        modelName:'',
        pluralModelName:'',
        columns:[],
        itemView:BackboneUtility.Views.TableItemView,
        events:{},
        children: []
      });

      _.extend(this, options);
      $(this.el).addClass(this.modelName + '-table-view');

      _.bindAll(this, 'render', 'itemAdded');
      this.collection.on('add', this.itemAdded, this);
      this.collection.on('reset', this.render, this);

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
      this.children.push(itemView);
    },

    close:function () {
      _.each(this.children, function(c){
        c.close();
      });
      this.remove();
      this.collection.off(null, null, this);
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
    initialize:function (options) {

      _.defaults(this, {
        modelName:'',
        pluralModelName:'',
        tableView:BackboneUtility.Views.TableView,
        tableViewInstance:null,
        template:null,
        columns:[]
      });

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
      this.collection.on('pagechanged', this.updateTableInfo, this);
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
        this.$('.btn.show-more').closest('tr').show();
      } else {
        this.$('.btn.show-more').closest('tr').hide();
      }

      if (hasItemsNotShown) {
        var lessHref = '#/' + this.pluralModelName + '/p' + (options.page - 1);
        this.$('.btn.show-less').attr('href', lessHref).closest('tr').show();
      } else {
        this.$('.btn.show-less').closest('tr').hide();
      }
    },
    close:function () {
      this.tableViewInstance.close();
      this.remove();
      this.unbind();
      this.collection.off(null, null, this);
    }
  });

  BackboneUtility.Views.ModelEditView = Backbone.View.extend({
    className:'model-edit-view',
    initialize:function (options) {

      _.defaults(options, {
        modelName:'',
        pluralModelName:'',
        events:{},
        formStructure: {}
      });

      _.extend(this, options);

      _.defaults(this.events, {
        'submit form':'doSave',
        'reset form':'doReset',
        'click .btn.cancel':'doCancel',
        'click .btn.delete':'doDelete',
      });

      _.bindAll(this, 'render', 'renderForm',
              'doSave', 'doReset', 'doCancel', 'close', 'modelError',
              'modelChanged', 'doDelete');

      this.$el.addClass(this.modelName + '-model-edit-view');

      this.model.on('remove', this.close, this);
      this.model.on('change', this.modelChanged, this);
      this.model.on('error', this.modelError, this);

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
        if (this.formStructure && !_.isEmpty(this.formStructure)){
          // We can use the form structure
          _.each(this.formStructure.fields, function (field) {
            this.bindings[field.name] = '[name="' + field.name + '"]';
          }, this);
        } else if (this.model.schema && this.model.schema.properties){
          // Use the schema
          _.each(this.model.schema.properties, function(prop, name){
            var selector = '[name="' + name + '"]';
            if (this.$(':input' + selector).length > 0){
              this.bindings[name] = selector;
            }
          }, this);
        }

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

        var m = ctx.model;
        var report = m.validate(m.attributes, {partialValidation: false});
        if (!report){
          m.save(null, {
            success:function () {
              ctx.close();
              window.location.href = '#/' + ctx.pluralModelName;
            }
          });
        } else {
          ctx.modelError(m, report);
        }
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
      this.model.off(null, null, this);
      this.modelBinder.unbind();
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
    },
    close: function(){
      this.remove();
      this.off();
      if (this.appView){
        this.appView.close();
      }
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

      // Add the links to the application
      var indexHref =  '#/' + this.pluralModelName;
      var navBar = $('.navbar-fixed-top ul.nav');
      if ($('[href="' + indexHref + '"]', navBar).length === 0){
        navBar.append('<li><a href="' + indexHref+ '">' + Utility.String.capitalize(this.pluralModelName) + '</a></li>');
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

  return BackboneUtility;

});