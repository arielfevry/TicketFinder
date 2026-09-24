// Disabled account was signed out, delete cookie and list disabled message
if (isDisabled(state.user) || new URLSearchParams(window.location.search).has('disabled'))
{
    state.user = null;
    deleteCookie(USER_COOKIE);
    document.getElementById('loginError').textContent = DISABLED_MESSAGE;
    history.replaceState(null, '', window.location.pathname); // Drops ?disabled=1 from the URL
}

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

    // Get email and password from input fields
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Email or password is not filled in
    if (!email || !password)
    {
        err.textContent = 'Enter your email and password.';
        return;
    }

    // User is disabled


    // Contact backend to log user in
    try {
        const res = await api(LOGIN_PATH, {method: 'POST', body: {email, password}} );
        const user = userFromLogin(res);

        // Account is disabled
        if (isDisabled(user))
        {
            err.textContent = DISABLED_MESSAGE;
            return;
        }

        // Make cookie
        state.user = user;
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


        // Account Created: Sign in new user and send to home page
        try {
            const res = await api(LOGIN_PATH, { method: 'POST', body: { email, password } });
            const user = userFromLogin(res);
            if (isDisabled(user)) throw new Error(DISABLED_MESSAGE);

            state.user = user;
            saveUser(state.user);
            window.location.href = 'tickets.html';
        } catch (ex) {
            // Automatic sign in failed, send back to sign in
            btn.disabled = false;
            document.getElementById('registerForm').reset();
            document.getElementById('showSignInBtn').click();

            // Pre-input email
            document.getElementById('loginEmail').value = email;

            document.getElementById('loginError').textContent = ex.message === DISABLED_MESSAGE ? DISABLED_MESSAGE : 'Account created! Sign in to continue.';
        }
    }
);