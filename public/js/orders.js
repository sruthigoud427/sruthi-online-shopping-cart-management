async function loadOrders() {

    const response = await fetch('/api/orders');

    if (response.status === 401) {
        alert('Please login first!');
        window.location.href = 'login.html';
        return;
    }

    const orders = await response.json();

    const container = document.getElementById('orderList');

    if (orders.length === 0) {
        container.innerHTML = '<h3>No orders found!</h3>';
        return;
    }

    container.innerHTML = '';

    orders.forEach(order => {

        container.innerHTML += `
            <div class="card">
                <h3>Order ID: ${order.order_id}</h3>

                <p>Total Amount: ₹${order.total_amount}</p>

                <p>Order Date: ${order.order_date}</p>

                <p>Status: ${order.status}</p>
            </div>
        `;

    });
}

loadOrders();