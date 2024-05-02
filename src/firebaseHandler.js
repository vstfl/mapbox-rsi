import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs, query, where, limit} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyC7GBQB3LVoKhtmvMqRn5UjgWWFh4JH-yc",
    authDomain: "demorsi-a1501.firebaseapp.com",
    databaseURL: "https://demorsi-a1501-default-rtdb.firebaseio.com",
    projectId: "demorsi-a1501",
    storageBucket: "demorsi-a1501.appspot.com",
    messagingSenderId: "817015833630",
    appId: "1:817015833630:web:8527005d0d234165b21a0f"
  };

// Init firebase app
const app = initializeApp(firebaseConfig);

// init services
const db = getFirestore();

// Returns a list of JSONs/dicts which represent each point queried from the database
export async function queryImagesByDateRange(startDate, endDate) {
    // console.log('From ' + startDate + ' To ' + endDate)

    const collectionRef = collectionGroup(db, 'Images')

    const images = await query(collectionRef,
        limit(100), // TODO: Adjust this later
        where('Date', '>=', startDate),
        where('Date', '<=', endDate)
        )

    const querySnapshot = await getDocs(images);
    const imagesArray = [];

    querySnapshot.forEach(doc => {
        // console.log(doc.data());
        imagesArray.push({
            id: doc.id,
            data: doc.data()
        });
    });

    // console.log('Return of Query (first obj): '+ JSON.stringify(imagesArray[0], null, 2))
    // console.log('Data inside of first obj: '+ imagesArray[0].data)
    console.log('Size of query: '+imagesArray.length)
    return imagesArray;
}
