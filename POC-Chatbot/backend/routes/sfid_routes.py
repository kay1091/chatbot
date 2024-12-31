from flask import Blueprint, jsonify, request
from models import SFIDUpdate, db

sfid_routes = Blueprint('sfid_routes', __name__)

@sfid_routes.route('/api/sfid', methods=['POST'])
def add_sfid():
    data = request.json
    sfid = data.get('sfid')
    update_text = data.get('update')
    if not sfid or not update_text:
        return jsonify({"error": "SFID and update text are required"}), 400
    new_entry = SFIDUpdate(sfid=sfid, update_text=update_text)
    try:
        db.session.add(new_entry)
        db.session.commit()
        return jsonify({"message": "SFID entry added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@sfid_routes.route('/api/sfid', methods=['GET'])
def get_all_sfids():
    entries = SFIDUpdate.query.all()
    return jsonify([
        {"sfid": entry.sfid, "update": entry.update_text}
        for entry in entries
    ])

@sfid_routes.route('/api/sfid/<string:sfid>', methods=['GET'])
def get_sfid(sfid):
    entry = SFIDUpdate.query.filter_by(sfid=sfid).first()
    if entry:
        return jsonify({"sfid": entry.sfid, "update": entry.update_text})
    return jsonify({"error": "SFID not found"}), 404

@sfid_routes.route('/api/sfid/<string:sfid>', methods=['PUT'])
def update_sfid(sfid):
    data = request.json
    update_text = data.get('update')
    entry = SFIDUpdate.query.filter_by(sfid=sfid).first()
    if entry:
        entry.update_text = update_text
        db.session.commit()
        return jsonify({"message": "SFID entry updated successfully"})
    return jsonify({"error": "SFID not found"}), 404

@sfid_routes.route('/api/sfid/<string:sfid>', methods=['DELETE'])
def delete_sfid(sfid):
    entry = SFIDUpdate.query.filter_by(sfid=sfid).first()
    if entry:
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "SFID entry deleted successfully"})
    return jsonify({"error": "SFID not found"}), 404