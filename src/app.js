import express from 'express';
import cors from 'cors';
import joi from 'joi';
import pg from 'pg';

const { Pool } = pg;
const connection = new Pool({ user: 'bootcamp_role', host: 'localhost', port: 5432, database: 'boardcamp', password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp' });
const app = express();
app.use(express.json());
app.use(cors());

const newCategorySchema = joi.object({
    name: joi.string().min(1).required()
});

const newGameSchema = joi.object({
    name: joi.string().min(1).required(),
    image: joi.string().required(),
    stockTotal: joi.number().integer().min(1).required(),
    categoryId: joi.number().integer().min(1).required(),
    pricePerDay: joi.number().integer().min(1).required()
});

//const newCustomerSchema = joi.object({});

app.get('/categories', (req, res) => {
    connection.query('SELECT * FROM categories').then(categories => {res.send(categories.rows)})
});

app.post('/categories', (req, res) => {
    newCategorySchema.validate(req.body).error ? res.sendStatus(400)
    : connection.query('SELECT * FROM categories WHERE name = $1', [req.body.name]).then(produto => {
        produto.rows[0] ? res.sendStatus(409)
        : connection.query('INSERT INTO categories (name) VALUES ($1)', [req.body.name]).then(res.sendStatus(201))
    });
});

app.get('/games', (req, res) => {
    let gamesList = [];
    let categoriesList = [];
    connection.query('SELECT * FROM categories').then(categories => {
        categoriesList = categories.rows;
    });
    connection.query('SELECT * FROM games').then(games => {
        if(games.rows[0]) {
            games.rows.forEach(g => {
                let gameCategory = categoriesList.find(category => category.id === g.categoryId);
                gamesList.push({...g, categoryName: gameCategory.name});
            })
            if(req.query.name) {gamesList = gamesList.filter(game => String(game.name.toLowerCase()).startsWith(req.query.name.toLowerCase()))}
            res.send(gamesList);
        }
    });
});

app.post('/games', (req, res) => {
    newGameSchema.validate(req.body).error ? res.sendStatus(400)
    : connection.query('SELECT * FROM games WHERE name = $1', [req.body.name]).then(game => {
        game.rows[0] ? res.sendStatus(409)
        : connection.query('SELECT * FROM categories WHERE id = $1', [req.body.categoryId]).then(category => {
            if(category.rows[0]) {
                req.body.image.match(/\.(jpeg|jpg|gif|png|svg)$/) != null ? connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)', [req.body.name, req.body.image, req.body.stockTotal, req.body.categoryId, req.body.pricePerDay]).then(res.sendStatus(201))
                : res.sendStatus(400);
            } else {res.sendStatus(400)}
        })
    })
});

app.listen(4000, () => {console.log('Server listening on port 4000.')});