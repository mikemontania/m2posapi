const { defaultConfig } = require("./config");

const generateDatosTotales = (data, items) => {
 
  let moneda = data.moneda;
  if (!moneda && defaultConfig.defaultValues === true) {
    moneda = "PYG";
  }

  let dSubExe = 0,
    dSubExo = 0,
    dSub5 = 0,
    dSub10 = 0,
    dTotOpeSinDescuento = 0,
    dTotOpe = 0,
    dTotDesc = 0,
    dTotDescGlotem = 0,
    dTotAntItem = 0,
    dTotAnt = 0,
    dDescTotal = 0,
    dAnticipo = 0,
    dTotOpeGs = 0,
    dIVA5 = 0,
    dIVA10 = 0,
    dLiqTotIVA5 = 0,
    dLiqTotIVA10 = 0,
    dBaseGrav5 = 0,
    dBaseGrav10 = 0;

  let agregarDSub = false;
  //Crear las variables
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item["gCamIVA"]) {
      //gCamIVA puede ser null (MT150=No informar si D013=2 y C002= 4 o 7)

      //Subtotal (exenta o iva parcial)
      if (
        item["gCamIVA"]["iAfecIVA"] == 3 ||
        item["gCamIVA"]["iAfecIVA"] == 4
      ) {
        //E731==3
        let sumaExenta = 0;
        if (item["gCamIVA"]["iAfecIVA"] == 3) {
          sumaExenta += item["gValorItem"]["gValorRestaItem"]["dTotOpeItem"]; //Suma de EA008
        }
        if (item["gCamIVA"]["iAfecIVA"] == 4) {
          sumaExenta += item["gCamIVA"]["dBasExe"]; //Suma de E737
        }
        dSubExe += sumaExenta; //Suma de EA008
      }
      //Exenta
      if (item["gCamIVA"]["iAfecIVA"] == 2) {
        //E731==2
        dSubExo += item["gValorItem"]["gValorRestaItem"]["dTotOpeItem"]; //Suma de EA008
      }
      //Gravadas 5 o 10
      if (
        item["gCamIVA"]["iAfecIVA"] == 1 ||
        item["gCamIVA"]["iAfecIVA"] == 4
      ) {
         if (data.tipoImpuesto == 1 || data.tipoImpuesto == 5) {
          //Esta condicion se repite en linea 219
          //No debe existir si D013 != 1
          if (item["gCamIVA"]["dTasaIVA"] == 5) {
            //E734
            let sumaGrav5 = 0;
            if (item["gCamIVA"]["iAfecIVA"] == 1) {
              sumaGrav5 += item["gValorItem"]["gValorRestaItem"]["dTotOpeItem"]; //EA008
            }
            if (item["gCamIVA"]["iAfecIVA"] == 4) {
              sumaGrav5 += item["gCamIVA"]["dBasGravIVA"] + item["gCamIVA"]["dLiqIVAItem"]; //E735 + E736. NT 13
            }
            dSub5 += sumaGrav5;
          }
          if (item["gCamIVA"]["dTasaIVA"] == 10) {
            let sumaGrav10 = 0;
            if (item["gCamIVA"]["iAfecIVA"] == 1) {
              sumaGrav10 += item["gValorItem"]["gValorRestaItem"]["dTotOpeItem"]; //EA008
            }
            if (item["gCamIVA"]["iAfecIVA"] == 4) {
              sumaGrav10 += item["gCamIVA"]["dBasGravIVA"] + item["gCamIVA"]["dLiqIVAItem"]; //E735 + E736. NT 13
            }
            dSub10 += sumaGrav10;

            //dSub10 += item['gValorItem']['gValorRestaItem']['dTotOpeItem'];
          }
          agregarDSub = true;
        }
      }
      //---
      if (data.tipoImpuesto == 1 || data.tipoImpuesto == 5) {
        //No debe existir si D013 != 1 o D013 != 5
        if (item["gCamIVA"]["dTasaIVA"] == 5) {
          //E734
          dIVA5 += item["gCamIVA"]["dLiqIVAItem"];
          //dLiqTotIVA5 = 0;    //se hace mas adelante, despues de obtener el redondeo
          dBaseGrav5 += item["gCamIVA"]["dBasGravIVA"];
        }
        if (item["gCamIVA"]["dTasaIVA"] == 10) {
          dIVA10 += item["gCamIVA"]["dLiqIVAItem"];
          //dLiqTotIVA10 = 0;   //se hace mas adelante, despues de obtener el redondeo
          dBaseGrav10 += item["gCamIVA"]["dBasGravIVA"];
        }
      }
    }
    //---
    if (data.tipoDocumento == 4) {
      dTotOpe += item["gValorItem"]["gValorRestaItem"]["dTotOpeItem"];
    }
 
    //hay que restarle el dDescItem antes de multiplicar por la cantidad)
    dTotOpeSinDescuento += item["gValorItem"]["dPUniProSer"] * item["dCantProSer"];

    dTotDesc +=
      (item["gValorItem"]["gValorRestaItem"]["dDescItem"] || 0) *
      item["dCantProSer"];

    //Este calculo no sale exactamente igual por la diferencia de decimales, entonces usa directo en enviado por el usuario. 

    dTotAntItem += (item["gValorItem"]["gValorRestaItem"]["dAntPreUniIt"] || 0) * item["dCantProSer"];
    dTotAnt += (item["gValorItem"]["gValorRestaItem"]["dAntGloPreUniIt"] || 0) * item["dCantProSer"];
 

    dAnticipo = dTotAntItem + dTotAnt;
    dTotOpeGs += item["gValorItem"]["gValorRestaItem"]["dTotOpeGs"]; //Suma del monto total en Gs.
  } //end-for

  //Finalmente sobreescribe de vuelta con el que paso el usuario.
  dTotDescGlotem = +data.descuentoGlobal || 0;
  dDescTotal = dTotDesc + dTotDescGlotem;

  if (
    data.tipoImpuesto == 1 ||
    data.tipoImpuesto == 3 ||
    data.tipoImpuesto == 4 ||
    data.tipoImpuesto == 5
  ) {
    if (data.tipoDocumento != 4) {
      dTotOpe = dSubExe + dSubExo + dSub5 + dSub10; // Suma (F002, F003, F004 y F005)
    }
  }

  if (data.moneda != "PYG") {
    dTotOpe = parseFloat(dTotOpe.toFixed(defaultConfig.decimals));
  }

  let dRedon = 0;
  if (defaultConfig.redondeoSedeco) {
    if (data.moneda === "PYG") {
      dRedon = redondeoSedeco(dTotOpe);
    } else {
      //Observación: Para monedas extranjeras o cualquier otro cálculo que contenga decimales, las reglas de validación
      //aceptarán redondeos de 50 céntimos (por encima o por debajo)
      if (dTotOpe % 1 != 0) {
        //Es moneda extranjera, en decimal
        //console.log('Moneda extranjera decimal ' + dTotOpe);
      }
    }
  }

  if (!(data.tipoImpuesto != 1 && data.tipoImpuesto != 5)) {
    //No debe existir si D013 != 1 o D013 != 5
    if (dIVA5 > 0) {
      /*dLiqTotIVA5 = dRedon / 1.05; //Consultar
      dLiqTotIVA5 = Math.round(dLiqTotIVA5);*/
      dLiqTotIVA5 = dRedon / 1.05; //Consultar
      dLiqTotIVA5 = Math.round(dLiqTotIVA5);
      dLiqTotIVA5 = 0;
    }

    if (dIVA10 > 0) {
      /*dLiqTotIVA10 = dRedon / 1.1;
      dLiqTotIVA10 = Math.round(dLiqTotIVA10);*/
      dLiqTotIVA10 = dRedon / 1.1;
      dLiqTotIVA10 = Math.round(dLiqTotIVA10);
      dLiqTotIVA10 = 0;
    }
  }

  let comisionLiquid = (data.comision || 0) * 10 / 100;

  //---
  //Corresponde al cálculo aritmético F008 - F013 + F025
  let dTotGralOpe = dTotOpe - dRedon + (data.comision || 0);
  if (data.moneda != "PYG") {
    dTotGralOpe = parseFloat(dTotGralOpe.toFixed(defaultConfig.decimals));
  } else {
    dTotGralOpe = parseFloat(dTotGralOpe.toFixed(defaultConfig.pygDecimals));
  }


  //Asignar al JSON DATA
  if (data.moneda != "PYG") {
    dSubExe = parseFloat(dSubExe.toFixed(defaultConfig.taxDecimals));
    dSubExo = parseFloat(dSubExo.toFixed(defaultConfig.taxDecimals));
  } else {
    dSubExe = parseFloat(dSubExe.toFixed(defaultConfig.pygTaxDecimals));
    dSubExo = parseFloat(dSubExo.toFixed(defaultConfig.pygTaxDecimals));
  }

  let jsonResult = {
    dSubExe: dSubExe,
    dSubExo: dSubExo
  };

  if (agregarDSub) {
    //if (!(data['tipoImpuesto'] != 1)) {
    if (data.tipoImpuesto == 1 || data.tipoImpuesto == 5) {
      //Esta condicion se repite en linea 64
      //No debe existir si D013 != 1        if (dSub5 > 0) {
      if (dSub5 > 0) {
        jsonResult["dSub5"] = dSub5;

        if (data.moneda !== "PYG") {
          jsonResult["dSub5"] = parseFloat(
            dSub5.toFixed(defaultConfig.taxDecimals)
          );
        } else {
          jsonResult["dSub5"] = parseFloat(
            dSub5.toFixed(defaultConfig.pygTaxDecimals)
          );
        }
      } else {
        jsonResult["dSub5"] = 0;
      }

      if (dSub10 > 0) {
        jsonResult["dSub10"] = dSub10;

        if (data.moneda !== "PYG") {
          //Redondea el tax, independiente a la moneda
          jsonResult["dSub10"] = parseFloat(
            dSub10.toFixed(defaultConfig.taxDecimals)
          );
        } else {
          jsonResult["dSub10"] = parseFloat(
            dSub10.toFixed(defaultConfig.pygTaxDecimals)
          );
        }
      } else {
        jsonResult["dSub10"] = 0;
      }
    }
  }

  if (data.moneda != "PYG") {
    dTotOpe = parseFloat(dTotOpe.toFixed(defaultConfig.decimals));
  } else {
    dTotOpe = parseFloat(dTotOpe.toFixed(defaultConfig.pygDecimals));
  }
  if (data.moneda != "PYG") {
    dTotDesc = parseFloat(dTotDesc.toFixed(defaultConfig.decimals));
  } else {
    dTotDesc = parseFloat(dTotDesc.toFixed(defaultConfig.pygDecimals));
  }
  if (data.moneda != "PYG") {
    dTotDescGlotem = parseFloat(dTotDescGlotem.toFixed(defaultConfig.decimals));
  } else {
    dTotDescGlotem = parseFloat( dTotDescGlotem.toFixed(defaultConfig.pygDecimals)
    );
  }
  if (data.moneda != "PYG") {
    dDescTotal = parseFloat(dDescTotal.toFixed(defaultConfig.decimals));
  } else {
    dDescTotal = parseFloat(dDescTotal.toFixed(defaultConfig.pygDecimals));
  }
  if (data.moneda != "PYG") {
    dTotOpe = parseFloat(dTotOpe.toFixed(defaultConfig.decimals)); //Este esta repetido en la linea 218, verificar
  } else {
    dTotOpe = parseFloat(dTotOpe.toFixed(defaultConfig.pygDecimals));
  }
  //---
  if (data.moneda != "PYG") {
    dTotAntItem = parseFloat(dTotAntItem.toFixed(defaultConfig.decimals));
  } else {
    dTotAntItem = parseFloat(dTotAntItem.toFixed(defaultConfig.pygDecimals));
  }
  if (data.moneda != "PYG") {
    dTotAnt = parseFloat(dTotAnt.toFixed(defaultConfig.decimals));
  } else {
    dTotAnt = parseFloat(dTotAnt.toFixed(defaultConfig.pygDecimals));
  }
  if (data.moneda != "PYG") {
    dAnticipo = parseFloat(dAnticipo.toFixed(defaultConfig.decimals));
  } else {
    dAnticipo = parseFloat(dAnticipo.toFixed(defaultConfig.pygDecimals));
  }
  jsonResult = {
    ...jsonResult,
    dTotOpe: dTotOpe, //F008
    dTotDesc: dTotDesc,
    dTotDescGlotem ,
    dTotAntItem: dTotAntItem,
    dTotAnt: dTotAnt,
    dPorcDescTotal: 0, //este no es obligatorio, pero se puede hacer un calculo en base al descuento por item + global y con relacion al precio
    dDescTotal: dDescTotal,
    dAnticipo: dAnticipo,
    dRedon: dRedon //F013
  };

  if (data.comision > 0) {
    jsonResult["dComi"] = data.comision;
  }

  jsonResult = {
    ...jsonResult,
    dTotGralOpe: dTotGralOpe //F014
  };

  //Redondeo

  //No se por que se puso este pero genera error en los redondeos al calcular, HB
  //Deshabilitado 05 05 23

  //Redondeo
  if (data.moneda !== "PYG") {
    dIVA5 = parseFloat(dIVA5.toFixed(defaultConfig.taxDecimals));
    dIVA10 = parseFloat(dIVA10.toFixed(defaultConfig.taxDecimals));
    dLiqTotIVA5 = parseFloat(dLiqTotIVA5.toFixed(defaultConfig.taxDecimals));
    dLiqTotIVA10 = parseFloat(dLiqTotIVA10.toFixed(defaultConfig.taxDecimals));
  } else {
    //Si la moneda es PYG, no asignar decimales en los impuestos previos de iva.
    dIVA5 = parseFloat(dIVA5.toFixed(defaultConfig.pygTaxDecimals));
    dIVA10 = parseFloat(dIVA10.toFixed(defaultConfig.pygTaxDecimals));
    dLiqTotIVA5 = parseFloat(dLiqTotIVA5.toFixed(defaultConfig.pygTaxDecimals));
    dLiqTotIVA10 = parseFloat(
      dLiqTotIVA10.toFixed(defaultConfig.pygTaxDecimals)
    );
  }

  if (agregarDSub) {
    if (data.tipoImpuesto == 1 || data.tipoImpuesto == 5) {
      //D013
      jsonResult["dIVA5"] = dIVA5;
      jsonResult["dIVA10"] = dIVA10;
      jsonResult["dLiqTotIVA5"] = dLiqTotIVA5;
      jsonResult["dLiqTotIVA10"] = dLiqTotIVA10;
    }
  }

  if (comisionLiquid > 0) {
    jsonResult = {
      ...jsonResult,
      dIVAComi: comisionLiquid
    };
  }

  if (agregarDSub) {
    if (data.tipoImpuesto == 1 || data.tipoImpuesto == 5) {
      //D013
      //dTotIva: No debe existir el campo si D013 ≠ 1 o D013≠5
      if (
        dIVA5 > 0 ||
        dIVA10 > 0 ||
        dLiqTotIVA5 > 0 ||
        dLiqTotIVA10 > 0 ||
        comisionLiquid > 0
      ) {
        jsonResult["dTotIVA"] = dIVA5 + dIVA10 - dLiqTotIVA5 - dLiqTotIVA10 + comisionLiquid;

        //Redondeo
        if (data.moneda !== "PYG") {
          jsonResult["dTotIVA"] = parseFloat(
            jsonResult["dTotIVA"].toFixed(defaultConfig.taxDecimals)
          );
        } else {
          jsonResult["dTotIVA"] = parseFloat(
            jsonResult["dTotIVA"].toFixed(defaultConfig.pygTaxDecimals)
          );
        }
      } else {
        jsonResult["dTotIVA"] = 0;
      }

      if (dBaseGrav5 > 0) {
        //Redondeo
        if (data.moneda !== "PYG") {
          dBaseGrav5 = parseFloat(
            dBaseGrav5.toFixed(defaultConfig.taxDecimals)
          );
        } else {
          dBaseGrav5 = parseFloat(
            dBaseGrav5.toFixed(defaultConfig.pygTaxDecimals)
          );
        }

        jsonResult["dBaseGrav5"] = dBaseGrav5;
      } else {
        jsonResult["dBaseGrav5"] = 0;
      }
      if (dBaseGrav10 > 0) {
        //Redondeo
        if (data.moneda !== "PYG") {
          dBaseGrav10 = parseFloat(
            dBaseGrav10.toFixed(defaultConfig.taxDecimals)
          );
        } else {
          dBaseGrav10 = parseFloat(
            dBaseGrav10.toFixed(defaultConfig.pygTaxDecimals)
          );
        }

        jsonResult["dBaseGrav10"] = dBaseGrav10;
      } else {
        jsonResult["dBaseGrav10"] = 0;
      }
      if (dBaseGrav5 > 0 || dBaseGrav10 > 0) {
        let toFixed = defaultConfig.taxDecimals;
        if (moneda == "PYG") {
          toFixed = defaultConfig.pygTaxDecimals;
        }

        jsonResult["dTBasGraIVA"] = parseFloat(
          ((dBaseGrav5 > 0 ? dBaseGrav5 : 0) +
            (dBaseGrav10 > 0 ? dBaseGrav10 : 0)).toFixed(toFixed)
        );
      } else {
        jsonResult["dTBasGraIVA"] = 0;
      }
    }
  }

  if (moneda != "PYG") {
    //Si es en otra moneda que no sea PYG
    //Utiliza el Decimales en Guaranies pygDecimals
    if (data.condicionTipoCambio == 1) {
      //Por el Global
      jsonResult["dTotalGs"] = parseFloat(
        (dTotGralOpe * data.cambio).toFixed(defaultConfig.pygDecimals)
      );
    } else {
      //TODO Este hay que ver la forma de que el totalGS sea por la multiplicacion con el cambio de cada item, al final
      // o ver como seria, hacer pruebas
      jsonResult["dTotalGs"] = parseFloat(
        (dTotGralOpe * data.cambio).toFixed(defaultConfig.pygDecimals)
      );
    }
  } else {
    //No informar si D015 = PYG
  }

  //Calculo del % de descuento Global
  if (jsonResult['dTotDescGlotem'] > 0) {
    jsonResult['dPorcDescTotal'] = ((dTotDescGlotem * 100) / dTotOpeSinDescuento).toFixed(8); //Maximo permitido
  }
let newJson  ={};
newJson["gTotSub"]=jsonResult;
  return newJson;
};

const redondeoSedeco = numero => {
  let parteDecimal = parseFloat((numero / 100).toFixed(2));
  let parteEntera = (numero / 100.0) | 0;
  let resta = parseFloat((parteDecimal - parteEntera).toFixed(2));

  let aComparar = parseFloat((resta * 100).toFixed(2));

  if (aComparar == 50) {
    return 0;
  } else if (aComparar > 50) {
    var diferencia = aComparar - 50;

    return diferencia;
  } else {
    //Redondear a 000
    var diferencia = 50 - (50 - aComparar);

    return diferencia;
  }
};

module.exports = {
  generateDatosTotales
};
