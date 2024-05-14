import * as turf from "@turf/turf";

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
  console.log("Interpolating using Lane method...");

  if (!currentGeoJSON) {
    return;
  }

  enableLoadingScreen();

  // Load the subdivided study area dataset
  let studyRoads = await loadSubdividedRoads(
    "./assets/I35I80_Lanes_500ft.geojson",
  );
  let studyPoints = currentGeoJSON;
  //

  // studyPoints = await findNearestLineSegmentsAsync(currentGeoJSON, studyRoads);

  studyPoints = findNearestLineSegmentsFast(currentGeoJSON, studyRoads);

  console.log(studyPoints);
  // TODO: Replace this code bit using spatial indexing, as it is too slow at the moment
  // Iterate through all line segments finding closest (lane matching) classification point
  assignClassificationToLineFeatures(studyRoads, studyPoints);

  // TODO: Proposed spatially indexed method
  // await assignNearestClassification(studyRoads, studyPoints);

  console.log("Interpolation complete.");
  fadeOutLoadingScreen();
  console.log(studyRoads);
  return studyRoads;
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

// Spatially indexed search, much faster (instantaneous), harder to understand
function findNearestLineSegmentsFast(studyPoints, studyRoads) {
  // Define a function to calculate the squared Euclidean distance between two points
  function squaredEuclideanDistance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  }

  // Build a spatial index from the line features
  const spatialIndex = {};
  studyRoads.features.forEach((lineFeature) => {
    const coords = lineFeature.geometry.coordinates;
    coords.forEach((coord, idx) => {
      const key = `${coord[0]},${coord[1]}`;
      spatialIndex[key] = { coord, lineFeatureId: lineFeature.id, idx };
    });
  });

  // Iterate over each point feature to find the nearest line segment
  studyPoints.features.forEach((pointFeature) => {
    let minDistance = Infinity;
    let closestClassification = null;

    // Find the nearest point on the line segments
    studyRoads.features.forEach((lineFeature) => {
      const coords = lineFeature.geometry.coordinates;
      coords.forEach((coord, idx) => {
        const distance = squaredEuclideanDistance(
          coord,
          pointFeature.geometry.coordinates,
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestClassification = lineFeature.properties.ROUTEID;
        }
      });
    });

    // Add the classification property of the closest line segment to the point
    pointFeature.properties.direction = closestClassification;
  });

  return studyPoints;
}

async function assignClassificationToLineFeatures(studyRoads, studyPoints) {
  await Promise.all(
    studyRoads.features.map(async (lineFeature) => {
      let currentGeoJSONCopy = JSON.parse(JSON.stringify(studyPoints)); // Create a copy of the studyPoints
      let nearest;

      while (!nearest && currentGeoJSONCopy.features.length > 0) {
        nearest = turf.nearestPointToLine(currentGeoJSONCopy, lineFeature);

        if (nearest) {
          // Check if nearest point matches the ROUTEID
          if (lineFeature.properties.ROUTEID === nearest.properties.direction) {
            // Access the classification property of the nearest point and assign it to the line segment
            lineFeature.properties.classification =
              nearest.properties.classification;
          } else {
            // Remove the point from the currentGeoJSONCopy
            currentGeoJSONCopy = {
              type: "FeatureCollection",
              features: currentGeoJSONCopy.features.filter(
                (feature) => feature !== nearest,
              ),
            };
            nearest = null; // Reset nearest to null to repeat the loop
          }
        }
      }
    }),
  );
}

// Spatial index based method to assign classification to nearest points
async function assignNearestClassification(studyRoads, studyPoints) {
  // Build a spatial index for the point features
  const index = new Map();
  studyPoints.features.forEach((pointFeature) => {
    index.set(pointFeature.id, pointFeature.geometry.coordinates);
  });

  await Promise.all(
    studyRoads.features.map(async (lineFeature) => {
      let nearestPointId;
      let minDistance = Infinity;

      // Iterate over the point features to find the nearest point to the current line segment
      for (const [pointId, pointCoords] of index.entries()) {
        const nearest = turf.nearestPointOnLine(lineFeature, pointCoords);
        const distance = nearest.properties.dist;
        if (distance < minDistance) {
          minDistance = distance;
          nearestPointId = pointId;
        }
      }

      // Get the nearest point feature
      const nearestPoint = studyPoints.features.find(
        (feature) => feature.id === nearestPointId,
      );

      // Check if nearest point matches the ROUTEID
      if (
        nearestPoint &&
        lineFeature.properties.ROUTEID === nearestPoint.properties.direction
      ) {
        // Access the classification property of the nearest point and assign it to the line segment
        lineFeature.properties.classification =
          nearestPoint.properties.classification;
      }
    }),
  );
}
