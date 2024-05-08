import mapboxgl from "mapbox-gl";
import { scrollToBottom } from "./webInteractions";
import { addData, removeData, newChart } from "./charts.js";
import RainLayer from "mapbox-gl-rain-layer";

mapboxgl.accessToken =
  "pk.eyJ1IjoidXJiaXp0b24iLCJhIjoiY2xsZTZvaXd0MGc4MjNzbmdseWNjM213eiJ9.z1YeFXYSbaMe93SMT6muVg";
export const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/urbizton/clve9aeu900c501rd7qcn14q6", // Default Dark

  center: [-94.53, 41.99],
  zoom: 6.4,
  maxZoom: 14,
});
map.addControl(
  new mapboxgl.NavigationControl({ visualizePitch: true }),
  "bottom-right",
);
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 300, unit: "imperial" })); // see if i can modify positioning later
map.addControl(
  new mapboxgl.FullscreenControl({
    container: document.querySelector("body"),
  }),
  "bottom-right",
);

// When user clicks home, pans back to iowa
function panToIowa() {
  map.flyTo({
    center: [-94.53, 41.99],
    zoom: 6.7,
    pitch: 0,
    bearing: 0,
  });
}
document
  .getElementById("center-iowa")
  .addEventListener("click", function (event) {
    event.preventDefault();
    panToIowa();
  });

function panToAverage(coordinates) {
  let sumLong = 0;
  let sumLat = 0;

  for (let i = 0; i < coordinates.length; i++) {
    sumLong += coordinates[i][0]; // longitude
    sumLat += coordinates[i][1]; // latitude
  }

  // Calculate the average longitude and latitude
  const avgLongitude = sumLong / coordinates.length;
  const avgLatitude = sumLat / coordinates.length;

  // could convert to function
  var arrowImg = document.getElementById("arrow-img");
  const flipped = !arrowImg.classList.contains("flipped");
  const padding = {};
  let currentWidth = document.getElementById("console").clientWidth - 200;
  padding["left"] = flipped ? 0 : currentWidth;
  console.log(currentWidth);

  // Return the average longitude and latitude as an array
  map.easeTo({
    padding: padding, // Add padding logic here
    center: [avgLongitude, avgLatitude],
    zoom: 6.5,
  });
}

let changedState = false;
let currentGeoJSON;
// Initial state of map, also ensures points stay the same when style changes
map.on("style.load", () => {
  map.resize();
  console.log("Map resized");
  if (!changedState) {
    updateMapData(currentGeoJSON);
  }
  if (changedState) {
    updateMapData(currentGeoJSON);
  }
});

// Obtain list of all coordinates from geoJSON
function extractCoordinatesFromGeoJSON(geoJSON) {
  if (geoJSON.type === "FeatureCollection") {
    return geoJSON.features.map((feature) => feature.geometry.coordinates);
  } else if (geoJSON.type === "Feature") {
    return [geoJSON.geometry.coordinates];
  } else {
    return [];
  }
}

// Handle update of map data
export function updateMapData(newGeoJSON) {
  if (map.getLayer("latestLayer")) {
    map.removeLayer("latestLayer");
  }
  if (map.getSource("latestSource")) {
    map.removeSource("latestSource");
  }
  addPointLayer(newGeoJSON);
  changedState = true;
  currentGeoJSON = newGeoJSON;
  panToAverage(extractCoordinatesFromGeoJSON(currentGeoJSON));
}

// Customize visualization/interactivity of geoJSON data here
function addPointLayer(geojsonSource) {
  map.addSource("latestSource", {
    type: "geojson",
    data: geojsonSource,
    generateId: true, // Ensure that each feature has a unique ID at the PROPERTY level
  });

  map.addLayer({
    id: "latestLayer",
    type: "circle",
    source: "latestSource",
    paint: {
      "circle-color": [
        "match",
        ["get", "classification"],
        "Undefined",
        "#FFAA00",
        "Bare",
        "#000000",
        "Partly",
        "#909090",
        "Full",
        "#FFFFFF",
        "#FFFFFF",
      ],
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        9, // Larger when true
        5,
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        2,
        0.5,
      ],
      "circle-stroke-color": "white",
      "circle-sort-key": "timestamp",
    },
  });
}

// Handle map style change
document.addEventListener("DOMContentLoaded", function () {
  const radios = document.querySelectorAll('.map-styles input[type="radio"]');

  radios.forEach((radio) => {
    radio.addEventListener("click", function () {
      if (this.checked) {
        const mapStyle = this.value;
        setMapStyle(mapStyle);
      }
    });
  });

  function setMapStyle(style) {
    map.setStyle("mapbox://styles/urbizton/" + style);
    console.log("Map style set to:", style);
  }
});

const idDisplay = document.getElementById("pointID");
const timeDisplay = document.getElementById("pointTimestamp");
const imageDisplay = document.getElementById("pointImage");
const chart = newChart();

let pointID = null;
let uniqueID = null;
let clickedPoint = false;
let clickedPointValues = {};

// General point interactivity
map.on("mouseleave", "latestLayer", () => {
  map.getCanvas().style.cursor = "default";

  // console.log(` ${clickedPointValues} hovered: ${uniqueID}`);
  if (uniqueID) {
    map.setFeatureState(
      { source: "latestSource", id: uniqueID },
      { hover: false },
    );
  }

  // console.log(clickedPoint);
  if (!clickedPoint) {
    idDisplay.textContent = "";
    timeDisplay.textContent = "";
    imageDisplay.src = "";
    removeData(chart);
  } else if (clickedPoint) {
    idDisplay.textContent = clickedPointValues.avlID;
    timeDisplay.textContent = clickedPointValues.timestamp;
    imageDisplay.src = clickedPointValues.image;
    removeData(chart);
    addData(chart, clickedPointValues.classes);
    map.setFeatureState(
      { source: "latestSource", id: clickedPointValues.specificID },
      { hover: true },
    );
  }
});

map.on("click", "latestLayer", (event) => {
  const features = map.queryRenderedFeatures(event.point, {
    layers: ["latestLayer"],
  });
  let coordinate = features[0].geometry.coordinates;
  scrollToBottom();

  if (clickedPoint) {
    map.setFeatureState(
      { source: "latestSource", id: clickedPointValues.specificID },
      { hover: false },
    );
  }

  var arrowImg = document.getElementById("arrow-img");
  const flipped = !arrowImg.classList.contains("flipped");
  const padding = {};
  let currentWidth = document.getElementById("console").clientWidth - 200;
  padding["left"] = flipped ? 0 : currentWidth;
  console.log(padding);

  map.easeTo({
    center: coordinate,
    padding: padding,
    // pitch: 0,
    // bearing: 0,
    duration: 600,
  });

  clickedPoint = true;

  // Define how values are interpreted
  let eventProperties = event.features[0].properties;

  clickedPointValues = {
    specificID: event.features[0]["id"],
    avlID: eventProperties.id,
    timestamp: timestampToISOString(eventProperties.timestamp),
    classification: eventProperties.classification,
    classes: eventProperties.class,
    image: eventProperties.url,
  };

  idDisplay.textContent = clickedPointValues.avlID;
  timeDisplay.textContent = clickedPointValues.timestamp;
  imageDisplay.src = clickedPointValues.image;
  removeData(chart);
  addData(chart, clickedPointValues.classes);
});

function timestampToISOString(timestamp) {
  var date = new Date(timestamp * 1000);
  var monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  var month = monthNames[date.getMonth()];
  var day = ("0" + date.getDate()).slice(-2);
  var year = date.getFullYear();
  var hours = date.getHours();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // Handle midnight (0 hours)
  var minutes = ("0" + date.getMinutes()).slice(-2);

  return (
    month + " " + day + ", " + year + " - " + hours + ":" + minutes + " " + ampm
  );
}
// Remove this function if not working properly
map.on("mousemove", "latestLayer", (event) => {
  map.getCanvas().style.cursor = "pointer";

  const features = map.queryRenderedFeatures(event.point, {
    layers: ["latestLayer"],
  });

  // Check if any features are hovered
  if (features.length > 0) {
    const hoveredFeature = features[0];
    const hoveredFeatureId = hoveredFeature.id;

    // If the hovered feature is different from the currently hovered feature
    if (hoveredFeatureId !== uniqueID) {
      // Clear feature state for the previously hovered feature
      if (uniqueID) {
        map.setFeatureState(
          { source: "latestSource", id: uniqueID },
          { hover: false },
        );
      }

      // Update feature state for the newly hovered feature
      map.setFeatureState(
        { source: "latestSource", id: hoveredFeatureId },
        { hover: true },
      );

      // Update uniqueID to the newly hovered feature's id
      uniqueID = hoveredFeatureId;

      // Update UI with the hovered feature's information
      idDisplay.textContent = hoveredFeature.properties.id;
      timeDisplay.textContent = timestampToISOString(
        hoveredFeature.properties.timestamp,
      );
      imageDisplay.src = hoveredFeature.properties.url;
      removeData(chart);
      addData(chart, hoveredFeature.properties.class);
    }
  } else {
    // If no features are hovered, reset cursor, clear UI, and clear feature state
    map.getCanvas().style.cursor = "default";
    idDisplay.textContent = "";
    timeDisplay.textContent = "";
    imageDisplay.src = "";
    removeData(chart);

    if (uniqueID !== null) {
      map.setFeatureState(
        { source: "latestSource", id: uniqueID },
        { hover: false },
      );
      uniqueID = null;
    }
  }
});

// Function to shift/zoom the map view based on changes in container width (thank you chatgpt)
function shiftMapView() {
  const currentCenter = map.getCenter();
  let currentZoom = map.getZoom();

  const containerWidth = document.getElementById("console").offsetWidth;

  // Check if the container width has changed
  if (containerWidth !== prevContainerWidth) {
    const widthChange = containerWidth - prevContainerWidth;

    // Calculate the relative change in container width
    const widthRatio = prevContainerWidth / containerWidth;

    // Calculate the new zoom level based on the relative change in width
    currentZoom *= widthRatio ** 0.1; // Adjust this value if you want more extreme zooms

    // Project current center to screen coordinates
    const currentScreenPoint = map.project(currentCenter);

    // Calculate new screen coordinates based on the change in container width
    const newScreenX = currentScreenPoint.x - widthChange * 0.7;
    const newScreenY = currentScreenPoint.y;

    // Unproject new screen coordinates back to geographical coordinates
    const newCenter = map.unproject([newScreenX, newScreenY]);

    map.setCenter(newCenter);
    map.setZoom(currentZoom);
    prevContainerWidth = containerWidth;
  }
}

// Wait till elements are loaded before recording container width
let prevContainerWidth;
setTimeout(() => {
  prevContainerWidth = document.getElementById("console").offsetWidth;
}, 1000);

let isMouseDown = false;
window.addEventListener("mousedown", (event) => {
  if (event.target.id === "console") {
    isMouseDown = true;
  }
});
window.addEventListener("mousemove", () => {
  if (isMouseDown) {
    shiftMapView();
  }
});
window.addEventListener("mouseup", () => {
  isMouseDown = false;
});

// Handle specific realtime functionalities:
function convertUnixTimestamp(unixTimestamp) {
  return new Date(unixTimestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Handle realtime toggle
const realtimeToggle = document.querySelector("#realtime-toggle");
realtimeToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    // Init GL JS Rain Layer
    const rainLayer = new RainLayer({
      id: "rain",
      source: "rainviewer",
      meshOpacity: 0,
      rainColor: "hsla(213, 76%, 73%, 0.86)",
      snowColor: "hsla(0, 0%, 100%, 1)",
      scale: "noaa",
    });
    map.addLayer(rainLayer);

    rainLayer.on("refresh", (data) => {
      console.log(
        `Last Weather Update: ${convertUnixTimestamp(data.timestamp)}`,
      );
    });

    // remove existing geoJSON source
    map.removeLayer("latestLayer");
    map.removeSource("latestSource");
    // TODO: Add realtime source and logic

    // console.log('checked')
  } else {
    // console.log('unchecked')
    map.removeLayer("rain");
  }
});
