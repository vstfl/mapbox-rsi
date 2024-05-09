import * as turf from "@turf/turf";

async function loadGeoJSON(filePath) {
  try {
    // Fetch GeoJSON data
    const response = await fetch(filePath);
    const data = await response.json();

    // Return GeoJSON feature collection
    return data;
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
    return null;
  }
}

const interpolationLinesRef = "./assets/Iowa_Hwy_80_35.geojson";
const testRef = "./assets/example.geojson";
let highwayGeoJSON;
let exampleGeoJSON;
loadGeoJSON(interpolationLinesRef)
  .then((geoJSONData) => {
    if (geoJSONData) {
      highwayGeoJSON = geoJSONData;
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });

loadGeoJSON(interpolationLinesRef)
  .then((geoJSONData) => {
    if (geoJSONData) {
      exampleGeoJSON = geoJSONData;
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });
