define([
  'jquery',
  'application/couchdb-replication-app/couchdb-replication-app',
  'application/todo-app'
], function ($, CouchDBReplicationApp, TodoApp) {

  var Application = {};
  Application.start = function () {

    $(function () {
      $('#apps-container').append('<div class="row app-container" id="replication-app-container"></div>');
      var replicationRouter = new CouchDBReplicationApp.Routers.ReplicationRouter({
        parentContainerSelector:'#replication-app-container'
      });

      $('#apps-container').append('<div class="row app-container" id="todo-app-container"></div>');
      var todoRouter = new TodoApp.Routers.TodoRouter({
        parentContainerSelector:'#todo-app-container'
      });

    });

  }

  return Application;

});