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

// Perform interpolation on GeoJSON

export async function interpolateGeoJSON(currentGeoJSON) {
  console.log("Interpolating...");

  // Load the subdivided study area dataset
  let studyRoads = await loadSubdividedRoads(
    "./assets/Iowa_Hwy_80_35_500ft.geojson",
  );
  //   console.log(studyRoads);
  // Iterate through all lines
  await Promise.all(
    studyRoads.features.map(async (lineFeature) => {
      const nearest = turf.nearestPointToLine(currentGeoJSON, lineFeature);

      // Check if nearest point is found
      if (nearest) {
        // Access the classification property of the nearest point and log its value
        const classification = nearest.properties.classification;
        //   console.log("Classification:", classification);

        lineFeature.properties.classification = classification;
      } else {
        //   console.log("No nearest point found for the line:", lineFeature);
      }
    }),
  );
  console.log("Interpolation complete.");
  //   console.log(studyRoads);
  return studyRoads;
}
