# Manual Breve de Comisiones

## Global Consultores Inmobiliarios y Servicios Integrales

Este manual explica de forma sencilla como funciona el modulo de comisiones dentro del sistema inmobiliario.

---

## 1. Objetivo del modulo

El modulo de comisiones permite controlar:

- la comision bruta generada por una venta
- el porcentaje de retencion de la pagina
- el monto que recibe la pagina
- el monto neto que recibe el agente
- el estado de pago de cada comision

---

## 2. Como se calcula una comision

El sistema trabaja en dos niveles:

1. Primero se calcula la comision bruta del agente sobre el valor de la venta.
2. Luego se calcula cuanto retiene la pagina sobre esa comision del agente.

### Ejemplo practico

- Precio de venta: `L 2,000,000`
- Comision del agente: `5%`
- Comision bruta del agente: `L 100,000`
- Retencion de la pagina: `10%`
- Monto para la pagina: `L 10,000`
- Monto neto para el agente: `L 90,000`

Formula:

- `Comision bruta = precio de cierre x % de comision del agente`
- `Retencion pagina = comision bruta x % de retencion`
- `Agente neto = comision bruta - retencion pagina`

---

## 3. Configuracion general de comisiones

En el modulo de comisiones existe una opcion para configurar los parametros generales.

Desde ahi se define:

- porcentaje minimo permitido para la pagina
- porcentaje maximo permitido para la pagina
- comision del agente por defecto
- retencion de pagina por defecto

Esto sirve para que el sistema ya sugiera valores al momento de cerrar una venta.

**Captura sugerida 1**
Pantalla: `Comisiones > Configurar parametros`

---

## 4. Como registrar una venta con comision

Cuando una propiedad se vende:

1. Ingresa al modulo `Propiedades`.
2. Busca la propiedad disponible.
3. Presiona `Cerrar venta`.
4. Completa los datos del cliente.
5. Ingresa el precio de cierre.
6. Verifica el porcentaje de comision del agente.
7. Define el porcentaje de retencion de la pagina.
8. El sistema calcula automaticamente:
   - comision bruta
   - monto para la pagina
   - monto neto del agente
9. Guarda la venta.

**Captura sugerida 2**
Pantalla: modal `Cerrar venta`

---

## 5. Como interpretar la pantalla de cierre de venta

En la pantalla de cierre se muestran estos datos:

- `Precio publicado`: valor original de la propiedad
- `Precio de cierre`: valor final de la venta
- `% comision`: porcentaje total que genera el agente
- `% pagina`: porcentaje que retiene la empresa sobre la comision del agente
- `Comision bruta del agente`: total generado por la venta
- `Retencion pagina`: monto que le corresponde a la empresa
- `Agente neto`: monto final que recibe el agente

**Captura sugerida 3**
Pantalla: resumen de calculo dentro del modal de venta

---

## 6. Modulo de comisiones

Despues de guardar la venta, el sistema registra automaticamente la comision en el modulo `Comisiones`.

Desde esta pantalla se puede revisar:

- propiedad asociada
- agente asociado
- monto de la comision
- estado de la comision
- pago relacionado

**Captura sugerida 4**
Pantalla: listado principal de `Comisiones`

---

## 7. Ajustar una comision ya registrada

Si la empresa necesita cambiar la retencion de la pagina en una venta ya cerrada:

1. Ingresa al modulo `Comisiones`.
2. Busca el registro correspondiente.
3. Presiona `Editar`.
4. Modifica el porcentaje de la pagina dentro del rango permitido.
5. El sistema recalcula automaticamente:
   - monto de la pagina
   - monto neto del agente
6. Guarda los cambios.

Importante:

- el porcentaje de la pagina solo puede quedar dentro del rango configurado
- al cambiar ese porcentaje, el sistema actualiza automaticamente los montos

**Captura sugerida 5**
Pantalla: modal de edicion de comision

---

## 8. Estados de la comision

El sistema permite controlar el estado administrativo de la comision.

Estados comunes:

- `Pendiente`
- `Pagada`

Cuando una comision se marca como pagada, puede registrarse:

- fecha de pago
- observaciones del pago

**Captura sugerida 6**
Pantalla: cambio de estado de una comision

---

## 9. Relacion entre ventas y comisiones

Cada vez que se registra una venta:

- la propiedad cambia su estado comercial
- se crea el registro de venta
- se genera la comision correspondiente

Por eso, el modulo de comisiones depende directamente del modulo de ventas.

---

## 10. Recomendaciones para el cliente

- revisar siempre el precio de cierre antes de guardar la venta
- validar el porcentaje de comision del agente
- confirmar el porcentaje de retencion de la pagina
- usar el modulo de comisiones para llevar el control de pagos
- no modificar porcentajes fuera de la politica comercial definida

---

## 11. Resumen rapido

El flujo correcto es:

1. Publicar propiedad
2. Cerrar venta
3. Calcular comision
4. Registrar comision automaticamente
5. Revisar o ajustar la retencion de la pagina si es necesario
6. Marcar la comision como pagada cuando corresponda

---

## 12. Capturas recomendadas para entrega

Para dejar este manual listo para el cliente, se recomienda insertar estas capturas:

1. Configuracion de parametros de comision
2. Modal de cierre de venta
3. Resumen del calculo de comision
4. Listado del modulo de comisiones
5. Modal de edicion de comision
6. Ejemplo de comision en estado pagada

