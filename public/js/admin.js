const form = document.getElementById('productForm');

// ================= ADD PRODUCT =================

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const product = {
        product_name: document.getElementById('product_name').value,
        category: document.getElementById('category').value,
        price: Number(document.getElementById('price').value),
        stock: Number(document.getElementById('stock').value),
        description: document.getElementById('description').value
    };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(product)
        });

        const data = await response.json();

        document.getElementById('message').textContent = data.message;

        if (response.ok) {
            form.reset();
            loadAdminProducts();
        }

    } catch (error) {
        console.error(error);
        alert('Unable to connect to server!');
    }
});


// ================= VIEW PRODUCTS =================

async function loadAdminProducts() {

    try {
        const response = await fetch('/api/products');

        if (!response.ok) {
            throw new Error('Failed to load products');
        }

        const products = await response.json();

        const container = document.getElementById('adminProducts');
        container.innerHTML = '';

        if (products.length === 0) {
            container.textContent = 'No products available.';
            return;
        }

        products.forEach(product => {

            const card = document.createElement('div');
            card.className = 'card';

            const title = document.createElement('h3');
            title.textContent = product.product_name;

            const category = document.createElement('p');
            category.textContent = 'Category: ' + product.category;

            const price = document.createElement('p');
            price.textContent = 'Price: ₹' + product.price;

            const stock = document.createElement('p');
            stock.textContent = 'Stock: ' + product.stock;

            // EDIT BUTTON
            const editButton = document.createElement('button');
            editButton.textContent = 'Update';
            editButton.onclick = () => editProduct(product);

            // DELETE BUTTON
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteProduct(product.product_id);

            card.append(
                title,
                category,
                price,
                stock,
                editButton,
                deleteButton
            );

            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        alert('Unable to load products!');
    }
}


// ================= UPDATE PRODUCT =================

async function editProduct(product) {

    const newName = prompt('Enter Product Name:', product.product_name);
    if (newName === null) return;

    const newCategory = prompt('Enter Category:', product.category);
    if (newCategory === null) return;

    const newPrice = prompt('Enter Price:', product.price);
    if (newPrice === null) return;

    const newStock = prompt('Enter Stock:', product.stock);
    if (newStock === null) return;

    const newDescription = prompt(
        'Enter Description:',
        product.description || ''
    );
    if (newDescription === null) return;

    if (
        !newName.trim() ||
        !newCategory.trim() ||
        !Number.isFinite(Number(newPrice)) ||
        Number(newPrice) <= 0 ||
        !Number.isInteger(Number(newStock)) ||
        Number(newStock) < 0
    ) {
        alert('Please enter valid product details!');
        return;
    }

    try {
        const response = await fetch(`/api/products/${product.product_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_name: newName,
                category: newCategory,
                price: Number(newPrice),
                stock: Number(newStock),
                description: newDescription
            })
        });

        const data = await response.json();

        alert(data.message);

        if (response.ok) {
            loadAdminProducts();
        }

    } catch (error) {
        console.error(error);
        alert('Unable to update product!');
    }
}


// ================= DELETE PRODUCT =================

async function deleteProduct(id) {

    const confirmDelete = confirm(
        'Are you sure you want to delete this product?'
    );

    if (!confirmDelete) return;

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        alert(data.message);

        if (response.ok) {
            loadAdminProducts();
        }

    } catch (error) {
        console.error(error);
        alert('Unable to delete product!');
    }
}


// ================= LOAD PRODUCTS =================

loadAdminProducts();