class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql+mysqlconnector://root:@localhost/macronutrientes'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'mysecretkey'

    #Configuración de correo
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'nutricion401soft@gmail.com'  # Cambia esto por tu dirección de correo
    MAIL_PASSWORD = 'aflw gbrm fgim sxgm'  # Cambia esto por tu contraseña
    MAIL_DEFAULT_SENDER = 'nutricion401soft@gmail.com'  # Cambia esto por tu dirección de correo
