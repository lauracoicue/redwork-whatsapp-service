import express from 'express';
import router from './routers/router';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.use('/api', router)
app.get('*', (_, res) => {
    res.redirect(process.env.FRONTEND!);
});

const initApi = async () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default initApi;

