import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const connection = new Pool({ user: 'bootcamp_role', host: 'localhost', port: 5432, database: 'boardcamp', password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp' });
const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    connection.query('SELECT * FROM categories').then(categories => {res.sendStatus(200)})
});

app.listen(4000, () => {console.log('Server listening on port 4000.')});