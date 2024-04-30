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
            query.style.display = "block";
        });
    }
    console.log(`Realtime: ${realtimeState}`);
});

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

//Example query
// firebase.database().ref('your/path').orderByChild('value').equalTo(currentValue).once('value').then(function(snapshot) {
// })

// Handle form submission for querying
document.getElementById('query-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
    
    if (!realtimeState) {
        const formData = new FormData(this);
        const date = formData.get('calendar');
        const window = formData.get('window');
        
        // Store form data in variables or pass it to a function for Firebase query
        // Example:
        // firebaseQuery(date, window);
        
        console.log('Date:', date);
        console.log('Window:', window);
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
