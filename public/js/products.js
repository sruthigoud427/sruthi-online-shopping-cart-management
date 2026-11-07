async function loadProducts() {

    const response = await fetch('/api/products');
    const products = await response.json();

    const productList = document.getElementById('productList');

    productList.innerHTML = '';

    products.forEach(product => {

        productList.innerHTML += `
            <div class="card">
                <h3>${product.product_name}</h3>

                <p>Category: ${product.category}</p>

                <h3>₹${product.price}</h3>

                <p>${product.description || ''}</p>

                <p>Available Stock: ${product.stock}</p>

                <button onclick="addToCart(${product.product_id})">
                    Add to Cart
                </button>
            </div>
        `;

    });
}

async function addToCart(productId) {

    const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: 1
        })
    });

    const data = await response.json();

    alert(data.message);
}

loadProducts();