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



// map.on('mousemove', 'airfacilities-layer', (event) => {
//     const features = map.queryRenderedFeatures(event.point, { layers: ['airfacilities-layer'] });

//     // console.log('Features:', features); // Debug logging

//     // Change cursor style
//     map.getCanvas().style.cursor = features.length ? 'pointer' : '';

//     if (!features.length) {
//         idDisplay.textContent = ''; // Clear the ID display if no feature is under the cursor
//         // Remove feature state if there's a previous feature
//         if (pointID) {
//             map.setFeatureState({
//                 source: 'air-facilities',
//                 id: pointID},
//                 {hover: false
                
//                 });
//             pointID = null; // Reset pointID
//         }
//         return;
//     }
    
//     console.log(features)
//     const objectId = features[0].properties.OBJECTID;
//     idDisplay.textContent = objectId;

//     // Check if features[0].id is valid
//     console.log('Feature ID:', objectId); // Debug logging

//     // Remove previous feature state
//     if (pointID) {
//         map.setFeatureState({
//             source: 'air-facilities',
//             id: 'cheese'},
//             {hover: false

//         });
//     }

//     pointID = objectId;

//     Set feature state for the current feature
//     map.setFeatureState(
//         { source: 'air-facilities', id: 'cheese' },
//         { hover: true }
//     );

// });