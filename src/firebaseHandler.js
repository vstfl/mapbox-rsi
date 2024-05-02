import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs, query, where} from 'firebase/firestore';

const firebaseConfig = {
// config goes here :)
};

// Init firebase app
const app = initializeApp(firebaseConfig);

// init services
const db = getFirestore();

export async function queryImagesByDateRange(startDate, endDate) {
    console.log('first')
    try {
        const images = query(collectionGroup(db, "Images",  
            where("Date", ">=", startDate),
            where("Date", "<=", endDate)
        ));
        console.log('second')
        console.log(images)
        const querySnapshot = await getDocs(images);

        const imagesArray = [];
        querySnapshot.forEach((doc) => {
            imagesArray.push({
                id: doc.id,
                data: doc.data()
            });
        });
        console.log('third')
        console.log(imagesArray);
        return imagesArray;
    } catch (error) {
        console.error("Error querying images:", error);
        throw error;
    }
}
