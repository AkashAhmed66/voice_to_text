# app.py
import os
from flask import Flask, request, jsonify, render_template
from banglaspeech2text import Speech2Text  # or use Wav2Vec2 instead
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure upload folder and allowed extensions
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not found in environment variables. Text refinement will be disabled.")
    client = None
else:
    client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize the model (small or base for lighter use)
try:
    stt = Speech2Text("small")
except Exception as e:
    print(f"Error initializing Speech2Text model: {e}")
    stt = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def refine_bangla_text(transcription):
    """
    Refine Bangla text using OpenAI API to fix spelling, grammar, and missing words
    """
    if not client:
        print("OpenAI client not available. Returning original transcription.")
        return transcription
        
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful assistant that refines Bangla text. Do not translate, just fix spelling, grammar, and missing words. Keep the text in Bangla language. If the input is empty or very short, return it as is."
                },
                {
                    "role": "user", 
                    "content": transcription
                }
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        refined_text = response.choices[0].message.content.strip()
        return refined_text
        
    except Exception as e:
        print(f"Error refining text with OpenAI: {e}")
        # Return original transcription if refinement fails
        return transcription

@app.route("/")
def index():
    return render_template('index.html')

@app.route("/api/docs")
def api_docs():
    """
    API documentation page
    """
    base_url = request.url_root.rstrip('/')
    return render_template('api_docs.html', base_url=base_url)

@app.route("/api/transcribe", methods=["POST"])
def api_transcribe():
    """
    API endpoint for audio transcription
    Returns JSON response with transcription data
    """
    try:
        # Check if model is initialized
        if stt is None:
            return jsonify({
                "success": False,
                "error": "Speech recognition model is not available. Please check server configuration."
            }), 500
        
        # Check if file is present
        if "audio" not in request.files:
            return jsonify({
                "success": False,
                "error": "No file uploaded"
            }), 400

        audio_file = request.files["audio"]
        
        # Check if file is selected
        if audio_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        # Check file type
        if not allowed_file(audio_file.filename):
            return jsonify({
                "success": False,
                "error": "Invalid file type. Please upload WAV, MP3, or M4A files only."
            }), 400

        # Secure the filename and save temporarily
        filename = secure_filename(audio_file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_api_{filename}")
        audio_file.save(filepath)

        # Run transcription
        try:
            transcription = stt.recognize(filepath)
            
            # Clean up temporary file
            if os.path.exists(filepath):
                os.remove(filepath)
            
            # Check if transcription is empty or None
            if not transcription or transcription.strip() == "":
                return jsonify({
                    "success": False,
                    "error": "No speech detected in the audio file. Please try with a clearer audio recording."
                }), 400
            
            # Refine the transcription using OpenAI
            print(f"Original transcription: {transcription}")
            refined_transcription = refine_bangla_text(transcription)
            print(f"Refined transcription: {refined_transcription}")
            
            # Check if refinement was successful (text actually changed)
            is_refined = client is not None and refined_transcription != transcription
            
            return jsonify({
                "success": True,
                "data": {
                    "transcription": refined_transcription,
                    "original_transcription": transcription,
                    "refined": is_refined,
                    "filename": audio_file.filename
                }
            })
            
        except Exception as e:
            # Clean up temporary file in case of error
            if os.path.exists(filepath):
                os.remove(filepath)
            print(f"Transcription error: {e}")
            return jsonify({
                "success": False,
                "error": "Failed to process the audio file. Please try again with a different file."
            }), 500
            
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred. Please try again."
        }), 500

@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Web interface transcription endpoint (for backward compatibility)
    """
    # Call the API function and extract the response
    api_response = api_transcribe()
    
    # If it's a successful response, extract the data
    if hasattr(api_response, 'status_code') and api_response.status_code == 200:
        response_data = api_response.get_json()
        if response_data.get('success'):
            data = response_data['data']
            return jsonify({
                "transcription": data['transcription'],
                "original_transcription": data['original_transcription'],
                "refined": data['refined']
            })
    
    # If error, return the error response
    return api_response

if __name__ == "__main__":
    app.run(debug=True)
