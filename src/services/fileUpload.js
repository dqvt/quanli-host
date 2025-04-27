import { db, storage } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage and save reference to Firestore
 * @param {File} file - The file to upload
 * @param {string} customerId - The ID of the customer
 * @param {number} year - The year for the debt
 * @param {string} notes - Optional notes about the file
 * @returns {Promise<Object>} - The uploaded file information
 */
export const uploadDebtFile = async (file, customerId, year, notes = '') => {
    try {
        // Create a unique file path in storage
        const timestamp = new Date().getTime();
        const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_'); // Sanitize filename
        const path = `debt_files/${customerId}/${year}/${timestamp}_${fileName}`;

        // Upload the file to Firebase Storage
        const storageRef = ref(storage, path);
        let downloadURL;

        try {
            // Use the simpler uploadBytes method
            const snapshot = await uploadBytes(storageRef, file);

            // Get the download URL
            downloadURL = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
            console.error('Error during upload:', uploadError);
            throw uploadError;
        }

        // Save file reference to Firestore
        const fileData = {
            customerId,
            year,
            fileName,
            fileType: file.type,
            fileSize: file.size,
            filePath: path,
            downloadURL,
            notes,
            uploadedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'customer_files'), fileData);

        return {
            id: docRef.id,
            ...fileData,
            uploadedAt: new Date() // Use a JavaScript Date for immediate display
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

/**
 * Delete a file from Firebase Storage and remove reference from Firestore
 * @param {string} path - The path of the file in storage
 * @param {string} fileId - The ID of the file document in Firestore
 * @returns {Promise<void>}
 */
export const deleteDebtFile = async (path, fileId) => {
    try {
        // Delete the file from Firebase Storage
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);

        // Delete the file reference from Firestore
        await deleteDoc(doc(db, 'customer_files', fileId));
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

/**
 * Get all files for a specific customer and year
 * @param {string} customerId - The ID of the customer
 * @param {number} year - The year for the debt
 * @returns {Promise<Array>} - Array of file documents
 */
export const getCustomerFiles = async (customerId, year) => {
    try {
        const filesQuery = query(collection(db, 'customer_files'), where('customerId', '==', customerId), where('year', '==', year));

        const querySnapshot = await getDocs(filesQuery);

        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting customer files:', error);
        return [];
    }
};
