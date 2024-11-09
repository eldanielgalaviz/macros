import jwt
import datetime
from flask import Blueprint, jsonify, request, current_app, url_for, render_template
from models import db, classusuarios, classalimentos, RegistroComidas
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
from sqlalchemy import func
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from sqlalchemy import func

mail = Mail()
#--------------------------------------------------Proteger rutas ------------------------------------------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Obtener el token de los encabezados
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]  # Extraer el token del formato Bearer

        if not token:
            return jsonify({'message': 'Token no proporcionado'}), 401

        try:
            # Decodificar el token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = classusuarios.query.filter_by(id=data['id']).first()

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido'}), 401

        # Llamar a la función decorada sin pasar el current_user_id
        return f(current_user, *args, **kwargs)

    return decorated

#--------------------------------------------------Rutas de autorización--------------------------------------------------
auth_bp = Blueprint('auth', __name__)
#--------------------------------------------------Rutas para login ------------------------------------------------------------
usuarios_bp = Blueprint('usuarios', __name__)
@auth_bp.route('/login', methods=['POST'])
def login():
    try:

        data = request.json
        user = classusuarios.query.filter_by(usuario=data['usuario']).first()

        if not user.verificado:
            return jsonify ({'message' : 'Por favor verifica tu cuenta antes de iniciar sesión'}), 403
        
        elif not user or not user.check_password(data['password']):
            return jsonify ({'message' : 'Credenciales inválidas'}), 401
        
        #if user and check_password_hash(user.password_hash, data['password']):
        token = jwt.encode({
            'id': user.id,
            'usuario':user.usuario,
            'correo':user.correo,
            'rol': user.rol,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify ({'token':token}),200
    
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

    #else:
        #return jsonify ({'message': 'Credenciales invalidas'})
    
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if classusuarios.query.filter_by(correo=data['correo']).first():
        return jsonify({'message': 'El correo ya está en uso'}), 400

    elif classusuarios.query.filter_by(usuario=data['usuario']).first():
        return jsonify ({'message': 'El nombre de usuario ya está en uso'}), 400
    
    elif classusuarios.query.filter_by(usuario=data['correo']).first():
        return jsonify ({'message': 'El correo ya está en uso'}), 400
    
    new_user = classusuarios(
        apellidopaterno = data['apellidopaterno'],
        apellidomaterno = data['apellidomaterno'],
        nombre=data['nombre'],
        rol=data['rol'],
        usuario = data['usuario'],
        correo = data['correo'],
        verificado=False
    )
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    token = s.dumps(new_user.correo, salt='email-verification-salt')
    verify_url = url_for('auth.verify_account', token=token, _external=True)

    msg = Message('Verificación de cuenta',
                recipients=[new_user.correo])
    msg.body = f'Para verificar tu cuenta, haz click en el siguiente enlace: {verify_url}'
    mail = Mail(current_app)
    mail.send(msg)

    return jsonify ({'message': 'Usuario registrado. Verifica tu correo para activar la cuenta  '}), 201

@auth_bp.route('/verify_account<token>', methods = ['GET'])
def verify_account(token):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email=s.loads(token, salt='email-verification-salt', max_age=3600)
    except SignatureExpired:
        return jsonify ({'message' : 'El enlace ha expirado'}), 400
    except BadSignature:
        return jsonify ({'message' : 'El enlace es inválido'}), 400
    
    user = classusuarios.query.filter_by(correo=email).first()
    if not user:
        return jsonify ({'message' : 'Usuario no encontrado'})
    
    user.verificado = True
    db.session.commit()

    return jsonify({'message': 'Cuenta verificada exitosamente.'}), 200

@auth_bp.route('/forgot_password', methods=['POST'])
def forgot_password():
    data=request.json
    user=classusuarios.query.filter_by(correo=data["correo"]).first()
    if not user:
        return jsonify ({'message': 'No se encontró un usuario con ese correo electrónico'}), 404
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    token = s.dumps(user.correo, salt='password-reset-salt')

    reset_url = f'http://localhost:4200/resetpassword/{token}'

    msg = Message ('Recuperación de contraseña',
                recipients=[user.correo])
    msg.body = f'Para restablecer tu contraseña, visita el siguiente link: {reset_url}. Si no has solicitado esto, simplemente ignoralo :)'
    mail = Mail(current_app)
    mail.send(msg)

    return jsonify ({'message' : 'Se ha enviado un correo con instrucciones para restablecer tu contraseña'})
    
@auth_bp.route('/reset_password/<token>', methods = ['GET', 'POST'])
def reset_password(token):
    if request.method == 'GET':
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        try:
            email = s.loads(token, salt='password-reset-salt', max_age=3600)
            return jsonify({'message': 'Token válido', 'email': email}), 200
        except SignatureExpired:
            return jsonify ({'message': 'token expirado'}), 400
        except BadSignature:
            return jsonify ({'message': 'token inválido'}), 400
        
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        return jsonify({'message': 'token expirado'}), 400
    except BadSignature:
        return jsonify({'message': 'token inválido'}), 400

    user= classusuarios.query.filter_by(correo=email).first()
    if not user:
        return jsonify ({'message': 'Usuario no encontrado'}), 404
    
    data=request.json
    if not 'new_password' or not 'confirm_password' in data:
        return jsonify({'message': 'Ambas contraseñas son requeridas'}), 400
    
    if data['new_password'] != data['confirm_password']:
                return jsonify({'message': 'Las contraseñas no coinciden'}), 400

    user.password_hash =  generate_password_hash(data['new_password'])
    db.session.commit()
    return jsonify ({'message' : 'Contraseña actualizada exitosamente'}), 200

personal_info_bp = Blueprint('personal_info_bp', __name__)
@personal_info_bp.route('/update', methods =['PUT'])
@token_required
def update_personal_info(current_user):
    data=request.json
    current_user.peso=data['peso']
    current_user.estatura = data['estatura']
    current_user.edad = data['edad']
    current_user.sexo = data['sexo']
    current_user.actividad = data['actividad']
    current_user.objetivo = data['objetivo']
    current_user.cantidad_comidas = data['cantidad_comidas']

    altura_metros = current_user.estatura / 100
    current_user.imc = current_user.peso / (altura_metros ** 2)

    if current_user.sexo.lower() == 'm':
        current_user.metabolismobasal = 88.362 + (13.397 * current_user.peso) + (4.799 * current_user.estatura) - (5.677 * current_user.edad)
    else:
        current_user.metabolismobasal = 447.593 + (9.247 * current_user.peso) + (3.098 * current_user.estatura) - (4.330 * current_user.edad)

    current_user.requerimentoagua = current_user.peso * 35

    actividad_factor = {
        "baja": 1.2,
        "moderada": 1.55,
        "alta": 1.9
    }.get(current_user.actividad.lower(), 1.2)

    if current_user.objetivo == 'mantener':
        current_user.requerimientocalorico = current_user.metabolismobasal * actividad_factor
    elif current_user.objetivo == 'aumentar':
        current_user.requerimientocalorico = current_user.metabolismobasal * actividad_factor * 1.15
    elif current_user.objetivo == 'disminuir':
        current_user.requerimientocalorico = current_user.metabolismobasal * actividad_factor * 0.85
    else:
        return jsonify({"error": "Objetivo no válido"}), 400

    db.session.commit()

    return jsonify({'message': 'Información personal actualizada exitosamente'}), 200
#--------------------------------------------------Validar token -----------------------------------------------------------------
@usuarios_bp.route('/validar-token', methods=['GET'])
@token_required
def validar_token(current_user):
    return jsonify({
        'message': 'Token válido',
        'usuario': current_user.usuario,
        'rol': current_user.rol,
        'id': current_user.id
    }), 200

#--------------------------------------------------Rutas para gestión de usuarios.--------------------------------------------------

@usuarios_bp.route('/usuarios', methods=['GET'])
@token_required
def get_users(current_user):
    if current_user.rol != 2:
        return jsonify({'message': 'No tienes permiso para acceder a esta ruta'}), 403
    
    users = classusuarios.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@usuarios_bp.route('/usuarios/<int:id>', methods=['GET'])
def get_user(id):
    user = classusuarios.query.get_or_404(id)
    return jsonify(user.to_dict())
"""
@usuarios_bp.route('/usuarios', methods=['POST'])
@token_required
def create_user(current_user):
    if current_user.rol != 2:
        return jsonify({"message": "No tienes permiso para acceder a esta ruta"}), 403

    data = request.json
    if not data:  # Verifica que se recibió datos
        return jsonify({"error": "No se recibieron datos"}), 400

    #Calcular imc
    alturaMetros = data['estatura'] / (100)
    imc = data['peso'] / (alturaMetros ** 2)

    #Calcular metabolismo basal
    if data['sexo'] == 'm' or 'M':
        metabolismobasal = 88.362 + (13.97 * data['peso']) + (4.799 * data['estatura']) - (5.677 * data['edad'])
    else:
        metabolismobasal = 447.593 + (9.247 * data['peso']) + (3.098 * data['estatura']) - (4.330 * data['edad'])

    #Calcular requerimiento de agua.
    requerimientoagua = data['peso'] * 35
    
    #Calcular valor numérico de factor de avtividad física
    if data['actividad'] == "baja":
        fap = 1.2
    elif data['actividad'] == "moderada":
        fap = 1.55
    elif data['actividad'] == "alta":
        fap = 1.9
    else:
        return jsonify({"error": "Nivel de actividad no válido"})
    
    # Calcular Requerimiento Calórico según el objetivo
    if data['objetivo'] == 'mantener':
        requerimientocalorico = metabolismobasal * fap
    elif data['objetivo'] == 'aumentar':
        requerimientocalorico = metabolismobasal * fap * 1.15
    elif data['objetivo'] == 'disminuir':
        requerimientocalorico = metabolismobasal * fap * 1.85

    new_user = classusuarios(
        apellidopaterno=data['apellidopaterno'],
        apellidomaterno=data['apellidomaterno'],
        nombre=data['nombre'],
        rol=data['rol'],
        usuario=data['usuario'],
        correo=data['correo'],
        peso=data['peso'],
        estatura=data['estatura'],
        edad=data['edad'],
        sexo=data['sexo'],
        actividad=data['actividad'],
        metabolismobasal=metabolismobasal,
        imc=imc,
        requerimentoagua=requerimientoagua,
        requerimientocalorico = requerimientocalorico,
        objetivo=data['objetivo'],
        cantidad_comidas=data['cantidad_comidas']
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201

@usuarios_bp.route('/usuarios/<int:id>/personaldata', methods=['PUT'])
#@token_required
def update_userpersonaldata(id):
    user = classusuarios.query.get_or_404(id)
    data = request.json

    if not data:  # Verifica que se recibió datos
        return jsonify({"error": "No se recibieron datos"}), 400

    user.apellidopaterno = data['apellidopaterno']
    user.apellidomaterno = data['apellidomaterno']
    user.nombre = data['nombre']
    user.peso = data['peso']
    user.estatura = data['estatura']
    user.edad = data['edad']
    user.sexo=data['sexo']
    user.actividad = data['actividad']
    user.objetivo = data['objetivo']
    user.cantidad_comidas = data['cantidad_comidas']

    # Recalcular IMC
    altura_metros = user.estatura / 100  # Convertir altura a metros
    user.imc = user.peso / (altura_metros ** 2)

    # Recalcular Metabolismo Basal
    if user.sexo == 'm' or 'M':
        user.metabolismobasal = 88.362 + (13.397 * user.peso) + (4.799 * user.estatura) - (5.677 * user.edad)
    else:
        user.metabolismobasal = 447.593 + (9.247 * user.peso) + (3.098 * user.estatura) - (4.330 * user.edad)

    # Recalcular Requerimiento de Agua
    user.requerimentoagua = user.peso * 35

    # Mapear el nivel de actividad física a un factor numérico
    if user.actividad == 'baja':
        actividad_factor = 1.2
    elif user.actividad == 'moderada':
        actividad_factor = 1.55
    elif user.actividad == 'alta':
        actividad_factor = 1.9
    else:
        return jsonify({"error": "Nivel de actividad no válido"}), 400

    # Recalcular Requerimiento Calórico según el objetivo
    if data['objetivo'] == 'mantener':
        user.requerimientocalorico = user.metabolismobasal * actividad_factor
    elif data['objetivo'] == 'aumentar':
        user.requerimientocalorico = user.metabolismobasal * actividad_factor * 1.15
    elif data['objetivo'] == 'disminuir':
        user.requerimientocalorico = user.metabolismobasal * actividad_factor * 0.85
    else:
        return jsonify({"error": "Objetivo no válido"}), 400

    # Actualizar el campo de objetivo
    user.objetivo = data['objetivo']

    db.session.commit()
    return jsonify(user.to_dict())

@usuarios_bp.route('/usuarios/<int:id>/accountdata', methods=['PUT'])
#@token_required
def update_accountdata(id):
    user = classusuarios.query.get_or_404(id)
    data = request.json
    user.usuario = data['usuario']
    user.correo = data['correo']
    user.rol = data['rol']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    db.session.commit()
    return jsonify(user.to_dict())

@usuarios_bp.route('/usuarios/<int:id>', methods=['DELETE'])
#@token_required
def delete_user(id):
    user = classusuarios.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return '', 204
"""
#--------------------------------------------------Rutas para gestión de alimentos.--------------------------------------------------
alimentos_bp = Blueprint('alimentos' ,__name__)
#@token_required
@alimentos_bp.route('/alimentos', methods=['GET'])
def get_alimentos():
    alimentos = classalimentos.query.all()
    return jsonify([alimento.to_dict() for alimento in alimentos])

@alimentos_bp.route('/alimentos/<int:id>', methods=['GET'])
def get_alimento(id):
    alimento = classalimentos.query.get_or_404(id)
    return jsonify(alimento.to_dict())

@alimentos_bp.route('/alimentos', methods = ['POST'])
def crear_alimento():
    data = request.json
    new_alimento = classalimentos(
        nombre=data['nombre'],
        porcion=data['porcion'],
        tipo_porcion=data['tipo_porcion'],
        proteinas=data['proteinas'],
        carbohidratos=data['carbohidratos'],
        grasas=data['grasas'],
        calorias=data['calorias']
    )
    db.session.add(new_alimento)
    db.session.commit()
    return jsonify(new_alimento.to_dict()), 201

@alimentos_bp.route('/alimentos/<int:id>', methods = ['PUT'])
#@token_required
def update_alimento(id):
    alimento = classalimentos.query.get_or_404(id)
    data = request.json()
    alimento.nombre = data['nombre']
    alimento.porcion = data['porcion']
    alimento.proteinas = data['proteinas']
    alimento.carbohidratos = data['carbohidratos']
    alimento.grasas = data['grasas']
    alimento.calorias = data['calorias']
    db.session.commit()
    return jsonify(alimento.to_dict())
    
    
@alimentos_bp.route('/alimentos/<int:id>', methods = ['DELETE'])
#@token_required
def delete_alimento(id):
    alimento = classalimentos.query.get_or_404(id)
    db.session.delete(alimento)
    db.session.commit
    return '',204


#--------------------------------------------------Rutas para gestión de alimentos.--------------------------------------------------
registro_comidas_bp = Blueprint('registro_comidas', __name__)

@registro_comidas_bp.route('/registrar-comida', methods=['POST'])
@token_required
def registrar_comida(current_user):
    data = request.json

    # Validar que el número de comida es válido
    if data['numero_comida'] < 1 or data['numero_comida'] > current_user.cantidad_comidas:
        return jsonify({'message': f'Número de comida inválido. Debe estar entre 1 y {current_user.cantidad_comidas}'}), 400
    
    nuevo_registro = RegistroComidas(
        usuario_id=current_user.id,
        alimento_id=data['alimento_id'],
        fecha=datetime.datetime.strptime(data['fecha'], '%Y-%m-%d').date(),
        cantidad=data['cantidad'],
        numero_comida=data['numero_comida']
    )
    
    db.session.add(nuevo_registro)
    db.session.commit()
    
    return jsonify(nuevo_registro.to_dict()), 201

@registro_comidas_bp.route('/comidas-diarias/<string:fecha>', methods=['GET'])
@token_required
def obtener_comidas_diarias(current_user, fecha):
    fecha_obj = datetime.datetime.strptime(fecha, '%Y-%m-%d').date()
    
    comidas = RegistroComidas.query.filter_by(
        usuario_id=current_user.id,
        fecha=fecha_obj
    ).all()
    
    return jsonify([comida.to_dict() for comida in comidas]), 200
@registro_comidas_bp.route('/resumen-diario/<string:fecha>', methods=['GET'])
@token_required
def resumen_diario(current_user, fecha):
    fecha_obj = datetime.datetime.strptime(fecha, '%Y-%m-%d').date()
    
    # Consulta para obtener el desglose por alimento
    desglose = db.session.query(
        RegistroComidas.id,
        RegistroComidas.numero_comida,
        classalimentos.nombre,
        RegistroComidas.cantidad,
        (classalimentos.proteinas * RegistroComidas.cantidad).label('proteinas'),
        (classalimentos.carbohidratos * RegistroComidas.cantidad).label('carbohidratos'),
        (classalimentos.grasas * RegistroComidas.cantidad).label('grasas'),
        (classalimentos.calorias * RegistroComidas.cantidad).label('calorias')
    ).join(
        classalimentos, RegistroComidas.alimento_id == classalimentos.id
    ).filter(
        RegistroComidas.usuario_id == current_user.id,
        RegistroComidas.fecha == fecha_obj
    ).order_by(RegistroComidas.numero_comida).all()
    
    # Consulta para obtener los totales del día
    totales = db.session.query(
        func.sum(classalimentos.proteinas * RegistroComidas.cantidad).label('proteinas_totales'),
        func.sum(classalimentos.carbohidratos * RegistroComidas.cantidad).label('carbohidratos_totales'),
        func.sum(classalimentos.grasas * RegistroComidas.cantidad).label('grasas_totales'),
        func.sum(classalimentos.calorias * RegistroComidas.cantidad).label('calorias_totales')
    ).join(
        RegistroComidas, classalimentos.id == RegistroComidas.alimento_id
    ).filter(
        RegistroComidas.usuario_id == current_user.id,
        RegistroComidas.fecha == fecha_obj
    ).first()
    
    # Preparar el resumen
    resumen = {
        'fecha': fecha,
        'desglose_por_alimento': [
            {
                'id': r.id,
                'numero_comida': r.numero_comida,
                'alimento': r.nombre,
                'cantidad': round(r.cantidad, 2),
                'proteinas': round(r.proteinas, 2),
                'carbohidratos': round(r.carbohidratos, 2),
                'grasas': round(r.grasas, 2),
                'calorias': round(r.calorias, 2)
            } for r in desglose
        ],
        'totales_del_dia': {
            'proteinas_totales': round(float(totales.proteinas_totales or 0), 2),
            'carbohidratos_totales': round(float(totales.carbohidratos_totales or 0), 2),
            'grasas_totales': round(float(totales.grasas_totales or 0), 2),
            'calorias_totales': round(float(totales.calorias_totales or 0), 2)
        }
    }
    
    return jsonify(resumen), 200

# ... (resto del código existente)
@registro_comidas_bp.route('/macronutrientes-diarios/<string:fecha>', methods=['GET'])
@token_required
def obtener_macronutrientes_diarios(current_user, fecha):
    fecha_obj = datetime.datetime.strptime(fecha, '%Y-%m-%d').date()
    
    resultados = db.session.query(
        func.sum(classalimentos.proteinas * RegistroComidas.cantidad).label('proteinas_totales'),
        func.sum(classalimentos.carbohidratos * RegistroComidas.cantidad).label('carbohidratos_totales'),
        func.sum(classalimentos.grasas * RegistroComidas.cantidad).label('grasas_totales'),
        func.sum(classalimentos.calorias * RegistroComidas.cantidad).label('calorias_totales')
    ).join(
        RegistroComidas, classalimentos.id == RegistroComidas.alimento_id
    ).filter(
        RegistroComidas.usuario_id == current_user.id,
        RegistroComidas.fecha == fecha_obj
    ).first()
    
    return jsonify({
        'proteinas_totales': round(float(resultados.proteinas_totales or 0), 2),
        'carbohidratos_totales': round(float(resultados.carbohidratos_totales or 0), 2),
        'grasas_totales': round(float(resultados.grasas_totales or 0), 2),
        'calorias_totales': round(float(resultados.calorias_totales or 0), 2)
    }), 200

@registro_comidas_bp.route('/actualizar-comida/<int:registro_id>', methods=['PUT'])
@token_required
def actualizar_comida(current_user, registro_id):
    registro = RegistroComidas.query.get_or_404(registro_id)
    
    # Verificar que el registro pertenece al usuario actual
    if registro.usuario_id != current_user.id:
        return jsonify({'message': 'No tienes permiso para modificar este registro'}), 403
    
    data = request.json

    if 'numero_comida' in data:
        if data['numero_comida'] < 1 or data['numero_comida'] > current_user.cantidad_comidas:
            return jsonify({'message': f'Número de comida inválido. Debe estar entre 1 y {current_user.cantidad_comidas}'}), 400
        registro.numero_comida = data['numero_comida']
    
    # Actualizar los campos del registro
    if 'alimento_id' in data:
        registro.alimento_id = data['alimento_id']
    if 'fecha' in data:
        registro.fecha = datetime.datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    if 'cantidad' in data:
        registro.cantidad = data['cantidad']
    if 'numero_comida' in data:
        registro.numero_comida = data['numero_comida']
    
    db.session.commit()
    
    return jsonify(registro.to_dict()), 200

@registro_comidas_bp.route('/eliminar-comida/<int:registro_id>', methods=['DELETE'])
@token_required
def eliminar_comida(current_user, registro_id):
    registro = RegistroComidas.query.get_or_404(registro_id)
    
    # Verificar que el registro pertenece al usuario actual
    if registro.usuario_id != current_user.id:
        return jsonify({'message': 'No tienes permiso para eliminar este registro'}), 403
    
    db.session.delete(registro)
    db.session.commit()
    
    return jsonify({'message': 'Registro eliminado correctamente'}), 200


