from flask import Flask
from models import db
from routes import usuarios_bp, alimentos_bp, registro_comidas_bp, auth_bp, personal_info_bp
from config import Config
from flask_mail import Mail
from flask_migrate import Migrate


app = Flask(__name__)

app.config['SECRET_KEY'] = 'mysecretkey'  # Cambia 'mysecretkey' por una cadena más segura
app.config.from_object(Config)

db.init_app(app)
mail = Mail(app)

migrate = Migrate(app, db)

with app.app_context():
    db.create_all()

app.register_blueprint(usuarios_bp)
app.register_blueprint(alimentos_bp)
app.register_blueprint(registro_comidas_bp)
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(personal_info_bp, url_prefix='/personal-info')

if __name__ == '__main__':
    app.run(debug=True)
