import jwt
import datetime
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app, url_for, make_response
from models import db, classusuarios, classalimentos, RegistroComidas, RegistroAgua, RegistroMedico
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
from sqlalchemy import func
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from sqlalchemy import func
import random

import string
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
import traceback
from io import BytesIO
import matplotlib.pyplot as plt
import numpy as np

from flasgger import swag_from

mail = Mail()
#--------------------------------------------------Proteger rutas ------------------------------------------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token no proporcionado'}), 401

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = classusuarios.query.filter_by(id=data['id']).first()

            # Verificar que el usuario existe y tiene los campos necesarios
            if not current_user:
                return jsonify({'message': 'Usuario no válido'}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido'}), 401
        except Exception as e:
            return jsonify({'message': f'Error: {str(e)}'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

#--------------------------------------------------Rutas de autorización--------------------------------------------------
auth_bp = Blueprint('auth', __name__)
#--------------------------------------------------Rutas para login ------------------------------------------------------------
usuarios_bp = Blueprint('usuarios', __name__)
@auth_bp.route('/login', methods=['POST'])
@swag_from({
    'tags': ['Autenticación'],
    'parameters': [{
        'in': 'body',
        'name': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'usuario': {'type': 'string', 'description': 'Nombre de usuario'},
                'password': {'type': 'string', 'description': 'Contraseña del usuario'}
            }
        }
    }],
    'responses': {
        200: {
            'description': 'Login exitoso',
            'schema': {
                'type': 'object',
                'properties': {
                    'token': {'type': 'string', 'description': 'JWT token'}
                }
            }
        },
        401: {'description': 'Credenciales inválidas'},
        403: {'description': 'Cuenta no verificada'},
        500: {'description': 'Error interno del servidor'}
    }
})
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
            'nombre': user.nombre,
            'apellidopaterno': user.apellidopaterno,
            'apellidomaterno': user.apellidomaterno,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify ({'token':token}),200
    
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

    #else:
        #return jsonify ({'message': 'Credenciales invalidas'})
    
@auth_bp.route('/register', methods=['POST'])
@swag_from({
    'tags': ['Autenticación'],
    'description': 'Registrar nuevo usuario',
    'parameters': [{
        'in': 'body',
        'name': 'user',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['apellidopaterno', 'apellidomaterno', 'nombre', 'rol', 'usuario', 'correo', 'password'],
            'properties': {
                'apellidopaterno': {'type': 'string'},
                'apellidomaterno': {'type': 'string'},
                'nombre': {'type': 'string'},
                'rol': {'type': 'integer', 'description': '1=Admin, 2=Doctor, 3=Paciente'},
                'usuario': {'type': 'string'},
                'correo': {'type': 'string', 'format': 'email'},
                'password': {'type': 'string'}
            }
        }
    }],
    'responses': {
        201: {
            'description': 'Usuario registrado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        400: {'description': 'Error de validación (correo o usuario ya existe)'}
    }
})
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
@swag_from({
    'tags': ['Autenticación'],
    'description': 'Solicitar recuperación de contraseña',
    'parameters': [{
        'in': 'body',
        'name': 'email',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['correo'],
            'properties': {
                'correo': {'type': 'string', 'format': 'email'}
            }
        }
    }],
    'responses': {
        200: {
            'description': 'Correo de recuperación enviado',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        404: {'description': 'Usuario no encontrado'}
    }
})
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
@personal_info_bp.route('/update/<int:patient_id>', methods =['PUT'])
@swag_from({
    'tags': ['Información Personal'],
    'description': 'Actualizar información del paciente (solo médicos)',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'patient_id',
            'in': 'path',
            'type': 'integer',
            'required': True
        },
        {
            'in': 'body',
            'name': 'data',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'peso': {'type': 'number'},
                    'estatura': {'type': 'number'},
                    'edad': {'type': 'integer'},
                    'sexo': {'type': 'string', 'enum': ['m', 'f']},
                    'actividad': {'type': 'string', 'enum': ['baja', 'moderada', 'alta']},
                    'objetivo': {'type': 'string', 'enum': ['mantener', 'aumentar', 'disminuir']},
                    'cantidad_comidas': {'type': 'integer'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Información actualizada exitosamente',
            'schema': {'properties': {'message': {'type': 'string'}}}
        },
        403: {'description': 'No autorizado - Solo médicos'},
        404: {'description': 'Paciente no encontrado'}
    }
})
@token_required
def update_patient_info(current_user, patient_id):

    if current_user.rol != 2:
        return jsonify({'message': 'No autorizado'}), 403
    
    data=request.json
    patient = classusuarios.query.get_or_404(patient_id)

    patient.peso=data['peso']
    patient.estatura = data['estatura']
    patient.edad = data['edad']
    patient.sexo = data['sexo']
    patient.actividad = data['actividad']
    patient.objetivo = data['objetivo']
    patient.cantidad_comidas = data['cantidad_comidas']

    altura_metros = patient.estatura / 100
    patient.imc = patient.peso / (altura_metros ** 2)

    if patient.sexo.lower() == 'm':
        patient.metabolismobasal = 88.362 + (13.397 * patient.peso) + (4.799 * patient.estatura) - (5.677 * patient.edad)
    else:
        patient.metabolismobasal = 447.593 + (9.247 * patient.peso) + (3.098 * patient.estatura) - (4.330 * patient.edad)

    patient.requerimentoagua = patient.peso * 35

    actividad_factor = {
        "baja": 1.2,
        "moderada": 1.55,
        "alta": 1.9
    }.get(patient.actividad.lower(), 1.2)

    if patient.objetivo == 'mantener':
        patient.requerimientocalorico = patient.metabolismobasal * actividad_factor
    elif patient.objetivo == 'aumentar':
        patient.requerimientocalorico = patient.metabolismobasal * actividad_factor * 1.15
    elif patient.objetivo == 'disminuir':
        patient.requerimientocalorico = patient.metabolismobasal * actividad_factor * 0.85
    else:
        return jsonify({"error": "Objetivo no válido"}), 400

    db.session.commit()

    return jsonify({'message': 'Información personal actualizada exitosamente'}), 200
#--------------------------------------------------Validar token -----------------------------------------------------------------
@usuarios_bp.route('/validar-token', methods=['GET'])
@swag_from({
    'tags': ['Usuarios'],
    'description': 'Validar token JWT y obtener información del usuario',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Token válido e información del usuario',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'usuario': {'type': 'string'},
                    'rol': {'type': 'integer'},
                    'id': {'type': 'integer'},
                    'correo': {'type': 'string'},
                    'nombre': {'type': 'string'},
                    'apellidopaterno': {'type': 'string'},
                    'cantidad_comidas': {'type': 'integer'},
                    'apellidomaterno': {'type': 'string'}
                }
            }
        },
        401: {'description': 'Token no proporcionado o inválido'}
    }
})
@token_required
def validar_token(current_user):
    print("Datos del usuario actual:", {
        'nombre': current_user.nombre,
        'apellidopaterno': current_user.apellidopaterno,
        'apellidomaterno': current_user.apellidomaterno,
        'cantidad_comidas': current_user.cantidad_comidas,
    })
    return jsonify({
        'message': 'Token válido',
        'usuario': current_user.usuario,
        'rol': current_user.rol,
        'id': current_user.id,
        'correo': current_user.correo,
        'nombre': current_user.nombre,
        'apellidopaterno': current_user.apellidopaterno,
        'cantidad_comidas': current_user.cantidad_comidas,
        'apellidomaterno': current_user.apellidomaterno,
    }), 200
#--------------------------------------------------Rutas para gestión de usuarios.--------------------------------------------------

@usuarios_bp.route('/usuarios', methods=['GET'])
@swag_from({
    'tags': ['Usuarios'],
    'description': 'Obtener lista de todos los usuarios (solo médicos)',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Lista de usuarios obtenida exitosamente',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'nombre': {'type': 'string'},
                        'apellidopaterno': {'type': 'string'},
                        'apellidomaterno': {'type': 'string'},
                        'usuario': {'type': 'string'},
                        'correo': {'type': 'string'},
                        'rol': {'type': 'integer'},
                        'verificado': {'type': 'boolean'}
                    }
                }
            }
        },
        403: {'description': 'No tiene permiso para acceder a esta ruta'}
    }
})
@token_required
def get_users(current_user):
    if current_user.rol != 2:
        return jsonify({'message': 'No tienes permiso para acceder a esta ruta'}), 403
    
    users = classusuarios.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@usuarios_bp.route('/usuarios/<int:id>', methods=['GET'])
@swag_from({
    'tags': ['Usuarios'],
    'description': 'Obtener información de un usuario específico',
    'parameters': [{
        'name': 'id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': 'ID del usuario'
    }],
    'responses': {
        200: {
            'description': 'Información del usuario',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'nombre': {'type': 'string'},
                    'apellidopaterno': {'type': 'string'},
                    'apellidomaterno': {'type': 'string'},
                    'usuario': {'type': 'string'},
                    'correo': {'type': 'string'},
                    'rol': {'type': 'integer'}
                }
            }
        },
        404: {'description': 'Usuario no encontrado'}
    }
})

def get_user(id):
    user = classusuarios.query.get_or_404(id)
    return jsonify(user.to_dict())

@usuarios_bp.route('/usuarios/<int:id>/comidas', methods=['GET'])

@token_required
def get_comidas(current_user, id):
    if current_user.id != id and current_user.rol != 2:  # Verifica que el usuario actual es el mismo o un admin
        return jsonify({'message': 'No tienes permiso para acceder a esta información'}), 403

    user = classusuarios.query.get_or_404(id)
    return jsonify({'cantidad_comidas': user.cantidad_comidas}), 200

@usuarios_bp.route('/usuarios/<int:id>/requerimientos', methods=['GET'])
@token_required
def get_requerimientos_nutricionales(current_user, id):
    if current_user.id != id and current_user.rol != 2:
        return jsonify({'message': 'No autorizado'}), 403
    
    user = classusuarios.query.get_or_404(id)
    
    # Obtener requerimiento calórico
    calorias_diarias = user.requerimientocalorico

    # Calcular macronutrientes según el objetivo del usuario
    if user.objetivo == 'aumentar':
        # Para aumentar masa muscular: más proteínas
        proteinas_porcentaje = 0.30  # 30%
        grasas_porcentaje = 0.25     # 25%
        carbos_porcentaje = 0.45     # 45%
    elif user.objetivo == 'disminuir':
        # Para pérdida de peso: proteínas altas, carbos bajos
        proteinas_porcentaje = 0.35  # 35%
        grasas_porcentaje = 0.30     # 30%
        carbos_porcentaje = 0.35     # 35%
    else:  # mantener
        # Distribución equilibrada
        proteinas_porcentaje = 0.25  # 25%
        grasas_porcentaje = 0.30     # 30%
        carbos_porcentaje = 0.45     # 45%

    # Calcular gramos de cada macronutriente
    # Proteínas y carbohidratos: 4 calorías por gramo
    # Grasas: 9 calorías por gramo
    proteinas_calorias = calorias_diarias * proteinas_porcentaje
    grasas_calorias = calorias_diarias * grasas_porcentaje
    carbos_calorias = calorias_diarias * carbos_porcentaje

    requerimientos = {
        'calorias_totales': round(calorias_diarias, 2),
        'proteinas': {
            'gramos': round(proteinas_calorias / 4, 2),
            'calorias': round(proteinas_calorias, 2),
            'porcentaje': round(proteinas_porcentaje * 100, 1)
        },
        'grasas': {
            'gramos': round(grasas_calorias / 9, 2),
            'calorias': round(grasas_calorias, 2),
            'porcentaje': round(grasas_porcentaje * 100, 1)
        },
        'carbohidratos': {
            'gramos': round(carbos_calorias / 4, 2),
            'calorias': round(carbos_calorias, 2),
            'porcentaje': round(carbos_porcentaje * 100, 1)
        }
    }

    return jsonify(requerimientos), 200

#--------------------------------------------------Rutas para gestión de alimentos.--------------------------------------------------
alimentos_bp = Blueprint('alimentos' ,__name__)
#@token_required
@alimentos_bp.route('/alimentos', methods=['GET'])
@swag_from({
    'tags': ['Alimentos'],
    'description': 'Obtener lista de todos los alimentos',
    'responses': {
        200: {
            'description': 'Lista de alimentos',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'nombre': {'type': 'string'},
                        'porcion': {'type': 'number', 'format': 'float'},
                        'tipo_porcion': {'type': 'string'},
                        'proteinas': {'type': 'number', 'format': 'float'},
                        'carbohidratos': {'type': 'number', 'format': 'float'},
                        'grasas': {'type': 'number', 'format': 'float'},
                        'calorias': {'type': 'number', 'format': 'float'}
                    }
                }
            }
        }
    }
})
def get_alimentos():
    alimentos = classalimentos.query.all()
    return jsonify([alimento.to_dict() for alimento in alimentos])

@alimentos_bp.route('/alimentos/<int:id>', methods=['GET'])
@swag_from({
    'tags': ['Alimentos'],
    'description': 'Obtener detalles de un alimento específico',
    'parameters': [{
        'name': 'id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': 'ID del alimento'
    }],
    'responses': {
        200: {
            'description': 'Detalles del alimento',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'nombre': {'type': 'string'},
                    'porcion': {'type': 'number', 'format': 'float'},
                    'tipo_porcion': {'type': 'string'},
                    'proteinas': {'type': 'number', 'format': 'float'},
                    'carbohidratos': {'type': 'number', 'format': 'float'},
                    'grasas': {'type': 'number', 'format': 'float'},
                    'calorias': {'type': 'number', 'format': 'float'}
                }
            }
        },
        404: {'description': 'Alimento no encontrado'}
    }
})
def get_alimento(id):
    alimento = classalimentos.query.get_or_404(id)
    return jsonify(alimento.to_dict())

@alimentos_bp.route('/alimentos', methods = ['POST'])
@swag_from({
    'tags': ['Alimentos'],
    'description': 'Crear un nuevo alimento',
    'parameters': [{
        'in': 'body',
        'name': 'alimento',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['nombre', 'porcion', 'tipo_porcion', 'proteinas', 'carbohidratos', 'grasas', 'calorias'],
            'properties': {
                'nombre': {'type': 'string'},
                'porcion': {'type': 'number', 'format': 'float'},
                'tipo_porcion': {'type': 'string', 'enum': ['gramos', 'unidad']},
                'proteinas': {'type': 'number', 'format': 'float'},
                'carbohidratos': {'type': 'number', 'format': 'float'},
                'grasas': {'type': 'number', 'format': 'float'},
                'calorias': {'type': 'number', 'format': 'float'}
            }
        }
    }],
    'responses': {
        201: {
            'description': 'Alimento creado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'nombre': {'type': 'string'},
                    'porcion': {'type': 'number'},
                    'tipo_porcion': {'type': 'string'},
                    'proteinas': {'type': 'number'},
                    'carbohidratos': {'type': 'number'},
                    'grasas': {'type': 'number'},
                    'calorias': {'type': 'number'}
                }
            }
        }
    }
})
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

@alimentos_bp.route('/alimentos/<int:id>', methods=['PUT'])
@swag_from({
    'tags': ['Alimentos'],
    'description': 'Actualizar un alimento existente',
    'parameters': [
        {
            'name': 'id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID del alimento'
        },
        {
            'in': 'body',
            'name': 'alimento',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['nombre', 'porcion', 'tipo_porcion', 'proteinas', 'carbohidratos', 'grasas', 'calorias'],
                'properties': {
                    'nombre': {'type': 'string'},
                    'porcion': {'type': 'number', 'format': 'float'},
                    'tipo_porcion': {'type': 'string', 'enum': ['gramos', 'unidad']},
                    'proteinas': {'type': 'number', 'format': 'float'},
                    'carbohidratos': {'type': 'number', 'format': 'float'},
                    'grasas': {'type': 'number', 'format': 'float'},
                    'calorias': {'type': 'number', 'format': 'float'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Alimento actualizado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'nombre': {'type': 'string'},
                    'porcion': {'type': 'number'},
                    'tipo_porcion': {'type': 'string'},
                    'proteinas': {'type': 'number'},
                    'carbohidratos': {'type': 'number'},
                    'grasas': {'type': 'number'},
                    'calorias': {'type': 'number'}
                }
            }
        },
        404: {'description': 'Alimento no encontrado'}
    }
})
#@token_required
def update_alimento(id):
    alimento = classalimentos.query.get_or_404(id)
    data = request.json  # Remove the parentheses
    
    alimento.nombre = data['nombre']
    alimento.porcion = data['porcion']
    alimento.tipo_porcion = data['tipo_porcion']  # No olvides actualizar el tipo de porción
    alimento.proteinas = data['proteinas']
    alimento.carbohidratos = data['carbohidratos']
    alimento.grasas = data['grasas']
    alimento.calorias = data['calorias']
    
    db.session.commit()
    return jsonify(alimento.to_dict())
    
    
@alimentos_bp.route('/alimentos/<int:id>', methods = ['DELETE'])
@swag_from({
    'tags': ['Alimentos'],
    'description': 'Eliminar un alimento',
    'parameters': [{
        'name': 'id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': 'ID del alimento'
    }],
    'responses': {
        204: {'description': 'Alimento eliminado exitosamente'},
        404: {'description': 'Alimento no encontrado'}
    }
})
#@token_required
def delete_alimento(id):
    alimento = classalimentos.query.get_or_404(id)
    db.session.delete(alimento)
    db.session.commit
    return '',204


#--------------------------------------------------Rutas para gestión de alimentos.--------------------------------------------------
registro_comidas_bp = Blueprint('registro_comidas', __name__)

@registro_comidas_bp.route('/registrar-comida', methods=['POST'])
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Registrar una nueva comida para el usuario',
    'security': [{'Bearer': []}],
    'parameters': [{
        'in': 'body',
        'name': 'comida',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['alimento_id', 'fecha', 'cantidad', 'numero_comida'],
            'properties': {
                'alimento_id': {'type': 'integer', 'description': 'ID del alimento'},
                'fecha': {'type': 'string', 'format': 'date', 'description': 'Fecha en formato YYYY-MM-DD'},
                'cantidad': {'type': 'number', 'format': 'float', 'description': 'Cantidad consumida'},
                'numero_comida': {'type': 'integer', 'description': 'Número de comida del día'}
            }
        }
    }],
    'responses': {
        201: {
            'description': 'Comida registrada exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'usuario_id': {'type': 'integer'},
                    'alimento_id': {'type': 'integer'},
                    'fecha': {'type': 'string'},
                    'cantidad': {'type': 'number'},
                    'numero_comida': {'type': 'integer'}
                }
            }
        },
        400: {'description': 'Número de comida inválido'},
        401: {'description': 'No autorizado'}
    }
})
@token_required
def registrar_comida(current_user):
    data = request.json

    # Validar que el número de comida es válido
    if data['numero_comida'] < 1 or data['numero_comida'] > current_user.cantidad_comidas:
        return jsonify({'message': f'Número de comida inválido. Debe estar entre 1 y {current_user.cantidad_comidas}'}), 400
    
    nuevo_registro = RegistroComidas(
        usuario_id=current_user.id,
        alimento_id=data['alimento_id'],
        fecha=datetime.strptime(data['fecha'], '%Y-%m-%d').date(),
        cantidad=data['cantidad'],
        numero_comida=data['numero_comida']
    )
    
    db.session.add(nuevo_registro)
    db.session.commit()
    
    return jsonify(nuevo_registro.to_dict()), 201

@registro_comidas_bp.route('/comidas-diarias/<string:fecha>', methods=['GET'])
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Obtener todas las comidas registradas en una fecha específica',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'fecha',
        'in': 'path',
        'type': 'string',
        'format': 'date',
        'required': True,
        'description': 'Fecha en formato YYYY-MM-DD'
    }],
    'responses': {
        200: {
            'description': 'Lista de comidas del día',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'usuario_id': {'type': 'integer'},
                        'alimento_id': {'type': 'integer'},
                        'fecha': {'type': 'string'},
                        'cantidad': {'type': 'number'},
                        'numero_comida': {'type': 'integer'}
                    }
                }
            }
        },
        401: {'description': 'No autorizado'}
    }
})
@token_required
def obtener_comidas_diarias(current_user, fecha):
    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    
    comidas = RegistroComidas.query.filter_by(
        usuario_id=current_user.id,
        fecha=fecha_obj
    ).all()
    
    return jsonify([comida.to_dict() for comida in comidas]), 200
@registro_comidas_bp.route('/resumen-diario/<string:fecha>', methods=['GET'])
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Obtener resumen diario de alimentación',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'fecha',
        'in': 'path',
        'type': 'string',
        'format': 'date',
        'required': True,
        'description': 'Fecha en formato YYYY-MM-DD'
    }],
    'responses': {
        200: {
            'description': 'Resumen diario de alimentación',
            'schema': {
                'type': 'object',
                'properties': {
                    'fecha': {'type': 'string'},
                    'desglose_por_alimento': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'numero_comida': {'type': 'integer'},
                                'alimento': {'type': 'string'},
                                'cantidad': {'type': 'number'},
                                'proteinas': {'type': 'number'},
                                'carbohidratos': {'type': 'number'},
                                'grasas': {'type': 'number'},
                                'calorias': {'type': 'number'}
                            }
                        }
                    },
                    'totales_del_dia': {
                        'type': 'object',
                        'properties': {
                            'proteinas_totales': {'type': 'number'},
                            'carbohidratos_totales': {'type': 'number'},
                            'grasas_totales': {'type': 'number'},
                            'calorias_totales': {'type': 'number'}
                        }
                    }
                }
            }
        },
        401: {'description': 'No autorizado'}
    }
})
@token_required
def resumen_diario(current_user, fecha):
    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    
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

@registro_comidas_bp.route('/macronutrientes-diarios/<string:fecha>', methods=['GET'])
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Obtener totales de macronutrientes para una fecha específica',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'fecha',
        'in': 'path',
        'type': 'string',
        'format': 'date',
        'required': True,
        'description': 'Fecha en formato YYYY-MM-DD'
    }],
    'responses': {
        200: {
            'description': 'Totales de macronutrientes',
            'schema': {
                'type': 'object',
                'properties': {
                    'proteinas_totales': {'type': 'number', 'format': 'float'},
                    'carbohidratos_totales': {'type': 'number', 'format': 'float'},
                    'grasas_totales': {'type': 'number', 'format': 'float'},
                    'calorias_totales': {'type': 'number', 'format': 'float'}
                }
            }
        },
        401: {'description': 'No autorizado'}
    }
})
@token_required
def obtener_macronutrientes_diarios(current_user, fecha):
    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    
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
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Actualizar un registro de comida existente',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'registro_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID del registro de comida'
        },
        {
            'in': 'body',
            'name': 'comida',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'alimento_id': {'type': 'integer'},
                    'fecha': {'type': 'string', 'format': 'date'},
                    'cantidad': {'type': 'number', 'format': 'float'},
                    'numero_comida': {'type': 'integer'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Registro actualizado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'usuario_id': {'type': 'integer'},
                    'alimento_id': {'type': 'integer'},
                    'fecha': {'type': 'string'},
                    'cantidad': {'type': 'number'},
                    'numero_comida': {'type': 'integer'}
                }
            }
        },
        400: {'description': 'Número de comida inválido'},
        401: {'description': 'No autorizado'},
        403: {'description': 'No tienes permiso para modificar este registro'},
        404: {'description': 'Registro no encontrado'}
    }
})
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
        registro.fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    if 'cantidad' in data:
        registro.cantidad = data['cantidad']
    if 'numero_comida' in data:
        registro.numero_comida = data['numero_comida']
    
    db.session.commit()
    
    return jsonify(registro.to_dict()), 200

@registro_comidas_bp.route('/eliminar-comida/<int:registro_id>', methods=['DELETE'])
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Eliminar un registro de comida',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'registro_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': 'ID del registro de comida'
    }],
    'responses': {
        200: {
            'description': 'Registro eliminado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        401: {'description': 'No autorizado'},
        403: {'description': 'No tienes permiso para eliminar este registro'},
        404: {'description': 'Registro no encontrado'}
    }
})
@token_required
def eliminar_comida(current_user, registro_id):
    registro = RegistroComidas.query.get_or_404(registro_id)
    
    # Verificar que el registro pertenece al usuario actual
    if registro.usuario_id != current_user.id:
        return jsonify({'message': 'No tienes permiso para eliminar este registro'}), 403
    
    db.session.delete(registro)
    db.session.commit()
    
    return jsonify({'message': 'Registro eliminado correctamente'}), 200

# Añade esto en routes.py
@registro_comidas_bp.route('/registrar-agua', methods=['POST'])
@swag_from({
    'tags': ['Registro de Agua'],
    'description': 'Registrar o actualizar consumo de agua',
    'security': [{'Bearer': []}],
    'parameters': [{
        'in': 'body',
        'name': 'agua',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['fecha', 'cantidad'],
            'properties': {
                'fecha': {'type': 'string', 'format': 'date', 'description': 'Fecha en formato YYYY-MM-DD'},
                'cantidad': {'type': 'integer', 'description': 'Cantidad en ml'}
            }
        }
    }],
    'responses': {
        200: {
            'description': 'Registro de agua actualizado',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'usuario_id': {'type': 'integer'},
                    'fecha': {'type': 'string'},
                    'cantidad': {'type': 'integer'}
                }
            }
        },
        201: {
            'description': 'Nuevo registro de agua creado',
            'schema': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'usuario_id': {'type': 'integer'},
                    'fecha': {'type': 'string'},
                    'cantidad': {'type': 'integer'}
                }
            }
        },
        401: {'description': 'No autorizado'}
    }
})  
@token_required
def registrar_agua(current_user):
    data = request.json
    fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    
    # Buscar si ya existe un registro para esta fecha
    registro_existente = RegistroAgua.query.filter_by(
        usuario_id=current_user.id,
        fecha=fecha
    ).first()

    if registro_existente:
        # Actualizar registro existente
        registro_existente.cantidad = data['cantidad']
        db.session.commit()
        return jsonify(registro_existente.to_dict()), 200
    else:
        # Crear nuevo registro
        nuevo_registro = RegistroAgua(
            usuario_id=current_user.id,
            fecha=fecha,
            cantidad=data['cantidad']
        )
        db.session.add(nuevo_registro)
        db.session.commit()
        return jsonify(nuevo_registro.to_dict()), 201

@registro_comidas_bp.route('/agua-diaria/<string:fecha>', methods=['GET'])
@swag_from({
    'tags': ['Registro de Agua'],
    'description': 'Obtener registro de agua para una fecha específica',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'fecha',
        'in': 'path',
        'type': 'string',
        'format': 'date',
        'required': True,
        'description': 'Fecha en formato YYYY-MM-DD'
    }],
    'responses': {
        200: {
            'description': 'Registro de agua del día',
            'schema': {
                'type': 'object',
                'properties': {
                    'cantidad': {'type': 'integer', 'description': 'Cantidad en ml'}
                }
            }
        },
        401: {'description': 'No autorizado'}
    }
})
@token_required
def obtener_agua_diaria(current_user, fecha):
    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    
    registro = RegistroAgua.query.filter_by(
        usuario_id=current_user.id,
        fecha=fecha_obj
    ).first()
    
    if registro:
        return jsonify(registro.to_dict()), 200
    else:
        return jsonify({'cantidad': 0}), 200
    

@registro_comidas_bp.route('/<int:patient_id>/resumen-diario/<string:fecha>', methods=['GET'])
@swag_from({
    'tags': ['Registro de Comidas'],
    'description': 'Obtener resumen diario de alimentación de un paciente (solo para médicos)',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'patient_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID del paciente'
        },
        {
            'name': 'fecha',
            'in': 'path',
            'type': 'string',
            'format': 'date',
            'required': True,
            'description': 'Fecha en formato YYYY-MM-DD'
        }
    ],
    'responses': {
        200: {
            'description': 'Resumen diario del paciente',
            'schema': {
                'type': 'object',
                'properties': {
                    'fecha': {'type': 'string'},
                    'desglose_por_alimento': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'numero_comida': {'type': 'integer'},
                                'alimento': {'type': 'string'},
                                'cantidad': {'type': 'number'},
                                'proteinas': {'type': 'number'},
                                'carbohidratos': {'type': 'number'},
                                'grasas': {'type': 'number'},
                                'calorias': {'type': 'number'}
                            }
                        }
                    },
                    'totales_del_dia': {
                        'type': 'object',
                        'properties': {
                            'proteinas_totales': {'type': 'number'},
                            'carbohidratos_totales': {'type': 'number'},
                            'grasas_totales': {'type': 'number'},
                            'calorias_totales': {'type': 'number'}
                        }
                    }
                }
            }
        },
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo médicos pueden acceder'}
    }
})
@token_required
def resumen_diario_paciente(current_user, patient_id, fecha):
    # Verificar que el usuario actual es un médico
    if current_user.rol != 2:
        return jsonify({'message': 'No autorizado'}), 403
    
    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    
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
        RegistroComidas.usuario_id == patient_id,
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
        RegistroComidas.usuario_id == patient_id,
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
    



#-------------------------------------------------- Gestión de información personal por parte del usuraio.--------------------------------------------------#


@usuarios_bp.route('/settings', methods=['GET'])
@swag_from({
    'tags': ['Usuarios'],
    'description': 'Obtener configuración del usuario actual',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Configuración del usuario',
            'schema': {
                'type': 'object',
                'properties': {
                    'nombre': {'type': 'string'},
                    'apellidopaterno': {'type': 'string'},
                    'apellidomaterno': {'type': 'string'},
                    'edad': {'type': 'integer'},
                    'usuario': {'type': 'string'}
                }
            }
        },
        401: {'description': 'No autorizado'}
    }
})
@token_required
def get_settings(current_user):
    user_data = {
        'nombre': current_user.nombre,
        'apellidopaterno': current_user.apellidopaterno,
        'apellidomaterno': current_user.apellidomaterno,
        'edad': current_user.edad,
        'usuario': current_user.usuario
    }
    return jsonify(user_data), 200

@usuarios_bp.route('/settings/personal', methods=['PUT'])
@swag_from({
    'tags': ['Usuarios'],
    'description': 'Actualizar información personal del usuario',
    'security': [{'Bearer': []}],
    'parameters': [{
        'in': 'body',
        'name': 'data',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['nombre', 'apellidopaterno', 'apellidomaterno', 'edad', 'usuario'],
            'properties': {
                'nombre': {'type': 'string'},
                'apellidopaterno': {'type': 'string'},
                'apellidomaterno': {'type': 'string'},
                'edad': {'type': 'integer'},
                'usuario': {'type': 'string'}
            }
        }
    }],
    'responses': {
        200: {
            'description': 'Información actualizada correctamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        400: {'description': 'Nombre de usuario ya existe'},
        401: {'description': 'No autorizado'}
    }
})
@token_required
def update_personal_settings(current_user):
    data = request.json
    
    # Verificar si el usuario ya existe y es diferente al actual
    if data['usuario'] != current_user.usuario:
        existing_user = classusuarios.query.filter_by(usuario=data['usuario']).first()
        if existing_user:
            return jsonify({'message': 'El nombre de usuario ya está en uso'}), 400

    current_user.nombre = data['nombre']
    current_user.apellidopaterno = data['apellidopaterno']
    current_user.apellidomaterno = data['apellidomaterno']
    current_user.edad = data['edad']
    current_user.usuario = data['usuario']
    
    db.session.commit()
    return jsonify({'message': 'Información actualizada correctamente'})

@usuarios_bp.route('/settings/password', methods=['PUT'])
@token_required
def update_password(current_user):
    try:
        data = request.json
        
        if not current_user.check_password(data['currentPassword']):
            return jsonify({'message': 'La contraseña actual es incorrecta'}), 400
            
        if data['newPassword'] != data['confirmPassword']:
            return jsonify({'message': 'Las contraseñas no coinciden'}), 400
            
        current_user.set_password(data['newPassword'])
        db.session.commit()
        return jsonify({'message': 'Contraseña actualizada correctamente'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar contraseña: {str(e)}'}), 500
    

# En routes.py
@personal_info_bp.route('/historial/<int:patient_id>', methods=['GET'])
@swag_from({
    'tags': ['Información Personal'],
    'description': 'Obtener historial médico del paciente (solo médicos)',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'patient_id',
        'in': 'path',
        'type': 'integer',
        'required': True
    }],
    'responses': {
        200: {
            'description': 'Historial médico del paciente',
            'schema': {
                'type': 'object',
                'properties': {
                    'registros_medicos': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'fecha': {'type': 'string', 'format': 'date'},
                                'peso': {'type': 'number'},
                                'imc': {'type': 'number'},
                                'observaciones': {'type': 'string'}
                            }
                        }
                    },
                    'resumen_comidas': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'semana': {'type': 'string'},
                                'proteinas_promedio': {'type': 'number'},
                                'carbohidratos_promedio': {'type': 'number'},
                                'grasas_promedio': {'type': 'number'},
                                'calorias_promedio': {'type': 'number'}
                            }
                        }
                    }
                }
            }
        },
        403: {'description': 'No autorizado - Solo médicos'},
        404: {'description': 'Paciente no encontrado'}
    }
})
@token_required
def get_historial(current_user, patient_id):
    if current_user.rol != 2:
        return jsonify({'message': 'No autorizado'}), 403
        
    # Obtener registros médicos
    registros = RegistroMedico.query.filter_by(usuario_id=patient_id)\
        .order_by(RegistroMedico.fecha.desc()).all()
    
    # Consulta para obtener el resumen de comidas por semana usando funciones de MySQL
    resumen_comidas = db.session.query(
        func.date_format(RegistroComidas.fecha, '%Y-%m-%d').label('semana'),
        func.avg(classalimentos.proteinas * RegistroComidas.cantidad).label('proteinas_promedio'),
        func.avg(classalimentos.carbohidratos * RegistroComidas.cantidad).label('carbohidratos_promedio'),
        func.avg(classalimentos.grasas * RegistroComidas.cantidad).label('grasas_promedio'),
        func.avg(classalimentos.calorias * RegistroComidas.cantidad).label('calorias_promedio')
    ).join(
        classalimentos, RegistroComidas.alimento_id == classalimentos.id
    ).filter(
        RegistroComidas.usuario_id == patient_id
    ).group_by(
        func.yearweek(RegistroComidas.fecha)
    ).order_by(
        func.yearweek(RegistroComidas.fecha).desc()
    ).all()

    return jsonify({
        'registros_medicos': [{
            'fecha': reg.fecha.strftime('%Y-%m-%d'),
            'peso': reg.peso,
            'imc': reg.imc,
            'observaciones': reg.observaciones
        } for reg in registros],
        'resumen_comidas': [{
            'semana': semana,
            'proteinas_promedio': round(float(prot), 2) if prot else 0,
            'carbohidratos_promedio': round(float(carb), 2) if carb else 0,
            'grasas_promedio': round(float(gras), 2) if gras else 0,
            'calorias_promedio': round(float(cal), 2) if cal else 0
        } for semana, prot, carb, gras, cal in resumen_comidas]
    })

@registro_comidas_bp.route('/registros-medicos', methods=['POST'])
@token_required
def crear_registro_medico(current_user):
    if current_user.rol != 2:  # Asegurarse que solo los médicos pueden crear registros
        return jsonify({'message': 'No autorizado'}), 403
        
    data = request.json
    nuevo_registro = RegistroMedico(
        usuario_id=data['usuario_id'],
        fecha=datetime.strptime(data['fecha'], '%Y-%m-%d').date(),
        peso=data['peso'],
        imc=data['imc'],
        observaciones=data['observaciones']
    )
    
    db.session.add(nuevo_registro)
    db.session.commit()
    
    return jsonify({'message': 'Registro médico creado exitosamente'}), 201

admin_bp = Blueprint('admin', __name__)
@admin_bp.route('/admin/users', methods=['GET'])
@swag_from({
    'tags': ['Administración'],
    'description': 'Obtener lista de todos los usuarios (solo administradores)',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Lista de usuarios',
            'schema': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'nombre': {'type': 'string'},
                        'apellidopaterno': {'type': 'string'},
                        'apellidomaterno': {'type': 'string'},
                        'usuario': {'type': 'string'},
                        'correo': {'type': 'string'},
                        'rol': {'type': 'integer', 'description': '1=Admin, 2=Doctor, 3=Paciente'},
                        'verificado': {'type': 'boolean'}
                    }
                }
            }
        },
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'}
    }
})
@token_required
def get_all_users(current_user):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    users = classusuarios.query.all()
    return jsonify([{
        'id': user.id,
        'nombre': user.nombre,
        'apellidopaterno': user.apellidopaterno,
        'apellidomaterno': user.apellidomaterno,
        'usuario': user.usuario,
        'correo': user.correo,
        'rol': user.rol,
        'verificado': user.verificado
    } for user in users]), 200

# En routes.py

@admin_bp.route('/admin/users', methods=['POST'])
@swag_from({
    'tags': ['Administración'],
    'description': 'Crear nuevo usuario (solo administradores)',
    'security': [{'Bearer': []}],
    'parameters': [{
        'in': 'body',
        'name': 'user',
        'required': True,
        'schema': {
            'type': 'object',
            'required': ['nombre', 'apellidopaterno', 'apellidomaterno', 'usuario', 'correo', 'password', 'rol'],
            'properties': {
                'nombre': {'type': 'string'},
                'apellidopaterno': {'type': 'string'},
                'apellidomaterno': {'type': 'string'},
                'usuario': {'type': 'string'},
                'correo': {'type': 'string', 'format': 'email'},
                'password': {'type': 'string'},
                'rol': {'type': 'integer', 'description': '1=Admin, 2=Doctor, 3=Paciente'}
            }
        }
    }],
    'responses': {
        201: {
            'description': 'Usuario creado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        400: {'description': 'Usuario o correo ya existe'},
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'}
    }
})
@token_required
def create_user(current_user):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    data = request.json
    if classusuarios.query.filter_by(usuario=data['usuario']).first():
        return jsonify({'message': 'El nombre de usuario ya existe'}), 400
    
    if classusuarios.query.filter_by(correo=data['correo']).first():
        return jsonify({'message': 'El correo ya está registrado'}), 400
    
    new_user = classusuarios(
        nombre=data['nombre'],
        apellidopaterno=data['apellidopaterno'],
        apellidomaterno=data['apellidomaterno'],
        usuario=data['usuario'],
        correo=data['correo'],
        rol=data['rol'],
        verificado=True  # Los usuarios creados por admin están verificados por defecto
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'Usuario creado correctamente'}), 201

@admin_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@swag_from({
    'tags': ['Administración'],
    'description': 'Actualizar usuario existente (solo administradores)',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'user_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID del usuario'
        },
        {
            'in': 'body',
            'name': 'user',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['nombre', 'apellidopaterno', 'apellidomaterno', 'usuario', 'correo', 'rol'],
                'properties': {
                    'nombre': {'type': 'string'},
                    'apellidopaterno': {'type': 'string'},
                    'apellidomaterno': {'type': 'string'},
                    'usuario': {'type': 'string'},
                    'correo': {'type': 'string', 'format': 'email'},
                    'rol': {'type': 'integer', 'description': '1=Admin, 2=Doctor, 3=Paciente'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Usuario actualizado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        400: {'description': 'Usuario o correo ya existe'},
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'},
        404: {'description': 'Usuario no encontrado'}
    }
})
@token_required
def update_user(current_user, user_id):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    user = classusuarios.query.get_or_404(user_id)
    data = request.json
    
    # Verificar duplicados solo si el valor ha cambiado
    if data['usuario'] != user.usuario and \
       classusuarios.query.filter_by(usuario=data['usuario']).first():
        return jsonify({'message': 'El nombre de usuario ya existe'}), 400
    
    if data['correo'] != user.correo and \
       classusuarios.query.filter_by(correo=data['correo']).first():
        return jsonify({'message': 'El correo ya está registrado'}), 400
    
    user.nombre = data['nombre']
    user.apellidopaterno = data['apellidopaterno']
    user.apellidomaterno = data['apellidomaterno']
    user.usuario = data['usuario']
    user.correo = data['correo']
    user.rol = data['rol']
    
    db.session.commit()
    return jsonify({'message': 'Usuario actualizado correctamente'}), 200

@admin_bp.route('/admin/users/<int:user_id>/verify', methods=['PUT'])
@swag_from({
    'tags': ['Administración'],
    'description': 'Cambiar estado de verificación de un usuario (solo administradores)',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'user_id',
            'in': 'path',
            'type': 'integer',
            'required': True,
            'description': 'ID del usuario'
        },
        {
            'in': 'body',
            'name': 'verification',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['verificado'],
                'properties': {
                    'verificado': {'type': 'boolean'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Estado de verificación actualizado',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'},
                    'verificado': {'type': 'boolean'}
                }
            }
        },
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'},
        404: {'description': 'Usuario no encontrado'}
    }
})
@token_required
def toggle_user_verification(current_user, user_id):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    user = classusuarios.query.get_or_404(user_id)
    data = request.json
    user.verificado = data['verificado']
    
    db.session.commit()
    return jsonify({
        'message': 'Estado de verificación actualizado correctamente',
        'verificado': user.verificado
    }), 200

@admin_bp.route('/admin/users/<int:user_id>/reset-password', methods=['POST'])
@swag_from({
        'tags': ['Administración'],
    'description': 'Restablecer contraseña de usuario (solo administradores)',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'user_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': 'ID del usuario'
    }],
    'responses': {
        200: {
            'description': 'Contraseña restablecida y enviada por correo',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'},
        404: {'description': 'Usuario no encontrado'}
    }
})

@token_required
def reset_user_password(current_user, user_id):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    user = classusuarios.query.get_or_404(user_id)
    
    # Generar una contraseña aleatoria
    new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    user.set_password(new_password)
    db.session.commit()
    
    # Enviar correo con la nueva contraseña
    msg = Message('Nueva contraseña',
                recipients=[user.correo])
    msg.body = f'Tu nueva contraseña es: {new_password}. Recomendamos que la cambies cuanto antes :)'
    mail = Mail(current_app)
    mail.send(msg)
    
    return jsonify({'message': 'Contraseña reseteada y enviada por correo'}), 200

@admin_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@swag_from({
    'tags': ['Administración'],
    'description': 'Eliminar usuario (solo administradores)',
    'security': [{'Bearer': []}],
    'parameters': [{
        'name': 'user_id',
        'in': 'path',
        'type': 'integer',
        'required': True,
        'description': 'ID del usuario'
    }],
    'responses': {
        200: {
            'description': 'Usuario eliminado exitosamente',
            'schema': {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        },
        400: {'description': 'No se puede eliminar el propio usuario'},
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'},
        404: {'description': 'Usuario no encontrado'}
    }
})
@token_required
def delete_user(current_user, user_id):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    if current_user.id == user_id:
        return jsonify({'message': 'No puedes eliminar tu propio usuario'}), 400
    
    user = classusuarios.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Usuario eliminado correctamente'}), 200

@admin_bp.route('/admin/stats', methods=['GET'])
@swag_from({
    'tags': ['Administración'],
    'description': 'Obtener estadísticas generales (solo administradores)',
    'security': [{'Bearer': []}],
    'responses': {
        200: {
            'description': 'Estadísticas del sistema',
            'schema': {
                'type': 'object',
                'properties': {
                    'totalUsers': {'type': 'integer'},
                    'totalDoctors': {'type': 'integer'},
                    'totalPatients': {'type': 'integer'},
                    'verifiedUsers': {'type': 'integer'},
                    'totalFoods': {'type': 'integer'}
                }
            }
        },
        401: {'description': 'No autorizado'},
        403: {'description': 'No autorizado - Solo administradores'}
    }
})
@token_required
def get_admin_stats(current_user):
    if current_user.rol != 1:
        return jsonify({'message': 'No autorizado'}), 403
    
    total_users = classusuarios.query.count()
    total_doctors = classusuarios.query.filter_by(rol=2).count()
    total_patients = classusuarios.query.filter_by(rol=3).count()
    verified_users = classusuarios.query.filter_by(verificado=True).count()
    total_foods = classalimentos.query.count()
    
    return jsonify({
        'totalUsers': total_users,
        'totalDoctors': total_doctors,
        'totalPatients': total_patients,
        'verifiedUsers': verified_users,
        'totalFoods': total_foods
    }), 200



@personal_info_bp.route('/generar-reporte/<int:patient_id>', methods=['POST'])
@swag_from({
    'tags': ['Información Personal'],
    'description': 'Generar reporte médico en PDF (solo médicos)',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'patient_id',
            'in': 'path',
            'type': 'integer',
            'required': True
        },
        {
            'in': 'body',
            'name': 'dates',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'startDate': {'type': 'string', 'format': 'date'},
                    'endDate': {'type': 'string', 'format': 'date'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Reporte PDF generado exitosamente',
            'content': {'application/pdf': {}}
        },
        403: {'description': 'No autorizado - Solo médicos'},
        404: {'description': 'Paciente no encontrado'},
        500: {'description': 'Error al generar el reporte'}
    }
})
@token_required
def generar_reporte(current_user, patient_id):
    if current_user.rol != 2:
        return jsonify({'message': 'No autorizado'}), 403

    try:
        data = request.json
        start_date = datetime.strptime(data['startDate'], '%Y-%m-%d')
        end_date = datetime.strptime(data['endDate'], '%Y-%m-%d')

        patient = classusuarios.query.get_or_404(patient_id)

        # Obtener registros filtrados por fecha
        registros_medicos = RegistroMedico.query.filter(
            RegistroMedico.usuario_id == patient_id,
            RegistroMedico.fecha.between(start_date, end_date)
        ).order_by(RegistroMedico.fecha).all()

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            alignment=1,  # Centrado
            spaceAfter=30
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            spaceBefore=20,
            spaceAfter=20
        )
        normal_style = styles['Normal']

        # Título y contenido inicial...
        elements = []

        # Título principal
        elements.append(Paragraph('Reporte Médico', title_style))
        elements.append(Paragraph(f'Fecha: {datetime.now().strftime("%d/%m/%Y")}', normal_style))
        elements.append(Spacer(1, 20))

        # Información del paciente
        elements.append(Paragraph('Información del Paciente', heading_style))
        elements.append(Paragraph(f'Nombre: {patient.nombre} {patient.apellidopaterno} {patient.apellidomaterno}', normal_style))
        elements.append(Paragraph(f'Edad: {patient.edad} años', normal_style))
        elements.append(Paragraph(f'Objetivo: {patient.objetivo}', normal_style))
        elements.append(Spacer(1, 20))

        # Gráfica de evolución del peso
        if registros_medicos:
            elements.append(Paragraph('Evolución del Peso', heading_style))
            plt.figure(figsize=(8, 4))
            fechas = [reg.fecha for reg in registros_medicos]
            pesos = [reg.peso for reg in registros_medicos]
            
            plt.plot(fechas, pesos, 'b-o')
            plt.title('Evolución del Peso')
            plt.xlabel('Fecha')
            plt.ylabel('Peso (kg)')
            plt.grid(True)
            plt.xticks(rotation=45)
            
            # Guardar la gráfica
            img_buffer = BytesIO()
            plt.savefig(img_buffer, format='png', bbox_inches='tight')
            img_buffer.seek(0)
            plt.close()

            # Añadir la gráfica al PDF
            img = Image(img_buffer)
            img.drawHeight = 200
            img.drawWidth = 400
            elements.append(img)
            elements.append(Spacer(1, 20))

        # Tabla de registros médicos
        elements.append(Paragraph('Registros Médicos', heading_style))
        if registros_medicos:
            data = [['Fecha', 'Peso (kg)', 'IMC', 'Observaciones']]
            for registro in registros_medicos:
                data.append([
                    registro.fecha.strftime('%d/%m/%Y'),
                    str(registro.peso),
                    f"{registro.imc:.2f}",
                    registro.observaciones or ''
                ])

            table = Table(data, colWidths=[80, 80, 80, 200])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph('No hay registros médicos disponibles', normal_style))

        # Generar el PDF
        doc.build(elements)
        pdf_value = buffer.getvalue()
        buffer.close()

        response = make_response(pdf_value)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=reporte_medico_{patient_id}.pdf'
        
        return response

    except Exception as e:
        print("Error al generar el reporte:")
        print(traceback.format_exc())
        return jsonify({
            'message': 'Error al generar el reporte',
            'error': str(e)
        }), 500