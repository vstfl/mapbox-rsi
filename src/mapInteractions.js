import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1IjoidXJiaXp0b24iLCJhIjoiY2xsZTZvaXd0MGc4MjNzbmdseWNjM213eiJ9.z1YeFXYSbaMe93SMT6muVg';
            const map = new mapboxgl.Map({
                container: 'map', 
                style: 'mapbox://styles/urbizton/clve9aeu900c501rd7qcn14q6', // Default Dark

                center: [-93.53, 41.99],
                zoom: 6.4,
                maxZoom: 14,
            });
            map.addControl(new mapboxgl.NavigationControl({visualizePitch: true}),'bottom-right');
            map.addControl(new mapboxgl.ScaleControl({maxWidth: 300, unit: 'imperial'})); // see if i can modify positioning later

function panToIowa() {
    map.flyTo({
        center: [-93.53, 41.99],
        zoom: 6,
        pitch: 0,
        bearing: 0
    })
}

let changedState = false;
let currentGeoJSON;
// Initial state of map, also ensures points stay the same when style changes
map.on('style.load', () => {
    map.resize()
    console.log('Map resized')
    if (!changedState) {
        // addPointLayer('./assets/Air_Facilities.geojson')
        updateMapData(currentGeoJSON)
    }
    if (changedState) {
        updateMapData(currentGeoJSON);
    }
});

// Handle update of map data
export function updateMapData(newGeoJSON) {
    if (map.getLayer('latestLayer')) {
        map.removeLayer('latestLayer');
    }
    if (map.getSource('latestSource')) {
        map.removeSource('latestSource');
    }
    addPointLayer(newGeoJSON);
    changedState = true;
    currentGeoJSON = newGeoJSON;
}

// Customize visualization/interactivity of geoJSON data here
function addPointLayer(geojsonSource) {
    map.addSource('latestSource', {
        type: 'geojson',
        data: geojsonSource,
        generateId: true // Ensure that each feature has a unique ID at the PROPERTY level
    });

    // map.addLayer({
    //     'id': 'latestLayer',
    //     'type': 'circle',
    //     'source': 'latestSource',
    //     'paint': {
    //         'circle-color': [
    //             'case',
    //             ['boolean', ['feature-state', 'hover'], false],
    //             '#FF0000', // Red color when hover state is true
    //             '#FFFFFF' // White color when hover state is false
    //         ],
    //         'circle-radius': [
    //             'case',
    //             ['boolean', ['feature-state', 'hover'], false],
    //             8, // Larger when true
    //             3
    //         ],
    //         'circle-stroke-width': 1,
    //         'circle-stroke-color': 'white'
    //     }
    // });

    map.addLayer({
        'id': 'latestLayer',
        'type': 'circle',
        'source': 'latestSource',
        'paint': {
            'circle-color': [
                'match',
                ['get', 'classification'],
                'Undefined', '#FFB200',
                'Bare', '#000000',
                'Partly', '#B2B2B2',
                'Full', '#FFFFFF',
                '#FFFFFF'
            ],
            'circle-radius': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                9, // Larger when true
                5
            ],
            'circle-stroke-width': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                2,
                0.5
            ],
            'circle-stroke-color': 'white',
            'circle-emissive-strength': 20,
            'circle-sort-key': 'timestamp'
        }
    });
}


// Handle map style change
document.addEventListener("DOMContentLoaded", function() {
    const radios = document.querySelectorAll('.map-styles input[type="radio"]');
    
    radios.forEach(radio => {
      radio.addEventListener("click", function() {
        if (this.checked) {
          const mapStyle = this.value;
          setMapStyle(mapStyle);
        }
      });
    });
  
    function setMapStyle(style) {
        map.setStyle('mapbox://styles/urbizton/' + style);
      console.log("Map style set to:", style);
    }
});

const idDisplay = document.getElementById('pointID');
const timeDisplay = document.getElementById('pointTimestamp');
const imageDisplay = document.getElementById('pointImage');

let pointID = null;
let uniqueID = null;
let clickedPoint = false;
let clickedPointValues = {};

// General point interactivity
map.on('mouseleave', 'latestLayer', () => {
    map.getCanvas().style.cursor ='default'

    // console.log(` ${clickedPointValues} hovered: ${uniqueID}`);
    if (uniqueID) {
        map.setFeatureState(
            { source: 'latestSource', id: uniqueID },
            { hover: false }
        );
    }

    // console.log(clickedPoint);
    if (!clickedPoint) {
        idDisplay.textContent = '';
        timeDisplay.textContent = '';
        imageDisplay.src = '';
    } else if (clickedPoint) {
        idDisplay.textContent = clickedPointValues.avlID;
        timeDisplay.textContent = clickedPointValues.timestamp;
        imageDisplay.src = clickedPointValues.image;
        map.setFeatureState(
            { source: 'latestSource', id: clickedPointValues.specificID },
            { hover: true }
        );
    }
})

map.on('click', 'latestLayer', (event) => {
    const features = map.queryRenderedFeatures(event.point, { layers: ['latestLayer']});
    let coordinate = features[0].geometry.coordinates

    if (clickedPoint) {
        map.setFeatureState(
            { source: 'latestSource', id: clickedPointValues.specificID },
            { hover: false }
        )
    }

    map.flyTo({
        center: coordinate,
        pitch: 0,
        bearing: 0
    })
    
    clickedPoint = true;

    // Define how values are interpreted
    let eventProperties = event.features[0].properties

    clickedPointValues = {
        specificID: event.features[0]['id'], 
        avlID: eventProperties.id, 
        timestamp: timestampToISOString(eventProperties.timestamp),
        classification: eventProperties.classification,
        classes: eventProperties.class,
        image: eventProperties.url
    };

    idDisplay.textContent = clickedPointValues.avlID;
    timeDisplay.textContent = clickedPointValues.timestamp;
    imageDisplay.src = clickedPointValues.image;
})

function timestampToISOString(timestamp) {
    var date = new Date(timestamp * 1000);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var year = date.getFullYear();
    var hours = ('0' + date.getHours()).slice(-2);
    var minutes = ('0' + date.getMinutes()).slice(-2);
    
    return month + '-' + day + '-' + year + ' ' + hours + ':' + minutes;
}

// Remove this function if not working properly
map.on('mousemove', 'latestLayer', (event) => {
    map.getCanvas().style.cursor = 'pointer';

    const features = map.queryRenderedFeatures(event.point, { layers: ['latestLayer'] });

    // Check if any features are hovered
    if (features.length > 0) {
        const hoveredFeature = features[0];
        const hoveredFeatureId = hoveredFeature.id;

        // If the hovered feature is different from the currently hovered feature
        if (hoveredFeatureId !== uniqueID) {
            // Clear feature state for the previously hovered feature
            if (uniqueID) {
                map.setFeatureState(
                    { source: 'latestSource', id: uniqueID },
                    { hover: false }
                );
            }

            // Update feature state for the newly hovered feature
            map.setFeatureState(
                { source: 'latestSource', id: hoveredFeatureId },
                { hover: true }
            );

            // Update uniqueID to the newly hovered feature's id
            uniqueID = hoveredFeatureId;

            // Update UI with the hovered feature's information
            idDisplay.textContent = hoveredFeature.properties.id;
            timeDisplay.textContent = timestampToISOString(hoveredFeature.properties.timestamp);
            imageDisplay.src = hoveredFeature.properties.url;
        }
    } else {
        // If no features are hovered, reset cursor, clear UI, and clear feature state
        map.getCanvas().style.cursor = 'default';
        idDisplay.textContent = '';
        timeDisplay.textContent = '';
        imageDisplay.src = '';

        if (uniqueID !== null) {
            map.setFeatureState(
                { source: 'latestSource', id: uniqueID },
                { hover: false }
            );
            uniqueID = null;
        }
    }
});


