import * as turf from "@turf/turf";
import KDBush from "kdbush";
import * as geokdbush from "geokdbush-tk";

async function loadSubdividedRoads(path) {
  try {
    // Fetch GeoJSON data
    // const interpolationLinesRef = "./assets/Iowa_Hwy_80_35.geojson";
    // const testRef = "./assets/example.geojson";

    const response = await fetch(path);
    const data = await response.json();

    // Return GeoJSON feature collection
    return data;
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
    return null;
  }
}

// Function to enable loading screen and elements with class "loadup"
export function enableLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");
  loadingScreen.style.display = "flex";
  loadingScreen.classList.add("fadeInAnimation");
  loadingScreen.style.display = "flex";

  let elements = document.querySelectorAll(".loadup");
  elements.forEach((element) => {
    element.classList.add("fadeOutAnimation");
    element.style.opacity = 0.3;
    element.classList.remove("fadeOutAnimation");
  });
}

// Function to fade out loading screen and elements with class "loadup"
export function fadeOutLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");
  loadingScreen.classList.remove("fadeInAnimation");
  loadingScreen.classList.add("fadeOutAnimation");
  loadingScreen.classList.remove("fadeOutAnimation");

  let elements = document.querySelectorAll(".loadup");
  elements.forEach((element) => {
    element.style.opacity = 1;
  });
}

// Perform interpolation on GeoJSON
export async function interpolateGeoJSON(currentGeoJSON) {
  console.log("Interpolating...");

  if (!currentGeoJSON) {
    return;
  }

  enableLoadingScreen();

  let studyRoads = await loadSubdividedRoads(
    "./assets/Iowa_Hwy_80_35_500ft.geojson",
  );

  // Iterate through all lines
  await Promise.all(
    studyRoads.features.map(async (lineFeature) => {
      const nearest = turf.nearestPointToLine(currentGeoJSON, lineFeature);

      // Check if nearest point is found
      if (nearest) {
        // Access the classification property of the nearest point and log its value
        const classification = nearest.properties.classification;

        lineFeature.properties.classification = classification;
      }
    }),
  );
  console.log("Interpolation complete.");
  fadeOutLoadingScreen();
  //   console.log(studyRoads);
  return studyRoads;
}

export async function filterStudyArea(newGeoJSON) {
  console.log("Filtering data to study areas...")
  console.log(newGeoJSON)
  if (!newGeoJSON) {
    return;
  }
  
  let studyRoads = await loadSubdividedRoads(
    "./assets/I35I80_Lanes_100ft.geojson",
  );

  const filteredGeoJSON = await nearRoadSegments(newGeoJSON, studyRoads, 0.2)
  
  console.log("Data filtering complete.")

  enableLoadingScreen();
  fadeOutLoadingScreen();
  console.log(filteredGeoJSON)
  return filteredGeoJSON;
}

async function nearRoadSegments(newGeoJSON, studyRoads, searchRadius) {
  const roadPoints = 138137;
  const index = new KDBush(roadPoints);
  const geoidMap = new Map();

  studyRoads.features.map((line) => {
    line.geometry.coordinates.map((point) => {
      const lineID = index.add(point[0], point[1]);
      geoidMap.set(lineID, line);
    });
  });

  index.finish();

  const filteredFeatures = newGeoJSON.features.filter((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const nearbyPoints = geokdbush.around(index, lng, lat, 1, searchRadius);

    return nearbyPoints.length > 0;
  });

  const filteredGeoJSON = {
    type: "FeatureCollection",
    features: filteredFeatures,

  };
  return filteredGeoJSON
}

// Perform interpolation on GeoJSON with Lane subdivision
export async function interpolateGeoJSONLanes(currentGeoJSON) {
  console.log("Interpolating specific Lanes method...");

  if (!currentGeoJSON) {
    return;
  }

  enableLoadingScreen();

  // Load the subdivided study area dataset
  let studyRoads = await loadSubdividedRoads(
    "./assets/I35I80_Lanes_100ft.geojson",
  );
  let studyPoints = currentGeoJSON;
  // studyPoints = await findNearestLineSegmentsAsync(currentGeoJSON, studyRoads);

  studyPoints = findNearestLineSegmentsFaster(currentGeoJSON, studyRoads, 0.05); // 50m Search radius for closest lane

  // console.log(studyPoints);

  const classifiedRoads = await assignNearestClassification(
    studyRoads,
    studyPoints,
    30, // 30km Allowable search radius
  );

  console.log("Interpolation complete.");
  fadeOutLoadingScreen();
  // console.log(classifiedRoads);
  return classifiedRoads;
}

// Linear search, way slower, easier to understand (not using in final ver)
async function findNearestLineSegmentsAsync(studyPoints, studyRoads) {
  await Promise.all(
    studyPoints.features.map(async (pointFeature) => {
      let closestDistance = Infinity;
      let closestClassification;

      studyRoads.features.forEach((lineFeature) => {
        const nearest = turf.nearestPointOnLine(lineFeature, pointFeature);
        const distance = nearest.properties.dist;

        if (distance < closestDistance) {
          closestDistance = distance;
          closestClassification = lineFeature.properties.ROUTEID;
        }
      });
      // Add the classification property of the closest line segment to the point
      pointFeature.properties.direction = closestClassification;
    }),
  );
  return studyPoints;
}

// Associate lanes to points using KDBush spatial indexing algorithm
function findNearestLineSegmentsFaster(studyPoints, studyRoads, searchRadius) {
  // 43273 for 500ft, 138137 for 100ft (can determine size by checking error in console if there is a mismatch in allocated index size)
  const roadPoints = 138137; // Hardcoded, must tune later depending on road seg geojson
  const index = new KDBush(roadPoints); //
  const geoidMap = new Map();

  // Initialize indexing and mapping of all road segments
  studyRoads.features.map((line) => {
    line.geometry.coordinates.map((point) => {
      const lineID = index.add(point[0], point[1]);
      geoidMap.set(lineID, line);
    });
  });

  index.finish();

  // Iterate through all points
  for (const pointFeature of studyPoints.features) {
    // Generate sorted list of closest road segment to each point
    const nearestIDs = geokdbush.around(
      index,
      pointFeature.geometry.coordinates[0],
      pointFeature.geometry.coordinates[1],
      3,
      searchRadius,
    );

    for (const lineID of nearestIDs) {
      const closestRoad = geoidMap.get(lineID);

      if (closestRoad) {
        pointFeature.properties.direction = closestRoad.properties.ROUTEID;
        break;
      }
    }
  }
  return studyPoints;
}

// Use spatial indexing to find closest classification points
// Docs: https://github.com/mourner/kdbush  and   https://www.npmjs.com/package/geokdbush-tk
async function assignNearestClassification(
  studyRoads,
  studyPoints,
  searchRadius,
) {
  // Initialize KDBush indexing
  const index = new KDBush(studyPoints.features.length);

  // Create a map for fast lookup of points by their geoid
  const pointMap = new Map();

  studyPoints.features.forEach((point) => {
    const pointID = index.add(
      point.geometry.coordinates[0],
      point.geometry.coordinates[1],
    );
    point.properties.geoid = pointID;
    pointMap.set(pointID, point);
  });

  index.finish();

  // Loop through each feature in studyRoads
  for (const lineFeature of studyRoads.features) {
    const avgCoordinates = averageCoordinates(lineFeature.geometry.coordinates);

    const nearestIDs = geokdbush.around(
      // Generates sorted list of point IDs according to proximity to road seg
      index,
      avgCoordinates[0],
      avgCoordinates[1],
      10,
      searchRadius,
    );

    // Check list of closest points, select only those with same direction, and closest only
    for (const pointID of nearestIDs) {
      const matchingPoint = pointMap.get(pointID);

      if (
        matchingPoint &&
        matchingPoint.properties.direction === lineFeature.properties.ROUTEID
      ) {
        lineFeature.properties.classification =
          matchingPoint.properties.classification;
        break;
      }
    }
  }
  return studyRoads;
}

function averageCoordinates(coordinates) {
  let totalLat = 0;
  let totalLon = 0;
  const numCoords = coordinates.length;

  coordinates.forEach((coord) => {
    totalLat += coord[1];
    totalLon += coord[0];
  });

  const avgLat = totalLat / numCoords;
  const avgLon = totalLon / numCoords;

  return [avgLon, avgLat];
}
