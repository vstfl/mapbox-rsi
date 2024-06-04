import { queryImagesByDateRange } from "./firebaseHandler.js";
import {
  updateMapData,
  updateInterpolation,
  panToAverage,
  currentGeoJSON,
} from "./mapInteractions.js";
import {
  interpolateGeoJSON,
  interpolateGeoJSONLanes,
} from "./interpolation.js";
import { map } from "./mapInteractions.js";
import * as geojson from "geojson";

// Handle realtime toggle
const realtimeToggle = document.querySelector("#realtime-toggle");
const archivedQuery = document.querySelectorAll(".archived-query");
let realtimeState = false;
realtimeToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    realtimeState = true;
    archivedQuery.forEach((query) => {
      query.style.display = "none";
    });
  } else {
    realtimeState = false;
    archivedQuery.forEach((query) => {
      query.style.display = "flex";
    });
  }
  console.log(`Realtime: ${realtimeState}`);
});

// Handle console shift toggle button
document.getElementById("shift-button").addEventListener("click", function () {
  document.getElementById("console").classList.toggle("shifted");
  document.getElementById("shift-button").classList.toggle("shifted");
  var arrowImg = document.getElementById("arrow-img");
  const flipped = arrowImg.classList.toggle("flipped");
  const padding = {};
  let currentWidth = document.getElementById("console").clientWidth;
  padding["right"] = flipped ? 0 : currentWidth;
  map.easeTo({
    padding: padding,
    duration: 1000,
  });
});

// Handle range slider value change visual
const slider = document.getElementById("time-range");
const sliderValue = document.getElementById("slider-value");
let currentRange = 0;
slider.addEventListener("input", function () {
  sliderValue.textContent = this.value;
  currentRange = this.value;
  console.log(currentRange);
});

export function scrollToBottom() {
  let consoleDiv = document.querySelector(".console.resizable");
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

// Handle form submission for querying
document
  .getElementById("query-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form submission
    scrollToBottom();

    // If archived mode, get Calendar and Window
    if (!realtimeState) {
      // Get the query data
      const formData = new FormData(this);
      const date = formData.get("calendar");
      const window = formData.get("window");

      // Disables button temporarily (prevents spamming for requests)
      const btn = document.getElementById("submit-query");

      btn.disabled = true;
      btn.style.cursor = "not-allowed";
      setTimeout(() => {
        btn.disabled = false;
        btn.style.cursor = "pointer";
        console.log("Button Available");
      }, 160 * window); // Scale button cooldown depending on size of window

      // console.log("Date:", date);
      // console.log("Window:", window);

      // Perform the query to Firestore
      const [startTimestamp, endTimestamp] = calculateDataRange(date, window);
      const [imageQueryAVL, imageQueryRWIS] = await queryImagesByDateRange(
        startTimestamp,
        endTimestamp,
      );
      const newGeoJSON = convertToGeoJSON(imageQueryAVL, imageQueryRWIS);
      console.log(newGeoJSON);

      // const geojsonString = JSON.stringify(newGeoJSON, null, 2); // For debugging purposes
      // console.log(geojsonString);
      updateMapData(newGeoJSON);

      // If interpolation tool is on, interpolate the data
      if (interpolationState) {
        // currentInterpolatedGeoJSON = await interpolateGeoJSON(currentGeoJSON);
        currentInterpolatedGeoJSON =
          await interpolateGeoJSONLanes(currentGeoJSON);

        updateInterpolation(currentInterpolatedGeoJSON);
      }
    }
  });

// Handle Geostatistical Interpolation (RSI) Trigger
let interpolationState = false;
let currentInterpolatedGeoJSON;
document
  .getElementById("interpolation")
  .addEventListener("click", async (event) => {
    event.preventDefault(); // Prevent default anchor behavior

    // currentInterpolatedGeoJSON = await interpolateGeoJSON(currentGeoJSON);
    currentInterpolatedGeoJSON = await interpolateGeoJSONLanes(currentGeoJSON);
    updateInterpolation(currentInterpolatedGeoJSON);
    interpolationState = true;
  });

// Logic to update website every minute if in realtime mode
function updateRealtimeData() {
  if (realtimeState) {
    let d = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    console.log("Window:", currentRange);
    console.log(`Latest map update: ${d}`);
  } else {
    console.log("Not in realtime state, not updating map");
  }
}
setInterval(updateRealtimeData, 60000);

function calculateDataRange(date, windowSize) {
  let timeDiff = windowSize * 1; //change to 60 for hours
  const dateTime = new Date(date);
  const startDate = new Date(dateTime.getTime() - timeDiff * 60000);
  const endDate = new Date(dateTime.getTime() + timeDiff * 60000);
  console.log("start: " + startDate + "\n\n end:" + endDate);
  return [startDate, endDate];
}

function removeLettersAfterUnderscore(str) {
  return str.replace(/_.*/, "");
}

function convertToGeoJSON(pointListAVL, pointListRWIS) {
  let data = [];
  for (const point of pointListAVL) {
    const base = point["data"];
    const id = removeLettersAfterUnderscore(point["id"]);
    // console.log(base);
    const lat = base["Position"]["latitude"];
    const lng = base["Position"]["longitude"];
    const classes = {
      Undefined: base["Undefined"],
      Bare: base["Bare"],
      Full: base["Full"],
      Partly: base["Partly"],
    };

    const classification = highestNumberString(
      base["Undefined"],
      base["Bare"],
      base["Full"],
      base["Partly"],
    );
    const url = base["IMAGE_URL"];
    const timestamp = base["Date"]["seconds"];

    data.push({
      id: id,
      type: "AVL",
      lat: lat,
      lng: lng,
      class: classes,
      classification: classification,
      url: url,
      timestamp: timestamp,
    });
  }

  const RWISMap = {};
  // first pass: initialize all station data:
  for (const point of pointListRWIS) {
    const base = point["data"];
    const id = removeLettersAfterUnderscore(point["id"]).substring(0, 8);
    if (!(id in RWISMap)) {
      const lat = base["Coordinates"]["latitude"];
      const lng = base["Coordinates"]["longitude"];
      const angles = {};
      const station = {
        id: id,
        type: "RWIS",
        lat: lat,
        lng: lng,
        angles: angles,
      };
      RWISMap[id] = station;
    }
  }

  for (const point of pointListRWIS) {
    const base = point["data"];
    const id = removeLettersAfterUnderscore(point["id"]).substring(0, 8);

    const classes = {
      Undefined: base["Class 4"],
      Bare: base["Class 1"],
      Partly: base["Class 2"],
      Full: base["Class 3"],
    };

    const classification = classByNumber(base["Predicted Class"]);
    const url = base["Image"];
    const timestamp = base["Date"]["seconds"];
    const gradcam = base["GradCam"];
    const angle = removeLettersAfterUnderscore(point["id"]).split("-")[2];

    // output to dict
    const angleDict = {
      angle: angle,
      timestamp: timestamp,
      url: url,
      class: classes,
      classification: classification,
      gradcam: gradcam,
    };

    if (angle in RWISMap[id]["angles"]) {
      if (RWISMap[id]["angles"][angle]["timestamp"] < timestamp) {
        RWISMap[id]["angles"][angle] = angleDict;
      }
    } else {
      RWISMap[id]["angles"][angle] = angleDict;
    }
  }
  // console.log(RWISMap);
  for (const key in RWISMap) {
    const station = RWISMap[key];
    let mostRecentKey;
    let mostRecentTimestamp = 0;
    // Iterate through angles and find most recent classification
    for (const anglekey in station["angles"]) {
      let currentTimestamp = station["angles"][anglekey]["timestamp"];
      if (currentTimestamp > mostRecentTimestamp) {
        mostRecentKey = anglekey;
        mostRecentTimestamp = currentTimestamp;
      }
    }
    station["classification"] =
      station["angles"][mostRecentKey]["classification"];
    station["timestamp"] = mostRecentTimestamp;
    station["recentangle"] = mostRecentKey;
    data.push(station);
  }
  console.log(data);
  return geojson.parse(data, { Point: ["lat", "lng"] });
}

function classByNumber(classNumber) {
  if (classNumber === 1) {
    return "Bare";
  } else if (classNumber === 2) {
    return "Partly";
  } else if (classNumber === 3) {
    return "Full";
  } else if (classNumber === 4) {
    return "Undefined";
  }
}

function highestNumberString(unde, bare, full, part) {
  var highest = Math.max(unde, bare, full, part);
  if (highest === unde) {
    return "Undefined";
  } else if (highest === bare) {
    return "Bare";
  } else if (highest === full) {
    return "Full";
  } else if (highest === part) {
    return "Partly";
  }
}
