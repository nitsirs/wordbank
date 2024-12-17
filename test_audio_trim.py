import os
from pydub import AudioSegment
import logging
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set ffmpeg path
FFMPEG_PATH = r"C:\Users\User\Desktop\ffmpeg-7.1-essentials_build\bin\ffmpeg.exe"
FFPROBE_PATH = r"C:\Users\User\Desktop\ffmpeg-7.1-essentials_build\bin\ffprobe.exe"

if os.path.exists(FFMPEG_PATH) and os.path.exists(FFPROBE_PATH):
    AudioSegment.converter = FFMPEG_PATH
    AudioSegment.ffprobe = FFPROBE_PATH
    logger.info(f"Found ffmpeg at: {FFMPEG_PATH}")
else:
    logger.error(f"FFmpeg not found at: {FFMPEG_PATH}")
    logger.error(f"FFprobe not found at: {FFPROBE_PATH}")
    raise FileNotFoundError("FFmpeg binaries not found!")

def detect_leading_silence(sound, silence_threshold=-45.0, chunk_size=10):
    '''
    sound is a pydub.AudioSegment
    silence_threshold in dB
    chunk_size in ms

    iterate over chunks until you find the first one with sound
    '''
    trim_ms = 0 # ms

    assert chunk_size > 0 # to avoid infinite loop
    while sound[trim_ms:trim_ms+chunk_size].dBFS < silence_threshold and trim_ms < len(sound):
        trim_ms += chunk_size

    return trim_ms

def process_audio_file(input_path, output_path):
    try:
        # Convert to absolute paths
        abs_input_path = os.path.abspath(input_path)
        abs_output_path = os.path.abspath(output_path)
        
        logger.info(f"Processing file: {abs_input_path}")
        logger.info(f"File exists: {os.path.exists(abs_input_path)}")
        logger.info(f"File size: {os.path.getsize(abs_input_path)} bytes")
        
        # Load the audio file
        logger.info("Attempting to load audio file...")
        sound = AudioSegment.from_mp3(abs_input_path)
        original_duration = len(sound)
        
        logger.info(f"Successfully loaded audio file. Duration: {original_duration/1000:.2f} seconds")
        
        # Detect silence at the end
        end_trim = detect_leading_silence(sound.reverse())
        
        logger.info(f"Detected silence at end: {end_trim/1000:.2f} seconds")
        
        # If there's silence to trim
        if end_trim > 0:
            # Trim the silence from the end
            duration = len(sound)
            trimmed_sound = sound[0:duration-end_trim]
            
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(abs_output_path), exist_ok=True)
            
            # Export the trimmed file
            logger.info(f"Exporting to: {abs_output_path}")
            trimmed_sound.export(abs_output_path, format="mp3")
            
            # Print comparison
            new_duration = len(trimmed_sound)
            print(f"\nComparison for: {os.path.basename(abs_input_path)}")
            print(f"Original duration: {original_duration/1000:.2f} seconds")
            print(f"Trimmed duration: {new_duration/1000:.2f} seconds")
            print(f"Removed silence: {(original_duration - new_duration)/1000:.2f} seconds")
            print(f"Saved trimmed version to: {abs_output_path}")
        else:
            print(f"No silence to trim in: {abs_input_path}")
            
    except Exception as e:
        logger.error(f"Error processing {abs_input_path}: {str(e)}", exc_info=True)
        logger.error(f"Python version: {sys.version}")
        logger.error(f"File encoding: {sys.getfilesystemencoding()}")

def main():
    # Test with one file
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    audio_dir = os.path.join(workspace_dir, "public", "audio")
    test_dir = os.path.join(audio_dir, "test")
    
    logger.info(f"Looking for MP3 files in: {audio_dir}")
    logger.info(f"Directory exists: {os.path.exists(audio_dir)}")
    
    if not os.path.exists(audio_dir):
        logger.error(f"Audio directory does not exist: {audio_dir}")
        return
    
    # Let's try with a specific file first
    test_file = "word_บรม.mp3"  # This is a shorter file
    input_path = os.path.join(audio_dir, test_file)
    output_path = os.path.join(test_dir, f"trimmed_{test_file}")
    
    if os.path.exists(input_path):
        process_audio_file(input_path, output_path)
    else:
        logger.error(f"Test file not found: {input_path}")
        logger.error(f"Directory contents: {os.listdir(audio_dir)}")

if __name__ == "__main__":
    main()
