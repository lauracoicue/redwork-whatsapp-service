import {sequelize, DataTypes }from "../config/sequelize";

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
});


export default User;
