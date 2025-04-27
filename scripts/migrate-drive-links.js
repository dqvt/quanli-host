import { db } from '@/config/firebase';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

async function migrateDriveLinks() {
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.oneDriveLink) {
            await updateDoc(doc.ref, {
                googleDriveLink: data.oneDriveLink,
                oneDriveLink: null // or firebase.firestore.FieldValue.delete()
            });
        }
    }
}

// Run the migration
migrateDriveLinks()
    .then(() => {
        console.log('Migration completed');
    })
    .catch((error) => {
        console.error('Migration failed:', error);
    });
