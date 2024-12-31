from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from database.models import db, SFIDUpdate

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sfid_updates.db'
db.init_app(app)

with app.app_context():
    db.create_all()
@app.route('/api/sfid/all', methods=['GET'])
def get_all_sfid():
    entries = SFIDUpdate.query.all()
    return jsonify([{"sfid": entry.sfid, "update": entry.update_text} for entry in entries])

@app.route('/api/chatbot/add', methods=['POST'])
def add_sfid():
    data = request.json
    new_entry = SFIDUpdate(sfid=data['sfid'], update_text=data['update'])
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({"message": "Entry added!"}), 201
