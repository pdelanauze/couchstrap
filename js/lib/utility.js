define(['jquery', 'underscore'], function ($, _) {


  var Utility = {
    DOM:{},
    String:{},
    Templates:{},
    File:{},
    Image:{}
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
      '<tr>' +
      '<td colspan="<%= columns.length + 1%>"><a style="display: none;" class="btn btn-large show-less" href="<%= showLess.href || \"#\"%>"><%= showLess.label || "Show less" %></a></td>' +
      '</tr>' +
      '</thead>' +
      '<tbody></tbody>' +
      '<tfoot><tr>' +
      '<td colspan="<%= columns.length + 1%>"><a style="display: none;" class="btn btn-large show-more" href="<%= showMore.href || \"#\"%>"><%= showMore.label || "Show more" %></a></td>' +
      '</tr></tfoot>';

  Utility.Templates.FORM_STRUCTURE = '<form action="<%= action %>" method="<%= method %>" class="<%= formClass %>"><fieldset>' +
      '<% if(legend){ %>' +
      '<legend><%= legend %></legend>' +
      '<% } %>' +
      '<% _.each(fields, function(field){ %>' +
      '<% if(field.type != "hidden"){ %>' +
      '<div class="control-group <%= field.outerClass %>">' +
      '<label class="control-label" for="<%= field.idPrefix %>-<%= recordId %>-<%= field.name%>"><%= field.humanName %></label>' +
      '<div class="controls <%= field.inputOuterClass %>">' +

      '<% if(field.type == "textarea") { %>' +
      '<textarea class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" rows="<%= field.rows %>" name="<%= field.name %>" <% if(field.disabled){ %>disabled="disabled" <% } %>><%= field.value %></textarea>' +
      '<% } else if (field.type == "select" || field.type == "select-multiple"){ %>' +
      '<select class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" name="<%= field.name %>" <%= (field.type == \'select-multiple\') ? \'multiple="multiple"\' : \'\'%>> ' +
      '<% _.each(field.options, function(option){ %>' +
      '<% if (option.optgroup){ %>' +
      '<optgroup label="<%= option.label %>">' +
      '<% _.each(option.options, function(subOption){ %>' +
      '<option value="<%= subOption.value %>" <%= (subOption.value == field.value || (_.isArray(field.value) && _.include(field.value, subOption.value))) ? \'selected="selected" \' : \'\' %>><%= subOption.label %></option> ' +
      '<% }); %>' +
      '</optgroup>' +
      '<% } else { %>' +
      '<option value="<%= option.value %>" <%= (option.value == field.value || (_.isArray(field.value) && _.include(field.value, option.value))) ? \'selected="selected" \' : \'\' %>><%= option.label %></option> ' +
      '<% } %>' +
      '<% }); %>' +
      '</select>' +
      '<% } else if (field.type == "checkbox"){ %>' +
      '<input class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" checked="<%= (field.value ? \'checked\' : \'\') %>" name="<%= field.name %>" type="<%= field.type %>" <% if(field.disabled){ %>disabled="disabled" <% } %> /> ' +
      '<% } else { %>' +
      '<input class="<%= field.inputClass %>" id="<%= field.idPrefix %>-<%= recordId %>-<%= field.name %>" value="<%= field.value %>" name="<%= field.name %>" size="<%= field.size %>" type="<%= field.type %>" <% if(field.disabled){ %>disabled="disabled" <% } %> <% if (field.max) { %> max="<%= field.max %>" <% } %> <% if (field.min) { %> min="<%= field.min %>" <% } %> <% if (field.step) { %> step="<%= field.step %>" <% } %> /> ' +
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

    _.defaults(structureData, {
      showMore:false,
      showLess:false,
      columns:[]
    });

    return _.template(template, structureData);

  };

  /**
   * Renders a standard form layout given the form structure provided.
   *
   * The field's type can be one of:
   * - hidden
   * - text
   * - textarea
   * - checkbox
   * - select
   * - select-multiple (alpha support)
   * - number
   * - range
   * - email
   * - search
   * - tel
   * - time
   * - url
   * - date
   * - datetime (|| date-time)
   * - datetime-local
   * - time
   * - month
   * - week
   *
   * Here is an example of a valid form structure:
   * var formStructure = {
          action: '#/products/new',
          method: 'POST',
          recordId: this.model.get('_id'),
          class: 'form-horizontal',
          fields: [
            {
              idPrefix: 'field-type',
              name: 'id',
              humanName: 'Id',
              outerClass: '',
              inputOuterClass: '',
              value: this.model.get('_id'),
              type: 'hidden'
            },
            {
              name: 'name',
              humanName: 'Name',
              value: this.model.get('name'),
              type: 'text'
            },
           {
             name: 'enabled',
             humanName: 'Enabled ?',
             value: this.model.get('enabled'),
             type: 'checkbox'
           },
           {
             name: 'quantity',
             humanName: 'Quantity',
             value: this.model.get('quantity'),
             type: 'number',
             min: 1,
             max: 10,
             step: 1
           },
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
    var now = new Date().getTime();
    _.defaults(formStructure, {
      action:'',
      formClass:'form-horizontal',
      method:'POST',
      recordId:now,
      legend:false,
      fields:[],
      buttons:[],
      idPrefix:now
    });

    _.each(formStructure.fields, function (field) {
      _.defaults(field, {
        idPrefix:'field-' + formStructure.idPrefix,
        outerClass:'',
        name:'',
        humanName:'',
        inputOuterClass:'',
        value:'',
        inputClass:'',
        type:'text',
        size:''
      });

      if (field.type == 'text' && !field.size) {
        field.size = 30;
      } else if (field.type == 'select' || field.type == 'select-multiple') {
        _.defaults(field, {
          options:[]
        });
      } else if (field.type.match(/^date.*/) || field.type == 'month' || field.type == 'week' || field.type == 'time') {
        _.defaults(field, {
          min:0,
          max:0
        });
      } else if (field.type == 'number' || field.type == 'range') {
        _.defaults(field, {
          min:0,
          max:0,
          step:0
        });
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

      if (key == 'id' || key == '_id') {
        type = 'hidden';
      } else if (_.isBoolean(value)) {
        type = 'checkbox';
      } else if (_.isString(value) || !value) {
        type = 'text';
      } else if (_.isDate(value)) {
        type = 'datetime';
      } else if (_.isNumber(value)) {
        type = 'number';
      }

      if (type) {
        formStructure.fields.push({
          idPrefix:options.humanName,
          name:key,
          humanName:(key.charAt(0).toUpperCase() + key.substring(1).replace(/_/g, ' ')),
          outerClass:'',
          inputOuterClass:'',
          inputClass:'input-xlarge',
          value:value,
          type:type,
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

  Utility.Templates.buildFormStructureFromSchema = function (jsonModel, schema, formStructure, options) {
    var recordId = jsonModel._id || jsonModel.id;

    if (!options) {
      options = {};
    }
    var humanName = options.humanName || Utility.String.uncapitalize(schema.name) || 'document';
    _.defaults(options, {
      humanName: humanName,
      capitalHumanName: Utility.String.capitalize(humanName)
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

    var processProperty = function(key, prop, value) {
      var type = false;

      switch (prop.format) {
        case 'email':
          type = 'email';
          break;
        case 'phone':
          type = 'tel';
          break;
        case 'uri':
          type = 'uri';
          break;
        case 'date-time':
          type = 'datetime';
          break;
        case 'date':
          type = 'date';
          break;
        case 'time':
          type = 'time';
          break;
        case 'ip-address':
          type = 'uri';
          break;
        case 'ipv6':
          type = 'uri';
          break;
        case 'host-name':
          type = 'uri';
          break;
      }

      if (!type) {
        if (prop.type === 'string') {
          if (prop.maxLength > 150) {
            type = 'textarea';
          } else {
            type = 'text';
          }
        } else if (prop.type === 'number' || prop.type === 'integer') {
          type = 'number';
        } else if (prop.type === 'boolean') {
          type = 'checkbox';
        }
      }

      var min = prop.minimum || prop.minLength;
      var max = prop.maximum || prop.maxLength;
      if (typeof min === 'number' && prop.exclusiveMinimum) {
        min++;
      }
      if (typeof max === 'number' && prop.exclusiveMaximum) {
        max--;
      }

      if (type) {
        formStructure.fields.push({
          idPrefix:options.humanName,
          name:key,
          humanName:(key.charAt(0).toUpperCase() + key.substring(1).replace(/_/g, ' ')),
          outerClass:'',
          inputOuterClass:'',
          inputClass:'input-xlarge',
          value:value,
          type:type,
          min:min,
          max:max
        });
      } else {
        console.log('buildFormStructureFromSchema: does not know how to handle type of "' + key + '" of schema:', schema);
      }
    }

    for(var key in schema.properties) {
      var prop = schema.properties[key];
      var value = jsonModel[key];
      processProperty(key, prop, value);
    }

    for(var key in schema.additionalProperties){
      var prop = schema.additionalProperties[key];
      var value = jsonModel[key];
      processProperty(key, prop, value);
    }

    // Now add some buttons
    if (formStructure.buttons.length == 0) {
      formStructure.buttons.push({'class':'btn-primary', type:'submit', humanName:'Submit'});
      formStructure.buttons.push({type:'reset', humanName:'Reset'});
    }

    return formStructure;

  }

  Utility.File.getBase64FromDataURL = function (dataUrl) {
    return dataUrl.match(/base64,(.*)$/)[1];
  };

  Utility.String.capitalize = function(str){
    return str.charAt(0).toUpperCase() + str.substring(1);
  };

  Utility.String.uncapitalize = function(str){
    return str.charAt(0).toLowerCase() + str.substring(1);
  }

  return Utility;
});