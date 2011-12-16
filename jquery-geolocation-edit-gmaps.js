/**
 * jQuery geolocation-edit-gmaps plugin
 * Copyright (c) 2011 Milos Popovic <the.elephant@gmail.com>
 * 
 * Freely distributable under the MIT license.
 * 
 * @version 0.0.1 (2011-12-16)
 * @see http://github.com/miloss/jquery-geolocation-edit
 */

(function($){
	
	// queued initializations
	var inits = [];
	
	/* plugin methods */
	
	var methods = {
		main: function (options) {
			//...
		},
		
		
		initMap: function (location) {
			var self = $(this).get(0)
				, map
				, markerOptions
				, marker
				, opts = $.data(self, 'opts');
			
			map = new google.maps.Map(self, $.extend({
				center: location
			}, opts.mapOptions));
			
			markerOptions = $.extend({
				map: map,
				position: location
			}, opts.markerOptions);
			
			marker = new google.maps.Marker(markerOptions);
			
			$.data(self, 'map', map);
			$.data(self, 'marker', marker);
			
			google.maps.event.addListener(marker, 'dragend', function () {
				$(self).geolocate({}, 'getMarkerLocation');
			});
		},
		
		
		callGeocoder: function () {
			var self = $(this).get(0)
				, addr = ''
				, opts = $.data(self, 'opts')
				, len = opts.address.length;
				
			// get address
			while (len--) {
				addr += $( opts.address[len] ).val();
			}
			
			// make request
			geo = new google.maps.Geocoder();
			
			geo.geocode({
				address: addr
			}, function (data, status) {
				// geocoder response
				var loc, first, map, marker;
				
				first = data[0];
				if (typeof first === 'undefined') return;
				
				map = $.data(self, 'map');
				marker = $.data(self, 'marker');
				
				if (typeof map === 'undefined') {
					// ???
				}
				
				loc = first.geometry.location;
				map.panToBounds( first.geometry.viewport );
				map.panTo( loc );
				marker.setPosition( loc );
				$(self).geolocate({}, 'getMarkerLocation');
			});
		},
		
		
		getMarkerLocation: function () {
			var self = $(this).get(0)
				, mrk = $.data(self, 'marker')
  			, opts = $.data(self, 'opts')
  			, pos = mrk.getPosition();
  			
			$( opts.lat ).val( pos.lat() );
			$( opts.lng ).val( pos.lng() );
		}
		
	};
	

	// plugin function
	jQuery.fn.geolocate = function (options, method) {
		var selector = this
			, opts
			, llat, llng, llocation
			, i, addrlen;
			
		// method calling
		if ( typeof method === 'undefined' ) {
			//TODO move to -> method.main
			
			// check for required option fields
			if (typeof options.lat === 'undefined' || typeof options.lng === 'undefined') {
				$.error( "Please provide 'lat' and 'lng' options for jQuery.geolocate" );
				return;
			}
			
			// if google maps not loaded, push init to queue and go on
			if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
				inits.push(function () {
					$(selector).geolocate(options);
				});
				loadScript();
				return;
			}
			
			// 1. create options for map init
			// extend default options
			opts = $.extend(true, {
				address: [],
				changeOnEdit: false,
				mapOptions: {
					zoom: 14,
					mapTypeId: google.maps.MapTypeId.ROADMAP,
					mapTypeControl: false,
					streetViewControl: false
				},
				markerOptions: {
					draggable:true,
					animation: google.maps.Animation.DROP
				}
			}, options);
			
			$(this).data('opts', opts);
			
			// 2. init map and marker - per coordinates
			llat = parseFloat( $( opts.lat ).val() );
			llng = parseFloat( $( opts.lng ).val() );
			
			if ( !isNaN(llat) && !isNaN(llng) ) {
				llocation = new google.maps.LatLng(llat, llng);
				$(this).geolocate({}, 'initMap', llocation);
			}
			
			// 3. bind fields actions - coordinates
			if ( opts.changeOnEdit ) {
				
				$( opts.lat ).change(function () {
					//TODO...
				});
				
				$( opts.lng ).change(function () {
					//TODO...
				});
				
			}
			
			// 4. bind field actions - address
			addrlen = opts.address.length;
			if (addrlen > 0) {
				for (i=0; i<addrlen; i++) {
					
					$( opts.address[i] ).change(function () {
						$(selector).geolocate({}, 'callGeocoder');
					});
					
				}
			}
			
		} else if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 2 ));
			
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.geolocate' );
		}
		
		return this;
	};
	
	// callback to google.maps async loading
	// FIXME find non-jQuery.fn-polluting solution
	jQuery.fn.geolocateGMapsLoaded = function () {
		// empty queued initializations
		while (inits.length) {
			inits.shift()();
		}
	};
	
	
	/* private functions */
	
	// loadScript, we want to do it only once
	loadScript = (function(){
		var ran = false;
		
		return function () {
			var script;
			if (ran) return;
			ran = true;
			
			script = document.createElement("script");
			script.type = "text/javascript";
			script.src = "http://maps.googleapis.com/maps/api/js?sensor=false&callback=$.fn.geolocateGMapsLoaded";
			document.body.appendChild(script);
		}
	})();

})(jQuery);