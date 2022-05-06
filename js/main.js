// https://cartographicperspectives.org/index.php/journal/article/view/cp76-donohue-et-al/1307
// python -m http.server
// http://localhost:8000/ca-energy-consumption/


//TODO: LOADING BASEMAP USING LEAFLET
$(document).ready(function() {

    var propCNTY,
        propCNTY2,
        choroCNTY;

    var baseLayer = L.tileLayer(
        'https:api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia25vam8yMiIsImEiOiJjaXl2cW5xa3owMDF0MndwbjliM3cxZjFoIn0.sMpJ7AM4zm5NSPAAXmIVBQ', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' + ' &copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
        });

    var map = L.map('map', {
            center: [37.52715, -120.43213],
            zoom: 6.25,
            minZoom: 6.25,
            maxZoom: 9
        });

    
    //add zoom control that returns viewer to original zoom level
	map.addControl(new L.Control.ZoomMin());

    baseLayer.addTo(map);


    //set global variable that will house the overlay control panel
    // var control;

   
    // L.control.layers().addTo(map);




    /*-------------------------------------------------------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /*---------------------------TODO:(CHOROPLETH MAP)-------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /*-------------------------------------------------------------------------------*/
    
    //data for choropleth map
    // var choroData = createChoroMap();

    $.ajax("data/FINALchoroData.geojson", {//FIXME:
        dataType: "json",
        success: function(response){
           
            var attr = processChoroData(response);
            createChoroMap(attr.timestamps, response);
            // createSliderUI(attr.timestamps);
            // console.log("ATTR.timestamps:", attr.timestamps);
            //ADD FIFTH OPERATOR (OVERLAY) TO CONTROL PANEL
            // control.addOverlay(choroCNTY, "Choropleth");
        }
    }).fail(function() { alert("There has been a problem loading the choropleth data.")});

    function createChoroMap(timestamps, data) {
        //create a Leaflet GeoJSON layer and add it to the map
        // console.log("createChoroMap()-data.features=", data.features);
        choroCNTY = L.geoJson(data, {
            style: getChoroStyle,
            onEachFeature: onEachFeature
            // onEachFeature: updateChoroMap
        }).addTo(map).bringToBack();
        updateChoroMap(timestamps[0]);
    }



    var tstamps = [];
    function processChoroData(data) {
        // var timestamps = [];
        var min = Infinity; 
        var max = -Infinity;
        for(var feature in data.features) {
            var properties = data.features[feature].properties; 
            for (var attribute in properties) {
                if ( attribute != 'OBJECTID' && attribute != 'CountyName' && attribute != 'CNTY_FIPS' && attribute != 'FIPS') {
                    if ( $.inArray(attribute, tstamps) === -1) {
                        tstamps.push(attribute);
                        // console.log(attribute);
                    }
                    if (properties[attribute] < min) {	
                        min = properties[attribute];
                    }
                    if (properties[attribute] > max) { 
                        max = properties[attribute]; 
                    }
                }
            }
        }
        // console.log("Energy Use tstamps:", tstamps);
        return {
            timestamps: tstamps,
            min : min,
            max : max
        }
    }

    //function that classifies and applies color swatches to choropleth data
    function getColor(d) {
        // console.log("getColor()-d=", d);
        if (d != 0) {
            return d < 2000 ? '#f2f0f7' :
            d < 6000  ? '#cbc9e2' :
            d < 11000 ? '#9e9ac8' :
            d < 20000 ? '#756bb1' :
            d < 70000 ? '#54278f' :
                        '#808080' ;
        } else {
            return '#808080';
        }
    }





    //FIXME: MODIFIED FUNCTION
    function getChoroStyle(feature, timestamp) {
        // console.log("getChoroStyle()-feature.properties[timestamp]=", feature.properties[timestamp]);
        return {
            fillColor: getColor(feature.properties[timestamp]),//FIXME:
            weight: 0.5,
            opacity: 1,
            color: '#000',
            fillOpacity: 1
        };
    }



    //FIXME: MODIFIED FUNCTION
    function updateChoroMap(timestamp) {
        choroCNTY.eachLayer(function(layer) {
            console.log("LAyer=",layer);
            var countyName = layer.feature.properties["CountyName"];
            console.log("countyName=", countyName);
            var props = layer.feature.properties[timestamp];
            console.log("updateChoroMap()-layer.feature.properties[",timestamp,"]=", props);
            var color = getColor(props);
            // console.log("COLOR=", color);
            // getChoroStyle(layer.feature, timestamp);
            layer.setStyle({
                fillColor: color,//FIXME:
                weight: 0.5,
                opacity: 1,
                color: '#000',
                fillOpacity: 1
            }).on({
                mouseover: function(e) {
                    console.log(e);
                    highlightChoro(e, timestamp, countyName);
                },
                mouseout: function(e) {
                    resetChoro(e, timestamp);
                    // info.update();
                }
            });
            // console.log("updateChoroMap()-props[timestamp]:", props[timestamp]);
            // info.update(props[timestamp]);
        });
    }

    function highlightChoro(e, timestamp, countyName) {
        var gWh = e.target.feature.properties[timestamp];
        var layer = e.target;
        layer.setStyle({
            weight: 2.5,
            color: 'black',
            fillOpacity: 1
        });
        info.update(e, timestamp, countyName, gWh);
    }

    function resetChoro(e, timestamp) {
        console.log("resetHighlightFeature()-e.target.feature.properties[",timestamp,"]",
                                 e.target.feature.properties[timestamp]);
        var layer = e.target;
        // choroCNTY.resetStyle(e.target);
        layer.setStyle({
            weight: 0.5,
            color: 'black',
            fillOpacity: 1
        });
        // info.update(e, timestamp, countyName, gWh);
    }
    


    //to add the listeners on our county layers
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
    info.update = function (e, timestamp, countyName, gWh) {
        console.log("update()-props:", timestamp);
        console.log("gWh=", gWh);
        this._div.innerHTML = '<h6  style="color:#54278f">California Energy Consumption</h6>' +  (
            gWh ? '<b>' + countyName + '</b> (' + timestamp + ')<br>' + gWh + ' <i>GWh</i>': '(Hover over a County)');
    };

    // event listener for layer mouseover event
    function highlightFeature(e) {
        // console.log("highlightFeature()-e.target", e.target.feature.properties);
        /* var layer = e.target;
        layer.setStyle({
            weight: 2.5,
            color: 'black',
            fillOpacity: 1
        }); */
        /* if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        } */
        info.update();
    }

    //define what happens on mouseout
    function resetHighlight(e) {
        /* var layer = e.target;
        // choroCNTY.resetStyle(e.target);
        layer.setStyle({
            weight: 0.5,
            color: 'black',
            fillOpacity: 1
        }) */
        info.update();
    }

    // click listener that zooms to the area
    function zoomToFeature(e) {//FIXME:
        map.fitBounds(e.target.getBounds());
    }

    info.addTo(map);
    

    //TODO: Custom Legend Control
    var legend = L.control({position: 'bottomleft'}); //FIXME:

    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend'),
            grades = [70000, 20000, 11000, 6000, 2000],
            labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            labels.push(
                '<i style="background:' + getColor(grades[i]-1) + '"></i>' +
                ' < ' + grades[i] + '<br>')
        }
        div.innerHTML = labels.join('');
        return div;
    };
    legend.addTo(map);


    
    /*-------------------------------------------------------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /*---------------------------TODO:(PROP SYMBOL MAP)------------------------------*/
    /*-------------------------------------------------------------------------------*/
    /*-------------------------------------------------------------------------------*/
    
    //data for proportional symbol map
    $.ajax("data/TotalGen.geojson", { //FIXME: Change geoJson file HERE!
        dataType: "json", 
        success: function(data) {
            var info = processData(data);
            createPropSymbols1(info.timestamps, data);
            // createLegend(info.min, info.max);
            // createSliderUI(info.timestamps);
        }
    }).fail(function() { alert("There has been a problem loading the proportional symbol data.")});

    $.ajax("data/RenewGen.geojson", { //FIXME: Change geoJson file HERE!
            dataType: "json", 
            success: function(data) {
                var info = processData(data);
                createPropSymbols2(info.timestamps, data);
                createLegend(info.min, info.max);
                createSliderUI(info.timestamps);
            }
        }).fail(function() { alert("There has been a problem loading the proportional symbol data.")});

    //TODO: PROCESSING THE GEOJSON
    function processData(data) {
        var timestamps = [];
        var min = Infinity; 
        var max = -Infinity;

        for (var feature in data.features) {

            var properties = data.features[feature].properties; 

            for (var attribute in properties) { 
                if ( attribute != 'County') { //FIXME: Changed according to column header
                        
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
    function createPropSymbols1(timestamps, data) {
        propCNTY = L.geoJson(data, {
            //TODO: REPLACING TEARDROP WITH CIRCLE MARKERS & 
            // ADDING EVENT LISTENERS FOR A POPUP WINDOW
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    fillColor: '#ffb347', //'#000', //'#846954',
                    color: '#ff7800b4', //"#846954",
                    weight: 1,
                    fillOpacity: 0.7  //0.6
                }).on({
                    mouseover: function(e) {
                        this.openPopup();
                        this.setStyle({color: 'yellow', weight:1.5, fillColor: '#ffb347', fillOpacity: 0});
                    },
                    mouseout: function(e) {
                        this.closePopup();
                        this.setStyle({color: "#ff7800b4", weight:1, fillColor: '#ffb347', fillOpacity: 0.7});
                    }
                });
            }
        }).addTo(map).bringToFront();
        // Updating the proportional circles by timestamp
        updatePropSymbols(timestamps[0]);
    }

    function createPropSymbols2(timestamps, data) {
        propCNTY2 = L.geoJson(data, {
            //TODO: REPLACING TEARDROP WITH CIRCLE MARKERS & 
            // ADDING EVENT LISTENERS FOR A POPUP WINDOW
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    fillColor: "#a5d74d", // #708598
                    color: "#a5d74d",
                    weight: 1,
                    fillOpacity: 0.5
                }).on({
                    mouseover: function(e) {
                        this.openPopup();
                        this.setStyle({color: 'yellow', weight:1.5, fillColor: '#a5d74d', fillOpacity: 0.2});
                    },
                    mouseout: function(e) {
                        this.closePopup();
                        this.setStyle({color: "#a5d74d", weight:1, fillColor: '#a5d74d', fillOpacity: 0.5});
                    }
                });
            }
        }).addTo(map).bringToFront();
        // Updating the proportional circles by timestamp
        updatePropSymbols(timestamps[0]);
    }

    //TODO: SCALING THE PROPORTIONAL CIRCLES
    function updatePropSymbols(timestamp) {
        propCNTY.eachLayer(function(layer) {
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[timestamp]);
            //build popup content string
            var popupContent = "<b>County:</b> " + props.County + "<br>" +//FIXME:
                    "<b>Total Energy Generation (" + timestamp +
                    ") </b><br>" + String(props[timestamp]*.001) + " <i>GWh</i>";

            layer.setRadius(radius);
            layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) });
        });
        propCNTY2.eachLayer(function(layer) {
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[timestamp]);
            //build popup content string
            var popupContent = "<b>County:</b> " + props.County + "<br>" +//FIXME:
                    "<b>Renewable Energy Generation (" + timestamp +
                    ") </b><br>" + String(props[timestamp]*.001) + " <i>GWh</i>";

            layer.setRadius(radius);
            layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) });
        });
    }

    function calcPropRadius(attributeValue) {
        var scaleFactor = 0.00007; //FIXME: was = 16
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
        	var classes = [roundNumber(min)+999920 , roundNumber(max)*1.33-858190.5 ];
        	var legendCircle;  
        	var lastRadius = 0;
        	var currentRadius;
        	var margin;
        	L.DomEvent.addListener(legendContainer, 'mousedown', function(e) { //disable the panning of the tileset underneath  the legend
            	L.DomEvent.stopPropagation(e);
        	});  
        	$(legendContainer).append("<h6 id='legendTitle' style='color:#ff7800b4'>CA Energy Generation<br>(2011-2020)</h6>");//FIXME:
        	for (var i = 0; i <= classes.length-1; i++) {  
        		legendCircle = L.DomUtil.create("div", "legendCircle");  
        		currentRadius = calcPropRadius(classes[i]);
        		margin = -currentRadius - lastRadius;
        		$(legendCircle).attr("style", "width: " + currentRadius*2 + 
        			"px; height: " + currentRadius*2 + 
        			"px; margin-left: " + margin + "px" );				
        		$(legendCircle).append("<span class='legendValue'>"+classes[i]*0.001+" GWh</span>");
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
    			// L.DomEvent.stopPropagation(e); //FIXME: NOT WORKING!
                map.dragging.disable();
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
                updateChoroMap($(this).val().toString());
                $(".temporal-legend").text(this.value);
    	  	    });
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


});
