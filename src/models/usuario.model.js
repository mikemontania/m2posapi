const { DataTypes } = require("sequelize");
const { sequelize } = require("../../dbconfig");
const Empresa = require("./empresa.model");
const Sucursal = require("./sucursal.model"); 
const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    empresaId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    sucursalesId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },

    password: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    usuario: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    img: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    rol: {
      type: DataTypes.STRING,
      allowNull: true
    },

    intentos: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    bloqueado: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    }
  },
  {
    tableName: "usuarios",
    timestamps: false,
    underscored: true
    // Esto convierte los nombres de modelos de pascalCase a snake_case
  }
);

Usuario.belongsTo(Sucursal, {
  foreignKey: "sucursalesId",
  targetKey: "id"
});

Usuario.belongsTo(Empresa, {
  foreignKey: "empresaId",
  targetKey: "id"
});

module.exports = Usuario;
