import express from 'express';
import router from './routers/router';

const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', router);

const initApi = async () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default initApi;

