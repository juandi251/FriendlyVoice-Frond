import pandas as pd
import json

# Función 1: Para cargar datos
def cargar_datos(usuarios_csv_path, publicaciones_json_path):
    """Carga los dos conjuntos de datos y retorna DataFrames."""
    df_usuarios = pd.read_csv(usuarios_csv_path)
    
    # Cargar JSON
    with open(publicaciones_json_path, 'r') as f:
        data_publicaciones = json.load(f)
    df_publicaciones = pd.DataFrame(data_publicaciones)
    
    return df_usuarios, df_publicaciones

# Función 2: Manejar valores nulos
def manejar_nulos(df, columna):
    """Reemplaza los valores nulos en la columna especificada con 'Desconocido'."""
    df[columna] = df[columna].fillna('Desconocido')
    return df

# Función 3: Estandarizar texto
def estandarizar_texto(df, columna):
    """Convierte a minúsculas y quita espacios extra en la columna."""
    # Quitar espacios al inicio y final, y convertir a minúsculas
    df[columna] = df[columna].str.strip().str.lower()
    return df

# Función 4: Limpieza específica
def limpieza_especifica(df, columna):
    """Asegura que los estados de publicación estén uniformes (Ej. todo en mayúsculas)."""
    df[columna] = df[columna].str.upper().str.strip()
    return df