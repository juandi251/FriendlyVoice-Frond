import pandas as pd
# Importa las funciones del módulo de preprocesamiento
from .preprocesamiento import cargar_datos, manejar_nulos, estandarizar_texto, limpieza_especifica

# Rutas de los archivos (relativas a la raíz del proyecto)
USUARIOS_PATH = 'data/usuarios.csv' # ¡CORREGIDO!
PUBLICACIONES_PATH = 'data/publicaciones.json' # ¡CORREGIDO!

def realizar_analisis():
    print("--- 1. Carga y Preprocesamiento de Datos ---")
    df_usuarios, df_publicaciones = cargar_datos(USUARIOS_PATH, PUBLICACIONES_PATH)
    
    # Aplicar funciones de limpieza:
    df_usuarios = manejar_nulos(df_usuarios, 'biografia')
    df_usuarios = estandarizar_texto(df_usuarios, 'intereses')
    df_publicaciones = limpieza_especifica(df_publicaciones, 'estado') 

    # Combinación de datos (Merge)
    df_combinado = pd.merge(df_usuarios, df_publicaciones, on='id_usuario', how='inner')
    print("Datos cargados y combinados correctamente.")
    
    # --- Aquí va el código para responder las preguntas clave (Trabajo de Miembro 3) ---
    # *Este código debe ser completado por el Analista Principal después del PR*
    
    return df_combinado

if __name__ == '__main__':
    df_resultado = realizar_analisis()
    # print("\nDataFrame Combinado (Listo para Analizar):\n", df_resultado.head())