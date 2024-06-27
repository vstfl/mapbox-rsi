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
import { DateTime } from "luxon";

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
  const [imageQueryAVL, imageQueryRWIS] = await queryImagesByDateRange(
    startTimestamp,
    endTimestamp,
  );

  // Scrape online database if AVL/RWIS images exist during time window
  // const actualImagesAVL = await mesonetScrapeAVL(startTimestamp, endTimestamp);
  const actualImagesAVL = await mesonetGETAVL(date, window);

  const actualImagesRWIS = await mesonetScrapeRWISv2(
    startTimestamp,
    endTimestamp,
  );

  // Construct the request for backend if predictions need to be completed
  const imagesForPredRWIS = predictionExistsRWIS(
    actualImagesRWIS,
    imageQueryRWIS,
  );
  const imagesForPredAVL = predictionExistsAVL(actualImagesAVL, imageQueryAVL);

  // If there are images to predict, prep request to RWIS/AVL backend asynchronously
  if (imagesForPredAVL) {
    console.log("Unpredicted AVL images were found, sending to backend...");
    console.log(
      "# of unpredicted AVL images: " + Object.keys(imagesForPredAVL).length,
    );
    sendPredictionsAVL(imagesForPredAVL, date, window);
  } else {
    console.log("All available AVL images already have predictions.");
  }

  if (imagesForPredRWIS) {
    console.log("Unpredicted RWIS images were found, sending to backend...");
    console.log(
      "# of unpredicted RWIS images: " + Object.keys(imagesForPredRWIS).length,
    );
    sendPredictionsRWIS(imagesForPredRWIS, date, window);
  } else {
    console.log("All available RWIS images already have predictions.");
  }

  // Update with initial visualization
  updateAll(imageQueryAVL, imageQueryRWIS);
}

async function sendPredictionsAVL(imagesForPredAVL, date, window) {
  try {
    console.log("POSTing to AVL Backend");

    console.time("Request Duration");
    const responseData = await postRequestToBackend(
      imagesForPredAVL,
      50,
      "/avl",
    );
    console.timeEnd("Request Duration");

    console.log("Response from AVL Backend: ", responseData);
  } catch (error) {
    console.error("Error:", error);
  }

  const [startTimestamp, endTimestamp] = calculateDataRange(date, window);
  // console.log("start: " + startTimestamp);
  // console.log("end: " + endTimestamp);
  const [imageQueryAVL, imageQueryRWIS] = await queryImagesByDateRange(
    startTimestamp,
    endTimestamp,
  );
  // console.log(imageQueryRWIS);
  // console.log(startTimestamp);
  updateAll(imageQueryAVL, imageQueryRWIS);
}

async function sendPredictionsRWIS(imagesForPredRWIS, date, window) {
  try {
    console.log("POSTing to RWIS Backend");

    console.time("Request Duration");
    const responseData = await postRequestToBackend(imagesForPredRWIS, 10, "");
    console.timeEnd("Request Duration");

    console.log("Response from RWIS Backend: ", responseData);
  } catch (error) {
    console.error("Error:", error);
  }

  const [startTimestamp, endTimestamp] = calculateDataRange(date, window);
  // console.log("start: " + startTimestamp);
  // console.log("end: " + endTimestamp);
  // TODO: Modify imageQueryRWIS to only grab images up to 15 minutes before the endTimestamp
  const [imageQueryAVL, imageQueryRWIS] = await queryImagesByDateRange(
    startTimestamp,
    endTimestamp,
  );
  // console.log(imageQueryRWIS);
  // console.log(startTimestamp);
  updateAll(imageQueryAVL, imageQueryRWIS);
}

function chunkObject(obj, size) {
  // Subdivide full dict to list of subdicts with length "size"
  const chunks = [];
  let currentChunk = {};

  for (const [key, value] of Object.entries(obj)) {
    currentChunk[key] = value;

    if (Object.keys(currentChunk).length === size) {
      chunks.push(currentChunk);
      currentChunk = {};
    }
  }

  if (Object.keys(currentChunk).length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

const RWIS_URL = "https://index-xmctotgaqq-uc.a.run.app";
function postRequestToBackend(imagesForPredRWIS, chunkSize, endpoint) {
  // console.log("Inside postRequestToBackend");

  const URL = RWIS_URL + endpoint;
  const chunks = chunkObject(imagesForPredRWIS, chunkSize);
  // console.log(chunks);

  const promises = chunks.map((chunk) => {
    return fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    });
  });

  console.log("\n# of requests to backend: " + Object.keys(promises).length);
  return Promise.all(promises);
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

      // Conversion from local machine time to CDT Timezone (Iowa)
      date = formData.get("calendar");
      console.log("TEST 1:" + date);
      const dateTime = DateTime.fromISO(date, { zone: "America/Chicago" });
      date = dateTime.setZone("America/Chicago").toISO();
      console.log("QUERY DATE: " + date);
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
      await startQuery(date, window);
    }
  });

async function triggerBackendStartup(i) {
  console.time("GET Request Duration " + i);
  const response = await fetch(RWIS_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  console.log("Backend triggered successfully:", data);
  console.timeEnd("GET Request Duration " + i);
}

const CONTAINERS = 5; // 5 fast requests spins up 2 containers
// Upon startup, spin up cloud run containers in advance
document.addEventListener("DOMContentLoaded", async (event) => {
  console.log(
    "Webpage has been opened, spinning up RWIS and AVL backend containers",
  );

  const promises = [];
  for (let i = 0; i < CONTAINERS; i++) {
    promises.push(triggerBackendStartup(i));
  }

  await Promise.all(promises);
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
let isUpdating = false;
async function updateRealtimeData() {
  if (isUpdating) {
    console.log(
      "Previous realtime update is already in progress, skipping this interval",
    );
    return;
  }

  isUpdating = true;

  if (realtimeState) {
    console.log("\n\nPerforming realtime update...");
    let d = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const formData = new FormData(document.getElementById("query-form"));

    let date = DateTime.now().setZone("America/Chicago");
    date = date.toISO();
    console.log("Realtime Date: " + date);
    const window = formData.get("window");

    await startQuery(date, window);

    console.log("Window:", currentRange);
    console.log(`Latest map update: ${d}`);
  } else {
    console.log("Not in realtime state, not updating map");
  }

  isUpdating = false;
}
setInterval(updateRealtimeData, 40000);

// Ensure date is in UTC (for standardization)
function calculateDataRange(date, windowSize) {
  let timeDiff = windowSize * 1; //change to 60 for hours
  const dateTime = new Date(date);

  // Already in UTC format, just defaulted to local timespace when console logged
  const startDate = new Date(dateTime.getTime() - timeDiff * 60000);
  const endDate = new Date(dateTime.getTime() + timeDiff * 60000);

  // console.log("start: " + startDate + "\nend:" + endDate);
  console.log(
    "UTC start: " +
      startDate.toISOString() +
      "\nUTC end: " +
      endDate.toISOString(),
  );
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
  // console.log(data);
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

async function mesonetGETAVL(date, window) {
  console.log("Performing get request to mesonet...");
  const baseUrl = "https://mesonet.agron.iastate.edu/api/1/idot_dashcam.json";

  const dateTime = new Date(date);
  const validTimestamp = dateTime.toISOString();
  const url = `${baseUrl}?valid=${encodeURIComponent(validTimestamp)}&window=${window}`;

  console.log(url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    const data = await response.json();
    console.log("Response from mesonet API:", data);
    return data;
  } catch (error) {
    console.error("There was a problem fetching the AVL data:", error);
    throw error;
  }
}

// DEFUNCT
// REASON: Using the mesonet API is much faster in cases where a day has a very large amount of vehicles
async function mesonetScrapeAVL(startTimestamp, endTimestamp) {
  const availableImages = [];
  // https://mesonet.agron.iastate.edu/archive/data/2019/01/12/camera/idot_trucks/A33537/
  // For now, assume data spans within a day (ignore edge cases wherein start is one day and end is another)
  const s = new DateTimeConstants(startTimestamp);
  const e = new DateTimeConstants(endTimestamp);

  const truckURL = `https://mesonet.agron.iastate.edu/archive/data/${s.year}/${s.month}/${s.day}/camera/idot_trucks`;
  const truckImageURLS = await parseTruckURL(truckURL);

  const truckFilteredImages = filterURLS(truckImageURLS, s, e);

  console.log(truckImageURLS);
  console.log(truckFilteredImages);

  console.log(
    "\n\nLength comparison: \n\nAll Truck Images: " +
      truckImageURLS.length +
      "\nDate Filtered Truck Images: " +
      truckFilteredImages.length,
  );

  // console.log("Available AVL images: " + availableImages.length);
  // return availableImages;
}

// DEFUNCT
async function parseTruckURL(truckURL) {
  let truckURLS = [];
  try {
    const response = await fetch(truckURL);
    const htmlText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const truckLinks = doc.querySelectorAll("a");

    truckLinks.forEach((link) => {
      const href = link.getAttribute("href");

      if (href.startsWith("A")) {
        truckURLS.push(truckURL + "/" + href);
      }
    });
    // console.log(truckURLS);
  } catch (error) {
    console.error("Error fetching or parsing the AVL Truck URL:", error);
  }

  const truckImageURLS = [];
  try {
    // Can take a super long time on very heavy days (2019-01-12 has over 70,000 images)
    // 70,000 images takes around 17 seconds to parse
    // Could probably optimize this by taking into account the "last modified" date
    // (i.e. if startTimestamp > last modified -> ignore)
    console.time("Fetch each truck URL");
    const fetches = truckURLS.map((truck) =>
      fetch(truck).then((res) => res.text()),
    );
    const htmlTexts = await Promise.all(fetches);
    console.timeEnd("Fetch each truck URL");
    console.log("SWAG 1");
    htmlTexts.forEach((htmlText) => {
      console.log("YES");
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      const truckImages = doc.querySelectorAll("a");

      truckImages.forEach((link) => {
        const href = link.getAttribute("href");

        if (href.endsWith(".jpg") && href.startsWith("A")) {
          truckImageURLS.push(href);
        }
      });
    });
    // console.log(truckImageURLS);
  } catch (error) {
    console.error("Error fetching or parsing the AVL Truck Image URL:", error);
  }

  return truckImageURLS;
}

async function mesonetScrapeRWISv2(startTimestamp, endTimestamp) {
  // Return a list of available image URLs from mesonet
  // TODO: Swap with list in email
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

  let modifiedStart = new Date(endTimestamp);
  modifiedStart.setMinutes(modifiedStart.getMinutes() - 60);

  const availableImages = [];
  // Edgecase: iterate through days as well if timespan crosses two days
  for (const id of ids) {
    const stationImages = await findImages(id, modifiedStart, endTimestamp);
    availableImages.push(...stationImages);
  }

  // console.log("Actual Available Images: " + availableImages.length);
  console.log("Available RWIS images: " + availableImages.length);
  return availableImages;
}

class DateTimeConstants {
  constructor(timestamp, hoursToAdd = 0) {
    this.date = new Date(timestamp);
    this.date.setHours(this.date.getHours() + hoursToAdd);
  }
  get year() {
    return this.date.getUTCFullYear();
  }
  get month() {
    return String(this.date.getUTCMonth() + 1).padStart(2, "0");
  }
  get day() {
    return String(this.date.getUTCDate()).padStart(2, "0");
  }
  get hour() {
    return String(this.date.getUTCHours()).padStart(2, "0");
  }
  get minute() {
    return String(this.date.getUTCMinutes()).padStart(2, "0");
  }
}

async function findImages(rwisID, startTimestamp, endTimestamp) {
  // Use of .toISOString to enforce UTC timestamping
  const s = new DateTimeConstants(startTimestamp);
  const e = new DateTimeConstants(endTimestamp);
  const stationURL = `https://mesonet.agron.iastate.edu/archive/data/${s.year}/${s.month}/${s.day}/camera/${rwisID}`;
  const stationURLS = await parseStationURL(stationURL);
  const stationFilteredImages = filterURLS(stationURLS, s, e);
  return stationFilteredImages;
}

function isInRange(urlHHMM, s, e) {
  const urlHour = parseInt(urlHHMM.slice(0, 2), 10);
  const urlMinute = parseInt(urlHHMM.slice(-2), 10);

  const startHour = parseInt(s.hour, 10);
  const startMinute = parseInt(s.minute, 10);
  const endHour = parseInt(e.hour, 10);
  const endMinute = parseInt(e.minute, 10);

  const urlTime = urlHour * 60 + urlMinute;
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  return urlTime >= startTime && urlTime <= endTime;
}

// Filter full list of images for specifically within daterange
function filterURLS(stationURLS, s, e) {
  // Can assume that images passed to this function consist only of images within the same day
  // TODO: This creates unknown edgecases between days. Will probably have to re-write this for a full implementation

  let filteredImages = [];
  for (const url of stationURLS) {
    const urlStart = url.lastIndexOf("_") + 1;
    const urlEnd = url.lastIndexOf(".");
    const urlHHMM = url.substring(urlStart, urlEnd).slice(-4);

    if (isInRange(urlHHMM, s, e)) {
      filteredImages.push(url);
    }
  }
  return filteredImages;
}

async function parseStationURL(stationURL) {
  let stationURLS = [];
  try {
    const response = await fetch(stationURL);
    const htmlText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const links = doc.querySelectorAll("a");

    links.forEach((link) => {
      const href = link.getAttribute("href");
      // console.log(href);
      if (href.startsWith("IDOT") && href.endsWith(".jpg")) {
        stationURLS.push(stationURL + "/" + href);
      }
    });
  } catch (error) {
    console.error("Error fetching or parsing the URL:", error);
  }

  return stationURLS;
}

function predictionExistsAVL(actualImagesAVL, firebaseImages) {
  // console.log("Inside predictionExistsAVL()");
  // console.log(actualImagesAVL);
  // "https://mesonet.agron.iastate.edu/archive/data/2019/01/12/camera/idot_trucks/A31614/A31614_201901121352.jpg"
  // console.log(firebaseImages);
  //

  const requestJSON = {};

  for (const image of actualImagesAVL.data) {
    let imgFound = false;
    for (const fireImage of firebaseImages) {
      if (fireImage.data.IMAGE_URL == image.imgurl) {
        imgFound = true;
        console.log("TRUE TRUE TRUE");
        break;
      }
    }
    if (!imgFound) {
      let imgKey = image.imgurl.split("/").pop().replace(".jpg", "");
      requestJSON[imgKey] = image.imgurl;
    }
  }
  // console.log(requestJSON);
  // console.log(Object.keys(requestJSON).length);
  return Object.keys(requestJSON).length === 0 ? false : requestJSON;
}

function predictionExistsRWIS(actualImagesRWIS, firebaseImages) {
  //actual images is a list of urls

  // console.log("Inside predictionExistsRWIS()");
  // console.log(actualImagesRWIS);
  // console.log(firebaseImages);

  const requestJSON = {};

  for (const image of actualImagesRWIS) {
    let imgFound = false;
    for (const fireImage of firebaseImages) {
      // These are URLS
      if (fireImage.data.Image == image) {
        imgFound = true;
        break;
      }
    }
    // If not found, generate the requestJSON for the RWIS backend
    if (!imgFound) {
      let imgKey = image.replace(".jpg", "").split("/").pop();
      requestJSON[imgKey] = image;
    }
  }

  // console.log(requestJSON);
  // Return falsy if requestJSON is empty
  return Object.keys(requestJSON).length === 0 ? false : requestJSON;
}
