import express from 'express';
import dayjs from 'dayjs';
import cors from 'cors';
import joi from 'joi';
import pg from 'pg';

const { Pool } = pg;
const connection = new Pool({ user: 'bootcamp_role', host: 'localhost', port: 5432, database: 'boardcamp', password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp' });
const app = express();
app.use(express.json());
app.use(cors());

const categorySchema = joi.object({
    name: joi.string().min(1).required()
});

const gameSchema = joi.object({
    name: joi.string().min(1).required(),
    image: joi.string().required(),
    stockTotal: joi.number().integer().min(1).required(),
    categoryId: joi.number().integer().min(1).required(),
    pricePerDay: joi.number().integer().min(1).required()
});

const customerSchema = joi.object({
    name: joi.string().min(1).required(),
    phone: joi.string().pattern(/[0-9]{10,11}/),
    cpf:joi.string().pattern(/[0-9]{11}/),
    birthday: joi.date().required()
});

const rentalSchema = joi.object({
    customerId: joi.number().min(1).required(),
    gameId: joi.number().min(1).required(),
    daysRented: joi.number().min(1).required()
})

const dates = {
    convert:function(d) {
        return (
            d.constructor === Date ? d :
            d.constructor === Array ? new Date(d[0],d[1],d[2]) :
            d.constructor === Number ? new Date(d) :
            d.constructor === String ? new Date(d) :
            typeof d === "object" ? new Date(d.year,d.month,d.date) :
            NaN
        );
    },
    compare:function(a,b) {
        return (
            isFinite(a=this.convert(a).valueOf()) &&
            isFinite(b=this.convert(b).valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
    },
    inRange:function(d,start,end) {
       return (
            isFinite(d=this.convert(d).valueOf()) &&
            isFinite(start=this.convert(start).valueOf()) &&
            isFinite(end=this.convert(end).valueOf()) ?
            start <= d && d <= end :
            NaN
        );
    }
}


app.get('/categories', (req, res) => {
    connection.query('SELECT * FROM categories').then(categories => {res.send(categories.rows)})
});

app.post('/categories', (req, res) => {
    categorySchema.validate(req.body).error ? res.sendStatus(400)
    : connection.query('SELECT * FROM categories WHERE name = $1', [req.body.name]).then(produto => {
        produto.rows[0] ? res.sendStatus(409)
        : connection.query('INSERT INTO categories (name) VALUES ($1)', [req.body.name]).then(res.sendStatus(201))
    });
});

app.get('/games', async (req, res) => {
    let gamesList = [];
    let categoriesList = [];
    await connection.query('SELECT * FROM categories').then(categories => {
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
    gameSchema.validate(req.body).error ? res.sendStatus(400)
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

app.get('/customers', (req, res) => {
    connection.query('SELECT * FROM customers').then(customers => {
        let customersList = customers.rows;
        if(req.query.cpf) {customersList = customersList.filter(customer => String(customer.cpf).startsWith(req.query.cpf))}
        res.send(customersList);
    })
});

app.get('/customers/:id', (req, res) => {
    const id = parseInt(req.params.id);
    connection.query('SELECT * FROM customers WHERE id = $1', [id]).then(customer => {
        customer.rows[0] ? res.send(customer.rows[0]) : res.sendStatus(404);
    })
});

app.post('/customers', (req, res) => {
    customerSchema.validate(req.body).error ? res.sendStatus(400)
    : connection.query('SELECT * FROM customers WHERE cpf = $1', [req.body.cpf]).then(customer => {
        customer.rows[0] ? res.sendStatus(409)
        : connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)', [req.body.name, req.body.phone, req.body.cpf, req.body.birthday]).then(res.sendStatus(201))
    })
});

app.put('/customers/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let cpfCheck = true;
    customerSchema.validate(req.body).error ? res.sendStatus(400)
    : connection.query('SELECT * FROM customers WHERE cpf = $1', [req.body.cpf]).then(customer => {
        if(customer.rows[0]) {customer.rows.forEach(c => {if(c.id !== id) {cpfCheck = false}})}
        if(cpfCheck === true) {
            connection.query('SELECT * FROM customers WHERE id = $1', [id]).then(customer => {
                if(customer.rows[0]) {
                    connection.query('UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5', [req.body.name, req.body.phone, req.body.cpf, req.body.birthday, id]).then(res.sendStatus(200))
                } else {res.sendStatus(404)}
            })
        } else {res.sendStatus(409)}
    })
});

app.get('/rentals', async (req, res) => {
    let rentalsList = [];
    const rentalsInfo = await connection.query('SELECT * FROM rentals');
    if(rentalsInfo.rows[0]) {
        rentalsInfo.rows.forEach(async (rental, i) => {
            const customerInfo = await connection.query('SELECT * FROM customers WHERE id = $1', [rental.customerId]);
            const gameInfo = await connection.query('SELECT * FROM games WHERE id = $1', [rental.gameId]);
            const categoryInfo = await connection.query('SELECT * FROM categories WHERE id = $1', [gameInfo.rows[0].categoryId]);
            rental = {
                ...rental, 
                customer: {id: customerInfo.rows[0].id, name: customerInfo.rows[0].name},
                game: {id: gameInfo.rows[0].id, name: gameInfo.rows[0].name, categoryId: gameInfo.rows[0].categoryId, categoryName: categoryInfo.rows[0].name}
            };
            rentalsList.push(rental);
            if(i === rentalsInfo.rows.length - 1) {
                if(req.query.customerId) {rentalsList = rentalsList.filter(rental => rental.customerId === parseInt(req.query.customerId))}
                if(req.query.gameId) {rentalsList = rentalsList.filter(rental => rental.gameId === parseInt(req.query.gameId))}
                res.send(rentalsList);
            }
        });
    } else {res.send(rentalsList)}
});

app.post('/rentals', async (req, res) => {
    const { gameId, customerId, daysRented } = req.body;
    let originalPrice = 0;
    const rentDate = dayjs().format('YYYY-MM-DD');
    if(rentalSchema.validate(req.body).error) {console.log('schema');res.sendStatus(400)} 
    else {
        const gameInfo = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
        const gameRentals = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1', [gameId]);
        const customerInfo = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if(gameInfo.rows[0] && gameRentals.rows.length < gameInfo.rows[0].stockTotal && customerInfo.rows[0]) {
            originalPrice = daysRented * gameInfo.rows[0].pricePerDay;
            connection.query('INSERT INTO rentals ("customerId", "gameId", "daysRented", "rentDate", "originalPrice", "returnDate", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7)', [customerId, gameId, daysRented, rentDate, originalPrice, null, null]).then(res.sendStatus(201));
        } else {res.sendStatus(400)}
    }
});

app.post('/rentals/:id/return', async (req, res) => {
    const id = parseInt(req.params.id);
    const returnDate = new Date(dayjs().format('YYYY-MM-DD'));
    const rentalInfo = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
    if(rentalInfo.rows[0]) {
        console.log(new Date(rentalInfo.rows[0].rentDate));
        console.log(returnDate);
        console.log(dates.compare(new Date(rentalInfo.rows[0].rentDate), new Date('2021-10-19')));
        console.log(rentalInfo.rows[0].daysRented);
        console.log(returnDate);
    } else {res.sendStatus(404)}
});

app.delete('/rentals/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const rentalInfo = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
    if(rentalInfo.rows[0]) {
        if(rentalInfo.rows[0].returnDate === null) {
            connection.query('DELETE FROM rentals WHERE id = $1', [id]).then(res.sendStatus(200))
        } else {res.sendStatus(400)}
    } else {res.sendStatus(404)}
});

app.listen(4000, () => {console.log('Server listening on port 4000.')});