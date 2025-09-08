import React, { useState, useEffect } from "react";
import "./StoreInventory.css";
import categories from "./Categories";
import axios from "axios";
import TopBar from "../Bar/TopBar";
import { requireStoreSessionOrRedirect } from "../utils/storeSession";

const StoreInventory = () => {
    const session = requireStoreSessionOrRedirect();
    const storeId = session?.storeId;
    const storeName = session?.storeName;

    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({
        id: "", name: "", category: "", price: "", quantity: "", description: "", brand: "", image: ""
    });
    const [error, setError] = useState("");
    const [editingProduct, setEditingProduct] = useState(null);
    const [categoryChoice, setCategoryChoice] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredProductsBySearch, setFilteredProductsBySearch] = useState([]);
    const [isSearchOn, setIsSearchOn] = useState(false);

    useEffect(() => {
        if (!storeId) return;
        fetchProducts(storeId);
    }, [storeId]);

    const addProducts = async (productToAdd) => {
        const response = await axios.post(
            "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/store/product",
            productToAdd
        );
        return response.data;
    };

    const fetchProducts = async (sid) => {
        if (!sid) return;
        try {
            const response = await fetch(
                `https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/products/getAllPProducts/${sid}`
            );
            const data = await response.json();
            const productsArray = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
            setProducts(productsArray);
        } catch (e) {
            console.error("Error fetching products:", e);
            setError("no products found for this store");
            setProducts([]);
        }
    };

    const editProductFromStore = async (sid, product_id, description, price, quantity, image_url) => {
        const response = await fetch(
            "https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/products/edit",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ store_id: sid, product_id, description, price, quantity, image_url })
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Update failed");
    };

    const deleteProductFromStore = async (sid, product_id) => {
        const response = await fetch(
            "https://xgpbt0u4ql.execute-api.us-east-1.amazonaws.com/prod/products/deleteFromStore",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ store_id: sid, product_id })
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Delete failed");
    };

    const handleChange = (e) => {
        setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
        setError("");
    };

    const addProduct = async () => {
        const missingFields = [];
        if (!newProduct.name) missingFields.push("Name");
        if (!newProduct.brand) missingFields.push("Brand");
        if (!newProduct.category) missingFields.push("Category");
        if (!newProduct.description) missingFields.push("Description");
        if (!newProduct.price || newProduct.price < 0) missingFields.push("Price");
        if (!newProduct.quantity || newProduct.quantity < 0) missingFields.push("Quantity");

        if (missingFields.length > 0) {
            setError(`⚠️ Error: Missing or invalid fields: ${missingFields.join(", ")}`);
            return;
        }

        if (editingProduct !== null) {
            await editProductFromStore(
                storeId,
                editingProduct,
                newProduct.description,
                Number(newProduct.price),
                Number(newProduct.quantity),
                newProduct.image
            );
            setEditingProduct(null);
            await fetchProducts(storeId);
        } else {
            const exists = products.some(p => p.name === newProduct.name);
            if (exists) {
                setError("⚠️ Error: This product already exist!");
                alert("⚠️ Error: This product already exist!");
                return;
            }
            setProducts(prev => [...prev, { ...newProduct, id: Date.now() }]);

            const productToAdd = {
                store_id: storeId,
                product_name: newProduct.name,
                category: newProduct.category,
                description: newProduct.description,
                price: Number(newProduct.price),
                quantity: Number(newProduct.quantity),
                image_url: newProduct.image || "https://img.icons8.com/ios-filled/50/ffffff/shopping-cart.png",
                brand: newProduct.brand
            };
            await addProducts(productToAdd);
            await fetchProducts(storeId);
        }

        setNewProduct({ name: "", price: "", quantity: "", brand: "", description: "", image: "", category: categoryChoice });
        setError("");
        await fetchProducts(storeId);
        handleSearch();
    };

    const removeProduct = async (id) => {
        setProducts(products.filter(p => p.id !== id));
        setEditingProduct(null);
        await deleteProductFromStore(storeId, id);
        await fetchProducts(storeId);
        if (isSearchOn) handleSearch();
    };

    const editProduct = (product) => {
        setNewProduct({
            name: product.name,
            price: product.price,
            quantity: product.quantity,
            brand: product.brand,
            description: product.description,
            category: product.category,
            image: product.image_url || ""
        });
        setEditingProduct(product.id);
    };

    const cleanForm = () => {
        setNewProduct({ name: "", price: "", quantity: "", image: "", brand: "", description: "", category: "" });
        setEditingProduct(null);
        setError("");
    };

    const HandleCategoryClick = (e) => {
        setCategoryChoice(e);
        setNewProduct(prev => ({ ...prev, category: e }));
    };

    const handleNoneCategoryClick = () => {
        setCategoryChoice("");
        setNewProduct(prev => ({ ...prev, category: "" }));
    };

    const handleSearch = () => {
        setIsSearchOn(true);
        if (!searchTerm.trim()) return;
        const filtered = products.filter(
            (p) =>
                p.name.toLowerCase().startsWith(searchTerm.toLowerCase()) &&
                (!categoryChoice || p.category === categoryChoice)
        );
        setFilteredProductsBySearch(filtered);
    };

    const handleClearSearch = () => {
        setIsSearchOn(false);
        setSearchTerm("");
        setFilteredProductsBySearch([]);
    };

    if (!session) return null; 

    return (
        <>
            <TopBar />
            <div className="inventory-title">
                <h1 className="inventory-management-title">{storeName} Inventory Management</h1>
                <div className="row-container">
                    <div className="inventory-container">
                        <h2 className="product-details-title">Enter Product Details</h2>
                        {error && <p className="error-message">{error}</p>}
                        <div className="inventory-form">
                            <input
                                type="text"
                                name="name"
                                placeholder="Product Name"
                                value={newProduct.name}
                                onChange={handleChange}
                                disabled={editingProduct !== null}
                            />
                            <input
                                type="text"
                                name="brand"
                                placeholder="Product Brand"
                                value={newProduct.brand}
                                onChange={handleChange}
                            />
                            <select name="category" value={newProduct.category} onChange={handleChange}>
                                <option value="">select category</option>
                                {categories.map((category, index) => (
                                    <option key={index} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                name="description"
                                placeholder="Product Description"
                                value={newProduct.description}
                                onChange={handleChange}
                            />
                            <input
                                type="number"
                                name="price"
                                placeholder="Price"
                                value={newProduct.price}
                                onChange={handleChange}
                            />
                            <input
                                type="number"
                                name="quantity"
                                placeholder="Quantity"
                                value={newProduct.quantity}
                                onChange={handleChange}
                            />
                            <input
                                type="text"
                                name="image"
                                placeholder="Image URL"
                                value={newProduct.image || ""}
                                onChange={handleChange}
                            />
                            <button onClick={addProduct} className="add-product-btn">
                                {editingProduct !== null ? "Update Product" : "Add Product"}
                            </button>
                            {(editingProduct !== null ||
                                newProduct.name ||
                                parseFloat(newProduct.price) > 0 ||
                                parseFloat(newProduct.quantity) > 0 ||
                                newProduct.image) && (
                                <button onClick={cleanForm} className="cancel-btn">
                                    Clean Fields
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="catogory-search-panel">
                        <div className="category-container">
                            <h2 className="category-title">Categories</h2>
                            <ul className="category-list">
                                {categories.map((category, index) => (
                                    <li key={index}>
                                        <button
                                            className={`category-item ${
                                                categoryChoice === category ? "active" : ""
                                            }`}
                                            onClick={() => {
                                                HandleCategoryClick(category);
                                            }}
                                        >
                                            {category}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {categoryChoice && (
                                <button className="cancel-choice" onClick={handleNoneCategoryClick}>
                                    None
                                </button>
                            )}
                        </div>

                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search product name"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <div className="search-buttons">
                                <button onClick={handleSearch} className="search-btn">
                                    Search
                                </button>
                                <button onClick={handleClearSearch} className="clear-btn">
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <ul className="product-list">
                    {(
                        (filteredProductsBySearch && filteredProductsBySearch.length > 0
                            ? filteredProductsBySearch
                            : products) || []
                    )
                        .filter((product) => !categoryChoice || product.category === categoryChoice)
                        .map((product) => (
                            <li key={product.id} className="product-card">
                                <div className="product-image">
                                    <img
                                        src={
                                            product.image_url ||
                                            "https://img.icons8.com/ios-filled/50/ffffff/shopping-cart.png"
                                        }
                                        alt={product.name}
                                    />
                                </div>
                                <div className="product-content">
                                    <h3 className="product-name">{product.name}</h3>
                                    <p className="product-brand">{product.brand}</p>
                                    <p className="product-meta">
                                        {product.price}₪ | {product.quantity} pcs
                                    </p>
                                    <div className="product-actions">
                                        <button onClick={() => editProduct(product)} className="edit-btn">
                                            Edit
                                        </button>
                                        <button onClick={() => removeProduct(product.id)} className="remove-btn">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                </ul>
            </div>
        </>
    );

};

export default StoreInventory;
