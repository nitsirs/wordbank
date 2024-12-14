const fs = require('fs');
const path = require('path');
const request = require('request');

// Process the entire wordlist
const allWords = require('../app/wordList.json');
const words = allWords;  // Use all words
console.log(`Processing all ${words.length} words...`);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to download file from URL
async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        request(url)
            .pipe(fs.createWriteStream(outputPath))
            .on('finish', () => {
                console.log(`Downloaded: ${outputPath}`);
                resolve();
            })
            .on('error', (error) => {
                console.error(`Error downloading file: ${error}`);
                reject(error);
            });
    });
}

// Function to generate audio using Botnoi API
async function generateAudio(text, outputPath) {
    return new Promise((resolve, reject) => {
        const requestBody = {
            "text": text,
            "speaker": "2",
            "volume": 1,
            "speed": 1,
            "type_media": "mp3",
            "save_file": true,
            "language": "th"
        };

        const options = {
            'method': 'POST',
            'url': 'https://api-voice.botnoi.ai/openapi/v1/generate_audio',
            body: JSON.stringify(requestBody),
            headers: {
                'Botnoi-Token': 'MGY3c1dBd0V3blExVE05WXpnVHYwNmlXNTJFMzU2MTg5NA==',
                'Content-Type': 'application/json'
            }
        };

        request(options, async function (error, response) {
            if (error) {
                console.error(`Network error for ${text}: ${error}`);
                reject(error);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                console.error(`HTTP Error ${response.statusCode} for ${text}`);
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            try {
                const result = JSON.parse(response.body);
                if (result.audio_url) {
                    await downloadFile(result.audio_url, outputPath);
                    resolve();
                } else {
                    if (result.message) {
                        console.error(`API Error for ${text}: ${result.message}`);
                    }
                    reject(new Error(`No audio URL in response for ${text}`));
                }
            } catch (e) {
                console.error(`Error parsing response for ${text}: ${e}`);
                reject(e);
            }
        });
    });
}

async function generateBatch() {
    console.log('Starting batch generation...');
    
    for (const [index, word] of words.entries()) {
        const outputPath = path.join(outputDir, `word_${word}.mp3`);
        console.log(`[${index + 1}/${words.length}] Processing: ${word}`);
        
        // Check if file already exists
        if (fs.existsSync(outputPath)) {
            console.log(`⏭️ Skipped: ${word} (already exists)`);
            continue;
        }
        
        try {
            await generateAudio(word, outputPath);
            console.log(`✓ Generated: ${word}`);
            
            // Add a delay between requests
            if (index < words.length - 1) {
                await delay(1000);
            }
        } catch (error) {
            console.error(`✗ Failed: ${word} - ${error.message}`);
        }
    }
    
    console.log('Batch generation complete!');
}

generateBatch()
    .then(() => console.log('All done!'))
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    }); 