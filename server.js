const http = require('http');
const { MongoClient, ObjectId } = require('mongodb');
const { URL } = require('url');

// MongoDB connection
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

async function connectToDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db('chocolateshop').collection('inventory');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

connectToDB();

const requestHandler = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE', 'Access-Control-Allow-Headers': 'Content-Type' });
        res.end();
        return;
    }

    if (req.method === 'POST' && url.pathname === '/add-product') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const product = JSON.parse(body);
                const result = await db.insertOne(product);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Product added successfully', id: result.insertedId }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Error adding product', error: error.message }));
            }
        });
    } else if (req.method === 'GET' && url.pathname === '/products') {
        try {
            const products = await db.find().toArray();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(products));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ message: 'Error fetching products', error: error.message }));
        }
    } else if (req.method === 'PUT' && url.pathname.startsWith('/update-product/')) {
        const id = url.pathname.split('/')[2];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const updatedProduct = JSON.parse(body);
                const result = await db.updateOne({ _id: new ObjectId(id) }, { $set: updatedProduct });
                if (result.matchedCount === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Product not found' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Product updated successfully' }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Error updating product', error: error.message }));
            }
        });
    } else if (req.method === 'DELETE' && url.pathname.startsWith('/delete-product/')) {
        const id = url.pathname.split('/')[2];
        try {
            const result = await db.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Product not found' }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Product deleted successfully' }));
            }
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ message: 'Error deleting product', error: error.message }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }
};

const server = http.createServer(requestHandler);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
