define(['jquery', 'underscore', 'backbone', 'modelbinder', 'lib/utility', 'lib/backbone-utility'], function ($, _, Backbone, BackboneModelBinder, Utility, BackboneUtility) {

  var BackboneCouchUtility = {
    Views: {}
  };

  BackboneCouchUtility.Views.AttachmentModelEditView = BackboneUtility.Views.ModelEditView.extend({
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

  return BackboneCouchUtility;
});