const { DataTypes } = require('sequelize');
const { sequelize } = require('../../dbconfig');
const Empresa = require('./empresa.model'); 

const ListaPrecio = sequelize.define('ListaPrecio', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }, 
  descripcion: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(12),
    allowNull: false
  }, 
  predeterminado: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }, 
}, {
  tableName: 'lista_precio',
  timestamps: false,
  underscored: true, // Convierte automáticamente a snake_case
});
ListaPrecio.belongsTo(Empresa, {
  foreignKey: 'empresaId',
  targetKey: 'id',
});
 
module.exports = ListaPrecio;
