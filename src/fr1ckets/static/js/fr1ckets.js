var products = [];
var discount = 0;

$('.no_js_warning').hide();

$('#overview_order').on('click', function() {
	var root = location.protocol + '//' + location.hostname;
	if (location.port) {
		root += ':' + location.port;
	}
	$.ajax({
		url : root + '/api/tickets_register',
		type : 'post',
		dataType : 'json',
		data : $('form#ticket_form').serialize(),
		success : function(resp) {
			if (resp.status == 'SUCCESS') {
				if (resp.redirect) {
					window.location.href = resp.redirect;
				}
			} else if (resp.status == 'FAIL') {
				if (resp.message) {
					$('#outcome_content').text(resp.message);
					$('#outcome_modal').modal('show');
				}
			}
		},
		error : function(resp) {
			$('#outcome_content').text("Er is een fout opgetreden, waarschijnlijk overbelasting. Probeer het nog eens.");
			$('#outcome_modal').modal('show');
		},
		statusCode : {
			502 : function() {
				$('#outcome_content').text("Er is een fout opgetreden, waarschijnlijk overbelasting. Probeer het nog eens.");
				$('#outcome_modal').modal('show');
			},
		},
	});
});

function is_safari() {
	return navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
}
$('#ticket_form').submit(function(e) {
	e.preventDefault();

	if (!("required" in document.createElement("input")) || is_safari()) {
		errors = validate_choices();
		if (errors.length > 0) {
			var f = '<p>Er zijn nog enkele onvolledigheden in de ingave, gelieve deze te corrigeren:</p>';
			f += '<ul>';
			for (var e in errors) {
				f += '<li>'+errors[e]+'</li>';
			}
			f += '</ul>'
			$('#validation_content').html(f);
			$('#validation_modal').modal('show');
			return;
		}
	}

	$('#overview_content').html(update_overview());
	$('#overview_modal').modal('show');
});
$('#show_tshirt_sizes_k').on('click', function(e) {
	e.preventDefault();
	$('#tshirt_sizes').attr('src', '/static/img/maattabel_k.png');
	$('#sizes_modal').modal('show');
});
$('#show_tshirt_sizes_f').on('click', function(e) {
	e.preventDefault();
	$('#tshirt_sizes').attr('src', '/static/img/maattabel_f.png');
	$('#sizes_modal').modal('show');
});
$('#show_tshirt_sizes_m').on('click', function(e) {
	e.preventDefault();
	$('#tshirt_sizes').attr('src', '/static/img/maattabel_m.png');
	$('#sizes_modal').modal('show');
});
function update_overview() {

	var choices = enumerate_choices();
	var f = '';

	f += '<table class="table">';
	f += '  <thead>';
	f += '    <tr>';
	f += '      <th>Wat</th>';
	f += '      <th>Eenheidsprijs</th>';
	f += '      <th>Hoeveel</th>';
	f += '      <th>Totale prijs</th>';
	f += '    </tr>';
	f += '  </thead>';
	f += '  <tbody>';
	for (var i = 0; i < choices.length; i++) {
		f += '    <tr>';
		f += '      <td>'+choices[i].name+'</td>';
		f += '      <td>'+choices[i].price+'</td>';
		f += '      <td>'+choices[i].n+'</td>';
		f += '      <td>'+(choices[i].price*choices[i].n)+'</td>';
		f += '    </tr>';
	}
	if (discount) {
		f += '    <tr class="success">';
		f += '      <td>Korting</td>';
		f += '      <td></td>';
		f += '      <td></td>';
		f += '      <td>€'+discount+'</td>';
		f += '    </tr>';
	}
	f += '    <tr>';
	f += '      <td><strong>Totaal</strong></td>';
	f += '      <td></td>';
	f += '      <td></td>';
	f += '      <td><strong>€'+calculate_total()+'</strong></td>';
	f += '    </tr>';
	f += '  </tbody>';
	f += '</table>';
	if (get_n_tickets() == 0) {
		f += '<div class="alert alert-warning" role="alert">';
		f += '  <p>';
		f += '    Je hebt geen tickets besteld, als je in een andere order nog tickets bestelt leggen we alles klaar voor je op het kamp, anders kan je deze bestelling afhalen op de Open Garage te Borsbeek.</p>';
		f += '  </p>';
		f += '</div>';
	}

	return f;

}

function handle_reservation(data) {

	if ($('#email').val() == '') {
		$("#email_reservation_collapse").html('');
		return;
	}

	var reservation = JSON.parse(data);
	var available = Date.now() >= (reservation.available_from*1000);
	var f = '';

	if (!available) {
		var available_date = new Date();
		available_date.setTime(reservation.available_from*1000);
		f += '<div class="row">';
		f += '  <div class="alert alert-danger text-center" role="alert">';
		f += '    <p>Met dit email-adres kan je pas vanaf '+available_date.toLocaleDateString()+' '+available_date.toLocaleTimeString()+' bestellen! Je kan het formulier tot 24 uur op voorhand invullen.</p>';
		f += '  </div>';
		f += '</div>';
	} else if (available && reservation.discount > 0) {
		f += '<div class="row">';
		f += '  <div class="alert alert-success text-center" role="alert">';
		f += '    <p>Met dit email krijg je éénmalig €'+reservation.discount+' korting!</p>';
		f += '  </div>';
		f += '</div>';
	}

	discount = reservation.discount;

	$("#email_reservation_collapse").html(f);

}

function find_ticket_by_dob(dob, billable) {

	var ticket = undefined;
	for (var t in products) {
		if (products[t].name.indexOf('ticket') == -1) {
			continue;
		}
		if (products[t].billable != billable) {
			continue;
		}
		if (dob >= products[t].max_dob) {
			ticket = products[t];
			break;
		}
	}
	return ticket;

}

function get_n_tickets() {
	return parseInt($('#n_tickets').val());
}

function validate_choices() {
	var errors = []

	// alert("validity="+$('#ticket_form')[0].checkValidity());
	var n_tickets = parseInt($('#n_tickets').val());
	var need_business_info = false;

	if ($('#email').val().length == 0) {
		errors.push("Email-adres");
	}
	for (var i = 0; i < n_tickets; i++) {
		var src = 'tickets_'+i;
		var year_src = src + '_dob_year';
		var month_src = src + '_dob_month';
		var day_src = src + '_dob_day';
		var name_src = src + '_name';
		var billable_src = src + "_billable";
		var now = new Date();

		var dob_year = parseInt($('#'+year_src).val());
		var dob_month = parseInt($('#'+month_src).val());
		var dob_day = parseInt($('#'+day_src).val());
		var name = $('#' + name_src).val();
		var billable = Boolean($('#'+billable_src).prop('checked'));

		console.log(dob_year, dob_month, dob_day);
		if (!dob_year || ((dob_year < 1900) || (dob_year > now.getFullYear()))) {
			errors.push("Geboortejaar ticket "+(i+1));
		}
		if (!dob_month || (dob_month < 1) || (dob_month > 12)) {
			errors.push("Geboortemaand ticket "+(i+1));
		}
		if (!dob_day || (dob_day < 1) || (dob_day > 31)) {
			errors.push("Geboortedag ticket "+(i+1));
		}
		if (name.length == 0) {
			errors.push("Naam ticket "+(i+1));
		}
		if (billable) {
			need_business_info = true;
		}
	}
	if (need_business_info) {
		var business_name = $('#business_name').val();
		var business_address = $('#business_address').val();
		var business_vat = $('#business_address').val();

		if ((business_name.length == 0) || (business_address.length == 0) || (business_vat.length == 0)) {
			errors.push("Bedrijfs-informatie");
		}
	}

	if (!$('#terms_payment').prop('checked') || !$('#terms_supervision').prop('checked') || !$('#terms_excellent').prop('checked')) {
		errors.push("Termen en condities");
	}
	return errors

}

function enumerate_choices() {
	var choices = [];

	for (var i in products) {
		if (products[i].name.indexOf('ticket') != -1) {
			// skip tickets
			continue;
		}
		var n = parseInt($('#'+products[i].name).val() || 0);
		if (n == 0) {
			continue;
		}
		var c = {
			n : n,
			price : products[i].price,
			name : products[i].display,
		}
		choices.push(c);
	}

	var n_tickets = parseInt($('#n_tickets').val());

	for (var i = 0; i < n_tickets; i++) {
		var src = 'tickets_'+i;
		var year_src = src + '_dob_year';
		var month_src = src + '_dob_month';
		var day_src = src + '_dob_day';
		var name_src = src + '_name';
		var not_volunteering_src = src + "_options_not_volunteering_during";
		var cleanup_src = src + "_options_volunteers_after";
		var billable_src = src + "_billable";

		var dob = new Date($('#'+year_src).val(), $('#'+month_src).val(), $('#'+day_src).val()).getTime();
		var billable = Boolean($('#'+billable_src).prop('checked'));
		var ticket = find_ticket_by_dob(dob, billable);
		var name = $('#' + name_src).val();
		var volunteering_during = !Boolean($('#'+not_volunteering_src).prop('checked'))
		var volunteering_after = Boolean($('#'+cleanup_src).prop('checked'));
		var ticket_price = ticket.volunteering_price;
		var ticket_name = ticket.display + " voor " + name;
		var can_volunteer = Boolean(dob < ticket_volunteering_cutoff);
		if (can_volunteer && !billable && !volunteering_during) {
			ticket_price = ticket.price;
			ticket_name = ticket_name + " (premium)";
		}
		var c = {
			n : 1,
			price : ticket_price,
			name : ticket_name,
		}
		choices.push(c);
	}

	return choices;

}

function calculate_total() {

	var choices = enumerate_choices();
	var total = 0;

	for (var i = 0; i < choices.length; i++) {
		console.dir(choices[i]);
		total += choices[i].n * choices[i].price;
	}

	total = Math.max(0, total - discount);

	return total;

}

function update_price_total_display() {

	$("#price_total").html('€'+calculate_total());

}

$(document).ready(function() {
	$.ajax({
		url : '/api/get_products',
		success: function(data) {
			products = JSON.parse(data);
			for (var i in products) {
				if (products[i].max_dob) {
					products[i].max_dob *= 1000;
				}
				$('#'+products[i].name).on('change', update_price_total_display);
			}
		},
	});
	$('#email').on('change', function() {
		if ($('#email').val().length > 0) {
			$.ajax({
				url : 'api/get_reservation/' + $('#email').val(),
				success: function(data) {
					handle_reservation(data);
				},
				error: function(data) {
					handle_reservation(data);
				},
			});
		} else {
			handle_reservation('');
		}
	});
	$('#n_tickets').on('change', update_price_total_display);
	update_price_total_display();
});

var ticket_volunteering_cutoff = new Date(2000, 8, 13).getTime();

var showing_business_info = false;
function display_business_info() {

	var n_tickets = parseInt($('#n_tickets').val());
	var n_tickets_billable = 0;

	for (var i = 0; i < n_tickets; i++) {
		var fmt = "tickets_"+i;
		var billable_id = fmt+"_billable";
		var billable = Boolean($('#'+billable_id).prop('checked'));
		if (billable) {
			n_tickets_billable++;
		}
	}

	if (!n_tickets_billable && showing_business_info) {
		// hide
		showing_business_info = false;
		$('#business_info').html('');
		$('#business_info').collapse('hide');
	} else if (n_tickets_billable && !showing_business_info) {
		// display
		showing_business_info = true;
		var f = '';
		f += '<div class="row text-center">';
		f += '  <p><h4>Factuurgegevens:</h4></p>';
		f += '</div>';
		f += '<hr/>';
		f += '<div class="form-group">';
		f += '  <label for="business_name" class="control-label col-sm-3 col-sm-offset-1">Bedrijf</label>';
		f += '  <div class="col-sm-8">';
		f += '    <input class="form-control" id="business_name" name="business_name" type=text required aria-required="true">';
		f += '  </div>';
		f += '</div>';
		f += '<div class="form-group">';
		f += '  <label for="business_address" class="control-label col-sm-3 col-sm-offset-1">Adres</label>';
		f += '  <div class="col-sm-8">';
		f += '    <textarea class="form-control" id="business_address" name="business_address" rows="3" required aria-required="true"></textarea>';
		f += '  </div>';
		f += '</div>';
		f += '<div class="form-group">';
		f += '  <label for="business_vat" class="control-label col-sm-3 col-sm-offset-1">BTW</label>';
		f += '  <div class="col-sm-8">';
		f += '    <input class="form-control" id="business_vat" name="business_vat" type=text required aria-required="true" placeholder="BE 4444.333.333">';
		f += '  </div>';
		f += '</div>';
		f += '<hr/>';
		$('#business_info').html(f);
		$('#business_info').collapse('show');
	}

}

function mk_cb_update_visitor_options(index) {
	return function(e) {
		var fmt = "tickets_"+index;
		var name_id = fmt+"_name";
		var dob_year_id = fmt+"_dob_year";
		var dob_month_id = fmt+"_dob_month";
		var dob_day_id = fmt+"_dob_day";
		var billable_id = fmt+"_billable";
		var options_id = fmt+"_options";

		if ($('#'+dob_year_id).val() == '' &&
			$('#'+dob_month_id).val() == '' &&
			$('#'+dob_day_id).val() == '') {
			return;
		}
		var dob = new Date($('#'+dob_year_id).val(), $('#'+dob_month_id).val(), $('#'+dob_day_id).val()).getTime();
		var billable = Boolean($('#'+billable_id).prop('checked'));
		var can_volunteer = Boolean(dob < ticket_volunteering_cutoff);

		var ticket = find_ticket_by_dob(dob, billable);

		var ticket_name_id = fmt + "_options_ticket_name";
		var ticket_price_id = fmt + "_options_ticket_price";
		var vegitarian_id = fmt + "_options_vegitarian";

		var f = '';
		var ef = '';
		// this part needs to be shown for every ticket
		if (ticket) {
			f += '<div class="row">';
			f += '  <div class="col-sm-6 col-sm-offset-4">';
			f += '    <p id="'+ticket_name_id+'">'+ticket.display+'</p>';
			f += '  </div>';
			f += '  <div class="col-sm-2 text-right">';
			f += '    <p id="'+ticket_price_id+'">€'+ticket.volunteering_price+'</p>';
			f += '  </div>';
			f += '</div>';
			f += '<div class="form-group">';
			f += '  <div class="checkbox col-sm-offset-4 col-sm-4 col-xs-6">';
			f += '    <label>';
			f += '      <input type="checkbox" id="'+vegitarian_id+'" name="'+vegitarian_id+'">';
			f += '      Vegetarisch';
			f += '    </label>';
			f += '  </div>';
		} else {
			f += '<div class="row">';
			f += '  <div class="col-sm-8 col-sm-offset-4">';
			f += '    <p>Ongeldige datum!</p>';
			f += '  </div>';
			f += '</div>';
		}
		if (ticket && can_volunteer) {
			var volunteering_id = fmt + "_options_not_volunteering_during";
			var cleanup_id = fmt + "_options_volunteers_after";
			f += '  <div class="checkbox col-sm-4 col-xs-6">';
			f += '    <label>';
			if (billable) {
				ef = 'checked="checked"';
			}
			f += '      <input type="checkbox" id="'+volunteering_id+'" name="'+volunteering_id+'" '+ef+' data-toggle="popover" data-placement="top" data-trigger="focus" data-content="Om het kamp te doen lukken, hopen we dat iedereen vanaf 16 jaar een volunteer-shift van een drietal uurtjes kan bijdragen. Als dit niet voor je lukt, kan je dit aanvinken, je betaalt dan wel iets meer.">';
			f += '      Kan géén vrijwilligers-shift doen.';
			f += '    </label>';
			f += '  </div>';
			f += '  <div class="checkbox col-sm-offset-4 col-sm-8 col-xs-6">';
			f += '    <label>';
			f += '      <input type="checkbox" id="'+cleanup_id+'" name="'+cleanup_id+'" data-toggle="popover" data-placement="top" data-trigger="focus" data-content="We zoeken een twintigtal mensen die graag een nachtje langer bijven kamperen en op dinsdag 16 augustus 2016 helpen opruimen. Pizza en karma voorzien!">';
			f += '      Helpt opkuisen op 16 augustus';
			f += '    </label>';
			f += '  </div>';
		}
		f += '</div>';
		// throw it into the DOM so we can add events to it
		$('#'+options_id).html(f);
		$('[data-toggle="popover"]').popover();
		if (can_volunteer) {
			if (!billable) {
				var volunteering_id = fmt + "_options_not_volunteering_during";
				var cleanup_id = fmt + "_options_volunteers_after";
				$('#'+volunteering_id).on('change', function() {
					var display_name = '';
					var display_price = 0;
					var is_not_volunteering = Boolean(this.checked);
					if (is_not_volunteering) {
						display_name = ticket.display + ' (premium)';
						display_price = ticket.price;
					} else {
						display_name = ticket.display;
						display_price = ticket.volunteering_price;
					}
					$('#'+ticket_name_id).text(display_name);
					$('#'+ticket_price_id).text('€'+display_price);
					update_price_total_display();
				});
			}
		}

		// and collapse it
		$('#'+options_id).collapse('show');

		// update main total
		update_price_total_display();

	}
}

$('#n_tickets').on('change', display_business_info);
$('#n_tickets').on('change', function() {
	var val = parseInt($("#n_tickets").val());
	var f = "";

	f += '<div class="row text-center">';
	f += '  <p><h4>Individuele tickets:</h4></p>';
	f += '</div>';

	// for each ticket, add some form fields to the collapsible target
	// each of those containing itself a collapsible part on their own,
	// which gets collapsed by datepicking
	for (var i = 0; i < val; i++) {
		var fmt = 'tickets_'+i
		var name_id = fmt+"_name";
		var dob_year_id = fmt+"_dob_year";
		var dob_month_id = fmt+"_dob_month";
		var dob_day_id = fmt+"_dob_day";
		var billable_id = fmt+"_billable";
		var options_id = fmt+"_options";
		f += '<hr/>';
		// name box
		f += '<div class="form-group">';
		f += '  <label for="'+name_id+'" class="control-label col-sm-3 col-sm-offset-1">Naam</label>';
		f += '  <div class="col-sm-8">';
		f += '    <input class="form-control" id="'+name_id+'" name="'+name_id+'" type=text required aria-required="true" data-toggle="popover" data-placement="top" data-trigger="focus" data-content="Voor de terrein-uitbater hebben we van iedereen de naam en geboortedatum nodig. We berekenen ondertussen het voordeligste ticket.">';
		f += '  </div>';
		f += '</div>';
		// dob box
		f += '<div class="form-group">';
		f += '  <label class="control-label col-sm-3 col-sm-offset-1">Geboortedag</label>';
		f += '  <div class="col-sm-4">';
		f += '   <input id="'+dob_year_id+'" name="'+dob_year_id+'" class="form-control col-sm-2" type="tel" maxlength="4" pattern="(19|20|21)[0-9]{2}" required aria-required="true" placeholder="YYYY">';
		f += '  </div>';
		f += '  <div class="col-sm-2">';
		f += '   <input id="'+dob_month_id+'" name="'+dob_month_id+'" class="form-control col-sm-1" type="tel" maxlength="2" pattern="^(1[0-2]|0?[1-9])$" required aria-required="true" placeholder="MM">';
		f += '  </div>';
		f += '  <div class="col-sm-2">';
		f += '   <input id="'+dob_day_id+'" name="'+dob_day_id+'" class="form-control col-sm-1" type="tel" maxlength="2" pattern="^(3[01]|[12][0-9]|0?[1-9])$" required aria-required="true" placeholder="DD">';
		f += '  </div>';
		f += '</div>';
		// bill box
		f += '<div class="form-group">';
		f += '  <label class="control-label col-sm-3 col-sm-offset-1 for="'+billable_id+'">Met factuur (€256+BTW)</label>';
		f += '  <div class="col-sm-8">';
		f += '    <input type="checkbox" id="'+billable_id+'" name="'+billable_id+'" data-toggle="popover" data-placement="top" data-trigger="focus" data-content="Je kiest ervoor om dit ticket te laten factureren. We nemen hiervoor zo snel mogelijk contact op.">'
		f += '  </div>';
		f += '</div>';
		// collapse for options depending on input above
		f += '<div class="collapsible" id="'+options_id+'">';
		f += '</div>';
	}
	f += '<hr/>';

	// push it into the DOM so we can hook event listeners on it
	$("#tickets").html(f);
	$('[data-toggle="popover"]').popover();

	// for each ticket, add relevant event handlers
	for (var i = 0; i < val; i++) {
		// changing the dob should result in a collapse of the
		// per-ticket options, so wire in the callback giving
		// it the needed parts to fill the per-ticket collapsable
		var fmt = "tickets_"+i;
		var name_id = fmt+"_name";
		var dob_year_id = fmt+"_dob_year";
		var dob_month_id = fmt+"_dob_month";
		var dob_day_id = fmt+"_dob_day";
		var billable_id = fmt+"_billable";
		var options_id = fmt+"_options";
		var cb = mk_cb_update_visitor_options(i);
		$("#"+dob_year_id).on('change', cb);
		$("#"+dob_month_id).on('change', cb);
		$("#"+dob_day_id).on('change', cb);
		$("#"+billable_id).on('change', display_business_info);
		$("#"+billable_id).on('change', cb);
	}

	// and collapse the whole target if a nonzero number of tickets was selected
	if (val) {
		$("#tickets").collapse('show');
	} else {
		$("#tickets").collapse('hide');
	}

});

