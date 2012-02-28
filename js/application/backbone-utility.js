define(['jquery', 'underscore', 'backbone', 'modelbinding', 'application/utility'], function ($, _, Backbone, ModelBinding, Utility) {

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
    initialize:function (options) {

      _.extend(this, options);
      _.bindAll(this, 'render', 'doDelete');

      _.defaults(this.events, {
        'submit form[method="DELETE"]':'doDelete'
      });
      this.delegateEvents();

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

      $(this.el).addClass(this.modelName + '-table-item-view').html(this.template(this.model.toJSON()));
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

  /**
   * Represents the actual table element used to represent a collection's contents.
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
    events:{},
    handleFileAttachments:true,
    initialize:function (options) {

      _.extend(this, options);
      $(this.el).addClass(this.modelName + '-model-edit-view');

      _.defaults(this.events, {
        'submit form':'doSave',
        'reset form':'doReset',
        'click .btn.cancel':'doCancel',
        'click .btn.delete':'doDelete',
        'click .btn.delete-attachment':'doDeleteAttachment'
      });

      var ctx = this;

      if (this.handleFileAttachments) {
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
      }

      _.bindAll(this, 'render', 'renderForm', 'renderAttachments',
              'doSave', 'doReset', 'doCancel', 'close', 'updateValidations',
              'hasChanged', 'doDelete', 'doDeleteAttachment',
              'dragOver', 'dragLeave', 'dragDrop');

      this.model.bind('remove', this.close);
      this.model.bind('error', this.updateValidations);
      this.model.bind('change:_attachments', this.renderAttachments);

      this.dragLeave = _.debounce(this.dragLeave, 1200);

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
          Utility.Templates.buildFormStructureFromModel(this.model.toJSON(), this.formStructure, {
            humanName:this.modelName
          });
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

      if (this.handleFileAttachments) {
        this.renderAttachments();
      }

      ModelBinding.bind(this);
    },
    renderAttachments:function () {
      var m = this.model;

      if (this.$('.file-attachment-handler-overlay').length === 0) {
        // Add the overlay item onto the DOM
        $(this.el).addClass('handle-file-attachments').append($('<div class="file-attachment-handler-overlay modal-backdrop"><h2>Drop me!</h2></div>'));
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
          url:v.digest ? ('/' + Backbone.couch_connector.config.db_name + '/' + m.get('_id') + '/' + k) : false,
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
    render:function () {
      return this;
    },
    hasChanged:function () {
      this.updateValidations(this.model, this.model.validate ? this.model.validate() : {});
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
    doDeleteAttachment:function (e) {
      var id = $(e.target).closest('.model-attachment-view').data('id');
      delete this.model.get('_attachments')[id];
      this.model.trigger('change:_attachments');
      return false;
    },
    close:function () {
      this.remove();
      this.unbind();
      ModelBinding.unbind(this);
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