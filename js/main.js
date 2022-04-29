// https://cartographicperspectives.org/index.php/journal/article/view/cp76-donohue-et-al/1307
// python -m http.server
// http://localhost:8000/ca-energy-consumption/



//TODO: LOADING BASEMAP USING LEAFLET
$(document).ready(function() {

    var cities;

    //data for proportional symbol map
    var propData = $.ajax("data/finalPropData.geojson", { //FIXME: Change geoJson file HERE!
                        dataType: "json", 
                        success: function(data) {
                            var info = processData(data);
                            createPropSymbols(info.timestamps, data);
                            createLegend(info.min, info.max);
                            createSliderUI(info.timestamps);
                        }
                    }).fail(function() { alert("There has been a problem loading the proportional symbol data.")});

    //data for choropleth map
    var choroData = getChoroData();

    var baseLight = L.tileLayer(
        'https:api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia25vam8yMiIsImEiOiJjaXl2cW5xa3owMDF0MndwbjliM3cxZjFoIn0.sMpJ7AM4zm5NSPAAXmIVBQ', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' + ' &copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
        });

    /* var baseDark = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        }); */

        
    var map = L.map('map', {
        center: [37.52715, -120.43213],
        zoom: 6.25,
        minZoom: 6.25,
        // maxZoom: 6.25
    });



    /* //add zoom control that returns viewer to original zoom level
	map.addControl(new L.Control.ZoomMin())
    
    
    var baseData = {
        'Light Basemap': baseLight,
        'Dark Basemap': baseDark
    };

    var overlayData = {
        'RPP Index (2010-2020)': propData,
        'Change of RPP in 2020': choroData
    };
    
    var layerControl = L.control.layers(baseData, overlayData, {
                            collapsed: false
                        }).addTo(map);

    map.on("baselayerchange", function(event) {
        console.log("clicked on base layer: " + event.layer);
        if (event.layer == 'Light Basemap') {
            propData.addTo(map);
            layerControl._update();
        } else {
            choroData.addTo(map);
            legend.addTo(map);
            layerControl._update();
        }
    }); */

    baseLight.addTo(map);

    L.control.layers().addTo(map);


    //TODO: PROCESSING THE GEOJSON
    function processData(data) {
        var timestamps = [];
        var min = Infinity; 
        var max = -Infinity;

        for (var feature in data.features) {

            var properties = data.features[feature].properties; 

            for (var attribute in properties) { 
                if ( attribute != 'id' &&
                attribute != 'GeoFips' &&
                attribute != 'GeoName' && //FIXME: Changed according to column header
                attribute != 'lat' && //FIXME: Changed according to column header
                attribute != 'lon' ) { //FIXME: Changed according to column header
                        
                    if ( $.inArray(attribute,timestamps) === -1) {
                        timestamps.push(attribute);		
                    }
                    if (properties[attribute] < min) {	
                        min = properties[attribute];
                    }
                    if (properties[attribute] > max) { 
                        max = properties[attribute]; 
                    }
                }
            }
            //check
            //console.log(properties);
        }
        return {
            timestamps : timestamps,
            min : min,
            max : max
        }
    }

    //TODO: ADDING TEARDROP MARKERS TO THE MAP
    function createPropSymbols(timestamps, data) {
        cities = L.geoJson(data, {
            //TODO: REPLACING TEARDROP WITH CIRCLE MARKERS & 
            // ADDING EVENT LISTENERS FOR A POPUP WINDOW
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    fillColor: "#ff7800", // #708598
                    color: "#ff7800",
                    weight: 1,
                    fillOpacity: 0.6
                }).on({
                    mouseover: function(e) {
                        this.openPopup();
                        this.setStyle({color: 'yellow', fillColor: 'yellow', fillOpacity: 0.4});
                    },
                    mouseout: function(e) {
                        this.closePopup();
                        this.setStyle({color: "#ff7800", fillColor: '#ff7800', fillOpacity: 0.6});
                    }
                });
            }
        }).addTo(map);

        // Updating the proportional circles by timestamp
        updatePropSymbols(timestamps[0]);

    }

    //TODO: SCALING THE PROPORTIONAL CIRCLES
    function updatePropSymbols(timestamp) {
        cities.eachLayer(function(layer) {
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[timestamp]);
            //build popup content string
            var popupContent = "<b>City/MSA:</b> " + props.GeoName + "<br>" +//FIXME:
                    "<b>RPP in " + timestamp +
                    ": </b>" + String(props[timestamp]);

            layer.setRadius(radius);
            layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) });
        });
    }
    function calcPropRadius(attributeValue) {
        var scaleFactor = 5; //FIXME: was = 16
        var area = attributeValue * scaleFactor;
        return Math.sqrt(area/Math.PI)*2;			
    }

    //TODO: CREATING A MAP LEGEND
    function createLegend(min, max) {
    	if (min < 80) {	
    		min = 80; 
    	}
    	function roundNumber(inNumber) {
    		return (Math.round(inNumber/10) * 10);  
    	}
    	var legend = L.control( { position: 'bottomleft' } );
        
    	legend.onAdd = function(map) {
        	var legendContainer = L.DomUtil.create("div", "legend");  
        	var symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
        	var classes = [roundNumber(min)-30, roundNumber(max)]; 
        	var legendCircle;  
        	var lastRadius = 0;
        	var currentRadius;
        	var margin;
        	L.DomEvent.addListener(legendContainer, 'mousedown', function(e) { //disable the panning of the tileset underneath  the legend
            	L.DomEvent.stopPropagation(e); 
        	});  
        	$(legendContainer).append("<h6 id='legendTitle'>CA Energy Consumption<br>(2010-2020)</h6>");//FIXME:
        	for (var i = 0; i <= classes.length-1; i++) {  
        		legendCircle = L.DomUtil.create("div", "legendCircle");  
        		currentRadius = calcPropRadius(classes[i]);
        		margin = -currentRadius - lastRadius;
        		$(legendCircle).attr("style", "width: " + currentRadius*2 + 
        			"px; height: " + currentRadius*2 + 
        			"px; margin-left: " + margin + "px" );				
        		$(legendCircle).append("<span class='legendValue'>"+classes[i]+"</span>");
        		$(symbolsContainer).append(legendCircle);
        		lastRadius = currentRadius;
        	}
        	$(legendContainer).append(symbolsContainer); 
        	return legendContainer; 
        };
        legend.addTo(map);  
    } // end of createLegend();

    //TODO: CREATING A TEMPORAL SLIDER
    function createSliderUI(timestamps) {
    	var sliderControl = L.control({ position: 'bottomleft'} );
    	sliderControl.onAdd = function(map) {
    		var slider = L.DomUtil.create("input", "range-slider");
    		L.DomEvent.addListener(slider, 'mousedown', function(e) { // disable the panning of the tileset underneath the slider
    			L.DomEvent.stopPropagation(e); //FIXME: NOT WORKING!
    		});
            //set slider attributes
    		$(slider).attr({
                    'type':'range', 
        			'max': timestamps[timestamps.length-1], 
    	    		'min': timestamps[0], 
    		    	'step': 1, //FIXME: set to 1 to increment by one year etc.
                    'value': String(timestamps[0])})
    	  		.on('input change', function() {
    	  		updatePropSymbols($(this).val().toString());
                  $(".temporal-legend").text(this.value);
    	  	});
            //add reverse and forward buttons(images)
            /* $('#reverse').html('<img src="img/reverse.png">');
            $('#forward').html('<img src="img/forward.png">'); */
    		return slider;
    	}
    	sliderControl.addTo(map)
        createTemporalLegend(timestamps[0]); 
    }

    //TODO: CREATING A TEMPORAL LEGEND
    function createTemporalLegend(startTimestamp) {
    	var temporalLegend = L.control({ position: 'bottomleft' }); 
    	temporalLegend.onAdd = function(map) { 
    		var output = L.DomUtil.create("output", "temporal-legend");
    		$(output).text(startTimestamp)
        	return output; 
        }
        temporalLegend.addTo(map); 
    }

    //TODO: FIFTH OPERATOR (Add choropleth map)

    //set global variable that will house the overlay control panel
    var control;

    //function that will load choropleth overlay data
    function getChoroData(){
        //load the data with callback function
        $.ajax("data/finalChoroData.geojson", {//FIXME:
            dataType: "json",
            success: function(response){
    
               //create a Leaflet GeoJSON layer and add it to the map
                L.geoJson(response, {
                    style: style,
                    onEachFeature: onEachFeature
                }).addTo(map);
                // L.control.layers(response).addTo(map);
            }
        });
    };

    //function that classifies and applies color swatches to choropleth data
    function getColor(d) {
        if (d != 0) {
            return d < -2  ? '#2c7bb6' :
            d < -1  ? '#abd9e9' :
            // d == 0 ? '#808080' :
            d < 0  ? '#ffffbf' :
            d < 1.5  ? '#fdae61' :
            d < 3.4 ? '#d7191c' :
                    '#808080';
        } else {
            return '#808080';
        }        
    }


    //function that sets the attribute being mapped (F2020wrt2019)
    //also sets styling of line weights and fills
    function style(feature) {
        return {
            fillColor: getColor(feature.properties["F2020wrt20"]),//FIXME:
            weight: 1,
            opacity: 1,
            color: 'white',
            // dashArray: '3',
            fillOpacity: 0.6
        };
    }


    //Adding Interaction
    var geojson;
    // ... our listeners
    //geojson = L.geoJson(...);
    geojson = L.geoJson(choroData, {//FIXME:
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    // event listener for layer mouseover event
    function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 2,
            color: '#125757',
            // dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        info.update(layer.feature.properties);
    }

    //define what happens on mouseout
    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        info.update();
    }

    // click listener that zooms to the area
    function zoomToFeature(e) {//FIXME:
        map.fitBounds(e.target.getBounds());
    }

    //to add the listeners on our state/msa layers
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    //TODO: Custom Info Control
    var info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    info.update = function (props) {
        this._div.innerHTML = '<h6  style="color:#993404">CA Energy Consumption</h6>' +  ( //FIXME:
            props ? '<b>' + props.NAME + '</b><br>' + props.F2020wrt20:
            // props.F2020wrt20 == 0 ? 'No Data' : //FIXME:
            '(Hover over a County)'
            );
    };

    info.addTo(map);

    //TODO: Custom Legend Control
    var legend = L.control({position: 'bottomleft'}); //FIXME:

    legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [-2, -1, 0, 1.5, 3.4],//FIXME:
            labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        /* for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? ' &ndash; ' + grades[i + 1] + '<br>' : '');
        } */
        for (var i = 0; i < grades.length; i++) {
            labels.push(
                '<i style="background:' + getColor(grades[i]-1) + '"></i>' +
                ' < ' + grades[i] + '<br>')
        }
        div.innerHTML = labels.join('') + '<br><i style="background:#808080"></i>' + 'No data available';
        return div;
    };
    legend.addTo(map);


});
