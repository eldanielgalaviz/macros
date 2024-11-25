from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date

db = SQLAlchemy()


class RegistroComidas(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('classusuarios.id'), nullable=False)
    alimento_id = db.Column(db.Integer, db.ForeignKey('classalimentos.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False, default=date.today)
    cantidad = db.Column(db.Float, nullable=False)  # cantidad consumida en porciones o gramos
    numero_comida = db.Column(db.Integer, nullable=False)  # Nuevo campo para indicar el número de comida
    
    def to_dict(self):
        return{
            'id': self.id,
            'usuario_id': self.usuario_id,
            'alimento_id':self.alimento_id,
            'fecha':self.fecha,
            'cantidad':self.cantidad
        }

class classalimentos(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False)
    porcion = db.Column(db.Float, nullable=False)  # cantidad en gramos o unidades
    tipo_porcion = db.Column(db.String(50), nullable=False)  # 'gramos' o 'unidad'
    proteinas = db.Column(db.Float, nullable=False)
    carbohidratos = db.Column(db.Float, nullable=False)
    grasas = db.Column(db.Float, nullable=False)
    calorias = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'porcion': self.porcion,
            'tipo_porcion': self.tipo_porcion,
            'proteinas': self.proteinas,
            'carbohidratos': self.carbohidratos,
            'grasas': self.grasas,
            'calorias': self.calorias
        }
    
class classusuarios(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    apellidopaterno = db.Column(db.String(255), nullable=False)
    apellidomaterno = db.Column(db.String(255), nullable=False)
    nombre = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.Integer, nullable = False)
    usuario = db.Column (db.String(255),unique=True, nullable=False)
    correo = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    peso = db.Column(db.Float, nullable=True, default = None)
    estatura = db.Column(db.Integer, nullable=True, default = None)
    edad = db.Column(db.Integer, nullable=True, default = None)
    sexo = db.Column(db.String(1), nullable=True, default = None)
    actividad = db.Column(db.String(255), nullable=True, default = None)
    metabolismobasal = db.Column(db.Integer, nullable=True, default = None)
    imc = db.Column(db.Float, nullable=True, default = None)
    requerimentoagua = db.Column(db.Integer, nullable=True, default = None)
    requerimientocalorico = db.Column(db.Integer, nullable=True, default = None)
    objetivo = db.Column(db.String(255), nullable=True, default = None)
    cantidad_comidas = db.Column(db.Integer, nullable=True, default=3)
    verificado = db.Column(db.Integer,nullable=True, default = False)


    def set_password(self,password):
        self.password_hash = generate_password_hash(password)

    def check_password(self,password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'apellidopaterno': self.apellidopaterno,
            'apellidomaterno': self.apellidomaterno,
            'nombre': self.nombre,
            'rol' : self.rol,
            'usuario': self.usuario,
            'correo': self.correo,
            'peso': self.peso,
            'estatura': self.estatura,
            'edad': self.edad,
            'sexo': self.sexo,
            'actividad': self.actividad,
            'metabolismobasal': self.metabolismobasal,
            'imc': self.imc,
            'requerimentoagua': self.requerimentoagua,
            'requerimientocalorico': self.requerimientocalorico,
            'objetivo': self.objetivo,
            'cantidad_comidas':self.cantidad_comidas
        }
    
class RegistroAgua(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('classusuarios.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False, default=date.today)
    cantidad = db.Column(db.Integer, nullable=False)  # cantidad en ml

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'fecha': self.fecha,
            'cantidad': self.cantidad
        }
    
class RegistroMedico(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('classusuarios.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    peso = db.Column(db.Float)
    imc = db.Column(db.Float)
    observaciones = db.Column(db.Text)

    def to_dict(self):
        return{
            'id':self.id,
            'usuario_id':self.usuario_id,
            'fecha':self.fecha,
            'peso':self.peso,
            'imc':self.imc,
            'obvservaciones':self.observaciones,
        }