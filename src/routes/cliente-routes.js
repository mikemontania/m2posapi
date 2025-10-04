const { Router } = require('express');
const clienteController = require('../controllers/cliente-controller.js');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();
// Ruta para encontrar el cliente predeterminado
router.get('/predeterminado', validarJWT,  clienteController.findPredeterminado);

// Ruta para encontrar el cliente propietario
router.get('/propietario',validarJWT, clienteController.findPropietario);

// Ruta para buscar clientes paginados
router.get('/paginados/:page/:pageSize/:searchTerm?', validarJWT,  clienteController.findClientesPaginados);
router.get('/paginadosCentral/:page/:pageSize/:searchTerm?', validarJWT,  clienteController.findClienteCentralPaginado); 
// Ruta para buscar un cliente por ID
router.get('/:id', validarJWT,    clienteController.getById);

// Ruta para buscar todos los clientes
router.get('/clientes', validarJWT,   clienteController.findAll);

// Ruta para crear un nuevo cliente
router.post('/cliente', validarJWT,   clienteController.create);

// Ruta para actualizar un cliente por ID

router.put('/cliente/:id', validarJWT,   clienteController.update);  

router.post("/clienteSucursal/", validarJWT, clienteController.createSucursal);
router.post("/clienteSucursalForm/", validarJWT, clienteController.crearClienteConSucursal);
router.put("/clienteSucursal/:id", validarJWT, clienteController.updateSucursal);
// Ruta para desactivar un cliente por ID
router.put('/clientedesactivar/:id', validarJWT,   clienteController.disable);

module.exports = router;
