from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class SFIDUpdate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sfid = db.Column(db.String(50), unique=True, nullable=False)
    update_text = db.Column(db.Text, nullable=False)
