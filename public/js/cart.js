async function loadCart() {
    const response = await fetch('/api/cart');

    if (response.status === 401) {
        alert('Please login first!');
        window.location.href = 'login.html';
        return;
    }

    const items = await response.json();

    const container = document.getElementById('cartItems');

    container.innerHTML = '';

    let total = 0;

    items.forEach(item => {
        total += Number(item.subtotal);

        container.innerHTML += `
            <div class="card">
                <h3>${item.product_name}</h3>
                <p>Price: ₹${item.price}</p>

                <p>Quantity:
                    <input type="number" min="1"
                    max="99"
                    value="${item.quantity}"
                    id="qty-${item.cart_id}">
                </p>

                <p>Subtotal: ₹${item.subtotal}</p>

                <button onclick="updateCart(${item.cart_id})">
                    Update
                </button>

                <button onclick="removeCart(${item.cart_id})">
                    Remove
                </button>
            </div>
        `;
    });

    if (items.length === 0) {
        container.innerHTML = '<p>Your cart is empty!</p>';
    }

    document.getElementById('total').textContent =
        'Total: ₹' + total.toFixed(2);
}

async function updateCart(id) {
    const quantity = document.getElementById(`qty-${id}`).value;

    const response = await fetch(`/api/cart/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: Number(quantity) })
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok) loadCart();
}

async function removeCart(id) {
    const response = await fetch(`/api/cart/${id}`, {
        method: 'DELETE'
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok) loadCart();
}

async function checkout() {

    const confirmOrder = confirm(
        'Are you sure you want to place this order?'
    );

    if (!confirmOrder) return;

    const response = await fetch('/api/checkout', {
        method: 'POST'
    });

    const data = await response.json();

    if (response.ok) {

        alert(
            data.message +
            '\nOrder ID: ' + data.order_id +
            '\nTotal Amount: ₹' + data.total
        );

        loadCart();

    } else {
        alert(data.message);
    }
}

loadCart();