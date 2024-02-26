const { Op } = require('sequelize');
const Numeracion = require('../models/numeracion.model'); // Asegúrate de que la importación del modelo sea correcta
const { sequelize } = require('../../dbconfig');
const Sucursal = require('../models/sucursal.model');

// Método para buscar por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const numeracion = await Numeracion.findByPk(id);
    console.log(numeracion)
      res.status(200).json(numeracion);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar la numeración por ID' });
  }
};

const findNumeracionesPaginados = async (req, res) => {
  try {
    const { empresaId } = req.usuario;
    const { page = 1, pageSize = 10  } = req.params;
    const condiciones = { empresaId };
    
    const offset = (page - 1) * pageSize;
    // Realizar la consulta paginada
    const { count, rows:numeraciones } = await Numeracion.findAndCountAll({
      where: condiciones,
      include: [
        { model: Sucursal, as: "sucursal",  }, 
      ],
      limit: pageSize,
      offset,
    }); 
    // Calcular el número total de páginas
    const totalPages = Math.ceil(count / pageSize);

    res.status(200).json({
      total: count,
      totalPages: Math.ceil(count / pageSize),
      page: Number(page),
      pageSize: Number(pageSize),
      numeraciones
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al buscar numeraciones paginados" });
  }
};

// Método para buscar todas las numeraciones
const findAll = async (req, res) => {
  try {
    const { empresaId } = req.usuario; 
    const {   sucursalId } = req.params;
  const condiciones={
    empresaId,
    sucursalId
   } ;
     const numeraciones = await Numeracion.findAll({ where: condiciones });
    console.log(numeraciones)
    res.status(200).json(numeraciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar numeraciones' });
  }
};

// Método para crear una nueva numeración
const create = async (req, res) => {
  const { empresaId } = req.usuario; 
  try {
    const {   sucursalId, inicioTimbrado, finTimbrado, numeroInicio, numeroFin, serie, timbrado, tipoComprobante, ultimoNumero, tipoImpresion, activo } = req.body;
    const numeracion = await Numeracion.create({ empresaId, sucursalId, inicioTimbrado, finTimbrado, numeroInicio, numeroFin, serie, timbrado, tipoComprobante, ultimoNumero, tipoImpresion, activo });
    res.status(201).json(numeracion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la numeración' });
  }
};

// Método para actualizar una numeración por ID
const update = async (req, res) => {
  const { empresaId } = req.usuario; 
  try {
    const { id } = req.params;
    const { sucursalId, inicioTimbrado, finTimbrado, numeroInicio, numeroFin, serie, timbrado, tipoComprobante, ultimoNumero, tipoImpresion, activo } = req.body;
    const numeracion = await Numeracion.findByPk(id);
    if (numeracion) {
      await numeracion.update({ empresaId, sucursalId, inicioTimbrado, finTimbrado, numeroInicio, numeroFin, serie, timbrado, tipoComprobante, ultimoNumero, tipoImpresion, activo });
      res.status(200).json(numeracion);
    } else {
      res.status(404).json({ error: 'Numeración no encontrada' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la numeración' });
  }
};

// Método para desactivar una numeración (marcar como inactiva)
const disable = async (req, res) => {
  try {
    const { id } = req.params;
    const numeracion = await Numeracion.findByPk(id);
    if (numeracion) {
      await numeracion.update({ activo: false });
      res.status(200).json({ message: 'Numeración desactivada exitosamente' });
    } else {
      res.status(404).json({ error: 'Numeración no encontrada' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desactivar la numeración' });
  }
};

module.exports = {
  getById,
  findAll,
  create,
  update,
  disable,
  findNumeracionesPaginados
};
