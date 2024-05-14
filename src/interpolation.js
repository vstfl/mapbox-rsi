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

  // Load the subdivided study area dataset
  let studyRoads = await loadSubdividedRoads(
    "./assets/Iowa_Hwy_80_35_500ft.geojson", //
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
