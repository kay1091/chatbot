from flask import Flask, request, jsonify, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import re
import json
from sqlalchemy.exc import IntegrityError

# Configuration
class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///sfid_updates.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db = SQLAlchemy(app)

# Define SFIDUpdate model
class SFIDUpdate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sfid = db.Column(db.String(50), unique=True, nullable=False)
    update_text = db.Column(db.Text, nullable=False)

# Create tables
with app.app_context():
    db.create_all()

# SFID validation function
def validate_sfid(sfid):
    pattern = re.compile(r'^[A-Za-z0-9-_]{1,50}$')
    return bool(pattern.match(sfid))

# Root endpoint
@app.route('/')
def index():
    return jsonify({"message": "Welcome to the Chatbot API!"}), 200

# Get all SFID entries with enhanced JSON handling
@app.route('/api/sfid/all', methods=['GET'])
def get_all_sfid():
    try:
        entries = SFIDUpdate.query.all()
        result = []
        for entry in entries:
            try:
                update_data = json.loads(entry.update_text)  # Parse JSON
            except json.JSONDecodeError:
                current_app.logger.warning(f"Invalid JSON for entry ID {entry.id}: {entry.update_text}")
                update_data = {"error": "Invalid JSON"}  # Fallback

            result.append({
                "id": entry.id,
                "sfid": entry.sfid,
                "update": update_data
            })
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching SFID data: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Add SFID entry
@app.route('/api/chatbot/add', methods=['POST'])
def add_sfid():
    try:
        data = request.get_json()
        if not data or 'sfid' not in data or 'update' not in data:
            return jsonify({"error": "sfid and update are required"}), 400

        if not validate_sfid(data['sfid']):
            return jsonify({"error": "Invalid SFID format"}), 400

        # Validate and serialize update field
        try:
            json_update = json.dumps(data['update'])  # Ensure valid JSON
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid update format"}), 400

        # Add or update entry
        entry = SFIDUpdate.query.filter_by(sfid=data['sfid']).first()
        if entry:
            entry.update_text = json_update
            db.session.commit()
            return jsonify({"message": "SFID already exists. Entry updated!"}), 200
        else:
            new_entry = SFIDUpdate(sfid=data['sfid'], update_text=json_update)
            db.session.add(new_entry)
            db.session.commit()
            return jsonify({"message": "Entry added!"}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "SFID already exists"}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding new entry: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Update SFID entry
@app.route('/api/chatbot/update', methods=['PUT'])
def update_sfid():
    try:
        data = request.get_json()
        if not data or 'sfid' not in data or 'update' not in data:
            return jsonify({"error": "sfid and update are required"}), 400

        if not validate_sfid(data['sfid']):
            return jsonify({"error": "Invalid SFID format"}), 400

        # Validate and serialize update field
        try:
            json_update = json.dumps(data['update'])  # Ensure valid JSON
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid update format"}), 400

        # Update existing entry
        entry = SFIDUpdate.query.filter_by(sfid=data['sfid']).first()
        if not entry:
            return jsonify({"error": f"SFID {data['sfid']} not found"}), 404

        entry.update_text = json_update
        db.session.commit()
        return jsonify({"message": "Entry updated!"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating entry: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Main function
if __name__ == '__main__':
    app.run(debug=True)
