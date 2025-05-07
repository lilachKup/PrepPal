const express = require('express');
const router = express.Router();
const db = require('../db');
const {checkIfStoreExists, getStoreById} = require('../utils/dbStoreHelpers');
const {checkIfProductExists, createProduct, checkIfProductExistsInStore, addProductToStore,
    updateProductQuantity, updateProductPrice, getProductInStore, getProductWithoutStore, getProductsByStore} = require('../utils/dbProductsHelper');


//add product to store
router.post('/addProductToStore', async (req, res) => {
    const { store_id, product_name, category, description, tag, price, quantity, image_url } = req.body;

    try {
        const storeExists = await checkIfStoreExists(store_id);
        if (!storeExists) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const productExists = await checkIfProductExists(product_name);
        let product_id;

        if (productExists) {
            product_id = productExists.id;
        }
        else {
            const newProduct = await createProduct(product_name, category, description, tag);
            product_id = newProduct.id;
        }

        const productStoreExists = await checkIfProductExistsInStore(product_id, store_id, price, quantity, image_url);
        if (productStoreExists) {
            await updateProductQuantity(product_id, store_id, quantity);
            res.status(200).json({
                message: 'Product quantity updated',
                product: productStoreExists
            });
        } else {
            const newProductStore = await addProductToStore(product_id, store_id, price, quantity, image_url);
            res.status(200).json({
                message: 'Product added to store',
                product: newProductStore
            });
        }
    } catch (err) {
        console.error('Error adding product to store:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/updateProductPrice', async (req, res) => {
    const { product_id, store_id, newPrice } = req.body;

    try {
        const productInStore = await getProductInStore(product_id, store_id);

        if (!productInStore) {
            return res.status(404).json({ error: 'Product not found in store' });
        }

        const updatedProduct = await updateProductPrice(product_id, store_id, newPrice);
        res.status(200).json({
            message: 'Product price updated successfully',
            product: updatedProduct
        });

    } catch (err) {
        console.error('Error updating product price:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/updateProductQuantity', async (req, res) => {
    const { product_id, store_id, newQuantity } = req.body;

    try {
        // בודקים אם המוצר קיים בחנות
        const productInStore = await getProductInStore(product_id, store_id);

        if (!productInStore) {
            return res.status(404).json({ error: 'Product not found in store' });
        }

        // עדכון הכמות
        const updatedProduct = await updateProductQuantity(product_id, store_id, newQuantity);
        res.status(200).json({
            message: 'Product quantity updated successfully',
            product: updatedProduct
        });

    } catch (err) {
        console.error('Error updating product quantity:', err);
        res.status(500).json({ error: 'Database error' });
    }
});


//we send store_id product id quantity ...
router.post('/buyProducts', async (req, res) => {
    const { store_id, products } = req.body;  // products = [{ product_id, quantity }, ...]

    let totalPrice = 0;
    const errors = [];
    let validProductFlag = false;
    const purchasedProducts = [];

    try {
        const storeName = (await getStoreById(store_id)).name;
        for (let product of products)
        {
            const { product_id, quantity } = product;
            validProductFlag = true;
            const productInStore = await getProductInStore(product_id, store_id);

            //check if product is in the store
            if (!productInStore) {
                errors.push(`Product with id ${product_id} not found in store`);
                validProductFlag = false;
            }

            if (productInStore.quantity < quantity) {
                errors.push(`Not enough stock for product ${product_id}. Available: ${productInStore.quantity}`);
                validProductFlag = false;
            }
            if(validProductFlag)
            {
                const productTotalPrice = productInStore.price * quantity;
                totalPrice += productTotalPrice;
                await updateProductQuantity(product_id, store_id, productInStore.quantity - quantity);
                purchasedProducts.push({
                    product_id,
                    name: product.name,
                    totalPrice: productTotalPrice,
                });
            }
        }
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        res.status(200).json({
            message: 'Products purchased successfully',
            storeName,
            purchasedProducts,
            totalPrice
        });

    } catch (err) {
        console.error('Error processing purchase:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/getProductWithoutStore/:product_id', async (req, res) => {
    const { product_id } = req.params;

    try {
        const product = await getProductWithoutStore(product_id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/getProductInhStore', async (req, res) => {
    const { product_id, store_id } = req.query;

    try {
        const product = await getProductInStore(product_id, store_id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found in store' });
        }
        res.json(product);
    } catch (err) {
        console.error('Error fetching product in store:', err);
        res.status(500).json({ error: 'Database error' });
    }
});


// Get all products for a specific store

router.get('/getProductsByStore/:store_id', async (req, res) => {
    const { store_id } = req.params;
  
    try {
        const result = getProductsByStore(store_id);
        
  
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No products found for this store' });
        }
  
        res.status(200).json(result.rows);
  
    } catch (err) {
        console.error('Error fetching products by store:', err);
        res.status(500).json({ error: 'Database error' });
    }
  });
  
  ///delete product from store
  router.delete('/deleteProductFromStore', async (req, res) => {
    const { store_id, product_id } = req.body;
  
    try {
        const productInStore = await getProductInStore(product_id, store_id);
        
        if (!productInStore) {
            return res.status(404).json({ error: 'Product not found in store' });
        }
  
        const result = deleteProductFromStore(product_id, store_id);
  
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Failed to delete product from store' });
        }
  
        res.status(200).json({
            message: 'Product successfully deleted from store',
            product: result.rows[0]
        });
  
    } catch (err) {
        console.error('Error deleting product from store:', err);
        res.status(500).json({ error: 'Database error' });
    }
  });

module.exports = router;

