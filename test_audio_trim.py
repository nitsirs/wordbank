import os
import subprocess
import logging
import sys
import shutil
import json
from mutagen.mp3 import MP3

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set ffmpeg path
FFMPEG_PATH = r"C:\Users\User\Desktop\ffmpeg-7.1-essentials_build\bin\ffmpeg.exe"
FFPROBE_PATH = r"C:\Users\User\Desktop\ffmpeg-7.1-essentials_build\bin\ffprobe.exe"

if not os.path.exists(FFMPEG_PATH) or not os.path.exists(FFPROBE_PATH):
    logger.error(f"FFmpeg not found at: {FFMPEG_PATH}")
    logger.error(f"FFprobe not found at: {FFPROBE_PATH}")
    raise FileNotFoundError("FFmpeg binaries not found!")

def get_audio_duration(input_path):
    """Get the duration of an audio file using mutagen"""
    try:
        audio = MP3(input_path)
        return audio.info.length
    except Exception as e:
        logger.error(f"Error getting duration using mutagen: {str(e)}")
        return None

def detect_silence_end(input_path, silence_threshold=-45):
    """Detect silence at the end of the file using ffmpeg silencedetect filter"""
    try:
        # Create temporary file with simple name
        temp_dir = os.path.dirname(input_path)
        temp_path = os.path.join(temp_dir, "temp_process.mp3")
        shutil.copy2(input_path, temp_path)
        
        try:
            cmd = f'"{FFMPEG_PATH}" -i "{temp_path}" -af silencedetect=noise={silence_threshold}dB:d=0.1 -f null -'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
            
            # Parse the output to find silence end times
            silence_starts = []
            for line in result.stderr.split('\n'):
                if "silence_start" in line:
                    time = float(line.split("silence_start: ")[1].split()[0])
                    silence_starts.append(time)
            
            if silence_starts:
                return silence_starts[-1]  # Return the last silence start time
            return None
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        logger.error(f"Error detecting silence: {str(e)}")
        return None

def trim_audio(input_path, output_path, end_time):
    """Trim audio file using ffmpeg"""
    try:
        # Create temporary files with simple names
        temp_dir = os.path.dirname(input_path)
        temp_input = os.path.join(temp_dir, "temp_input.mp3")
        temp_output = os.path.join(temp_dir, "temp_output.mp3")
        
        # Copy input to temp file
        shutil.copy2(input_path, temp_input)
        
        try:
            cmd = f'"{FFMPEG_PATH}" -i "{temp_input}" -t {end_time} -acodec libmp3lame -y "{temp_output}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
            
            # If successful, move temp output to final output
            if os.path.exists(temp_output):
                shutil.move(temp_output, output_path)
                return True
            return False
            
        finally:
            # Clean up temporary files
            if os.path.exists(temp_input):
                os.remove(temp_input)
            if os.path.exists(temp_output):
                os.remove(temp_output)
                
    except Exception as e:
        logger.error(f"Error trimming audio: {str(e)}")
        return False

def process_audio_file(input_path, output_path):
    try:
        logger.info(f"Processing file: {input_path}")
        
        # Get total duration using mutagen
        duration = get_audio_duration(input_path)
        if duration is None:
            logger.error(f"Failed to get duration for: {input_path}")
            return False
            
        # Detect silence using temporary file
        silence_start = detect_silence_end(input_path)
        if silence_start is None:
            logger.error(f"No silence detected in: {input_path}")
            return False
            
        if silence_start >= duration:
            logger.error(f"Invalid silence position ({silence_start}) >= duration ({duration}) in: {input_path}")
            return False
            
        # Trim the file using temporary files
        success = trim_audio(input_path, output_path, silence_start)
        
        if success:
            new_duration = get_audio_duration(output_path)
            if new_duration is None:
                logger.error(f"Failed to get duration of trimmed file: {output_path}")
                return False
                
            print(f"\nComparison for: {os.path.basename(input_path)}")
            print(f"Original duration: {duration:.2f} seconds")
            print(f"Trimmed duration: {new_duration:.2f} seconds")
            print(f"Removed silence: {(duration - new_duration):.2f} seconds")
            print(f"Saved trimmed version to: {output_path}")
            return True
        else:
            logger.error(f"Failed to trim file: {input_path}")
            return False
            
    except Exception as e:
        logger.error(f"Error processing {input_path}: {str(e)}")
        return False

def main():
    # Set up paths
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    audio_dir = os.path.join(workspace_dir, "public", "audio")
    output_dir = os.path.join(audio_dir, "trimmed")
    
    logger.info(f"Looking for MP3 files in: {audio_dir}")
    
    if not os.path.exists(audio_dir):
        logger.error(f"Audio directory does not exist: {audio_dir}")
        return
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Get list of MP3 files and create filename mapping
        mp3_files = [f for f in os.listdir(audio_dir) if f.lower().endswith('.mp3')]
        logger.info(f"Found {len(mp3_files)} MP3 files to process")
        
        # Create filename mapping dictionary
        filename_map = {i: filename for i, filename in enumerate(mp3_files)}
        
        # Save the mapping for reference
        mapping_file = os.path.join(output_dir, "filename_mapping.json")
        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump(filename_map, f, ensure_ascii=False, indent=2)
        logger.info("Saved filename mapping to filename_mapping.json")
        
        # Keep track of processing results
        successful_files = []
        failed_files = []
        
        # Process each file using numeric indices
        for index, original_filename in filename_map.items():
            try:
                # Create temporary numeric filename
                temp_filename = f"word_{index}.mp3"
                
                # Set up paths
                input_path = os.path.join(audio_dir, original_filename)
                temp_output_path = os.path.join(output_dir, temp_filename)
                final_output_path = os.path.join(output_dir, original_filename)
                
                logger.info(f"Processing {original_filename} (temporary index: {index})")
                
                # Process the audio file
                if process_audio_file(input_path, temp_output_path):
                    # Rename back to original Thai filename
                    if os.path.exists(temp_output_path):
                        try:
                            shutil.move(temp_output_path, final_output_path)
                            logger.info(f"Successfully renamed {temp_filename} back to {original_filename}")
                            successful_files.append(original_filename)
                        except Exception as e:
                            logger.error(f"Failed to rename {temp_filename} to {original_filename}: {str(e)}")
                            failed_files.append(original_filename)
                    else:
                        logger.error(f"Temporary file not found: {temp_output_path}")
                        failed_files.append(original_filename)
                else:
                    logger.error(f"Failed to process {original_filename}")
                    failed_files.append(original_filename)
                    
            except Exception as e:
                logger.error(f"Error processing file {original_filename}: {str(e)}")
                failed_files.append(original_filename)
                continue
        
        # Print summary
        print("\nProcessing Summary:")
        print(f"Successfully processed: {len(successful_files)} files")
        print(f"Failed to process: {len(failed_files)} files")
        
        if failed_files:
            print("\nFailed files:")
            for file in failed_files:
                print(f"- {file}")
            
    except Exception as e:
        logger.error(f"Error in main process: {str(e)}", exc_info=True)

if __name__ == "__main__":
    main()
