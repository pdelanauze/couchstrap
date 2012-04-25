define([
	'jquery',
	'application/couchdb-replication-app'
], function ($, CouchDBReplicationApp) {

	var Application = {};
	Application.start = function () {

		$(function () {
			var replicationRouter = new CouchDBReplicationApp.Routers.ReplicationRouter({
				parentContainerSelector:'#replication-app-container'
			});
		});

	}

	return Application;

});