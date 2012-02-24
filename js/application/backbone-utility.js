define(['jquery', 'underscore', 'backbone', 'modelbinding', 'application/utility'], function ($, _, Backbone, ModelBinding, Utility) {

  var BackboneUtility = {
    Views:{},
    Routers:{}
  };

  BackboneUtility.Views.TableItemView = Backbone.View.extend({
    className:'table-item-view',
    tagName:'tr',
    modelName:'',
    pluralModelName:'',
    template:null,
    columns:[],
    events:{
      'submit form[method="DELETE"]':'doDelete'
    },
    initialize:function (options) {

      _.extend(this, options);
      this.className += ' ' + this.modelName + '-table-item-view';

      _.bindAll(this, 'render', 'doDelete');
      this.model.bind('remove', this.remove);

      // Create the template
      if (!this.template) {
        var json = this.model.toJSON();
        var template = '';
        _.each(this.columns, function (column) {
          template += '<td class="' + column.value + '" data-bind="' + (column.type || 'text') + ' ' + column.value + '"></td>';
        });
        template += '<td class="table-cell-actions">' +
                '<a class="btn btn-small btn-primary edit" href="#/' + this.pluralModelName + '/edit">Edit</a>' +
                '<form action="#/' + this.pluralModelName + '" method="DELETE"><button type="submit" class="btn btn-small btn-danger delete">Delete</button></form> ' +
                '</td>';

        this.template = _.template(template);
      }

      $(this.el).html(this.template(this.model.toJSON()));
      this.render();

      ModelBinding.bind(this);
    },
    render:function () {
      this.$('a.edit').attr('href', '#/' + this.pluralModelName + '/' + this.model.get('_id') + '/edit');
      this.$('.btn.delete').closest('form').attr('action', '#/' + this.pluralModelName + '/' + this.model.get('_id'));
      return this;
    },
    doDelete:function () {
      if (confirm('Are you sure ?')) {
        this.model.destroy();
        this.close();
      }
      return false;
    },
    close:function () {
      this.remove();
      this.unbind();
      ModelBinding.unbind(this);
    }
  });


  BackboneUtility.Views.TableView = Backbone.View.extend({
    className:'table table-striped vertical-middle ',
    tagName:'table',
    modelName:'',
    pluralModelName:'',
    columns:[],
    itemView:BackboneUtility.Views.TableItemView,
    events:{

    },
    initialize:function (options) {

      _.extend(this, options);
      this.className += ' ' + this.modelName + '-table-view';

      _.bindAll(this, 'render', 'itemAdded');
      this.collection.bind('add', this.itemAdded);
      this.collection.bind('reset', this.render);

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
        className:this.className,
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
      this.className += ' ' + this.modelName + '-table-control-view';

      if (!this.template) {
        this.template = _.template('<div class="pull-right control top">' +
                '<a href="#/' + this.pluralModelName + '/new" class="btn btn-primary">New ' + this.modelName + '</a>' +
                '</div>' +
                '<div class="table-container"></div>');
      }

      if (!this.tableViewInstance) {
        this.tableViewInstance = new this.tableView(_.extend(options, {
          columns:this.columns,
          modelName:this.modelName,
          pluralModelName:this.pluralModelName
        }));
      }

      _.bindAll(this, 'render');
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

      if (options.limit && this.collection.length < options.limit) {
        hasMore = true;
      } else if (options.limit && options.page > 1 && this.collection.length < (options.limit * options.page)) {
        hasItemsNotShown = true;
      }

      var href = '#/' + this.pluralModelName + '/p' + (options.page ? options.page + 1 : 2);
      if (options.limit) {
        href = href.concat('/l' + options.limit);
      }

      this.$('.btn.show-more').attr('href', href);

      if (hasMore) {
        this.$('.btn.show-more').hide();
      } else {
        this.$('.btn.show-more').show();
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
    }
  });

  BackboneUtility.Views.ModelEditView = Backbone.View.extend({
    className:'model-edit-view',
    modelName:'',
    pluralModelName:'',
    formStructure:{},
    events:{
      'submit form':'doSave',
      'reset form':'doReset',
      'click .btn.cancel':'doCancel'
    },
    initialize:function (options) {

      _.extend(this, options);
      this.className += ' ' + this.modelName + '-model-edit-view';

      var ctx = this;
      _.bindAll(this, 'render', 'doSave', 'doReset', 'doCancel', 'close', 'updateValidations', 'hasChanged');
      this.model.bind('remove', this.close);
      this.model.bind('error', this.updateValidations);
      this.model.bind('change', this.hasChanged);

      var data = this.model.toJSON();
      if (this.model.isNew()) {
        data.id = 'new';
      }

      _.defaults(this.formStructure, {
        action:'#/' + this.pluralModelName + '/new',
        method:'POST',
        recordId:this.model.get('id'),
        legend:'Edit ' + this.modelName,
        fields:[],
        buttons:[]
      });

      if (this.formStructure.fields.length == 0) {
        Utility.Templates.buildFormStructureFromModel(this.model.toJSON(), this.formStructure);
      } else {
        _.each(this.formStructure.fields, function (field) {
          _.defaults(field, {
            idPrefix:ctx.modelName
          });
        });
      }

      $(this.el).html(Utility.Templates.renderForm(this.formStructure));

      ModelBinding.bind(this);

    },
    render:function () {
      return this;
    },
    hasChanged:function () {
      return this.updateValidations(this.model, this.model.validate ? this.model.validate() : {});
    },
    updateValidations:function (model, errors) {
      var ctx = this;
      ctx.$('.control-group.error,:input.error').removeClass('error').
              find('.help-inline').text('');

      _.each(errors, function (v, k) {
        ctx.$(':input[name="' + k + '"]').addClass('error').
                closest('.control-group').addClass('error').
                find('.help-inline').text(v);

      });
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
    close:function () {
      this.remove();
      this.unbind();
      ModelBinding.unbind(this);
    }
  });


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

      this.route(this.pluralModelName, 'listItems', this.listItems);
      this.route(this.pluralModelName + '/*splat', 'listItemsSplat', this.listItems);
      this.route(this.pluralModelName + '/new', 'newItem', this.newItem);
      this.route(this.pluralModelName + '/:id/edit', 'editItem', this.editItem);

    },
    switchToStateClass:function (el, newClass) {
      $(el).removeClass(this.possibleStateClasses.join(' ')).addClass(newClass);
      return this;
    },
    getParentElement:function () {
      return $(this.parentContainerSelector);
    },
    listItems:function (query) {

      var ctx = this;
      var shouldAddToCollection = true;
      if (query) {
        var queries = query.split('/');
        _.each(queries, function (q) {
          var matches = q.match(/^(p|l)([0-9]+)$/);
          if (matches) {
            switch (matches[1]) {
              case 'p':
                var newPage = parseInt(matches[2]);
                if (newPage < ctx.page) {
                  shouldAddToCollection = false;
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
          collection:this.collection
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

      this.switchToStateClass(parent, 'new-state');
      this.newItemView = new this.modelEditView({
        model:model,
        modelName:this.modelName,
        pluralModelName:this.pluralModelName
      }).render();

      $(this.newItemContainer, parent).append(this.newItemView.el);
    },
    editItem:function (id) {
      var ctx = this;
      var parent = this.getParentElement();
      var model = this.collection.get(id);

      if (this.editItemView) {
        this.editItemView.close();
        this.editItemView = null;
      }

      // Fetch from the server if this model is not yet in the collection
      if (!model) {
        model = new this.modelClass({'_id':id});
        model.fetch({
          error:function () {
            ctx.navigate("#/" + ctx.pluralModelName);
          }
        });
      }

      this.switchToStateClass(parent, 'edit-state');
      this.editItemView = new this.modelEditView({
        model:model,
        modelName:this.modelName,
        pluralModelName:this.pluralModelName
      }).render();

      $(this.editItemContainer, parent).append(this.editItemView.el);
    }
  });

  return BackboneUtility;

});