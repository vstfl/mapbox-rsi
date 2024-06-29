import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collectionGroup,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";

import firebase from "firebase/compat/app";
import * as firebaseui from "firebaseui";
import "firebaseui/dist/firebaseui.css";

const firebaseConfig = {
  apiKey: "AIzaSyC7GBQB3LVoKhtmvMqRn5UjgWWFh4JH-yc",
  authDomain: "demorsi-a1501.firebaseapp.com",
  databaseURL: "https://demorsi-a1501-default-rtdb.firebaseio.com",
  projectId: "demorsi-a1501",
  storageBucket: "demorsi-a1501.appspot.com",
  messagingSenderId: "817015833630",
  appId: "1:817015833630:web:8527005d0d234165b21a0f",
};

// Init firebase app
const app = firebase.initializeApp(firebaseConfig);

// init services
const db = getFirestore();

// Initialize FirebaseUI Widget
var uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function (authResult) {
      // User successfully signed in.
      // Return type determines whether we continue the redirect automatically
      // or whether we leave that to developer to handle.
      console.log("yes");
      const greyOut = document.querySelector(".grey-out");
      greyOut.style.display = "none";
      console.log(authResult.user.uid);
      return false;
    },
    uiShown: function () {
      // The widget is rendered.
      // Hide the loader.
      document.getElementById("loader").style.display = "none";
    },
  },
  signInOptions: [
    // https://firebase.google.com/docs/auth/web/firebaseui
    {
      provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
      requireDisplayName: false,
    },
  ],
};
var ui = new firebaseui.auth.AuthUI(firebase.auth());
ui.start("#firebaseui-auth-container", uiConfig);

// Handle sign-in UI visibility
if (ui.isPendingRedirect()) {
  ui.start("#firebaseui-auth-container", uiConfig);
}

// Returns a list of JSONs/dicts which represent each point queried from the database
export async function queryImagesByDateRange(startDate, endDate) {
  // console.log('Querying from ' + startDate + ' To ' + endDate)

  const collectionRef = collectionGroup(db, "Images");
  // console.log("inside firebasehandler");

  const startTimestamp = Timestamp.fromDate(startDate);

  const modStart = new Date(endDate.getTime() - 60 * 60000); // Change 60. This value should match that of the mesonetscrape
  const startTimestampRWIS = Timestamp.fromDate(modStart); // Distinction to ensure RWIS data is latest rather than windowed

  const endTimestamp = Timestamp.fromDate(endDate);

  const imagesAVL = await query(
    collectionRef,
    limit(5000), // TODO: Adjust this later
    where("Date", ">=", startTimestamp),
    where("Date", "<=", endTimestamp),
    where("Type", "==", "AVL"),
  );

  const imagesRWIS = await query(
    collectionRef,
    limit(300), // TODO: Adjust this later
    where("Date", ">=", startTimestampRWIS),
    where("Date", "<=", endTimestamp),
    where("Type", "==", "RWIS"),
  );

  const querySnapshotAVL = await getDocs(imagesAVL);
  const querySnapshotRWIS = await getDocs(imagesRWIS);
  const imagesArrayAVL = [];
  const imagesArrayRWIS = [];

  querySnapshotAVL.forEach((doc) => {
    // console.log(doc.data());
    // if (doc.id.startsWith("A")) {
    if (doc.data()["Type"] == "AVL") {
      imagesArrayAVL.push({
        id: doc.id,
        data: doc.data(),
      });
    }
  });

  querySnapshotRWIS.forEach((doc) => {
    if (doc.data()["Type"] == "RWIS") {
      imagesArrayRWIS.push({
        id: doc.id,
        data: doc.data(),
      });
    }
  });

  // TODO: Remove any duplicates (entries with same image url)
  // REASON: AVL source data can come from the previous archive and the new archive, so overlaps can exist
  // Do not delete the old archive, as a backup is important, but do delete the new archive data for debugging.
  // console.log('Return of Query (first obj): '+ JSON.stringify(imagesArray[0], null, 2))
  // console.log('Data inside of first obj: '+ imagesArray[0].data)
  console.log(
    "Size of AVL Query: " +
      imagesArrayAVL.length +
      ", RWIS Query: " +
      imagesArrayRWIS.length,
  );
  // console.log(imagesArrayRWIS);
  return [imagesArrayAVL, imagesArrayRWIS];
}
