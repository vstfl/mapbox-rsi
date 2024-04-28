document.getElementById('query-date').addEventListener('change', function() {
    var selectedDate = this.value;
    console.log('Selected Date:', selectedDate);
});

// Function to log the current value of the range input
document.getElementById('time-range').addEventListener('input', function() {
    var currentValue = this.value;
    console.log('Current Range Value:', currentValue);
});

//Example query
// TODO: Define as function, and pass it into either of the udpates above
// firebase.database().ref('your/path').orderByChild('value').equalTo(currentValue).once('value').then(function(snapshot) {
// });