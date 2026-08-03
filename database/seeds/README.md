# Seeds

Los seeds son idempotentes y están pensados para entornos nuevos. Las categorías
y productos se crean inactivos porque sus rutas de imagen solo son válidas
después de subir los objetos correspondientes a Storage.

Los valores de contacto, retiro y transferencia son marcadores deliberados:
deben reemplazarse mediante un procedimiento administrativo seguro antes de
habilitar producción.

El administrador no se crea aquí. Supabase Auth debe crear la identidad y luego
se inserta manualmente el `profile` asociado, sin versionar contraseñas ni
credenciales.
