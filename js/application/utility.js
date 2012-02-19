define(['jquery', 'underscore'], function ($, _) {


  var Utility = {
    DOM:{},
    String:{},
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

  Utility.Templates.FORM_STRUCTURE = '<form action="<%= action %>" method="<%= method %>" class="<%= formClass %>"><fieldset>' +
          '<% if(legend){ %>' +
          '<legend><%= legend %></legend>' +
          '<% } %>' +
          '<% _.each(fields, function(field){ %>' +
          '<% if(field.type != "hidden"){ %>' +
          '<div class="control-group <%= field.outerClass %>">' +
          '<label class="control-label" for="<%= field.idPrefix %>-<%= recordId %>-<%= field.name%>"><%= field.humanName %></label>' +
          '<div class="controls <%= field.inputOuterClass %>">' +

          '<% if(field.type == "text") { %>' +
          '<input class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" value="<%= field.value %>" name="<%= field.name %>" size="<%= field.size %>" type="<%= field.type %>"/> ' +
          '<% } else if (field.type == "textarea") { %>' +
          '<textarea class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" rows="<%= field.rows %>" name="<%= field.name %>"><%= field.value %></textarea>' +
          '<% } %>' +

          '<span class="help-inline"></span>' +

          '</div>' +
          '</div>' +
          '<% } else { %>' +
          '<input class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" value="<%= field.value %>" name="<%= field.name %>" size="<%= field.size %>" type="<%= field.type %>" /> ' +
          '<% } %>' + // End the if type=='hidden'
          '<% }); %>' +

          '<div class="form-actions">' +
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

    if (!template) {
      template = Utility.Templates.TABLE_STRUCTURE;
    }

    return _.template(template, structureData);

  };

  /**
   * Renders a standard form layout given the form structure provided.
   *
   * The field's type can be one of:
   * - hidden
   * - text
   * - textarea
   *
   * Here is an example of a valid form structure:
   * var formStructure = {
   action: '#/prescriptions/new',
   method: 'POST',
   recordId: this.model.get('id'),
   class: 'form-horizontal',
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
   {'class': 'btn-primary', type: 'submit', humanName: 'Submit'},
   {type: 'reset', humanName: 'Reset'}
   ]
   };
   *
   * @param formStructure
   * @param template
   */
  Utility.Templates.renderForm = function (formStructure, template) {

    if (!template) {
      template = Utility.Templates.FORM_STRUCTURE;
    }

    // Prep the defaults for the form structure
    _.defaults(formStructure, {
      action:'',
      formClass:'form-horizontal',
      method:'POST',
      recordId:new Date().getTime(),
      legend:false,
      fields:[],
      buttons:[]
    });

    _.each(formStructure.fields, function (field) {
      _.defaults(field, {
        idPrefix:'field-' + new Date().getTime(),
        outerClass:'',
        name:'',
        humanName:'',
        inputOuterClass:'',
        value:'',
        inputClass:'',
        type:'text'
      });

      if (field.type == 'text' && !field.size) {
        field.size = 30;
      } else if (field.type == 'textarea' && !field.rows) {
        field.rows = 4;
      }
    });

    _.each(formStructure.buttons, function (button) {
      _.defaults(button, {
        'class':'',
        type:'button',
        humanName:'Button'
      });
    });

    // Sort the fields according to their types so that the hidden ones are at the end
    formStructure.fields = _.sortBy(formStructure.fields, function (f) {
      return f.type == 'hidden' ? 2 : 1
    });

    return _.template(template, formStructure);

  };


  Utility.Templates.buildFormStructureFromModel = function (jsonModel, formStructure, options) {

    var recordId = jsonModel._id || jsonModel.id;

    if (!options) {
      options = {};
    }
    _.defaults(options, {
      humanName:'document',
      capitalHumanName:'Document'
    });

    if (!formStructure) {
      formStructure = {};
    }
    _.defaults(formStructure, {
      action:'#',
      method:'POST',
      recordId:recordId,
      legend:(recordId ? ('Edit ' + options.humanName + ' ' + recordId) : 'New ' + options.humanName),
      fields:[],
      buttons:[]
    });

    for (var key in jsonModel) {
      var value = jsonModel[key];
      var type = false;

      if (_.isString(value) || _.isNumber(value) || !value) {
        type = 'text';
      } else if (_.isBoolean(value)) {
        type = 'checkbox';
      } else if (_.isDate(value)) {
        type = 'datetime';
      }

      if (type) {
        formStructure.fields.push({
          idPrefix:options.humanName,
          name:key,
          humanName:(key.charAt(0).toUpperCase() + key.substring(1)),
          outerClass:'',
          inputOuterClass:'',
          inputClass:'input-xlarge',
          value:value,
          type:type
        });
      } else {
        console.log('buildFormStructureFromModel: does not know how to handle type of "' + key + '" in jsonModel:', jsonModel);
      }
    }

    // Now add some buttons
    if (formStructure.buttons.length == 0) {
      formStructure.buttons.push({'class':'btn-primary', type:'submit', humanName:'Submit'});
      formStructure.buttons.push({type:'reset', humanName:'Reset'});
    }

    return formStructure;

  };

  return Utility;
});