import { Model } from "sequelize";
import {sequelize, DataTypes }from "../config/sequelize";

interface UserAttributes {
    id?: number;
    name: string;
    phone: string;
    country: string;
    awaitName: boolean;
    idWorker?: string;
    requestConversation?: boolean;
}

interface UserInstance extends Model<UserAttributes>, UserAttributes {}

const User = sequelize.define<UserInstance>('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    awaitName: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    requestConversation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    idWorker: {
        type: DataTypes.STRING,
        allowNull: true,
    }

});


export default User;
