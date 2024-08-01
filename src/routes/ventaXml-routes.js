const { Router } = require('express');
const ventaXmlController = require('../controllers/ventaXml-controller.js');
const { validarJWT } = require('../middlewares/validar-jwt');
const { auditMiddleware } = require('../middlewares/auditMiddleware');

const router = Router();

// Ruta para buscar un XML por ID
router.get('/:id', validarJWT, ventaXmlController.getById);

// Ruta para crear un nuevo XML
router.post('/', validarJWT, auditMiddleware, ventaXmlController.create);

// Ruta para actualizar un XML por ID
router.put('/:id', validarJWT, auditMiddleware, ventaXmlController.update);

// Ruta para buscar XMLs por ventaId
router.get('/venta/:ventaId', validarJWT, ventaXmlController.findByVentaId);

module.exports = router;