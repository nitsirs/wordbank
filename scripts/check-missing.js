const fs = require('fs');
const path = require('path');

// Load words from JSON
const words = require('../app/wordList.json');
console.log(`Total words in wordList.json: ${words.length}`);

// Directory where MP3 files are stored
const audioDir = path.join(__dirname, '../public/audio');
console.log(`Checking directory: ${audioDir}`);

// Read all files in the audio directory
const files = fs.readdirSync(audioDir);
console.log(`Total files found: ${files.length}`);

// Filter only .mp3 files and extract the word from each filename
const existingWords = files
  .filter(file => file.endsWith('.mp3'))
  .map(file => {
    // Filenames are in format "word_<word>.mp3"
    const match = file.match(/^word_(.+)\.mp3$/);
    return match ? match[1] : null;
  })
  .filter(word => word !== null);

console.log(`Total MP3 files found: ${existingWords.length}`);

// Find words that have not been converted to mp3 yet
const missingWords = words.filter(word => !existingWords.includes(word));

// Find any extra files that don't correspond to words in the list
const extraFiles = existingWords.filter(word => !words.includes(word));

// Print out missing words with their indices
console.log('\nMissing words:');
missingWords.forEach((word, index) => {
    const originalIndex = words.indexOf(word);
    console.log(`${originalIndex + 1}. ${word}`);
});

// Print out any extra files found
if (extraFiles.length > 0) {
    console.log('\nExtra files found (not in wordList.json):');
    extraFiles.forEach(word => {
        console.log(`- word_${word}.mp3`);
    });
}

console.log(`\nSummary:`);
console.log(`- Words in JSON: ${words.length}`);
console.log(`- MP3 files found: ${existingWords.length}`);
console.log(`- Missing words: ${missingWords.length}`);
console.log(`- Extra files: ${extraFiles.length}`);
console.log(`Completion: ${existingWords.length}/${words.length} (${Math.round(existingWords.length/words.length * 100)}%)`);

// Verify word list integrity
const uniqueWords = new Set(words);
if (uniqueWords.size !== words.length) {
    console.log('\nWarning: Duplicate words found in wordList.json:');
    const duplicates = words.filter((word, index) => words.indexOf(word) !== index);
    duplicates.forEach(word => {
        const indices = words.reduce((acc, w, i) => {
            if (w === word) acc.push(i + 1);
            return acc;
        }, []);
        console.log(`- "${word}" appears at indices: ${indices.join(', ')}`);
    });
} 