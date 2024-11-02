import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

interface WorkerAttributes {
    id?: number;
    name?: string;
    country: string;
    phone: string;
    lastMessage: Date,
    modeEdit: boolean;
}

interface WorkerInstance extends Model<WorkerAttributes>, WorkerAttributes {}

const Worker = sequelize.define<WorkerInstance>('Worker', {
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    lastMessage: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    modeEdit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
});

export default Worker;