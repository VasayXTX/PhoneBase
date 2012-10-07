// ------------- Ajax -------------

var Ajax = Spine.Class.sub({});
Ajax.extend({
	sendRequest: function(request, handlerOk, handlerErr) {
		$.post('/ajax', { request: request }, function(data) {
			console.log(data);
			if (data['status'] === 'ok') {
				if (_.isFunction(handlerOk)) handlerOk(data);
			} else {
				if (_.isFunction(handlerErr)) {
					handlerErr(data);
				} else {
					// TODO: implement default handler
				}
			}
		}, 'json');
	}
});

// ------------- Models -------------

var Contact = Spine.Model.sub();
Contact.configure('Contact',
	'first_name',
	'last_name',
	'second_name',
	'phone_number',
	'street_id'
);

var City = Spine.Model.sub();
City.configure('City', 'name');

var Street = Spine.Model.sub();
Street.configure('Street', 'name');

// ------------- PageCtrl -------------

var PageCtrl = Spine.Controller.sub({
	elements: {},
	events: {
		'click #btn-create-new-contact': 'showNewForm',
		'click #btn-delete-contacts': 'deleteContacts'
	},

	init: function(opts) {
		Ajax.sendRequest(
			{ cmd: 'getAllData' },
			function(data) {
				var fillModel = function(model, records) {
					_.each(records, function(rec) { model.create(rec); });
				}
				fillModel(Contact, data['contacts']);
				fillModel(Street, data['streets']);
				fillModel(City, data['cities']);
			}
		);
	},

	updateContactsList: function() {

	},

	showNewForm: function(event) {
		event.preventDefault();
	},

	deleteContacts: function(event) {
		event.preventDefault();
	}	
});

$(function() {
	var pageCtrl = new PageCtrl({
		el: $(document)
	});
});
