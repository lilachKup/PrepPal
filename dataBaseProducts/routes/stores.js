const express = require('express');
const router = express.Router();
const {checkIfStoreExists, checkDoubleStore, createStore, getAllStores, getStoreById, deleteStoreById, updateStoreById,updateStoreSequence} = require('../utils/dbStoreHelpers');
//const {storeManager} = require('../utils/dbStoreHelpers');
//create new store
router.post('/createStore', async (req, res) => {
    const {name, location} = req.body;

    try {
        const existStore = await checkDoubleStore(name, location);
        /*if (!existStore) {
            const newStore = await createStore(name, location);
            res.status(201).json(newStore);
            )
            res.status(201).json(result.rows[0]);
        } else {
            return res.status(400).json({error: 'Store already exists'});
        }*/
        if (!existStore) {
            const newStore = await createStore(name, location);
            res.status(201).json(newStore);
            //await updateStoreSequence();
        } else {
            return res.status(400).json({ error: 'Store already exists' });
        }
    } catch (err) {
        console.error('Error creating store:', err);
        res.status(500).json({error: 'Database error'});
    }
});

//get all the stores
router.get('/getAllStores', async (req, res) => {
    try {
        const allStores = await getAllStores();
        /*if (allStores.length > 0) {
            res.json(allStores.rows);
        } else {
            return res.status(400).json({error: 'no Stores'});
        }*/
        if (allStores.length > 0) {
            res.json(allStores);
        } else {
            return res.status(400).json({ error: 'No stores found' });
        }

    } catch (err) {
        console.error('Error fetching stores:', err);
        res.status(500).json({error: 'Database error'});
    }
})

//get store by id
router.get('/getStore/:id', async (req, res) => {
    const {id} = req.params;

    try {
        const exists = await checkIfStoreExists(id);
        /*if (!exists) {
            return res.status(404).json({error: 'Store not found'});
        }

        const getStoreById = await db.query(
            'SELECT * FROM stores WHERE id = $1',
            [id]
        );*/
        if (!exists) {
            return res.status(404).json({ error: 'Store not found' });
        }
        const store = await getStoreById(id);

        if (store) {
            res.json(store);
        } else {
            res.status(404).json({ error: 'Store not found' });
        }

    } catch (err) {
        console.error('Error fetching store by ID:', err);
        res.status(500).json({error: 'Database error'});
    }
});

//delete store
router.delete('/deleteStoreById/:id', async (req, res) => {
    const {id} = req.params;

    try {
        // בדיקה אם החנות קיימת לפני מחיקה
        const exists = await checkIfStoreExists(id);
        /*if (!exists) {
            return res.status(404).json({error: 'Store not found'});
        }

        // מחיקה רק אם קיימת
        const result = await db.query(
            'DELETE FROM stores WHERE id = $1 RETURNING *',
            [id]
        );

        res.json({message: 'Store deleted successfully', store: result.rows[0]});*/
        if (!exists) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const deletedStore = await deleteStoreById(id);
        //await updateStoreSequence();
        res.json({
            message: 'Store deleted successfully',
            store: deletedStore
        });

    } catch (err) {
        console.error('Error deleting store:', err);
        res.status(500).json({error: 'Database error'});
    }
});

//update store name
router.put('/updateStoreById/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    try {
        const exists = await checkIfStoreExists(id);
        if (!exists) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const updatedStore = await updateStoreById(id, updates);
        res.json(updatedStore);

    } catch (err) {
        console.error('Error updating store:', err);
        res.status(500).json({ error: 'Database error' });
    }
});
module.exports = router;