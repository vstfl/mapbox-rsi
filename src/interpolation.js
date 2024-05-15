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
function enableLoadingScreen() {
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
function fadeOutLoadingScreen() {
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

  // Load the subdivided study area dataset
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

// Perform interpolation on GeoJSON
export async function interpolateGeoJSONLanes(currentGeoJSON) {
  console.log("Interpolating specific Lanes method...");

  if (!currentGeoJSON) {
    return;
  }

  enableLoadingScreen();

  // Load the subdivided study area dataset
  let studyRoads = await loadSubdividedRoads(
    "./assets/I35I80_Lanes_500ft.geojson",
  );
  let studyPoints = currentGeoJSON;
  // studyPoints = await findNearestLineSegmentsAsync(currentGeoJSON, studyRoads);

  studyPoints = findNearestLineSegmentsFaster(currentGeoJSON, studyRoads, 0.03); // 30m Search radius for closest lane

  // console.log(studyPoints);

  const classifiedRoads = await assignNearestClassification(
    studyRoads,
    studyPoints,
    30, // Allowable search radius
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

function findNearestLineSegmentsFaster(studyPoints, studyRoads, searchRadius) {
  const index = new KDBush(studyRoads.features.length);

  // Initialize indexing for all road segments
  studyRoads.features.map((line) => {
    const avgCoordinates = averageCoordinates(line.geometry.coordinates);
    const lineID = index.add(avgCoordinates[0], avgCoordinates[1]);
    line.properties.geoid = lineID;
  });

  index.finish();

  // Iterate through all points
  for (const pointFeature of studyPoints.features) {
    // Generate sorted list of closest road segment to each point
    const nearestIDs = geokdbush.around(
      index,
      pointFeature.geometry.coordinates[0],
      pointFeature.geometry.coordinates[1],
      50,
      searchRadius,
    );
    // Check list of closest road segments, select only closest
    for (const lineID of nearestIDs) {
      const closestRoad = studyRoads.features.filter(
        (line) => line.properties.geoid === lineID,
      )[0];

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
  // console.log(studyPoints);
  // console.log(studyRoads);

  // Initialize KDBush indexing
  const index = new KDBush(studyPoints.features.length);

  studyPoints.features.map((point) => {
    const pointID = index.add(
      point.geometry.coordinates[0],
      point.geometry.coordinates[1],
    );
    point.properties.geoid = pointID;
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
      50,
      searchRadius,
    );

    // Check list of closest points, select only those with same direction, and closest only
    for (const pointID of nearestIDs) {
      const matchingPoint = studyPoints.features.filter(
        (point) =>
          point.properties.geoid === pointID &&
          point.properties.direction === lineFeature.properties.ROUTEID,
      )[0];

      if (matchingPoint) {
        // console.log("Match found for point", matchingPoint.properties.id);
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
