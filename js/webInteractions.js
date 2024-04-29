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
slider.addEventListener('input', function() {
    sliderValue.textContent = this.value;
})

//Example query
// firebase.database().ref('your/path').orderByChild('value').equalTo(currentValue).once('value').then(function(snapshot) {
// });

document.getElementById('query-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
    
    const formData = new FormData(this);
    const date = formData.get('calendar');
    const window = formData.get('window');
    
    // Store form data in variables or pass it to a function for Firebase query
    // Example:
    // firebaseQuery(date, window);
    
    console.log('Date:', date);
    console.log('Window:', window);
});