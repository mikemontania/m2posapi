const Documento = require("../../models/documento.model");
const { formatDateToLocalISO } = require("../generarXml");
const { paises } = require("./constants.service");

const formatToParams = (documento, empresa) => {
  try {
    return {
      ruc: empresa.ruc,
      razonSocial: empresa.razonSocial,
      nombreFantasia: empresa.nombreFantasia,
      actividadesEconomicas: empresa.actividades.map(act => ({
        codigo: act.cActEco,
        descripcion: act.dDesActEco
      })),
      timbradoNumero: documento.timbrado,
      timbradoFecha: documento.fechaInicio,
      tipoContribuyente: empresa.tipoContId,
      tipoRegimen: empresa.tipoImpId,
      establecimientos: [
        {
          codigo: documento.sucursalId.toString().padStart(3, "0"),
          direccion: documento.sucursal.direccion,
          numeroCasa: empresa.numCasa.toString(),
          complementoDireccion1: "",
          complementoDireccion2: "",
          departamento: empresa.departamento.codigo,
          departamentoDescripcion: empresa.departamento.descripcion,
          distrito: empresa.ciudad.codigo,
          distritoDescripcion: empresa.ciudad.descripcion,
          ciudad: empresa.barrio.codigo,
          ciudadDescripcion: empresa.barrio.descripcion,
          telefono: documento.sucursal.telefono,
          email: documento.sucursal.email, 
        }
      ]
    };
  } catch (error) {
    console.error("❌ Error formatToParams:", error.message);
    return null;
  }
};

const formatToData = async (documento, empresa) => {
  console.log("documento ", JSON.stringify(documento, null, 2)); 
  
  const esContado = documento.condicionPago.id == 1;
  let documentoAsociado=null
  if (documento.docAsociadoId) {
    const documentoAso = await Documento.findByPk(documento.docAsociadoId);
    const [establecimientoAS, puntoAs, numeroAs] =
    documento.nroComprobante.split("-") || [];
    documentoAsociado={
      /*1= Electrónico
      2= Impreso
      3= Constancia Electrónica*/
     formato : 1,
     cdc  : documentoAso.cdc,
     tipo : 1,
     "timbrado" : documentoAso.timbrado,
     "establecimiento" : establecimientoAS,
     "punto" : puntoAs,
     "numero" : numeroAs,
     "fecha" : documentoAso.fecha,
    }

}
  const condicion = esContado
    ? {
        tipo: 1,
        entregas: [
          {
            tipo: 1,
            monto: documento.importeTotal,
            moneda: "PYG",
            cambio: 0
          }
        ]
      }
    : { tipo: 2 ,
      credito: {
        tipo: 1,
        plazo: `${documento.condicionPago.dias} días`,
        cuotas: 1,
        montoEntrega: documento.importeTotal,
        infoCuotas: [
          {
            moneda: empresa.codMoneda,
            monto: documento.importeTotal,
            vencimiento: documento.fechaVencimiento
          },
          {
            moneda: empresa.codMoneda,
            monto: documento.importeTotal,
            vencimiento: documento.fecha
          }
        ]
      }
    };
  


  try {
    const [establecimiento, punto, numero] =
      documento.nroComprobante.split("-") || [];
    const pais = paises.find(p => p.codigo == documento.cliente.codigoPais);
    const items = documento.detalles.map(detalle => ({
      codigo: detalle.codigo,
      descripcion: detalle.descripcion,
      observacion: null,
      unidadMedida: 77,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.importePrecio,
      cambio: 0,
      descuento: (detalle.importeDescuento/detalle.cantidad),
      anticipo: detalle.anticipo || 0,
      pais: pais.codigo,
      paisDescripcion: pais.descripcion,
      tolerancia: 1, //nota remision
      toleranciaCantidad: 1, //nota remision
      toleranciaPorcentaje: 1, //nota remision
      cdcAnticipo: "", //nota remision
      dncp: {
        codigoNivelGeneral: "00000000",
        codigoNivelEspecifico: "000",
      /*   codigoGtinProducto: "1111111",
        codigoNivelPaquete: "1111111" */
      },
      ivaTipo: detalle.ivaTipo,
      ivaBase: detalle.ivaBase,
      iva: detalle.porcIva,
      lote: null,
      vencimiento: null,
      numeroSerie: null,
      numeroPedido: null,
      numeroSeguimiento: null,
      importador: null,
      registroSenave: null,
      registroEntidadComercial: null,
      sectorAutomotor: null
    }));

    return {
      cdc: documento.cdc,
      codigoSeguridad: documento.codigoSeguridad,
      tipoDocumento: documento.tipoDocumento.codigo,
      establecimiento: establecimiento,
      codigoSeguridadAleatorio: documento.codigoSeguridad,
      punto: punto,
      numero: numero,
      descripcion: "",
      observacion: "",
      fecha: formatDateToLocalISO(documento.fechaCreacion),
      tipoEmision: 1,
      tipoTransaccion: empresa.tipoTransaId,
      tipoImpuesto: empresa.tipoImpId,
      moneda: empresa.codMoneda,
      //condicionAnticipo: 1,
      condicionTipoCambio: 1,
      descuentoGlobal:0,
      anticipoGlobal: 0,
      cambio: 6700,
      cliente: {
        contribuyente: (documento.cliente.naturalezaReceptor == 1)?true:false,
        ruc:  (documento.cliente.naturalezaReceptor == 1)? documento.cliente.nroDocumento:null,
        documentoNumero: (documento.cliente.naturalezaReceptor == 2)? documento.cliente.nroDocumento:null,
        razonSocial: documento.clienteSucursal.nombre,
        nombreFantasia: documento.cliente.nombreFantasia,
        tipoOperacion: documento.cliente.tipoOperacionId,
        direccion: documento.clienteSucursal.direccion,
        numeroCasa: "0",
        departamento: null,
        departamentoDescripcion: null,
        distrito: null,
        distritoDescripcion: null,
        ciudad: null,
        ciudadDescripcion: null,
        pais: pais.codigo,
        paisDescripcion: pais.descripcion,
        tipoContribuyente: documento.cliente.tipoContribuyente,
        documentoTipo: documento.cliente.tipoDocIdentidad,
        telefono: documento.clienteSucursal.telefono,
        celular: documento.clienteSucursal.celular,
        email: documento.cliente.email,
        //codigo: documento.cliente.id
      }, 
      factura: {
        presencia: 1,
        fechaEnvio: documento.fecha,
        dncp: {
          modalidad: "00",
          entidad: 11111,
          periodo: 11,
          secuencia: 1111111,
          fecha: documento.fecha
        }
      }, 
       notaCreditoDebito : {
        motivo : documento.idMotEmi
    },
      condicion,    
      items: items,
      sectorEnergiaElectrica: null,
      sectorSeguros: null,
      sectorSupermercados: null,
      sectorAdicional: null,
      detalleTransporte: null,
      complementarios: null,
      documentoAsociado
    };
     
  } catch (error) {
    console.error("❌ Error formatToData:", error.message);
    return null;
  }
};

module.exports = {
  formatToParams,
  formatToData
};
