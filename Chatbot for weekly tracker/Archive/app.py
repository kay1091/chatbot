from flask import Flask, request, jsonify
import sqlite3
import re

app = Flask(__name__)

# Validate SFDC ID format
def is_valid_sfdc_id(sfdc_id):
    return re.match(r'^(SF-\d{6}|NOSFID)$', sfdc_id) is not None

@app.route('/chatbot', methods=['POST'])
def chatbot():
    user_data = request.json
    state = user_data.get('state')
    response = {}

    if state == "start":
        response['message'] = "Welcome! Please provide the SFDC ID (e.g., SF-XXXXXX or NOSFID)."
        response['next_state'] = "get_sfdc_id"

    elif state == "get_sfdc_id":
        sfdc_id = user_data.get('sfdc_id')
        if not is_valid_sfdc_id(sfdc_id):
            response['message'] = "Invalid SFDC ID format. Please try again."
            response['next_state'] = "get_sfdc_id"
        else:
            with sqlite3.connect('team.db') as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM team_members WHERE sfdc_id = ?", (sfdc_id,))
                row = cur.fetchone()

            if row:
                response['message'] = f"Record found for {sfdc_id}. What would you like to update?"
                response['fields'] = ["status_next_steps", "category", "due_date", "dsc", "proposal_status"]
                response['next_state'] = "update_record"
            else:
                response['message'] = "SFDC ID not found. Let’s create a new record. Please provide the details."
                response['next_state'] = "create_record"

    elif state == "update_record":
        updates = user_data.get('updates')
        sfdc_id = user_data.get('sfdc_id')

        with sqlite3.connect('team.db') as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE team_members
                SET status_next_steps = ?, category = ?, due_date = ?, dsc = ?, proposal_status = ?
                WHERE sfdc_id = ?""",
                (updates['status_next_steps'], updates['category'], updates['due_date'], updates['dsc'], updates['proposal_status'], sfdc_id))
            conn.commit()

        response['message'] = f"Record updated for {sfdc_id}!"
        response['next_state'] = "start"

    elif state == "create_record":
        data = user_data.get('data')

        with sqlite3.connect('team.db') as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO team_members 
                (sbu, account_name, sfdc_id, opportunity_name, opportunity_description, client_partner, 
                 opportunity_type, bid_manager, proposal_writer, orals_spoc, partner_details, solution_spocs, 
                 delivery_spoc, due_date, value_usd, dsc, stage, status_next_steps, proposal_status, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (data['sbu'], data['account_name'], data['sfdc_id'], data['opportunity_name'], data['opportunity_description'], 
                 data['client_partner'], data['opportunity_type'], data['bid_manager'], data['proposal_writer'], data['orals_spoc'], 
                 data['partner_details'], data['solution_spocs'], data['delivery_spoc'], data['due_date'], data['value_usd'], 
                 data['dsc'], data['stage'], data['status_next_steps'], data['proposal_status'], data['category']))
            conn.commit()

        response['message'] = f"New record created for {data['sfdc_id']}!"
        response['next_state'] = "start"

    else:
        response['message'] = "I didn’t understand that. Let’s start again."
        response['next_state'] = "start"

    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)