/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};
let map;

(function rideScopeWrapper($) {
    var authToken;
    WildRydes.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        } else {
            window.location.href = '/signin.html';
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.href = '/signin.html';
    });

    //  requestUnicorn
    //      make the POST request to the server
    function requestUnicorn(pickupLocation) {
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                PickupLocation: {
                    Latitude: pickupLocation.latitude,
                    Longitude: pickupLocation.longitude
                }
            }),
            contentType: 'application/json',
            success: result => completeRequest(result, pickupLocation),
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting ride: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when requesting your unicorn:\n' + jqXHR.responseText);
            }
        });
    }

    //  completeRequest
    //      a Unicorn has been dispatched to your location
    function completeRequest(result, pickupLocation) {
        var unicorn;
        var pronoun;

        console.log('Response received from API: ', result);
        unicorn = result.Unicorn;
        pronoun = unicorn.Gender === 'Male' ? 'his' : 'her';
        displayUpdate(unicorn.Name + ', your ' + unicorn.Color + ' unicorn, is on ' + pronoun + ' way.', unicorn.Color);

        console.log(pickupLocation);
        //  get the local weather, find nearby restaurants, movies
        // getWeather(pickupLocation, unicorn)

        animateArrival(function animateCallback() {
            displayUpdate(unicorn.Name + ' has arrived. Giddy up!', unicorn.Color);
            WildRydes.map.unsetLocation();

            $('#request').prop('disabled', 'disabled');
            $('#request').text('Set Pickup');
        });
    }

    // Register click handler for #request button
    $(function onDocReady() {
        $('#request').click(handleRequestClick);

        WildRydes.authToken.then(function updateAuthMessage(token) {
            if (token) {
                displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
                $('.authToken').text(token);
            }
        });

        if (!_config.api.invokeUrl) {
            $('#noApiMessage').show();
        }

        window.navigator.geolocation
            .getCurrentPosition(setLocation);

        //  put the map behind the updates list
        document.getElementById("map").style.zIndex = "10";

        function setLocation(loc) {
            map = L.map('map').setView([loc.coords.latitude, loc.coords.longitude], 13);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            WildRydes.map.center = {latitude: loc.coords.latitude, longitude: loc.coords.longitude};
            let b = map.getBounds();        //  TODO moved
            WildRydes.map.extent = {minLat: b._northEast.lat, minLng: b._northEast.lng,
                maxLat: b._southWest.lat, maxLng: b._southWest.lng};

            WildRydes.marker  = L.marker([loc.coords.latitude, loc.coords.longitude]).addTo(map);
            var myIcon = L.icon({
                iconUrl: 'images/unicorn-icon.png',
                iconSize: [25, 25],
                iconAnchor: [22, 24],
                shadowSize: [25, 25],
                shadowAnchor: [22, 24]
            });
            WildRydes.unicorn = L.marker([loc.coords.latitude, loc.coords.longitude], {icon: myIcon}).addTo(map);
            // WildRydes.marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();

            // var popup = L.popup();
            map.on('click', onMapClick);

            function onMapClick(e) {            //  TODO move to esri.js
                WildRydes.map.selectedPoint = {longitude: e.latlng.lng, latitude: e.latlng.lat};
                if (WildRydes.marker)       WildRydes.marker.remove();
                handlePickupChanged();

                WildRydes.marker  = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);

                // popup
                //     .setLatLng(e.latlng)
                //     .setContent("You clicked the map at " + e.latlng.toString())
                //     .openOn(map);
            }
        }
    });

    //  handlePickupChanged
    //      enable the Pickup button and set text to Request Unicorn
    function handlePickupChanged() {
        var requestButton = $('#request');
        requestButton.text('Request Unicorn');
        requestButton.prop('disabled', false);
    }

    //  handleRequestClick
    //      get current request location and POST request to server
    function handleRequestClick(event) {
        var pickupLocation =  WildRydes.map.selectedPoint;

        event.preventDefault();
        requestUnicorn(pickupLocation);
    }

    //  animateArrival
    //      animate the Unicorn's arrival to the user's pickup location
    function animateArrival(callback) {
        var dest = WildRydes.map.selectedPoint;
        var origin = {};

        if (dest.latitude > WildRydes.map.center.latitude) {
            origin.latitude = WildRydes.map.extent.minLat;
        } else {
            origin.latitude = WildRydes.map.extent.maxLat;
        }

        if (dest.longitude > WildRydes.map.center.longitude) {
            origin.longitude = WildRydes.map.extent.minLng;
        } else {
            origin.longitude = WildRydes.map.extent.maxLng;
        }

        WildRydes.map.animate(origin, dest, callback);
    }


}(jQuery));

//  these functions below here are my utility functions
//      to present messages to users
//      and to particularly add some 'sizzle' to the application

//  displayUpdate
//      nice utility method to show message to user
function displayUpdate(text, color='green') {
    $('#updates').prepend($(`<li style="background-color:${color}">${text}</li>`));
}

var $stocks = $("#Stocks"),
    animationend = (Modernizr.prefixed('animation') + "End").replace(/^ms/, "MS").replace(/^Webkit/, "webkit").replace(/^Moz.*/, "animationend");

////////////////////////////////////////
// Get stock data via YQL query
var getStocks = function () {
			
	var wsql = "select * from yahoo.finance.quotes where symbol in ('PWR')",
			stockYQL = 'https://query.yahooapis.com/v1/public/yql?q='+encodeURIComponent(wsql)+'&env=http%3A%2F%2Fdatatables.org%2Falltables.env&format=json&callback=?';
  
  return $.ajax({
    url: stockYQL,
    dataType: 'json'
  });
};


////////////////////////////////////////
// Format Numbers
var getRepString = function (rep) {
  rep = rep+''; // coerce to string
  if (rep >= 1000000000) {
    return (rep / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
  } else if (rep >= 1000000) {
    return (rep / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (rep >= 1000) {
    return (rep / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return rep; 
  }
}


////////////////////////////////////////
// Replace children with [data-replace] attribute given a data object
$.fn.dataReplace = function(data) {
  var $replacers = this.find("[data-replace]");
  
  if ( $replacers.length ) {
    $replacers.each(function(){
      var $this = $(this);
      var replace = $this.data("replace");
      var content = data[replace];
    
      if ( replace === 'Name' ) {
        content = content.replace(/\W/gi, ' ');
      } else if ( replace === 'Volume' ) {
        content = getRepString(content);
      }
  
      //console.log("replace",replace,":",data[replace]);
      $this.html(content);
    });
    return true;
  } else {
    return false;
  }
}

////////////////////////////////////////
// Update on Click
$stocks.on("click",function(){
  
  var _this = this;
	var $this = $(this);
  var _uniqueID = "stockLoad.unique"+Math.floor(Math.random() * (100 - 1) + 1);
  
  $this
    .removeClass("is-Loaded")
    .addClass("is-Loading");
  
  if ( $this.hasClass("is-Visible") ) {
    $this.css("animation-play-state", "running");
  }
  
  console.log("Triggering AJAX... ");
  
  $this
    .one(_uniqueID,function(data){
      
      console.log("_uniqueID",_uniqueID,"triggered");
      window.setTimeout(function(){
        
        $this.dataReplace($this.data("quote"));
        
        if ( ! $this.is(":visible") ) {
           $this.addClass("is-Visible").fadeIn(1000); 
        }
        
        $this
          .removeClass("is-Loading")
          .addClass("is-Loaded");
          //.html($this.data("stocks"));
        console.log("Done!");
      }, 600)
    })
    .on(animationend,function(event){
      $this.css("animation-play-state","paused");
    });
  
  getStocks().done(function(data){
    console.log("AJAX Returned.",data);
    
    //$this.data("stocks",formatStocks(data));
    $this.data("quote",data.query.results.quote);
    
    if ( Modernizr.cssanimations && $this.css("animation-play-state") === "running" ) {
      console.log("Animating!");
      $this.on(animationend,function(event){
          $this.trigger(_uniqueID);
      });
      
      window.setTimeout(function(){ 
        console.log("animation end no-trigger fallback");
        $this.trigger(_uniqueID);
      },2000);
    } else {
      console.log("Not animating.");
      $this.trigger(_uniqueID);
    }
  });
  
});

$stocks.hide().click();
