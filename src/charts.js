import Chart from 'chart.js/auto';

const data = {
    labels: [
        'Undefined',
        'Fully',
        'Partly',
        'Bare'
    ],
    datasets: [{
        label: 'My First Dataset',
        data: [300, 50, 100, 30],
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
                }

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
        hoverOffset: 20
    }
};


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

const chart = new Chart(
    document.getElementById('donutchart'),
    config
);



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

