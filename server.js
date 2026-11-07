const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(express.static('public'));

// ADMIN AUTHENTICATION
function adminAuth(req, res, next) {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied! Admin only.'
        });
    }
    next();
}

// USER REGISTRATION
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Please fill all required fields'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null]
        );

        res.json({ message: 'Registration successful!' });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: error.code === 'ER_DUP_ENTRY'
                ? 'Email already registered'
                : 'Registration failed'
        });
    }
});

// USER LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        req.session.userId = user.user_id;
        req.session.role = user.role;

        res.json({
            message: 'Login successful!',
            name: user.name
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Login failed'
        });
    }
});

// LOGOUT
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out successfully' });
    });
});

// GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await db.query(
            'SELECT * FROM products'
        );

        res.json(products);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to fetch products'
        });
    }
});

// ADMIN ADD PRODUCT
app.post('/api/products', adminAuth, async (req, res) => {
    try {
        const {
            product_name,
            category,
            price,
            stock,
            description
        } = req.body;

        if (!product_name || !category ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0 ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0) {

            return res.status(400).json({
                message: 'Please enter valid product details'
            });
        }

        await db.query(
            `INSERT INTO products
            (product_name, category, price, stock, description)
            VALUES (?, ?, ?, ?, ?)`,
            [product_name, category, price, stock, description]
        );

        res.json({
            message: 'Product added successfully!'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to add product'
        });
    }
});

// ADMIN UPDATE PRODUCT
app.put('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const {
            product_name,
            category,
            price,
            stock,
            description
        } = req.body;

        const [result] = await db.query(
            `UPDATE products
            SET product_name = ?,
                category = ?,
                price = ?,
                stock = ?,
                description = ?
            WHERE product_id = ?`,
            [
                product_name,
                category,
                price,
                stock,
                description,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        res.json({
            message: 'Product updated successfully!'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Update failed'
        });
    }
});

// ADMIN DELETE PRODUCT
app.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM products WHERE product_id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        res.json({
            message: 'Product deleted successfully!'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Cannot delete product. It may be referenced by a cart or order.'
        });
    }
});

// ADD PRODUCT TO CART
app.post('/api/cart', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: 'Please login first!'
            });
        }

        const productId = Number(req.body.product_id);
        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(productId) ||
            !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: 'Invalid product or quantity'
            });
        }

        const [products] = await db.query(
            'SELECT * FROM products WHERE product_id = ?',
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        if (products[0].stock < quantity) {
            return res.status(400).json({
                message: 'Insufficient stock'
            });
        }

        const [existing] = await db.query(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            [req.session.userId, productId]
        );

        if (existing.length > 0) {
            const newQuantity =
                Number(existing[0].quantity) + quantity;

            if (newQuantity > products[0].stock) {
                return res.status(400).json({
                    message: 'Insufficient stock'
                });
            }

            await db.query(
                'UPDATE cart SET quantity = ? WHERE cart_id = ?',
                [newQuantity, existing[0].cart_id]
            );

        } else {
            await db.query(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [req.session.userId, productId, quantity]
            );
        }

        res.json({
            message: 'Product added to cart successfully!'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to add product'
        });
    }
});

// VIEW CART
app.get('/api/cart', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: 'Please login first!'
            });
        }

        const [items] = await db.query(`
            SELECT cart.cart_id,
                   products.product_name,
                   products.price,
                   cart.quantity,
                   (products.price * cart.quantity) AS subtotal
            FROM cart
            JOIN products ON cart.product_id = products.product_id
            WHERE cart.user_id = ?
        `, [req.session.userId]);

        res.json(items);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to load cart'
        });
    }
});

// REMOVE PRODUCT FROM CART
app.delete('/api/cart/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: 'Please login first!'
            });
        }

        await db.query(
            'DELETE FROM cart WHERE cart_id = ? AND user_id = ?',
            [req.params.id, req.session.userId]
        );

        res.json({
            message: 'Product removed from cart!'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to remove product'
        });
    }
});

// UPDATE CART QUANTITY
app.put('/api/cart/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: 'Please login first!'
            });
        }

        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: 'Enter a valid quantity'
            });
        }

        const [items] = await db.query(`
            SELECT cart.cart_id, products.stock
            FROM cart
            JOIN products ON cart.product_id = products.product_id
            WHERE cart.cart_id = ? AND cart.user_id = ?
        `, [req.params.id, req.session.userId]);

        if (items.length === 0) {
            return res.status(404).json({
                message: 'Cart item not found'
            });
        }

        if (quantity > items[0].stock) {
            return res.status(400).json({
                message: 'Insufficient stock'
            });
        }

        await db.query(
            'UPDATE cart SET quantity = ? WHERE cart_id = ? AND user_id = ?',
            [quantity, req.params.id, req.session.userId]
        );

        res.json({
            message: 'Quantity updated successfully!'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to update quantity'
        });
    }
});

// PLACE ORDER
app.post('/api/checkout', async (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({
            message: 'Please login first!'
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;

        const [items] = await connection.query(`
            SELECT cart.product_id,
                   cart.quantity,
                   products.price,
                   products.stock,
                   products.product_name
            FROM cart
            JOIN products ON cart.product_id = products.product_id
            WHERE cart.user_id = ?
            FOR UPDATE
        `, [userId]);

        if (items.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: 'Your cart is empty!'
            });
        }

        let total = 0;

        for (const item of items) {
            if (item.quantity > item.stock) {
                throw new Error(
                    'Insufficient stock for ' + item.product_name
                );
            }

            total += Number(item.price) * item.quantity;
        }

        const [order] = await connection.query(`
            INSERT INTO orders
            (user_id, total_amount, order_date, status)
            VALUES (?, ?, CURDATE(), 'Placed')
        `, [userId, total]);

        for (const item of items) {
            await connection.query(`
                UPDATE products
                SET stock = stock - ?
                WHERE product_id = ?
            `, [item.quantity, item.product_id]);
        }

        await connection.query(
            'DELETE FROM cart WHERE user_id = ?',
            [userId]
        );

        await connection.commit();

        res.json({
            message: 'Order placed successfully!',
            order_id: order.insertId,
            total: total
        });

    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(400).json({
            message: error.message || 'Order failed'
        });

    } finally {
        connection.release();
    }
});

// VIEW ORDER HISTORY
app.get('/api/orders', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: 'Please login first!'
        });
    }

    try {
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY order_id DESC',
            [req.session.userId]
        );

        res.json(orders);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Unable to fetch orders'
        });
    }
});

// START SERVER
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});