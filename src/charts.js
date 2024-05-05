import Chart from 'chart.js/auto';

const data = {
    labels: [
        'Undefined',
        'Fully',
        'Partly',
        'Bare'
    ],
    datasets: [{
        label: ' Deep Learning Prediction',
        data: [0.5, 0.3, 0, 0.2], // Undefined, Fully, Partly, Bare
        backgroundColor: [
        '#FFAA00',
        '#FFFFFF',
        '#909090',
        '#000000'
        ],
        hoverOffset: 4
    }]
};

const config = {
    type: 'doughnut',
    data: data,
    options: {
        elements: {
            point: {
                borderColor: 'rgba(255, 255, 255, 0)',
                borderWidth: 8
            }
        },
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    padding: 30,
                    boxHeight: 20,
                    boxWidth: 20,
                    textAlign: 'right',
                    usePointStyle: true,
                    font: {
                        size: 14
                    },
                    color: 'white'
                },
                onClick: function(event, legendItem, legend) {
                    const classification = legendItem.text; // Get the classification from legend item 
                    toggleMapVisibility(classification); // Toggle visibility in Mapbox
            }
        },
        maintainAspectRatio: false,
        animation: {
            animateRotate: true,
            animateScale: true
        },
        layout: {
            padding: 20,
        },
        hoverOffset: 20,
        }
    }
};

function toggleMapVisibility(classification) {
    // console.log(classification);
    // Set layout property for each classification
    map.setLayoutProperty('latestLayer',
        'visibility',
        ['match', ['get', 'classification'], classification, 'none']
    );
}

// Create a function to update chart options based on container width
function updateChartOptions() {
    const containerWidth = document.getElementById('inner-console').clientWidth;
    if (containerWidth < 420) {
        config.options.plugins.legend.position = 'top';
        config.options.plugins.legend.labels.padding = 15;
    } else {
        config.options.plugins.legend.position = 'right';
        config.options.plugins.legend.labels.padding = 30;

    }
}

function roundListToPrecision(list, precision) {
    return list.map(function (element) {
        return parseFloat(element.toFixed(precision));
    });
}

export function removeData(chart) {
    // chart.data.labels.pop();
    chart.data.datasets[0].data = [];
    chart.update();
}

export function addData(chart, newData) { // Undefined, Fully, Partly, Bare
    const jsonObject = JSON.parse(newData);
    const listForm = [jsonObject.Undefined, jsonObject.Full, jsonObject.Partly, jsonObject.Bare];
    const rounded = roundListToPrecision(listForm, 8);
    // chart.data.labels.push(' Deep Learning Prediction');
    chart.data.datasets[0].data = rounded;
    console.log(chart.data.datasets);
    chart.update();
}

export function newChart() {
    const chart = new Chart(
        document.getElementById('donutchart'),
        config
    )
    return chart
};



let isMouseDown = false;
window.addEventListener('mousedown', (event) => {
    if (event.target.id === 'console') {
        isMouseDown = true;
    }
});
window.addEventListener('mousemove', () => {
    if (isMouseDown) {
        updateChartOptions();
        chart.update();
    }
});
window.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// Initial call to update chart options based on container width
updateChartOptions();

