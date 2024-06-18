import { queryImagesByDateRange } from "./firebaseHandler.js";
// currentInterpolatedGeoJSON = await interpolateGeoJSON(currentGeoJSON);
import {
  // currentInterpolatedGeoJSON = await interpolateGeoJSON(currentGeoJSON);
  updateMapData,
  updateInterpolation,
  panToAverage,
  currentGeoJSON,
  clickedPointValues,
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

// Handle image click to view// handHandle RWIS data
// Check if caLogic to gobtain lbmost recent image for specific said angleeach angle
document.addEventListener("DOMContentLoaded", function () {
  let imageElement = document.getElementById("pointImage");

  function toggleImageSrc() {
    let img1 = clickedPointValues.image;
    if (!clickedPointValues.CAM && clickedPointValues.type == "RWIS") {
      // let img2 = `./assets/gradcamimages/Grad-CAM_${img1.split("/").pop()}`;
      // https://storage.googleapis.com/rwis_cam_images/images/IDOT-048-04_201901121508.jpg_gradcam.png
      // Grad-CAM_IDOT-026-01_201901121420.jpg

      // console.log(img1);
      let img2 = `https://storage.googleapis.com/rwis_cam_images/images/${img1.split("/").pop()}_gradcam.png`;
      // console.log(img2);

      imageElement.src = img2;
      clickedPointValues["CAM"] = true;
    } else {
      imageElement.src = img1;
      clickedPointValues["CAM"] = false;
    }
  }

  imageElement.addEventListener("click", toggleImageSrc);
});

async function startQuery(date, window) {
  const [startTimestamp, endTimestamp] = calculateDataRange(date, window);
  // TODO: Modify imageQueryRWIS to only grab images up to 15 minutes before the endTimestamp
  const [imageQueryAVL, imageQueryRWIS] = await queryImagesByDateRange(
    startTimestamp,
    endTimestamp,
  );
  const actualImagesRWIS = await mesonetScrapeRWIS(
    startTimestamp,
    endTimestamp,
  );
  const imagesForPredRWIS = predictionExistsRWIS(
    actualImagesRWIS,
    imageQueryRWIS,
  );

  console.log(imagesForPredRWIS);
  console.log("Outside of predictionExistsRWIS");

  // TODO: THIS IS WHERE I AM: DEBUG this logic later
  // TODO: Divid images into sets of 5 and send request to backend

  // If there are images to predict, divid and send request to backend asynchronously
  if (imagesForPredRWIS) {
    sendPredictionsRWIS(imagesForPredRWIS, date, window);
  }

  // Update with initial visualization
  updateAll(imageQueryAVL, imageQueryRWIS);
}

async function sendPredictionsRWIS(imagesForPredRWIS, date, window) {
  postRequestToBackend(imagesForPredRWIS)
    .then((responseData) => {
      console.log("Response data:", responseData);
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  const [startTimestamp, endTimestamp] = calculateDataRange(date, window);

  // TODO: Modify imageQueryRWIS to only grab images up to 15 minutes before the endTimestamp

  const [imageQueryAVL, imageQueryRWIS] = await queryImagesByDateRange(
    startTimestamp,
    endTimestamp,
  );

  updateAll(imageQueryAVL, imageQueryRWIS);
}

const RWIS_URL = "https://index-xmctotgaqq-uc.a.run.app";
// TODO: divide requests into 5, send
function postRequestToBackend(imagesForPredRWIS) {
  return new Promise((resolve, reject) => {
    fetch(RWIS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(imagesForPredRWIS),
    })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

async function updateAll(imageQueryAVL, imageQueryRWIS) {
  const newGeoJSON = convertToGeoJSON(imageQueryAVL, imageQueryRWIS);

  updateMapData(newGeoJSON);

  if (interpolationState) {
    currentInterpolatedGeoJSON = await interpolateGeoJSONLanes(currentGeoJSON);
    updateInterpolation(currentInterpolatedGeoJSON);
  }
}

// Handle form submission for querying
document
  .getElementById("query-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form submission
    scrollToBottom();
    let date, window;
    // If archived mode, get Calendar and Window
    if (!realtimeState) {
      // Get the query data
      const formData = new FormData(this);
      date = formData.get("calendar");
      window = formData.get("window");

      // Disables button temporarily (prevent for request spam)
      const btn = document.getElementById("submit-query");

      btn.disabled = true;
      btn.style.cursor = "not-allowed";
      setTimeout(() => {
        btn.disabled = false;
        btn.style.cursor = "pointer";
        console.log("Button Available");
      }, 160 * window); // Scale button cooldown depending on size of window
    }
    await startQuery(date, window);
  });

// Handle Geostatistical Interpolation (RSI) Trigger
let interpolationState = false;
let currentInterpolatedGeoJSON;
document
  .getElementById("interpolation")
  .addEventListener("click", async (event) => {
    event.preventDefault(); // Prevent default anchor behavior

    currentInterpolatedGeoJSON = await interpolateGeoJSONLanes(currentGeoJSON);
    updateInterpolation(currentInterpolatedGeoJSON);
    interpolationState = true;
  });

// Logic to update website every minute in realtime mode
function updateRealtimeData() {
  if (realtimeState) {
    let d = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    // add logic for query data
    // todo: grab current data in window

    // todo: add date, and
    // const date = "swag";
    // const window = formData.get("window");

    // Call startquery here for realtime
    startQuery(date, window);

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

  // Handle RWIS data
  for (const point of pointListRWIS) {
    const base = point["data"];
    const id = removeLettersAfterUnderscore(point["id"]).substring(0, 8);

    const classes = {
      Undefined: base["Class 4"],
      Bare: base["Class 1"],
      Partly: base["Class 2"],
      Full: base["Class 3"],
    };
    // console.log(base["GradCAM"]);
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

    // Logic to obtain most recent image for each angle
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

async function mesonetScrapeRWIS(startTimestamp, endTimestamp) {
  const ids = [
    "IDOT-000-03",
    "IDOT-014-00",
    "IDOT-026-01",
    "IDOT-030-01",
    "IDOT-030-02",
    "IDOT-047-00",
    "IDOT-047-01",
    "IDOT-047-02",
    "IDOT-047-04",
    "IDOT-047-05",
    "IDOT-047-06",
    "IDOT-048-02",
    "IDOT-048-03",
    "IDOT-048-04",
    "IDOT-048-05",
    "IDOT-053-00",
    "IDOT-053-02",
  ];

  // Limit the search to the end of date range - 15 minutes to limit GET requests
  // At the moment, this causes around 300 requests to mesonet, not sure if they are fine with this,
  // but regardless, try not to increase the amount. 15 minutes seems appropriate given image capturing periods
  let modifiedStart = new Date(endTimestamp);
  modifiedStart.setMinutes(modifiedStart.getMinutes() - 15);

  const tasks = [];
  let currentIteration = modifiedStart;
  console.log(currentIteration);
  console.log(endTimestamp);

  for (const id of ids) {
    currentIteration = new Date(modifiedStart);
    while (currentIteration <= endTimestamp) {
      const imageUrl = formatImageUrlRWIS(id, currentIteration);
      tasks.push(imageUrl);
      currentIteration.setMinutes(currentIteration.getMinutes() + 1);
    }
  }
  console.log("Potential Images: " + tasks.length);

  const results = await Promise.all(
    tasks.map((task) => checkImageExists(task)),
  );
  const availableImages = tasks.filter((url, index) => results[index]);

  console.log("Actual Available Images: " + availableImages.length);
  // console.log(availableImages);
  return availableImages;
}

async function checkImageExists(task) {
  try {
    const response = await fetch(task);
    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
  return false;
}

function formatImageUrlRWIS(rwisID, currentIteration) {
  // Add 1 hours to the currentdate to adjust for timezone (I think)
  // Add 2 hours to match database
  // TODO: Figure out whats going on with this
  // ! Might change in different timezones, its worth a check later if fully implemented
  const tempIteration = new Date(currentIteration);
  tempIteration.setHours(tempIteration.getHours() + 2);

  const year = tempIteration.getFullYear();
  const month = String(tempIteration.getMonth() + 1).padStart(2, "0");
  const day = String(tempIteration.getDate()).padStart(2, "0");
  const hour = String(tempIteration.getHours() + 5).padStart(2, "0");
  const minute = String(tempIteration.getMinutes()).padStart(2, "0");

  return `https://mesonet.agron.iastate.edu/archive/data/${year}/${month}/${day}/camera/${rwisID}/${rwisID}_${year}${month}${day}${hour}${minute}.jpg`;
}

function predictionExistsRWIS(actualImagesRWIS, firebaseImages) {
  //actual images is a list of urls
  // need to parse firebase images and
  console.log("Inside predictionExistsRWIS()");
  console.log(actualImagesRWIS);
  console.log(firebaseImages);

  const requestJSON = {};

  for (const image of actualImagesRWIS) {
    let imgFound = false;
    for (const fireImage of firebaseImages) {
      if (fireImage.data.Image == image) {
        imgFound = true;
        break;
      }
    }
    if (!imgFound) {
      let imgKey = image.replace(".jpg", "").split("/").pop();
      requestJSON[imgKey] = image;
    }
  }

  // console.log(requestJSON);

  return requestJSON;
}
