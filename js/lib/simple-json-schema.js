/**
 * Simple JSON schema validator.
 * Version 0.1
 * Based on http://tools.ietf.org/id/draft-zyp-json-schema-03.html, current support limited to properties and additional
 * properties, only core features, array / object are not really supported.
 *
 * User: pat
 * Date: 12-05-12
 * Time: 9:33 PM
 */
define(function () {


  var sjs = {

    messages:{
      invalidNumber:' is not a number',
      mustBeGreaterThan:' must be greater than',
      mustBeSmallerThan:' must be smaller than',
      mustBeGreaterOrEqualTo:' must be greater or equal to',
      mustBeSmallerOrEqualTo:' must be smaller or equal to',
      mustBeAtLeast:' must be at least ${number} characters',
      mustBeAtMost:' cannot be more than ${number} characters',
      invalidString:' is not a valid string',
      invalidInteger:' is not a valid integer',
      invalidBoolean:' is not a valid boolean',
      invalidObject:' is not a valid object',
      invalidArray:' is not a valid array',
      mustBeNull:' must be null',
      isRequired:' cannot be empty',
      doesNotMatchProvidedRegex:' does not match the format specified by regular expression',
      doesNotMatchProvidedPattern:' does not match the pattern',
      mustBeOneOf:' value must be one of: ${choices}',
      invalidDateTime:' must be in the format YYYY-MM-DDThh:mm:ssZ',
      invalidDate:' must be in the format YYYY-MM-DD',
      invalidTime:' must be in the format hh:mm:ss',
      invalidPhoneNumber:' is not a valid phone number',
      invalidEmail:' is not a valid e-mail address',
      invalidIpAddress:' is not a valid IP address',
      invalidIpv6Address:' is not a valid IPv6 address'
    },
    regex:{
      number:/^-?[0-9]*(,.[0-9]+)?$/,
      string:/.*/,
      integer:/^-?[0-9]+$/,
      email:/^\S+@\S+\.\S+$/,
      'date-time':/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2,3})$/,
      date:/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/,
      time:/^([0-9]{2}):([0-9]{2}):([0-9]{2,3})$/,
      'utc-millisec':/^[0-9]+$/,
      'ip-address':/^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/,
      ipv6:/^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/,
      phone:/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
    },
    validators:{
      number:function (value, prop) {
        if (typeof value === 'number') {

          if (typeof prop.minimum !== 'undefined' && prop.exclusiveMinimum && value <= prop.minimum) {
            return sjs.messages.mustBeGreaterThan;
          } else if (typeof prop.minimum !== 'undefined' && value < prop.minimum) {
            return sjs.messages.mustBeGreaterOrEqualTo;
          } else if (typeof prop.maximum !== 'undefined' && prop.exlusiveMaximum && value >= prop.maximum) {
            return sjs.messages.mustBeSmallerThan;
          } else if (typeof prop.maximum !== 'undefined' && value > prop.maximum) {
            return sjs.messages.mustBeSmallerOrEqualTo;
          } else {
            return false;
          }
        } else if (sjs && sjs instanceof String && sjs.trim().length > 0 && sjs.regex.number.exec(value)) {
          return false;
        }

        return sjs.messages.invalidNumber;
      },
      string:function (value, prop) {
        if (typeof value === 'string') {
          if (prop.pattern && !new RegExp(prop.pattern).exec(value)) {
            return sjs.messages.doesNotMatchProvidedPattern + '(' + prop.pattern + ')';
          } else if (prop.minLength && value.length < prop.minLength) {
            return sjs.messages.mustBeAtLeast.replace('${number}', prop.minLength);
          } else if (prop.maxLength && value.length > prop.maxLength) {
            return sjs.messages.mustBeAtMost.replace('${number}', prop.maxLength);
          } else if (sjs.regex.string.exec(value)) {
            return false;
          }
        }

        return sjs.messages.invalidString;
      },
      integer:function (value, prop) {
        if (typeof value === 'number') {
          if (typeof prop.minimum !== 'undefined' && prop.exclusiveMinimum && value <= prop.minimum) {
            return sjs.messages.mustBeGreaterThan;
          } else if (typeof prop.minimum !== 'undefined' && value < prop.minimum) {
            return sjs.messages.mustBeGreaterOrEqualTo;
          } else if (typeof prop.maximum !== 'undefined' && prop.exlusiveMaximum && value >= prop.maximum) {
            return sjs.messages.mustBeSmallerThan;
          } else if (typeof prop.maximum !== 'undefined' && value > prop.maximum) {
            return sjs.messages.mustBeSmallerOrEqualTo;
          } else {
            return false;
          }
        }

        return sjs.messages.invalidInteger;
      },
      'boolean':function (value, prop) {
        if (typeof value === 'boolean') {
          return false;
        } else if (value === 'true' || value === 'false'
            || value === 0 || value === 1
            || value === 't' || value === 'f') {
          return false;
        }

        return sjs.messages.invalidBoolean;
      },
      'date-time':function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex['date-time'].exec(value)) {
          return sjs.messages.invalidDateTime;
        }
        return false;
      },
      date:function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex.date.exec(value)) {
          return sjs.messages.invalidDate;
        }
        return false;
      },
      time:function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex.time.exec(value)) {
          return sjs.messages.invalidTime;
        }
        return false;
      },
      phone:function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex.phone.exec(value)) {
          return sjs.messages.invalidPhoneNumber;
        }
        return false;
      },
      email:function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex.email.exec(value)) {
          return sjs.messages.invalidEmail;
        }
        return false;
      },
      'ip-address':function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex['ip-address'].exec(value)) {
          return sjs.messages.invalidIpAddress;
        }
        return false;
      },
      ipv6:function (value, prop) {
        if (typeof value === 'string' && value.trim().length > 0 && !sjs.regex.ipv6.exec(value)) {
          return sjs.messages.invalidIpv6Address;
        }
        return false;
      },
      object:function (value) {
        if (typeof value === 'object') {
          return false;
        }
        return sjs.messages.invalidObject;
      },
      array:function (value) {
        if (Object.prototype.toString.call(value) === '[object Array]') {
          return false;
        }
        return sjs.messages.invalidArray;
      },
      'null':function (value) {
        if (value === null) {
          return false;
        }
        return sjs.messages.mustBeNull;
      },
      any:function (value) {
        return false;
      }
    },
    validate:function (instance, schema, partial) {

      var errors = [];

      var appendIfErrors = function (propErrors) {
        if (propErrors) {
          errors = errors.concat(propErrors);
        }
      };

      if (partial) {

        // Validate only the attributes received
        for (var key in instance) {
          appendIfErrors(sjs.validateProp(instance, schema, key, schema.additionalProperties && schema.additionalProperties[key]));
        }

      } else {
        // Validate all the schema's properties
        for (var key in schema.properties) {
          appendIfErrors(sjs.validateProp(instance, schema, key));
        }
        for (var key in schema.additionalProperties) {
          appendIfErrors(sjs.validateProp(instance, schema, key, true));
        }
      }

      return {
        isValid:errors.length == 0,
        errors:errors
      };
    },
    validateProp:function (instance, schema, key, isAdditional) {

      var value = instance[key];
      var prop;
      var errors = [];
      if (!isAdditional) {
        prop = schema.properties[key];
      } else {
        prop = schema.additionalProperties[key];
      }

      if (!prop) {
        return;
      }

      if (prop.required && (typeof value === 'undefined' || (typeof value === 'string' && value.trim().length === 0))) {
        errors.push({property:key, error:sjs.messages.isRequired});
      } else {
        // Run the format validator if any
        var errorString = false;
        if (sjs.validators[prop.format]) {
          // We have a validator for this format, run it
          errorString = sjs.validators[prop.format](value, prop);
        } else if (!errorString && sjs.validators[prop.type]) {
          errorString = sjs.validators[prop.type](value, prop);
        } else if (!errorString && prop['enum']) {

          if (prop.enum.indexOf(value) === -1) {
            errorString = sjs.messages.mustBeOneOf.replace('${choices}', prop.enum.join(', '));
          }
        } else if (!errorString && prop.regex) {
          // Run the custom regex
          if (!new RegExp(prop.regex).exec(value)) {
            errorString = sjs.messages.doesNotMatchProvidedRegex + ' (' + prop.regex + ')';
          }
        }

        if (errorString) {
          errors.push({property:key, error:errorString});
        }
      }

      if (errors.length > 0) {
        return errors;
      }

    }
  };

  return sjs;
});