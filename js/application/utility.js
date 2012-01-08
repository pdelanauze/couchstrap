define(['jquery'], function ($) {
  var Utility = {
    DOM:{
      serializeObject:function (el) {
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
      }
    }
  };

  return Utility;
});