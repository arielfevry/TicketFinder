// Skip to movies if already signed in
if (state.user)
{
    window.location.href = 'movies.html';
}

// Confirm login credentials


document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    err.textContent = '';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password)
    {
        err.textContent = 'Enter your email and password.';
        return;
    }

    try {
        const res = await api(LOGIN_PATH, {method: 'POST', body: {email, password}} );
        state.user = {
            id: res.id,
            firstName: res.firstName,
            lastName: res.lastName,
            email: res.email,
            isAdmin: !!(res.isAdmin ?? res.is_admin),
        };
        saveUser(state.user);
        window.location.href = 'tickets.html';
    } catch (ex) {
        err.textContent = ex.status === 401
            ? 'That email and password do not match.'
            : ex.message;
    }
});

// Sign In/Register Toggle

document.getElementById('showRegisterBtn').addEventListener('click', () =>
{
    document.getElementById('loginForm').hidden = true;
    document.getElementById('showRegisterLine').hidden = true;
    document.getElementById('registerForm').hidden = false;
    document.getElementById('showSignInLine').hidden = false;
});

document.getElementById('showSignInBtn').addEventListener('click', () =>
{
    document.getElementById('registerForm').hidden = true;
    document.getElementById('showSignInLine').hidden = true;
    document.getElementById('loginForm').hidden = false;
    document.getElementById('showRegisterLine').hidden = false;
});


// Register new account
document.getElementById('registerForm').addEventListener('submit', async e =>
    {
        e.preventDefault();
        const err = document.getElementById('registerError');
        err.textContent = '';

        const firstName = document.getElementById('regFirstName').value.trim();
        const lastName = document.getElementById('regLastName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;

        if (!firstName || !lastName || !email || !password) {
            err.textContent = 'Fill in every field.'
            return;
        }

        if (password !== confirm)
        {
            err.textContent = 'Passwords do not match.';
            return;
        }

        const btn = e.currentTarget.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            await api(REGISTER_PATH, { method: 'POST', body: { firstName, lastName, email, password } });
        } catch (ex) {
            btn.disabled = false;
            err.textContent = ex.status === 409
                ? 'An account with this email already exists.'
                : ex.message;
            return;
        }
    }
);