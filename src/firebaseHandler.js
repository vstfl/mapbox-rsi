import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collectionGroup,
    getDocs,
    query,
    where,
    limit,
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

// // Handle sign-in UI visibility
if (ui.isPendingRedirect()) {
    ui.start("#firebaseui-auth-container", uiConfig);
}

// Returns a list of JSONs/dicts which represent each point queried from the database
export async function queryImagesByDateRange(startDate, endDate) {
    // console.log('Querying from ' + startDate + ' To ' + endDate)

    const collectionRef = collectionGroup(db, "Images");

    const images = await query(
        collectionRef,
        limit(1000), // TODO: Adjust this later
        where("Date", ">=", startDate),
        where("Date", "<=", endDate),
    );

    const querySnapshot = await getDocs(images);
    const imagesArray = [];

    querySnapshot.forEach((doc) => {
        // console.log(doc.data());
        imagesArray.push({
            id: doc.id,
            data: doc.data(),
        });
    });

    // console.log('Return of Query (first obj): '+ JSON.stringify(imagesArray[0], null, 2))
    // console.log('Data inside of first obj: '+ imagesArray[0].data)
    console.log("Size of query: " + imagesArray.length);
    return imagesArray;
}
