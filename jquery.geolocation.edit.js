/**
 * jQuery geolocation.edit plugin
 * Copyright (c) 2012 Milos Popovic <the.elephant@gmail.com>
 *
 * Freely distributable under the MIT license.
 *
 * @version 0.0.16 (2015-10-16)
 * @see http://github.com/miloss/jquery-geolocation-edit
 */
(function ($) {
	var loadScript;

	// Queued initializations
	var inits = [];

	// Methods container object
	var methods = {};


	// Plugin methods

	/**
	 * Main execution method
	 * @param {Object}  options  Passed plugin options
	 */
	methods.main = function (options) {
		var selector = this;

		// Check for required fields
		if (typeof options.lat === 'undefined' || typeof options.lng === 'undefined') {
			$.error("Please provide 'lat' and 'lng' options for jQuery.geolocate");
			return;
		}

		// If GoogleMaps not loaded - push init to queue and go on
		if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
			inits.push(function () {
				$(selector).geolocate(options);
			});
			loadScript();
			return;
		}

		// Extend default options
		var opts = $.extend(true, {
			address: [],
			changeOnEdit: false,
			readOnlyMap: false, // Don't allow pin movement on click
			mapOptions: {
				zoom: 14,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				mapTypeControl: false,
				streetViewControl: false
			},
			markerOptions: {
				draggable:true,
				animation: google.maps.Animation.DROP
			},
			geoCallback: function(){}
		}, options);

		$(this).data('opts', opts);

		// Init map and marker - per coordinates
		var llat = parseFloat( $( opts.lat ).val() );
		var llng = parseFloat( $( opts.lng ).val() );
		if (isNaN(llat)) {
			llat = 0;
		}
		if (isNaN(llng)) {
			llng = 0;
		}

		var llocation = new google.maps.LatLng(llat, llng);
		$(this).geolocate({}, 'initMap', llocation);

		// Bind actions - coordinates fields
		if ( opts.changeOnEdit ) {
			$( opts.lat ).change(function () { $(selector).geolocate({}, 'updateLatLng', opts); });
			$( opts.lng ).change(function () { $(selector).geolocate({}, 'updateLatLng', opts); });
		}

		// Bind  actions - address field
		var addrlen = opts.address.length;
		for (var i = 0; i < addrlen; i++) {
			$( opts.address[i] ).change(function () {
				$(selector).geolocate({}, 'callGeocoding');
			});
		}
	};


	/**
	 * Initialize GoogleMaps Map on page
	 * @param {LatLng} location  GoogleMaps object
	 */
	methods.initMap = function (location) {
		var self = $(this).get(0);
		var gmaps = google.maps;
		var opts = $.data(self, 'opts');

		var map = new gmaps.Map(self, $.extend({
			center: location
		}, opts.mapOptions));

		var markerOptions = $.extend({
			map: map,
			position: location
		}, opts.markerOptions);

		var marker = new gmaps.Marker(markerOptions);

		$.data(self, 'map', map);
		$.data(self, 'marker', marker);

		gmaps.event.addListener(marker, 'dragend', function () {
			$(self).geolocate({}, 'getMarkerLocation');
		});

		// Move the marker to the location user clicks
		if (!opts.readOnlyMap) {
			gmaps.event.addListener(map, 'click', function (event) {
				marker.setPosition(event.latLng);
				$(self).geolocate({}, 'getMarkerLocation');
			});
		}
	};


	/**
	 * Make Google Geocoding call with provided address
	 */
	methods.callGeocoding = function () {
		var self = $(this).get(0);
		var opts = $.data(self, 'opts');
		var len = opts.address.length;
		var cbfunc = opts.geoCallback;

		// Get address
		var addr = '';
		while (len--) {
			addr += $( opts.address[len] ).val();
		}

		// Make request
		var geo = new google.maps.Geocoder();

		// Geocoder response
		geo.geocode({
			address: addr
		}, function (data, status) {
			var loc, first, map, marker;

			cbfunc(data, status);

			first = data[0];
			if (typeof first === 'undefined') return;

			map = $.data(self, 'map');
			marker = $.data(self, 'marker');

			loc = first.geometry.location;
			map.panToBounds( first.geometry.viewport );
			map.panTo( loc );
			marker.setPosition( loc );
			$(self).geolocate({}, 'getMarkerLocation');
		});
	};


	/**
	 * Copy marker position to coordinates fields
	 */
	methods.getMarkerLocation = function () {
		var marker = $.data($(this).get(0), 'marker');
		var opts = $.data($(this).get(0), 'opts');
		var pos = marker.getPosition();;

		$( opts.lat ).val( pos.lat() );
		$( opts.lng ).val( pos.lng() );
	};


	/**
	 * Move to the current settings for lat & lng
	 * @param {Object} opts
	 */
	methods.updateLatLng = function (opts) {
		var self = $(this).get(0);
		var lat = $( opts.lat ).val();
		var lng = $( opts.lng ).val();
		var loc = new google.maps.LatLng(lat, lng);
		var map = $.data(self, 'map');
		var marker = $.data(self, 'marker');
		map.panTo(loc);
		marker.setPosition(loc);
	};


	// Main plugin function
	// Call appropriate method, or execute 'main'
	$.fn.geolocate = function (os, method) {
		var pslice = Array.prototype.slice;
		if ( typeof method === 'undefined' ) { // Only method passed (as 1st parameter)
			if ( typeof os === 'string' && typeof methods[os] !== 'undefined' ) {
				return methods[ os ].apply( this, pslice.call( arguments, 1 ));
			} else {
				$(this).geolocate({}, 'main', os);
			}
		} else if ( methods[method] ) {
			return methods[ method ].apply( this, pslice.call( arguments, 2 ));
		} else {
			$.error("Method " +  method + " does not exist on jQuery.geolocate");
		}
		return this;
	};


	// Callback to GoogleMaps async loading
	// FIXME find non-jQuery.fn-polluting solution
	$.fn.geolocateGMapsLoaded = function () {
		while (inits.length) {
			inits.shift()();
		}
	};


	// Private functions

	// Load GoogleMaps, we want to do it only once
	loadScript = (function () {
		var ran = false;

		return function () {
			var script;
			if (ran) return;
			ran = true;

			script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = ( window.location.protocol == 'https:' ? 'https' : 'http' ) + '://maps.googleapis.com/maps/api/js?sensor=false&callback=jQuery.fn.geolocateGMapsLoaded';
			document.body.appendChild(script);
		};
	})();

})(jQuery);
