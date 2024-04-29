function panToIowa() {
    map.flyTo({
        center: [-93.53, 41.99],
        zoom: 6,
        pitch: 0,
        bearing: 0
    })
}

map.on('load', () => {
    map.addSource('air-facilities', {
        type: 'geojson',
        data: './assets/Air_Facilities.geojson',
        generateId: true // Ensure that each feature has a unique ID at the PROPERTY level
    });

    map.addLayer({
        'id': 'airfacilities-layer',
        'type': 'circle',
        'source': 'air-facilities',
        'paint': {
            'circle-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#FF0000', // Red color when hover state is true
                '#FFFFFF' // White color when hover state is false
            ],
            'circle-radius': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                7,
                3
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': 'white'
        }
    });
});

const idDisplay = document.getElementById('airid');
const labelDisplay = document.getElementById('maplabel');

let pointID = null;
let uniqueID = null;
let clickedPoint = false;
let clickedPointValues = [];

// General point interactivity
// Need to refactor to use mousemove instead (buggy with clusters of points)
map.on('mouseenter', 'airfacilities-layer', (event) => {
    map.getCanvas().style.cursor = 'pointer'
    const features = map.queryRenderedFeatures(event.point, { layers: ['airfacilities-layer']});
    // console.log('Features:', features); // For debugging

    if (uniqueID !==null) {
        map.setFeatureState(
            { source: 'air-facilities', id: uniqueID},
            { hover: false }
        );
    }
    pointID = event.features[0].properties.OBJECTID;
    uniqueID = event.features[0]['id'];

    map.setFeatureState(
        { source: 'air-facilities', id: uniqueID },
        { hover: true }
    );
    idDisplay.textContent = pointID;
    labelDisplay.textContent = event.features[0].properties.MAPLABELNA;
    
})

map.on('mouseleave', 'airfacilities-layer', () => {
    map.getCanvas().style.cursor ='default'

    console.log(` ${clickedPointValues} hovered: ${uniqueID}`);
    if (uniqueID !== null) {
        map.setFeatureState(
            { source: 'air-facilities', id: uniqueID },
            { hover: false }
        );
    }

    console.log(clickedPoint);
    if (!clickedPoint) {
        idDisplay.textContent = '';
        labelDisplay.textContent = '';
    } else if (clickedPoint) {
        idDisplay.textContent = clickedPointValues[1];
        labelDisplay.textContent = clickedPointValues[2];
        map.setFeatureState(
            { source: 'air-facilities', id: clickedPointValues[0] },
            { hover: true }
        );
    }
})

map.on('click', 'airfacilities-layer', (event) => {
    const features = map.queryRenderedFeatures(event.point, { layers: ['airfacilities-layer']});
    let coordinate = features[0].geometry.coordinates

    if (clickedPoint) {
        map.setFeatureState(
            { source: 'air-facilities', id: clickedPointValues[0] },
            { hover: false }
        )
    }

    map.flyTo({
        center: coordinate,
        pitch: 0,
        bearing: 0
    })
    clickedPoint = true;
    clickedPointValues = [
        event.features[0]['id'], 
        event.features[0].properties.OBJECTID, 
        event.features[0].properties.MAPLABELNA
    ];
    idDisplay.textContent = clickedPointValues[1];
    labelDisplay.textContent = clickedPointValues[2];
})

// Remove this function if not working properly
map.on('mousemove', 'airfacilities-layer', (event) => {
    map.getCanvas().style.cursor = 'pointer';

    const features = map.queryRenderedFeatures(event.point, { layers: ['airfacilities-layer'] });

    // Check if any features are hovered
    if (features.length > 0) {
        const hoveredFeature = features[0];
        const hoveredFeatureId = hoveredFeature.id;

        // If the hovered feature is different from the currently hovered feature
        if (hoveredFeatureId !== uniqueID) {
            // Clear feature state for the previously hovered feature
            if (uniqueID !== null) {
                map.setFeatureState(
                    { source: 'air-facilities', id: uniqueID },
                    { hover: false }
                );
            }

            // Update feature state for the newly hovered feature
            map.setFeatureState(
                { source: 'air-facilities', id: hoveredFeatureId },
                { hover: true }
            );

            // Update uniqueID to the newly hovered feature's id
            uniqueID = hoveredFeatureId;

            // Update UI with the hovered feature's information
            idDisplay.textContent = hoveredFeature.properties.OBJECTID;
            labelDisplay.textContent = hoveredFeature.properties.MAPLABELNA;
        }
    } else {
        // If no features are hovered, reset cursor, clear UI, and clear feature state
        map.getCanvas().style.cursor = 'default';
        idDisplay.textContent = '';
        labelDisplay.textContent = '';

        if (uniqueID !== null) {
            map.setFeatureState(
                { source: 'air-facilities', id: uniqueID },
                { hover: false }
            );
            uniqueID = null;
        }
    }
});
