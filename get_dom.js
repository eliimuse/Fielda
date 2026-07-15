const fs = require('fs');
const code = fs.readFileSync('src/components/MatchdayHub.tsx', 'utf8');

// A simple script to extract the JSX structure
// I will just use regex to find the components or we can just read the file manually
