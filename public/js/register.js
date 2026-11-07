document.getElementById('registerForm')
.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name, email, password, phone
            })
        });

        const data = await response.json();

        document.getElementById('message').textContent = data.message;

        if (response.ok) {
            alert('Registration successful!');
            window.location.href = 'login.html';
        }

    } catch (error) {
        document.getElementById('message').textContent =
            'Unable to connect to server';
    }
});