import dbConfig from "./db-config";
import { Sequelize, DataTypes } from "sequelize";

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    dialect: 'sqlite',
    storage: dbConfig.params.storage,
    define: dbConfig.params.define,
});

const syncModels = async () => {
    try {
        await sequelize.sync({ alter: true }); 
    } catch (error) {
        console.error(`Error syncing models: ${error}`);
        process.exit(1);
    }
};

syncModels();

export { sequelize, DataTypes };
