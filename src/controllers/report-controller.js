const fs = require("fs");
const path = require("path"); // Agrega esta línea para requerir el módulo path
const { createInvoice } = require("../helpers/pdfGenerator");
const Documento = require("../models/documento.model");
const DocumentoDetalle = require("../models/documentoDetalle.model");
const Cliente = require("../models/cliente.model");
const CondicionPago = require("../models/condicionPago.model");
const Sucursal = require("../models/sucursal.model");
const Empresa = require("../models/empresa.model");
const Usuario = require("../models/usuario.model");
const Variante = require("../models/variante.model");
const Presentacion = require("../models/presentacion.model");
const Variedad = require("../models/variedad.model");
const Producto = require("../models/producto.model");
const Unidad = require("../models/unidad.model");
const Cobranza = require("../models/cobranza.model");
const CobranzaDetalle = require("../models/cobranzaDetalle.model");
const MedioPago = require("../models/medioPago.model");
const { Op } = require("sequelize");

const moment = require("moment");
const { sequelize } = require("../../dbconfig");
const EmpresaActividad = require("../models/empresaActividad.model");
const Actividad = require("../models/actividad.model");
const ClienteSucursal = require("../models/ClienteSucursal.model");
const { createTicket } = require("../helpers/pdfGenerator-ticket");

const getReporteCobranza = async (req, res) => {
  console.log("getReporteCobranza");
  try {
    const { fechaDesde, fechaHasta, medioPagoId, sucursalId } = req.params;
    const { empresaId } = req.usuario;

    console.log(fechaDesde, fechaHasta, medioPagoId, sucursalId);
    const condiciones = {
      empresaId
    };
    const desde = moment(fechaDesde).format("YYYY-MM-DD");
    const hasta = moment(fechaHasta).format("YYYY-MM-DD");
    console.log(fechaDesde);
    console.log(desde);
    if (desde && hasta) {
      condiciones.fecha = {
        [Op.gte]: desde, // Mayor o igual que la fecha desde
        [Op.lte]: hasta  // Menor o igual que la fecha hasta
      };
    }
    condiciones.anulado = false;
    condiciones.cobranzaId != null;

    if (sucursalId > 0) {
      condiciones.sucursalId = sucursalId;
    }

    let condiciones2 = {};
    if (medioPagoId > 0) condiciones2.medioPagoId = medioPagoId;
     
    const documentos = await Documento.findAll({
      where: condiciones,
      attributes: [
        "id",
        "fecha",
        "nroComprobante",
        "importeTotal",
        "cobranzaId"
      ],
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["nroDocumento", "razonSocial"]
        },
        { model: Sucursal, as: "sucursal", attributes: ["descripcion"] }
      ]
    });

    let detalles = [];

    for (const documento of documentos) {
      condiciones2.cobranzaId = documento.cobranzaId;

      const cobranzaDetallesArray = await CobranzaDetalle.findAll({
        where: condiciones2, 
        include: [
          { model: MedioPago, as: "medioPago", attributes: ["descripcion"] }
        ]
      });

      const cobranzaDetalles = cobranzaDetallesArray.map(detalle =>
        detalle.toJSON()
      );
      console.log(cobranzaDetalles)
      for (const primerCobranzaDetalle of cobranzaDetalles) {
        detalles.push({
          ...documento.toJSON(), // Aplicar toJSON() a la documento
          importeCobrado: +primerCobranzaDetalle.importeCobrado,
          nroRef: primerCobranzaDetalle.nroRef,
          medioPago: primerCobranzaDetalle.medioPago.descripcion
        });
      }
    }



    // Objeto para almacenar la información agrupada por medio de pago
    const agrupadoPorMedioPago = detalles.reduce((acumulador, detalle) => {
      const { medioPago, importeCobrado } = detalle;
      if (!acumulador[medioPago]) {
        acumulador[medioPago] = {
          cantidadCobranza: 0,
          importeTotal: 0
        };
      }

      acumulador[medioPago].cantidadCobranza++;
      acumulador[medioPago].importeTotal += parseFloat(importeCobrado); // Convertir a número y sumar

      return acumulador;
    }, {});

    // Convertir el objeto agrupado a un array
    const resultadoAgrupado = Object.keys(
      agrupadoPorMedioPago
    ).map(medioPago => ({
      medioPago,
      cantidadCobranza: agrupadoPorMedioPago[medioPago].cantidadCobranza,
      importeTotal: agrupadoPorMedioPago[medioPago].importeTotal
    }));

    res.status(200).json({
      detalles: detalles,
      agrupado: resultadoAgrupado
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.original?.detail ||   "Error al listar las documentos" });
  }
};

 
const getVendedoresPorTotal = async (req, res) => {
  try {
    const { empresaId } = req.usuario;

    const { fechaDesde, fechaHasta, sucursalId } = req.params;
    const sucursalCondition = sucursalId !== '0' ? "AND v.sucursal_id = :sucursalId" : "";
 
    // Realizar la consulta a la base de datos para obtener las variantes más vendidas
    const query = `
      SELECT
        u.id,
        u.usuario as vendedor, 
        COUNT(v.id) as cantidad,
        SUM(v.total_kg) AS peso,
        SUM(v.valor_neto) total
      FROM documentos v  
      JOIN usuarios u ON u.id = v.usuario_creacion_id
      WHERE
        v.anulado = false AND v.empresa_id = :empresaId
        AND v.fecha BETWEEN :fechaDesde AND :fechaHasta
        ${sucursalCondition}
      GROUP BY u.id, vendedor ORDER BY total  DESC 
    `;

    const resultados = await sequelize.query(query, {
      replacements: { fechaDesde, fechaHasta, sucursalId,empresaId },
      type: sequelize.QueryTypes.SELECT
    });

   
 
    // Estructurar y enviar la respuesta
    res.status(200).json({
      resultados: resultados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.original?.detail ||   "Error al obtener getVendedoresPorTotal" });
  }
};
const getInformeNC = async (req, res) => {
  try {
    const { empresaId } = req.usuario;
    const { fechaDesde, fechaHasta , sucursalId} = req.params;
    const sucursalCondition = sucursalId !== '0' ? "AND c.sucursal_id = :sucursalId" : "";
  
    const query = `
      SELECT
        mp.id AS id,
        mp.descripcion AS medioPago ,
        SUM(cd.importe_cobrado *-1) AS totalImporteCobrado,
        COUNT( mp.id) AS cantidad
      FROM
        medio_pago mp
      LEFT JOIN
        cobranzas_detalle cd ON mp.id = cd.medio_pago_id
      LEFT JOIN
        cobranzas c ON cd.cobranza_id = c.id
      WHERE
        c.fecha_cobranza BETWEEN :fechaDesde AND :fechaHasta
        AND c.tipo in ('NC')
        AND c.anulado = false
        AND c.empresa_id = :empresaId
        ${sucursalCondition}
      GROUP BY mp.id, mp.descripcion `;

    const resultados = await sequelize.query(query, {
      replacements: { fechaDesde, fechaHasta, sucursalId, empresaId },
      type: sequelize.QueryTypes.SELECT
    });

    // Estructurar y enviar la respuesta
    res.status(200).json({
      resultados
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: error?.original?.detail ||  "Error al obtener el informe de medios de pago NC" });
  }
};


const getInformeMediosDePago = async (req, res) => {
  try {
    const { empresaId } = req.usuario;
    const { fechaDesde, fechaHasta , sucursalId} = req.params;
    const sucursalCondition = sucursalId !== '0' ? "AND c.sucursal_id = :sucursalId" : "";
  
    const query = `
      SELECT
        mp.id AS id,
        mp.descripcion AS medioPago ,
        SUM(cd.importe_cobrado) AS totalImporteCobrado,
        COUNT( mp.id) AS cantidad
      FROM
        medio_pago mp
      LEFT JOIN
        cobranzas_detalle cd ON mp.id = cd.medio_pago_id
      LEFT JOIN
        cobranzas c ON cd.cobranza_id = c.id
      WHERE
        c.fecha_cobranza BETWEEN :fechaDesde AND :fechaHasta
        AND c.tipo in ('FT','NC')
        AND c.anulado = false
        AND c.empresa_id = :empresaId
        ${sucursalCondition}
      GROUP BY mp.id, mp.descripcion    `;

    const resultados = await sequelize.query(query, {
      replacements: { fechaDesde, fechaHasta, sucursalId, empresaId },
      type: sequelize.QueryTypes.SELECT
    });

    // Estructurar y enviar la respuesta
    res.status(200).json({
      resultados
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: error?.original?.detail ||  "Error al obtener el informe de medios de pago" });
  }
};

const getTopClientes = async (req, res) => {
  try {
    const { empresaId } = req.usuario;
    const { fechaDesde, fechaHasta, sucursalId } = req.params;
    const sucursalCondition = sucursalId !== '0' ? "AND v.sucursal_id = :sucursalId" : "";
    // Realizar la consulta a la base de datos para obtener los clientes más compradores
    const query = `
      SELECT
        c.nro_documento as doc,
        c.razon_social as razonSocial,
        SUM(v.valor_neto) AS totalImporte,
        COUNT(v.id) AS totalFacturas
      FROM
        documentos v
      JOIN
        clientes c ON v.cliente_id = c.id
      WHERE
        v.anulado = false  AND v.empresa_id = :empresaId
        AND c.predeterminado = false
        AND c.propietario = false
        AND v.fecha BETWEEN :fechaDesde AND :fechaHasta
        ${sucursalCondition}

      GROUP BY
      doc, razonSocial 
      ORDER BY
      totalImporte DESC
      LIMIT 10;
    `;

    const resultados = await sequelize.query(query, {
      replacements: { fechaDesde, fechaHasta, empresaId,  sucursalId  },
      type: sequelize.QueryTypes.SELECT
    });

    // Estructurar y enviar la respuesta
    res.status(200).json({
      resultados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.original?.detail ||   "Error al obtener el top de clientes" });
  }
};
const getTopVariantes = async (req, res) => {
  try {
    const { empresaId } = req.usuario;
    const { fechaDesde, fechaHasta, sucursalId } = req.params;
    const sucursalCondition = sucursalId !== '0' ? "AND v.sucursal_id = :sucursalId" : "";
    // Realizar la consulta a la base de datos para obtener las variantes más vendidas
    const query = `
      SELECT
        va.id,
        va.cod_erp as codErp,
        pro.nombre as producto,
        var.descripcion as variedad,
        pre.descripcion as presentacion,
        SUM(vd.cantidad) AS vendidos,
        SUM(vd.total_kg) AS peso,
        SUM(vd.importe_total) AS totalImporte
      FROM
        documentos_detalle vd
      JOIN
        documentos v ON vd.documento_id = v.id
      JOIN variantes va ON va.id = vd.variante_id
      JOIN productos pro ON va.producto_id = pro.id
      JOIN presentaciones pre ON va.presentacion_id = pre.id
      JOIN variedades var ON va.variedad_id = var.id
      WHERE v.anulado = false  AND v.empresa_id = :empresaId
      AND v.calculable = true
      AND v.fecha BETWEEN :fechaDesde AND :fechaHasta
        ${sucursalCondition}
      GROUP BY
      va.id,
      codErp,
      producto,
      variedad,
      presentacion
      ORDER BY
        vendidos DESC
      LIMIT 10;
    `;
    const resultados = await sequelize.query(query, {
      replacements: { fechaDesde, fechaHasta, sucursalId,empresaId  },
      type: sequelize.QueryTypes.SELECT
    });

    // Estructurar y enviar la respuesta
    res.status(200).json({
       resultados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.original?.detail ||   "Error al obtener el top de variantes" });
  }
};
const getReporteDocumentosPorSucursal = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, sucursalId } = req.params;
    const { empresaId } = req.usuario;
console.log(sucursalId)
    // Ajustar la condición para la sucursal
    const sucursalCondition = sucursalId !== '0' ? "AND s.id = :sucursalId" : "";

    // Realizar la consulta a la base de datos para obtener la cantidad de documentos y totales por sucursal
    const query = `
      SELECT
        s.id AS sucursalId,
        s.descripcion AS sucursalNombre,
        COUNT(v.id) AS totalDocumentos,
        SUM(v.valor_neto) AS totalImporte
      FROM
        documentos v
      JOIN
        sucursales s ON v.sucursal_id = s.id
      WHERE
        v.anulado = false 
        AND v.empresa_id = :empresaId
        AND v.fecha BETWEEN :fechaDesde AND :fechaHasta
        ${sucursalCondition}
      GROUP BY
        s.id, s.descripcion
      ORDER BY
        totalImporte DESC;
    `;

    const resultados = await sequelize.query(query, {
      replacements: { fechaDesde, fechaHasta, empresaId, sucursalId  },
      type: sequelize.QueryTypes.SELECT
    });

    // Estructurar y enviar la respuesta
    res.status(200).json({
     
      resultados
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: error?.original?.detail ||  "Error al obtener el reporte de documentos por sucursal" });
  }
};
const getPdf = async (req, res) => {
  const { empresaId } = req.usuario;
  const { id } = req.params;
  try {
    const documento = await Documento.findByPk(id, {
      include: [
        { model: Usuario, as: "vendedorCreacion", attributes: ["usuario"] },
        {
          model: Cliente,
          as: "cliente",
          attributes: ["nroDocumento", "razonSocial" ]
        },
        {
          model: ClienteSucursal,
          as: "clienteSucursal" 
        },
        {
          model: CondicionPago,
          as: "condicionPago",
          attributes: ["id", "descripcion"]
        },
        {
          model: Sucursal,
          as: "sucursal",
          attributes: ["descripcion", "direccion", "telefono", "cel"]
        },
        {
          model: Empresa,
          as: "empresa",
          attributes: [
            "razonSocial",
            "ruc",
            "img",
            "web"
          ]
        }
      ]
    });
    if (!documento) {
      return res.status(404).json({ error: "Documento not found" });
    }
    const  data = await EmpresaActividad.findAll({
      where: {   empresaId },
      include: [{ model: Actividad, as: 'actividades' }]
    });
    const actividades = data.map(d => ({
      ...d.actividades['dataValues']
     }))

    const detallesDocumento = await DocumentoDetalle.findAll({
      where: { documentoId: id },
      include: [
        {
          model: Variante,
          as: "variante", // Asegúrate de usar el alias correcto aquí
          include: [
            {
              model: Presentacion,
              as: "presentacion", // Asegúrate de usar el alias correcto aquí
              attributes: ["id", "descripcion", "size"]
            },
            {
              model: Variedad,
              as: "variedad", // Asegúrate de usar el alias correcto aquí
              attributes: ["id", "descripcion", "color"]
            },
            {
              model: Producto,
              as: "producto", // Asegúrate de usar el alias correcto aquí
              attributes: ["nombre"]
            },
            {
              model: Unidad,
              as: "unidad", // Asegúrate de usar el alias correcto aquí
              attributes: ["code"]
            }
          ]
        }
      ]
    });
    if (detallesDocumento.length === 0) {
      return res.status(404).json({ error: "No details found for this documento" });
    }
    /* console.log(documento)
 */

    const cabecera = {
      ...documento.dataValues,
      sucursal: { ...documento.dataValues.sucursal.dataValues },
      empresa: { ...documento.dataValues.empresa.dataValues,actividades },
      vendedorCreacion: { ...documento.dataValues.vendedorCreacion.dataValues },
      cliente: { ...documento.dataValues.cliente.dataValues, ...documento.dataValues.clienteSucursal.dataValues},
      condicionPago: { ...documento.dataValues.condicionPago.dataValues }
    };
    let detalles = [];

    detallesDocumento.forEach(detail => {
      console.log(detail)

      const detalle = detail.get({ plain: true });
      console.log(detalle)
      const variante = detail.variante.get({ plain: true });
      console.log(variante)
      // Acceder a los datos de Variante 
      detalles.push({
        porcIva:detalle.porcIva,
        cantidad: detalle.cantidad,
        importePrecio: detalle.importePrecio,
        importeIva5: detalle.importeIva5,
        importeIva10: detalle.importeIva10,
        importeIvaExenta: detalle.importeIvaExenta,
        importeDescuento: detalle.importeDescuento,
        importeNeto: detalle.importeNeto,
        importeSubtotal: detalle.importeSubtotal,
        importeTotal: detalle.importeTotal,
        totalKg: detalle.totalKg,
        tipoDescuento: detalle.tipoDescuento,
        variante: variante,
        presentacion: variante.presentacion,
        variedad: variante.variedad,
        producto: variante.producto,
        unidad: variante.unidad
      });
      /*  console.log("-------------------");
    console.log(cabecera);
    console.log("-------------------");
    console.log(detalles);
    console.log("-------------------"); */
    });

    const pdfContent = createInvoice(cabecera, detalles);

    // Configurar la respuesta HTTP
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=FE-${cabecera.nroComprobante}.pdf`
    );

    // Enviar el contenido del PDF como respuesta
    pdfContent.pipe(res);
  } catch (error) {
    console.error("Error in getPdf:", error);
    res.status(500).json({ error: error?.original?.detail ||   "Internal Server Error" });
  }
};
const getTicket = async (req, res) => {
  const { empresaId } = req.usuario;
  const { id, doc } = req.params;

  let tipo=null;
if (doc==1) {
  tipo ="Original:Cliente"
}else{
   tipo ="Duplicado:Comprobante tributario"
}
  try {
    const documento = await Documento.findByPk(id, {
      include: [
        { model: Usuario, as: "vendedorCreacion", attributes: ["usuario"] },
        {
          model: Cliente,
          as: "cliente",
          attributes: ["nroDocumento", "razonSocial" ]
        },
        {
          model: ClienteSucursal,
          as: "clienteSucursal" 
        },
        {
          model: CondicionPago,
          as: "condicionPago",
          attributes: ["id", "descripcion"]
        },
        {
          model: Sucursal,
          as: "sucursal",
          attributes: ["descripcion", "direccion", "telefono", "cel"]
        },
        {
          model: Empresa,
          as: "empresa",
          attributes: [
            "razonSocial",
            "ruc",
            "img",
            "web"
          ]
        }
      ]
    });
    if (!documento) {
      return res.status(404).json({ error: "Documento not found" });
    }
    const  data = await EmpresaActividad.findAll({
      where: {   empresaId },
      include: [{ model: Actividad, as: 'actividades' }]
    });
    const actividades = data.map(d => ({
      ...d.actividades['dataValues']
     }))

    const detallesDocumento = await DocumentoDetalle.findAll({
      where: { documentoId: id },
      include: [
        {
          model: Variante,
          as: "variante", // Asegúrate de usar el alias correcto aquí
          include: [
            {
              model: Presentacion,
              as: "presentacion", // Asegúrate de usar el alias correcto aquí
              attributes: ["id", "descripcion", "size"]
            },
            {
              model: Variedad,
              as: "variedad", // Asegúrate de usar el alias correcto aquí
              attributes: ["id", "descripcion", "color"]
            },
            {
              model: Producto,
              as: "producto", // Asegúrate de usar el alias correcto aquí
              attributes: ["nombre"]
            },
            {
              model: Unidad,
              as: "unidad", // Asegúrate de usar el alias correcto aquí
              attributes: ["code"]
            }
          ]
        }
      ]
    });
    if (detallesDocumento.length === 0) {
      return res.status(404).json({ error: "No details found for this documento" });
    }
    /* console.log(documento)
 */

    const cabecera = {
      ...documento.dataValues,
      sucursal: { ...documento.dataValues.sucursal.dataValues },
      empresa: { ...documento.dataValues.empresa.dataValues,actividades },
      vendedorCreacion: { ...documento.dataValues.vendedorCreacion.dataValues },
      cliente: { ...documento.dataValues.cliente.dataValues, ...documento.dataValues.clienteSucursal.dataValues},
      condicionPago: { ...documento.dataValues.condicionPago.dataValues }
    };
    let detalles = [];

    detallesDocumento.forEach(detail => {
      console.log(detail)

      const detalle = detail.get({ plain: true });
      console.log(detalle)
      const variante = detail.variante.get({ plain: true });
      console.log(variante)
      // Acceder a los datos de Variante 
      detalles.push({
        porcIva:detalle.porcIva,
        cantidad: detalle.cantidad,
        importePrecio: detalle.importePrecio,
        importeIva5: detalle.importeIva5,
        importeIva10: detalle.importeIva10,
        importeIvaExenta: detalle.importeIvaExenta,
        importeDescuento: detalle.importeDescuento,
        importeNeto: detalle.importeNeto,
        importeSubtotal: detalle.importeSubtotal,
        importeTotal: detalle.importeTotal,
        totalKg: detalle.totalKg,
        tipoDescuento: detalle.tipoDescuento,
        variante: variante,
        presentacion: variante.presentacion,
        variedad: variante.variedad,
        producto: variante.producto,
        unidad: variante.unidad
      });
     
    });

    const pdfContent = createTicket(tipo,cabecera, detalles);

    // Configurar la respuesta HTTP
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=FE-${cabecera.nroComprobante}.pdf`
    );

    // Enviar el contenido del PDF como respuesta
    pdfContent.pipe(res);
  } catch (error) {
    console.error("Error in getPdf:", error);
    res.status(500).json({ error: error?.original?.detail ||   "Internal Server Error" });
  }
};
module.exports = {
  getPdf,
  getTicket,
  getReporteCobranza,
  getReporteDocumentosPorSucursal ,
  getTopVariantes,
  getTopClientes,getInformeNC,getInformeNC,
  getInformeMediosDePago,  getVendedoresPorTotal
};
