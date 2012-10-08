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
				handlerErr = handlerErr || {};
				if (_.isFunction(handlerErr[data['status']])) {
					handlerErr[data['status']](data);
				} else {
					// TODO: implement default handler
				}
			}
		}, 'json');
	}
});

// ------------- Models -------------


var OrderedModel = {
  _init_: function() {
    this.ordered_arr = [];
  },

  create: function() {
    this.ordered_arr.push(arguments[0].id);
    return Spine.Model.create.apply(this, arguments);
  },

  deleteAll: function() {
    this.ordered_arr = [];
    Spine.Model.destroyAll.apply(this, arguments);
  },

  getAllOrdered: function() {
    var res = [];
    for (var i = 0; i < this.count(); ++i) {
      res.push(this.find(this.ordered_arr[i]));
    }
    return res;
  }
};

var Contact = Spine.Model.sub();
Contact.extend(OrderedModel);
Contact._init_();
Contact.configure('Contact',
	'first_name',
	'last_name',
	'second_name',
	'phone_number',
	'street_id'
);

var City = Spine.Model.sub();
City.extend(OrderedModel);
City._init_();
City.configure('City', 'name');

var Street = Spine.Model.sub();
Street.extend(OrderedModel);
Street._init_();
Street.configure('Street', 'name', 'city_id');

// ------------- PageCtrl -------------

var PageCtrl = Spine.Controller.sub({
	elements: {
		'#contacts-list': '$contactsList',
		'#templ-contact-list-item': '$templContactsListItem',
		'#btn-delete-contacts': '$btnDelete',

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
		'change #select-city': 'changeCity',
		'change #contacts-list input[type="checkbox"]': 'updateDeleteBtnState'
	},

	init: function(opts) {
		var self = this;

		self.load_resources();
		self.reloadContacts();

		// Init submit event
		self.$contactForm.on('submit', $.proxy(self.submitContactForm, self));

		// Init focusin events
		_.each(['LastName', 'FirstName', 'SecondName', 'PhoneNumber'], function(el) {
			self['$inp' + el].on('focusin', function(event) {
				$(this).closest('.control-group').removeClass('error');
				$(this).siblings('.help-inline').empty();
			});
		});
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

	reloadContacts: function(callback) {
		var self = this;
		Ajax.sendRequest(
			{ cmd: 'getContacts' },
			function(data) {
				Contact.deleteAll();
				Utils.fillModel(Contact, data['contacts']);
				self.updateContactsList();
				if (_.isFunction(callback)) callback();
			}
		);
	},

	updateContactsList: function() {
		this.$contactsList.templater(
			this.$templContactsListItem,
			{ contacts: Contact.getAllOrdered() }
		);
	},

	showNewForm: function(event) {
		event.preventDefault();
		var self = this;

		self.isNew = true;
		self.$contactForm.show().find('legend').text('Создание');
		self.$submitContact.text('Создать');

		// Clean form
		self.emptyValidateErrs();
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

		// Hide form, if array for deletion contains edited rec
		if (_.indexOf(a, self.selectedContactId) !== -1) {
			self.$contactForm.hide();
		}
		
		Ajax.sendRequest(
			{ cmd: 'deleteContacts', contacts: a },
			function(data) {
				self.reloadContacts($.proxy(self.updateDeleteBtnState, self));
			}
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

		self.emptyValidateErrs();
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
			contact[field] = $.trim(contactMap[field].val());
		}
		contact.street_id = Utils.getSelectedIntValue(self.$selectStreets);

		var cmd = 'createContact';
		if (!self.isNew) {
			cmd = 'updateContact';
			contact.id = self.selectedContactId; 
		}

		Ajax.sendRequest(
			{ cmd: cmd, contact: contact },
			function(data) { self.reloadContacts(); },
			{
				badContact: function(data) {
					var errs = data['messages'];
					var contactMap = self.getContactMap();
					for (var fld in errs) {
						var $inp = contactMap[fld];
						$inp.closest('.control-group').addClass('error');
						$inp.siblings('.help-inline').text(errs[fld]);
					}
				}
			}
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
		_.each(City.getAllOrdered(), function(city) {
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
	},

	emptyValidateErrs: function() {
		var self = this;
		_.each(['LastName', 'FirstName', 'SecondName', 'PhoneNumber'], function(el) {
			var $inp = self['$inp' + el];
			$inp.closest('.control-group').removeClass('error');
			$inp.siblings('.help-inline').empty();
		});
	},

	updateDeleteBtnState: function() {
		var self = this;
		var isNotEmpty = false;
		var $chbxs = self.$contactsList.find('input[type="checkbox"]');
		$chbxs.each(function(i, el) {
			isNotEmpty |= $(el).is(':checked');
		});
		if (isNotEmpty) {
			self.$btnDelete.removeAttr('disabled');
		} else {
			self.$btnDelete.attr('disabled', 'disabled');
		}
	}
});

$(function() {
	var pageCtrl = new PageCtrl({
		el: $(document)
	});
});
