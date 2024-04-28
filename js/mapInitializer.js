mapboxgl.accessToken = 'pk.eyJ1IjoidXJiaXp0b24iLCJhIjoiY2xsZTZvaXd0MGc4MjNzbmdseWNjM213eiJ9.z1YeFXYSbaMe93SMT6muVg';
            const map = new mapboxgl.Map({
                container: 'map', 
                style: 'mapbox://styles/urbizton/clve9aeu900c501rd7qcn14q6', // Normal
                // style: 'mapbox://styles/urbizton/clvj8ldr8014x01q1f0et6pay', // Satellite
                // style: 'mapbox://styles/urbizton/clvj8hyu7014v01q18d11gsz5',
                center: [-93.53, 41.99],
                zoom: 6, 
                maxZoom: 14,
            });
            map.addControl(new mapboxgl.NavigationControl({visualizePitch: true}),'bottom-right');
            map.addControl(new mapboxgl.ScaleControl({maxWidth: 300, unit: 'imperial'})); // see if i can modify positioning later
