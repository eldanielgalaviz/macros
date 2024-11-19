from flask import Flask, request, jsonify
from models import db, classusuarios ,classalimentos # Asegúrate de que `classusuarios` esté correctamente definido en `models.py`
from routes import usuarios_bp, alimentos_bp, registro_comidas_bp, auth_bp, personal_info_bp
from config import Config
from flask_mail import Mail
from flask_migrate import Migrate
from flask_cors import CORS

# Crear la aplicación Flask
app = Flask(__name__)

# Configuración de CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:4200"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
        "supports_credentials": True
    }
})

# Configuración de la base de datos y Flask-Mail
app.config['SECRET_KEY'] = 'mysecretkey'  # Cambia 'mysecretkey' por una cadena más segura
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:@localhost/macronutrientes'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config.from_object(Config)

db.init_app(app)
mail = Mail(app)

# Configuración de migraciones
migrate = Migrate(app, db)

# Registro de blueprints
app.register_blueprint(usuarios_bp)
app.register_blueprint(alimentos_bp)
app.register_blueprint(registro_comidas_bp)
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(personal_info_bp, url_prefix='/personal-info')

# Ruta adicional para obtener la cantidad de comidas
@app.route('/get_cantidad_comidas', methods=['POST'])
def get_cantidad_comidas():
    data = request.get_json()  # Obtenemos los datos enviados desde el frontend
    print('Datos recibidos:', data)

    user_id = data.get('id')
    if not user_id:
        return jsonify({'error': 'ID no proporcionado'}), 400

    # Consulta a la base de datos
    user = classusuarios.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({'cantidad_comidas': user.cantidad_comidas}), 200

# Crear tablas si no existen (solo útil para desarrollo)
with app.app_context():
    db.create_all()

@app.route('/consultar_alimentos', methods=['GET'])
def alimentos():
    # Obtener todos los alimentos de la tabla classalimentos
    alimentos = classalimentos.query.all()

    # Si no hay alimentos en la base de datos
    if not alimentos:
        return jsonify({'mensaje': 'No se encontraron alimentos'}), 404
    
    # Crear una lista con los nombres de los alimentos
    nombres_alimentos = [alim.nombre for alim in alimentos]

    # Devolver los nombres en formato JSON
    return jsonify({'nombres': nombres_alimentos}), 200

@app.route('/get_alimento_detalles/<nombre>', methods=['GET'])
def obtener_detalles_alimento(nombre):
    # Obtener el alimento de la base de datos por su nombre
    alimento = classalimentos.query.filter_by(nombre=nombre).first()

    if alimento:
        # Devolver los detalles del alimento
        return jsonify({
            'detalle': {
                'proteinas': alimento.proteinas,
                'carbohidratos': alimento.carbohidratos,
                'grasas': alimento.grasas,
                'calorias': alimento.calorias
            }
        }), 200
    else:
        return jsonify({'mensaje': 'Alimento no encontrado'}), 404


# Ruta adicional para obtener la cantidad de comidas
@app.route('/get_cantidad_agua', methods=['POST'])
def get_cantidad_agua():
    data = request.get_json()  # Obtenemos los datos enviados desde el frontend
    print('Datos recibidos en /get_cantidad_agua:', data)

    user_id = data.get('id')
    if not user_id:
        print('Error: ID no proporcionado')
        return jsonify({'error': 'ID no proporcionado'}), 400

    user = classusuarios.query.filter_by(id=user_id).first()
    if not user:
        print(f'Error: Usuario con ID {user_id} no encontrado')
        return jsonify({'error': 'Usuario no encontrado'}), 404

    print(f'Requerimiento de agua para el usuario {user_id}: {user.requerimentoagua}')
    return jsonify({'requerimentoagua': user.requerimentoagua}), 200

# Ejecutar la aplicación
if __name__ == '__main__':
    app.run(debug=True)
