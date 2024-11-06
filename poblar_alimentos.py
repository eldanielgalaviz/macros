from app import app, db
from models import classalimentos

def poblar_alimentos():
    # Datos extraídos de USDA Food Data Central (https://fdc.nal.usda.gov/)
    # Cada alimento incluye su FDC ID para referencia
    alimentos = [
        # Proteínas animales (por 100g)
        {
            "nombre": "Pechuga de pollo, sin piel, cruda",  # FDC ID: 171477
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 23.1,
            "carbohidratos": 0.0,
            "grasas": 2.62,
            "calorias": 120
        },
        {
            "nombre": "Atún fresco (Yellowfin), crudo",  # FDC ID: 175159
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 24.4,
            "carbohidratos": 0.0,
            "grasas": 0.49,
            "calorias": 108
        },
        {
            "nombre": "Salmón del Atlántico, crudo",  # FDC ID: 175168
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 20.4,
            "carbohidratos": 0.0,
            "grasas": 13.4,
            "calorias": 208
        },
        {
            "nombre": "Huevo entero, crudo, grado A",  # FDC ID: 172183
            "porcion": 1,
            "tipo_porcion": "unidad",
            "proteinas": 6.28,
            "carbohidratos": 0.36,
            "grasas": 4.76,
            "calorias": 72
        },
        
        # Carnes rojas
        {
            "nombre": "Carne de res, lomo, magra, cruda",  # FDC ID: 173933
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 22.3,
            "carbohidratos": 0.0,
            "grasas": 7.21,
            "calorias": 158
        },
        {
            "nombre": "Lomo de cerdo, magro, crudo",  # FDC ID: 167760
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 21.9,
            "carbohidratos": 0.0,
            "grasas": 4.51,
            "calorias": 130
        },

        # Lácteos
        {
            "nombre": "Leche entera 3.25%",  # FDC ID: 746772
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 3.15,
            "carbohidratos": 4.80,
            "grasas": 3.25,
            "calorias": 61
        },
        {
            "nombre": "Yogur natural, entero",  # FDC ID: 171284
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 3.47,
            "carbohidratos": 4.66,
            "grasas": 3.25,
            "calorias": 61
        },
        {
            "nombre": "Queso mozzarella",  # FDC ID: 173417
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 22.2,
            "carbohidratos": 2.19,
            "grasas": 22.4,
            "calorias": 300
        },

        # Carbohidratos
        {
            "nombre": "Arroz blanco, grano largo, cocido",  # FDC ID: 169756
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 2.69,
            "carbohidratos": 28.2,
            "grasas": 0.28,
            "calorias": 130
        },
        {
            "nombre": "Pan integral de trigo",  # FDC ID: 172686
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 8.85,
            "carbohidratos": 43.1,
            "grasas": 2.08,
            "calorias": 247
        },
        {
            "nombre": "Avena, hojuelas",  # FDC ID: 173904
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 13.2,
            "carbohidratos": 67.7,
            "grasas": 6.52,
            "calorias": 379
        },

        # Frutas
        {
            "nombre": "Plátano, crudo",  # FDC ID: 173944
            "porcion": 1,
            "tipo_porcion": "unidad",
            "proteinas": 1.09,
            "carbohidratos": 22.84,
            "grasas": 0.33,
            "calorias": 89
        },
        {
            "nombre": "Manzana con piel, cruda",  # FDC ID: 171688
            "porcion": 1,
            "tipo_porcion": "unidad",
            "proteinas": 0.26,
            "carbohidratos": 13.81,
            "grasas": 0.17,
            "calorias": 52
        },

        # Verduras
        {
            "nombre": "Brócoli, crudo",  # FDC ID: 170379
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 2.82,
            "carbohidratos": 6.64,
            "grasas": 0.37,
            "calorias": 34
        },
        {
            "nombre": "Espinacas, crudas",  # FDC ID: 168462
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 2.86,
            "carbohidratos": 3.63,
            "grasas": 0.39,
            "calorias": 23
        },

        # Legumbres
        {
            "nombre": "Frijoles negros, cocidos",  # FDC ID: 173735
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 8.86,
            "carbohidratos": 23.71,
            "grasas": 0.54,
            "calorias": 132
        },
        {
            "nombre": "Lentejas, cocidas",  # FDC ID: 172420
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 9.02,
            "carbohidratos": 20.13,
            "grasas": 0.38,
            "calorias": 116
        },

        # Grasas saludables
        {
            "nombre": "Aguacate, crudo",  # FDC ID: 171705
            "porcion": 1,
            "tipo_porcion": "unidad",
            "proteinas": 2.0,
            "carbohidratos": 8.53,
            "grasas": 14.66,
            "calorias": 160
        },
        {
            "nombre": "Almendras",  # FDC ID: 170567
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 21.15,
            "carbohidratos": 21.55,
            "grasas": 49.93,
            "calorias": 579
        },
         {
            "nombre": "Nueces",  # FDC ID: 170187
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 15.23,
            "carbohidratos": 13.71,
            "grasas": 65.21,
            "calorias": 654
        },
        {
            "nombre": "Semillas de chía",  # FDC ID: 170554
            "porcion": 100,
            "tipo_porcion": "gramos",
            "proteinas": 16.54,
            "carbohidratos": 42.12,
            "grasas": 30.74,
            "calorias": 486
        }
    ]

    try:
        with app.app_context():
            # Eliminar todos los registros existentes
            db.session.query(classalimentos).delete()
            
            # Insertar los nuevos alimentos
            for alimento in alimentos:
                nuevo_alimento = classalimentos(**alimento)
                db.session.add(nuevo_alimento)
            
            db.session.commit()
            print(f"Base de datos poblada exitosamente con {len(alimentos)} alimentos")
            print("Todos los valores nutricionales han sido obtenidos de USDA Food Data Central")
            print("Fuente: https://fdc.nal.usda.gov/")
    
    except Exception as e:
        print("Error al poblar la base de datos:", str(e))
        db.session.rollback()

if __name__ == "__main__":
    poblar_alimentos()