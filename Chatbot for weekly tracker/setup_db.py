import sqlite3

# Create the database and table
with sqlite3.connect('team.db') as conn:
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS team_members (
        sbu TEXT,
        account_name TEXT,
        sfdc_id TEXT PRIMARY KEY,
        opportunity_name TEXT,
        opportunity_description TEXT,
        client_partner TEXT,
        opportunity_type TEXT,
        bid_manager TEXT,
        proposal_writer TEXT,
        orals_spoc TEXT,
        partner_details TEXT,
        solution_spocs TEXT,
        delivery_spoc TEXT,
        due_date TEXT,
        value_usd REAL,
        dsc TEXT,
        stage TEXT,
        status_next_steps TEXT,
        proposal_status TEXT,
        category TEXT
    )
    """)
    print("Database created and table initialized!")