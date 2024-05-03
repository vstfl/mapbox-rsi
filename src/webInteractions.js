
import { queryImagesByDateRange } from './firebaseHandler.js';
import { updateMapData } from './mapInteractions.js';
import * as geojson from 'geojson';

// Handle realtime toggle
const consoleContainer = document.getElementById('inner-console');
const consoleBreak = document.getElementById('console-break');
const realtimeToggle = document.querySelector("#realtime-toggle");
const archivedQuery = document.querySelectorAll(".archived-query");
let realtimeState = false;

realtimeToggle.addEventListener('change', e => {
    if (e.target.checked) {
        realtimeState = true;
        archivedQuery.forEach(query => {
            query.style.display = 'none';
        });
    } else {
        realtimeState = false;
        archivedQuery.forEach(query => {
            query.style.display = "flex";
        });
    }
    console.log(`Realtime: ${realtimeState}`);
});

//

// Handle console shift toggle button
document.getElementById('shift-button').addEventListener('click', function() {
    document.getElementById('console').classList.toggle('shifted');
    document.getElementById('shift-button').classList.toggle('shifted');
    var arrowImg = document.getElementById('arrow-img');
    arrowImg.classList.toggle('flipped');
}); 


// Handle range slider value change visual
const slider = document.getElementById('time-range');
const sliderValue = document.getElementById('slider-value')
let currentRange = 0;
slider.addEventListener('input', function() {
    sliderValue.textContent = this.value;
    currentRange = this.value;
    console.log(currentRange);
})

// Handle form submission for querying
document.getElementById('query-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent form submission
    
    if (!realtimeState) {
        const formData = new FormData(this);
        const date = formData.get('calendar');
        const window = formData.get('window');
        
        console.log('Date:', date);
        console.log('Window:', window);
        
        const [startTimestamp, endTimestamp] = calculateDataRange(date, window);
        const imageQuery = await queryImagesByDateRange( startTimestamp, endTimestamp );
        const newGeoJSON = convertToGeoJSON(imageQuery);

        const geojsonString = JSON.stringify(newGeoJSON, null, 2);
        console.log(geojsonString);
        updateMapData(newGeoJSON);
    }
});

// Logic to update website every minute if in realtime mode
function updateRealtimeData() {
    if (realtimeState){
        let d = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        console.log('Window:', currentRange);
        console.log(`Latest map update: ${d}`)
    } else {
        console.log('Not in realtime state, not updating map');
    }
}
setInterval(updateRealtimeData, 60000);

function calculateDataRange(date, windowSize) {
    const dateTime = new Date(date);
    const startDate = new Date(dateTime.getTime() - (windowSize * 60000));
    const endDate = new Date(dateTime.getTime() + (windowSize * 60000));
    return [startDate, endDate];
}

function convertToGeoJSON(pointList) {
    let data = [];
    for (const point of pointList) {
        const base = point['data'];
        const id = point['id'];
        // Grab and organize all relevant values
        const lat = base['Position']["latitude"];
        const lng = base['Position']['longitude'];
        const classification = {
            Undefined: base['Undefined'],
            Bare: base['Bare'],
            Full: base['Full'],
            Partly: base['Partly']
        };
        const url = base["IMAGE_URL"];
        const timestamp = base['Date']['seconds']

        data.push({
            id: id,
            lat: lat,
            lng: lng,
            class: classification,
            url: url,
            timestamp: timestamp
        })
    }

    return geojson.parse(data, {Point: ['lat', 'lng']})
}