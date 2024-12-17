const fs = require('fs');
const path = require('path');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
require('dotenv').config({ path: '.env.azure' });

// Log environment setup
console.log('Environment check:');
console.log(`- Speech Region: ${process.env.AZURE_SPEECH_REGION}`);
console.log(`- Speech Key length: ${process.env.AZURE_SPEECH_KEY?.length || 0} characters`);

// Process the entire wordlist
const allWords = require('../app/wordList.json');
const words = allWords;  // Process all words
console.log(`\nProcessing ${words.length} words: ${JSON.stringify(words)}`);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
} else {
    console.log(`Output directory exists: ${outputDir}`);
}

// Helper function to delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to check file size and existence
function checkGeneratedFile(filePath) {
    try {
        const stats = fs.statSync(filePath);
        console.log(`File details for ${path.basename(filePath)}:`);
        console.log(`- Size: ${stats.size} bytes`);
        console.log(`- Created: ${stats.birthtime}`);
        console.log(`- Full path: ${filePath}`);
        return stats.size > 1000; // File should be at least 1KB
    } catch (error) {
        console.error(`Error checking file: ${error.message}`);
        return false;
    }
}

// Function to generate audio using Azure Text-to-Speech
async function generateAudio(text, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`\nGenerating audio for "${text}":`);
        console.log(`- Output path: ${outputPath}`);
        
        try {
            // Initialize speech config with environment variables
            const speechConfig = sdk.SpeechConfig.fromSubscription(
                process.env.AZURE_SPEECH_KEY,
                process.env.AZURE_SPEECH_REGION
            );
            
            // Set speech synthesis options
            speechConfig.speechSynthesisLanguage = 'th-TH';
            speechConfig.speechSynthesisVoiceName = 'th-TH-PremwadeeNeural';
            console.log('- Using voice: th-TH-PremwadeeNeural');

            // Create audio config for file output
            const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
            
            // Create synthesizer
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
            console.log('- Synthesizer created, starting generation...');

            // Event handler for synthesis completed
            synthesizer.synthesisCompleted = (s, e) => {
                console.log('- Synthesis completed event received');
            };

            // Event handler for synthesis started
            synthesizer.synthesisStarted = (s, e) => {
                console.log('- Synthesis started');
            };

            // Event handler for canceled synthesis
            synthesizer.SynthesisCanceled = (s, e) => {
                console.log(`- Synthesis canceled: ${e.errorDetails}`);
                console.log(`- Cancellation reason: ${e.reason}`);
            };

            // Synthesize text
            synthesizer.speakTextAsync(
                text,
                result => {
                    if (result) {
                        console.log(`- Speech synthesis result received: ${result.resultId}`);
                        console.log(`- Reason: ${sdk.ResultReason[result.reason]}`);
                        
                        if (result.reason === sdk.ResultReason.Canceled) {
                            const cancellation = sdk.CancellationDetails.fromResult(result);
                            console.log(`- Cancellation reason: ${sdk.CancellationReason[cancellation.reason]}`);
                            console.log(`- Error details: ${cancellation.errorDetails}`);
                            synthesizer.close();
                            reject(new Error(`Synthesis canceled: ${cancellation.errorDetails}`));
                            return;
                        }
                        
                        synthesizer.close();
                        console.log('- Synthesizer closed');

                        // Give the system a moment to finish writing the file
                        setTimeout(() => {
                            if (checkGeneratedFile(outputPath)) {
                                console.log('- File generated successfully');
                                resolve();
                            } else {
                                reject(new Error('File was not generated properly'));
                            }
                        }, 2000);
                    } else {
                        synthesizer.close();
                        reject(new Error('No result from speech synthesis'));
                    }
                },
                error => {
                    console.error(`- Error synthesizing text: ${error}`);
                    synthesizer.close();
                    reject(error);
                }
            );
        } catch (error) {
            console.error(`- Setup error: ${error}`);
            reject(error);
        }
    });
}

async function generateBatch() {
    console.log('\nStarting batch generation...');
    
    for (const [index, word] of words.entries()) {
        const outputPath = path.join(outputDir, `word_${word}.mp3`);
        console.log(`\n[${index + 1}/${words.length}] Processing: ${word}`);
        
        // Check if file already exists and is valid
        if (fs.existsSync(outputPath)) {
            console.log(`- File exists, checking details:`);
            if (checkGeneratedFile(outputPath)) {
                console.log(`⏭️ Skipped: ${word} (valid file exists)`);
                continue;
            } else {
                console.log(`- Existing file is invalid, regenerating`);
            }
        }
        
        try {
            await generateAudio(word, outputPath);
            console.log(`✓ Generated: ${word}`);
            
            // Add a delay between requests to avoid rate limiting
            if (index < words.length - 1) {
                console.log('Waiting 1 second before next word...');
                await delay(1000);
            }
        } catch (error) {
            console.error(`✗ Failed: ${word} - ${error.message}`);
        }
    }
    
    console.log('\nBatch generation complete!');
}

generateBatch()
    .then(() => {
        console.log('All done! Generated files:');
        fs.readdirSync(outputDir).forEach(file => {
            if (file.endsWith('.mp3')) {
                console.log(`\nChecking ${file}:`);
                checkGeneratedFile(path.join(outputDir, file));
            }
        });
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });