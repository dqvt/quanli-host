const fs = require('fs');
const path = require('path');

// Directories to search
const directories = [
    'src/components',
    'src/views',
    'src/services',
    'src/stores'
];

// Firebase import patterns to look for
const firebasePatterns = [
    'import { db } from',
    'import { auth } from',
    'import { storage } from',
    'from \'firebase/',
    'from "firebase/'
];

// Function to recursively search directories
function searchDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
            searchDirectory(filePath);
        } else if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.vue'))) {
            checkFile(filePath);
        }
    }
}

// Function to check a file for Firebase imports
function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const pattern of firebasePatterns) {
        if (content.includes(pattern)) {
            console.log(`Firebase import found in: ${filePath}`);
            break;
        }
    }
}

// Start the search
console.log('Searching for Firebase imports...');
for (const dir of directories) {
    searchDirectory(dir);
}
console.log('Search complete.');
