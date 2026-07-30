import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig;
  private synthesizer: sdk.SpeechSynthesizer;

  constructor() {
    // Key + region from env (was hardcoded w/ a dead key + wrong region; moved out 2026-07-30).
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    if (!speechKey || !speechRegion) {
      throw new Error('Azure Speech env vars missing: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.');
    }
    this.speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    
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