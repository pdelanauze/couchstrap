define(['jquery', 'underscore'], function ($, _) {


  var Utility = {
    DOM:{},
    Templates:{}
  };

  Utility.DOM.serializeObject = function (el) {
    var o = {};
    var a = $(el).serializeArray();
    $.each(a, function () {
      if (o[this.name] !== undefined) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || '');
      } else {
        o[this.name] = this.value || '';
      }
    });
    return o;
  };

  Utility.Templates.TABLE_STRUCTURE = '<thead>' +
      '<tr>' +
      '<% _.each(columns, function(c){ %>' +
      '<th class="<%= c.value %>"><%= c.name %></th>' +
      '<% }); %>' +
      '</tr>' +
      '</thead>' +
      '<tbody></tbody>';

  Utility.Templates.FORM_STRUCTURE = '<form action="<%= action %>" method="<%= method %>"><fieldset>' +
      '<% _.each(fields, function(field){ %>' +
      '<% if(field.type == "hidden"){ %>' +
      '<input class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" value="<%= field.value %>" name="<%= field.name %>" size="<%= field.size %>" type="<%= field.type %>" /> ' +
      '<% } else { %>' +
      '<div class="clearfix input-outer-container <%= field.outerClass %>">' +
      '<label for="<%= field.idPrefix %>-<%= recordId %>-<%= field.name%>"><%= field.humanName %></label>' +
      '<div class="input <%= field.inputOuterClass %>">' +

      '<% if(field.type == "text") { %>' +
      '<input class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" value="<%= field.value %>" name="<%= field.name %>" size="<%= field.size %>" type="<%= field.type %>"/> ' +
      '<% } else if (field.type == "textarea") { %>' +
      '<textarea class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" rows="<%= field.rows %>" name="<%= field.name %>"><%= field.value %></textarea>' +
      '<% } %>' +

      '<span class="help-inline"></span>' +

      '</div>' +
      '</div>' +
      '<% } %>' + // End the if type=='hidden'
      '<% }); %>'  +

      '<div class="actions">' +
      '<% _.each(buttons, function(button){ %>' +
      '<% if(button.type == "link"){ %>' +
      '<a class="btn <%= button.class %>" href="<%= button.href %>"><%= button.humanName %></a>&nbsp;' +
      '<% } else { %>' +
      '<button class="btn <%= button.class %>" type="<%= button.type %>"><%= button.humanName %></button>&nbsp;' +
      '<% }}); %>' +
      '</div>' +
      '</fieldset></form>';

  /**
   * Renders an underscore.js template with the provided structure data.
   * The default template is the Utility.Templates.TABLE_STRUCTURE.
   *
   * structureData example:
   * { columns: [{name: 'ID', value: 'id'},{name: 'Name', value: 'name'}] }
   *
   * @param structureData
   * @param template
   */
  Utility.Templates.renderTableStructure = function (structureData, template) {

    if (!template){
      template = Utility.Templates.TABLE_STRUCTURE;
    }

    return _.template(template, structureData);

  };

  /**
   * Renders a standard form layout given the form structure provided.
   *
   * Here is an example of a valid form structure:
   * var formStructure = {
       action: '#/prescriptions/new',
       method: 'POST',
       recordId: this.model.get('id'),
       fields: [
         {
           idPrefix: 'field-type',
           name: 'id',
           humanName: 'Id',
           outerClass: '',
           inputOuterClass: '',
           value: this.model.get('id'),
           type: 'hidden'
         },
         {
           name: 'name',
           humanName: 'Name',
           value: this.model.get('name'),
           type: 'text'
         }
       ],
       buttons: [
         {'class': 'primary', type: 'submit', humanName: 'Submit'},
         {type: 'reset', humanName: 'Reset'}
       ]
     };
   *
   * @param formStructure
   * @param template
   */
  Utility.Templates.renderForm = function(formStructure, template){

    if (!template){
      template = Utility.Templates.FORM_STRUCTURE;
    }

    // Prep the defaults for the form structure
    _.defaults(formStructure, {
      action: '',
      method: 'POST',
      recordId: new Date().getTime(),
      fields: [],
      buttons: []
    });

    _.each(formStructure.fields, function(field){
      _.defaults(field, {
        idPrefix: 'field-' + new Date().getTime(),
        outerClass: '',
        name: '',
        humanName: '',
        inputOuterClass: '',
        value: '',
        inputClass: '',
        type: 'text'
      });

      if (field.type == 'text' && !field.size){
        field.size = 30;
      } else if (field.type == 'textarea' && !field.rows){
        field.rows = 4;
      }
    });

    _.each(formStructure.buttons, function(button){
      _.defaults(button, {
        'class': '',
        type: 'button',
        humanName: 'Button'
      });
    });

    return _.template(template, formStructure);

  };

  return Utility;
});