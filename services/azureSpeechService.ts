import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig;
  private synthesizer: sdk.SpeechSynthesizer;

  constructor() {
    // Initialize with Azure Speech Service key and region
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      '8Pf36xf8HDbmSEDR4SG23bt8i2ldSBT2gaB0aicQVvkEGmMJT0PhJQQJ99ALACqBBLyXJ3w3AAAYACOGWjCe',
      'eastus'
    );
    
    // Set speech synthesis language and voice
    this.speechConfig.speechSynthesisLanguage = 'th-TH';
    this.speechConfig.speechSynthesisVoiceName = 'th-TH-Premwadee'; // Standard voice model
    
    // Create speech synthesizer
    this.synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
  }

  async synthesizeToFile(text: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, audioConfig);

      synthesizer.speakTextAsync(
        text,
        result => {
          if (result) {
            synthesizer.close();
            resolve();
          }
        },
        error => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  }

  close() {
    if (this.synthesizer) {
      this.synthesizer.close();
    }
  }
}

export const azureSpeechService = new AzureSpeechService();
export default azureSpeechService; 