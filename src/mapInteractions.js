import mapboxgl from "mapbox-gl";
import { DateTime } from "luxon";
import { scrollToBottom } from "./webInteractions";
import { addData, removeData, newChart } from "./charts.js";
import RainLayer from "mapbox-gl-rain-layer";

/**
 * Handle's the majority of relevant map interactions for the user.
 *
 * This includes (in this order):
 * - Map Initialization
 * - Map Functions (Panning to points)
 * - Map Styling/Sourcing (Style updates, Layer/GeoJSON source updates)
 * - Point Interactivity (Point Hover, Point Click)
 * - UI Updates (Triggered by a map interaction, Chart updates, point information)
 * - Miscellaneous Map Updates (Real-time views (i.e. rain, new data sources [to-do]))
 */

mapboxgl.accessToken =
  "pk.eyJ1IjoidXJiaXp0b24iLCJhIjoiY2xsZTZvaXd0MGc4MjNzbmdseWNjM213eiJ9.z1YeFXYSbaMe93SMT6muVg";
export const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/urbizton/clve9aeu900c501rd7qcn14q6", // Default Dark

  center: [-94.53, 41.99],
  zoom: 6.4,
  maxZoom: 18,
});
map.addControl(
  new mapboxgl.NavigationControl({ visualizePitch: true }),
  "bottom-right",
);
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 300, unit: "imperial" }));
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
    padding: padding,
    center: [avgLongitude, avgLatitude],
    zoom: 6.5,
  });
}

export let currentGeoJSON; // Ensure variable is availabe in global scope
export let currentInterpolation;
// Initial state of map, also ensures points stay the same when style changes
map.on("style.load", () => {
  map.resize();
  console.log("Map resized");
  updateMapData(currentGeoJSON);
  updateInterpolation(currentInterpolation);
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
  console.log(newGeoJSON);
  addPointLayer(newGeoJSON);
  currentGeoJSON = newGeoJSON;
  panToAverage(extractCoordinatesFromGeoJSON(currentGeoJSON));
}

// Same as above but specifically for interpolation data
export function updateInterpolation(interpolationGeoJSON) {
  if (map.getLayer("latestInterpolationLayer")) {
    map.removeLayer("latestInterpolationLayer");
  }
  if (map.getSource("latestInterpolation")) {
    map.removeSource("latestInterpolation");
  }
  addInterpolationLayer(interpolationGeoJSON);
  // console.log(interpolationGeoJSON);
  currentInterpolation = interpolationGeoJSON;
}

// Customize visualization/interactivity of geoJSON data here
function addInterpolationLayer(interpolationGeoJSON) {
  map.addSource("latestInterpolation", {
    type: "geojson",
    data: interpolationGeoJSON,
    generateId: true, // Ensure that each feature has a unique ID at the PROPERTY level
    tolerance: 0,
  });

  map.addLayer(
    {
      id: "latestInterpolationLayer",
      type: "line",
      source: "latestInterpolation",
      layout: {
        visibility: "visible",
        "line-cap": "square",
        "line-join": "round",
        "line-sort-key": [
          "match",
          ["get", "classification"],
          "Undefined",
          0,
          "Bare",
          4,
          "Partly",
          3,
          "Full",
          2,
          0,
        ],
      },
      paint: {
        "line-color": [
          "match",
          ["get", "classification"],
          "Undefined",
          "#554f56",
          "Bare",
          "#80B932",
          "Partly",
          "#EFC44E",
          "Full",
          "#E51000",
          "#554f56",
        ],
        "line-width": 3,
        "line-offset": 2,
      },
    },
    "latestLayer",
  );
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
    layout: {
      visibility: "visible",
    },
    paint: {
      "circle-color": [
        "match",
        ["get", "classification"],
        "Undefined",
        "#554f56",
        "Bare",
        "#80B932",
        "Partly",
        "#EFC44E",
        "Full",
        "#E51000",
        "#554f56",
      ],
      "circle-radius": [
        "match",
        ["get", "type"],
        "RWIS",
        [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          16, // Larger when true
          12,
        ],
        [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          10, // Larger when true
          6,
        ],
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        2,
        0.5,
      ],
      "circle-stroke-color": "#242225",
      // "circle-sort-key": ["to-number", "timestamp"],
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
export let clickedPointValues = {
  CAM: false,
};
let stateCAM = false;

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
    imageDisplay.parentNode.style.display = "none";
    removeData(chart);
    stateCAM = false;
  } else if (clickedPoint) {
    clickedPointValues["CAM"] = false;
    idDisplay.textContent = clickedPointValues.avlID;
    timeDisplay.textContent = clickedPointValues.timestamp;
    imageDisplay.src = clickedPointValues.image;
    imageDisplay.parentNode.style.display = "block";

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
  var imgControls = document.getElementById("img-buttons");

  if (eventProperties.type == "AVL") {
    console.log(eventProperties);
    clickedPointValues = {
      specificID: event.features[0]["id"],
      avlID: eventProperties.id,
      timestamp: timestampToISOString(eventProperties.timestamp),
      classification: eventProperties.classification,
      classes: eventProperties.class,
      image: eventProperties.url,
    };
    imgControls.style.display = "none";
  } else {
    // add function to trigger imgcontrol functionality
    // should include:
    // check how many images
    // visualize # of images, what image out of total images
    //
    imgControls.style.display = "flex";

    stateCAM = true;
    // console.log(eventProperties);
    // console.log(JSON.parse(eventProperties.angles));
    let recentangle = eventProperties.recentangle;
    clickedPointValues = {
      type: eventProperties.type,
      specificID: event.features[0]["id"],
      avlID: eventProperties.id,
      timestamp: timestampToISOString(eventProperties.timestamp),
      classification: eventProperties.classification,
      classes: JSON.stringify(
        JSON.parse(eventProperties.angles)[recentangle].class,
      ),
      image: JSON.parse(eventProperties.angles)[recentangle].url,
    };

    // if button is clicked, trigger function -> update/iterate through angles
  }

  idDisplay.textContent = clickedPointValues.avlID;
  timeDisplay.textContent = clickedPointValues.timestamp;
  imageDisplay.src = clickedPointValues.image;
  imageDisplay.parentNode.style.display = "block";

  removeData(chart);
  addData(chart, clickedPointValues.classes);
});

function timestampToISOString(timestamp) {
  const date = DateTime.fromSeconds(timestamp, { zone: "America/Chicago" });
  const formattedDateTime = date.toLocaleString(DateTime.DATETIME_FULL);
  return formattedDateTime;
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
      stateCAM = false;
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
      let recentangle;
      if (hoveredFeature.properties.type == "RWIS") {
        stateCAM = true;
        recentangle = hoveredFeature.properties["recentangle"];
        imageDisplay.src = JSON.parse(hoveredFeature.properties.angles)[
          recentangle
        ].url;
        imageDisplay.parentNode.style.display = "block";
        removeData(chart);
        addData(
          chart,
          JSON.stringify(
            JSON.parse(hoveredFeature.properties.angles)[recentangle].class,
          ),
        );
      } else {
        imageDisplay.src = hoveredFeature.properties.url;
        imageDisplay.parentNode.style.display = "block";
        removeData(chart);
        addData(chart, hoveredFeature.properties.class);
      }
    }
  } else {
    // If no features are hovered, reset cursor, clear UI, and clear feature state
    map.getCanvas().style.cursor = "default";
    idDisplay.textContent = "";
    timeDisplay.textContent = "";
    imageDisplay.src = "";
    imageDisplay.parentNode.style.display = "none";

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

// Handle toggling of layers, toggling of CAM
map.on("idle", () => {
  if (stateCAM) {
    console.log("yes");
  }

  // If these two layers were not added to the map, abort
  if (
    !map.getLayer("latestLayer") ||
    !map.getLayer("latestInterpolationLayer")
  ) {
    document.getElementById("menu").style.display = "none";
    return;
  }
  document.getElementById("menu").style.display = "flex";

  // Enumerate ids of the layers.
  const toggleableLayerIds = ["latestLayer", "latestInterpolationLayer"];

  // Set up the corresponding toggle button for each layer.
  for (const id of toggleableLayerIds) {
    // Skip layers that already have a button set up.
    if (document.getElementById(id)) {
      continue;
    }

    // Create a link.
    const link = document.createElement("a");
    link.id = id;
    link.href = "#";
    let text;
    if (id == "latestLayer") {
      text = "Actual";
    } else {
      text = "Interpolated";
    }
    link.textContent = text;
    link.className = "active";

    // Show or hide layer when the toggle is clicked.
    link.onclick = function (e) {
      const clickedLayer = id;
      e.preventDefault();
      e.stopPropagation();
      const visibility = map.getLayoutProperty(clickedLayer, "visibility");
      // Toggle layer visibility by changing the layout object's visibility property.
      if (visibility === "visible") {
        map.setLayoutProperty(clickedLayer, "visibility", "none");
        this.className = "";
      } else {
        this.className = "active";
        map.setLayoutProperty(clickedLayer, "visibility", "visible");
      }
    };

    const layers = document.getElementById("menu");
    layers.appendChild(link);
  }
});
