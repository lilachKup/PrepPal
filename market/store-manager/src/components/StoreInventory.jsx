import React, { useState } from "react";
import "./StoreInventory.css"; // Importing external CSS file

const StoreInventory = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", quantity: "", image: "" });
  const [error, setError] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  const handleChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
    setError(""); // Clear error message when typing
  };

  const addProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
      setError("⚠️ Error: All fields except image are required!");
      alert("⚠️ Error: All fields except image are required!");
      return;
    }
    const filteredList =products.filter(product => newProduct.name === product.name)
    if(filteredList.length !== 0) {
        setError("⚠️ Error: This product already exist!");
        alert("⚠️ Error: This product already exist!");
        return;
    }
    if (editingProduct !== null) {
      setProducts(products.map((product) => 
        product.id === editingProduct ? { ...newProduct, id: editingProduct } : product
      ));
      setEditingProduct(null);
    } else {
      setProducts([...products, { ...newProduct, id: Date.now() }]);
    }
    setNewProduct({ name: "", price: "", quantity: "", image: "" });
    setError(""); // Clear error after successful addition
  };

  const removeProduct = (id) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  const editProduct = (product) => {
    setNewProduct({ name: product.name, price: product.price, quantity: product.quantity, image: product.image });
    setEditingProduct(product.id);
  };

  const cleanForm = () => {
    setNewProduct({ name: "", price: "", quantity: "", image: "" });
    setEditingProduct(null);
    setError("");
  };

  return (
    <div className="inventory-title">
        <h1 className="inventory-management-title">Inventory Management</h1>
        <div className="inventory-container">
            <h2 className="product-details-title">Enter Product Details</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="inventory-form">
                <input type="text" name="name" placeholder="Product Name" value={newProduct.name} onChange={handleChange} />
                <input type="number" name="price" placeholder="Price" value={newProduct.price} onChange={handleChange} />
                <input type="number" name="quantity" placeholder="Quantity" value={newProduct.quantity} onChange={handleChange} />
                <input type="text" name="image" placeholder="Image URL" value={newProduct.image} onChange={handleChange} />
                <button onClick={addProduct} className="add-product-btn">{editingProduct !== null ? "Update Product" : "Add Product"}</button>
                {(editingProduct !== null || newProduct.name || parseFloat(newProduct.price) > 0 || parseFloat(newProduct.quantity) > 0 || newProduct.image) && (
                <button onClick={cleanForm} className="cancel-btn">Cancel</button>)}
            </div>
        </div>
            <ul className="product-list">
                {products.map((product) => (
                <li key={product.id} className="product-item">
                    <img src={product.image || "https://via.placeholder.com/50"} alt={product.name} className="product-image" />
                    <div className="product-details">
                        <span>{product.name}</span>
                        <span>{product.price}₪ - {product.quantity} pcs</span>
                        <button onClick={() => editProduct(product)} className="edit-btn">Edit</button>
                        <button onClick={() => removeProduct(product.id)} className="remove-btn">Remove</button>
                    </div>
                </li>
                ))}
            </ul>
        </div>
  );
};

export default StoreInventory;
