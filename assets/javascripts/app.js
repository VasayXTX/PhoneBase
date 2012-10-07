// ------------- templater (jquery plugin) -------------

jQuery.fn.templater = function($templ, data) {
  this.empty().append_templater($templ, data);
}

jQuery.fn.append_templater = function($templ, data) {
  var compiled = _.template($templ.html());
  var view = compiled(data);
  this.append(view);
}

// ------------- Utils -------------

var Utils = Spine.Class.sub({});
Utils.extend({
	fillModel: function(model, records) {
		_.each(records, function(rec) { model.create(rec); });
	},

	getSelectedIntValue: function($select) {
		var selectedIndex = $select[0].selectedIndex;
		return selectedIndex === -1 ?
			null :
			parseInt($($select.find('option').get(selectedIndex)).val(), 10);
	},

	updateSelect: function($select, selectedId, isEmptyAvailable) {
		if (isEmptyAvailable) {
			$select.prepend('<option value="-1"></option>');
			if (_.isUndefined(selectedId)) selectedId = -1;
		} else {
			if (_.isUndefined(selectedId)) return;
		}
		$select.find('option[value="' + selectedId + '"]').attr('selected', 'selected');
	}
});

// ------------- Ajax -------------

var Ajax = Spine.Class.sub({});
Ajax.extend({
	sendRequest: function(request, handlerOk, handlerErr) {
		$.post('/', { request: request }, function(data) {
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
Street.configure('Street', 'name', 'city_id');

// ------------- PageCtrl -------------

var PageCtrl = Spine.Controller.sub({
	elements: {
		'#contacts-list': '$contactsList',
		'#templ-contact-list-item': '$templContactsListItem',

		'#contact-form': '$contactForm',
		'#inp-last-name': '$inpLastName',
		'#inp-first-name': '$inpFirstName',
		'#inp-second-name': '$inpSecondName',
		'#inp-phone-number': '$inpPhoneNumber',
		'#contact-form button[type="submit"]': '$submitContact',
		'#select-city': '$selectCities',
		'#select-street': '$selectStreets'
	},

	events: {
		'click #btn-create-new-contact': 'showNewForm',
		'click #btn-delete-contacts': 'deleteContacts',
		'click .contact-list-item': 'selectContact',
		'change #select-city': 'changeCity'
	},

	init: function(opts) {
		this.load_resources();
		this.reload_contacts();

		// Init submit event
		this.$contactForm.on('submit', $.proxy(this.submitContactForm, this));
	},

	load_resources: function() {
		var self = this;

		Ajax.sendRequest(
			{ cmd: 'getResources' },
			function(data) {
				Utils.fillModel(Street, data['streets']);
				Utils.fillModel(City, data['cities']);
			}
		);
	},

	reload_contacts: function() {
		var self = this;

		Ajax.sendRequest(
			{ cmd: 'getContacts' },
			function(data) {
				Contact.deleteAll();
				Utils.fillModel(Contact, data['contacts']);
				self.updateContactsList();
			}
		);
	},

	updateContactsList: function() {
		this.$contactsList.templater(
			this.$templContactsListItem,
			{ contacts: Contact.all() }
		);
	},

	showNewForm: function(event) {
		event.preventDefault();
		var self = this;

		self.isNew = true;
		self.$contactForm.show().find('legend').text('Создание');
		self.$submitContact.text('Создать');

		// Clean form
		var a = ['FirstName', 'LastName', 'SecondName', 'PhoneNumber'];
		_.each(a, function(el) {
			self['$inp' + el].val('');
		});
		self.updateSelectCities();
		self.updateSelectStreets();
	},

	deleteContacts: function(event) {
		event.preventDefault();
		var self = this;
		
		var a = [];
		this.$contactsList.find('input[type="checkbox"]').each(function(i, el) {
			var $chbx = $(el);
			if ($chbx.attr('checked')) {
				a.push(self.parseContactId($chbx.closest('li')));
			}
		});
		
		Ajax.sendRequest(
			{ cmd: 'deleteContacts', contacts: a },
			function(data) { self.reload_contacts(); }
		);
	},

	parseContactId: function($contactItem) {
		var id = $contactItem.attr('id');
		return parseInt(id.match('contact_(-?\\d+)')[1], 10);
	},

	selectContact: function(event) {
		event.preventDefault();
		var self = this;

		self.isNew = false;
		self.$contactForm.show().find('legend').text('Изменение');
		self.$submitContact.text('Изменить');

		var $li = $(event.currentTarget).closest('li');
		self.selectedContactId = this.parseContactId($li);
		var contact = Contact.find(self.selectedContactId);

		var contactMap = self.getContactMap();
		for (var field in contactMap) {
			contactMap[field].val(contact[field]);
		}

		// Update selects
		if (_.isNull(contact.street_id)) {
			self.updateSelectCities();
			self.updateSelectStreets();
		} else {
			self.updateSelectCities(Street.find(contact.street_id).city_id);
			self.updateSelectStreets(contact.street_id);
		}
	},

	submitContactForm: function(event) {
		var self = this;

		var contactMap = self.getContactMap();
		var contact = {};
		for (var field in contactMap) {
			contact[field] = contactMap[field].val();
		}
		contact.street_id = Utils.getSelectedIntValue(self.$selectStreets);

		var cmd = 'createContact';
		if (!self.isNew) {
			cmd = 'updateContact';
			contact.id = self.selectedContactId; 
		}

		Ajax.sendRequest(
			{ cmd: cmd, contact: contact },
			function(data) { self.reload_contacts(); }
		);
		return false;
	},

	getContactMap: function() {
		return contact = {
			first_name: this.$inpFirstName,
			last_name: this.$inpLastName,
			second_name: this.$inpSecondName,
			phone_number: this.$inpPhoneNumber
		};
	},

	updateSelectCities: function(selectedId) {
		var self = this;
		self.$selectCities.empty();
		_.each(City.all(), function(city) {
			self.$selectCities.append('<option value="' + city.id + '">' + city.name + '</option');
		});
		Utils.updateSelect(self.$selectCities, selectedId, true);
	},

	updateSelectStreets: function(selectedId) {
		var self = this;
		var cityId = Utils.getSelectedIntValue(self.$selectCities);
		self.$selectStreets.empty();
		_.each(Street.findAllByAttribute('city_id', cityId), function(street) {
			self.$selectStreets.append('<option value="' + street.id + '">' + street.name + '</option');
		});
		Utils.updateSelect(self.$selectStreets, selectedId, false);
	},

	changeCity: function(event) {
		this.updateSelectStreets();
	}
});

$(function() {
	var pageCtrl = new PageCtrl({
		el: $(document)
	});
});
