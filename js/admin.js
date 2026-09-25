const ADMIN_PATH = '/TicketFinder/admins';
let adminUsers = [];

async function adminRequest(path, { method = 'GET', body } = {}) {
    const response = await fetch(path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + state.user.id,
            'X-User-Id': state.user.id,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401) {
        signOut();
        throw new Error('Your session expired. Sign in again.');
    }
    if (response.status === 403) {
        document.getElementById('admin-content').hidden = true;
        throw new Error('Administrator access is required.');
    }
    // Some endpoints emit a route comment before their JSON response.
    const text = (await response.text()).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('The server returned an invalid response.');
    }
    if (!response.ok) throw new Error(data.error || data.message || 'The request failed.');
    return data;
}

function bindAdminForm(id, action) {
    const form = document.getElementById(id);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const status = form.querySelector('.form-status');
        button.disabled = true;
        status.textContent = 'Working...';
        try {
            status.textContent = await action(new FormData(form), form);
        } catch (error) {
            status.textContent = error.message;
            document.getElementById('admin-status').textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });
}

async function loadAdminMovies() {
    const data = await adminRequest(MOVIES_PATH);
    const movies = Array.isArray(data) ? data : data.movies;
    if (!Array.isArray(movies)) throw new Error('The server did not return a movie list.');
    const select = document.getElementById('showtime-movie');
    select.replaceChildren(el('option', { value: '' }, 'Select a movie'));
    for (const movie of movies) select.append(el('option', { value: String(movie.ID) }, movie.Title));
}

function renderAdminUsers() {
    const search = document.getElementById('user-search').value.trim().toLowerCase();
    const list = document.getElementById('user-list');
    list.replaceChildren();
    const users = adminUsers.filter(user => `${user.FirstName} ${user.LastName} ${user.Email}`.toLowerCase().includes(search));
    for (const user of users) {
        const active = Number(user.Active) === 1;
        const button = el('button', { type: 'button' }, active ? 'Disable' : 'Enable');
        button.disabled = Number(user.ID) === Number(state.user.id);
        if (button.disabled) button.title = 'You cannot disable your own account here.';
        button.addEventListener('click', async () => {
            if (!window.confirm(`${active ? 'Disable' : 'Enable'} the account for ${user.FirstName} ${user.LastName}?`)) return;
            button.disabled = true;
            const status = document.getElementById('user-status');
            try {
                await adminRequest(`${ADMIN_PATH}/users/${user.ID}`, { method: 'PUT', body: { active: !active } });
                user.Active = active ? 0 : 1;
                renderAdminUsers();
                status.textContent = 'Account status updated.';
            } catch (error) {
                status.textContent = error.message;
                button.disabled = false;
            }
        });
        list.append(el('tr', {},
            el('td', {}, String(user.ID)),
            el('td', {}, `${user.FirstName} ${user.LastName}`),
            el('td', {}, user.Email),
            el('td', {}, Number(user.IsAdmin) === 1 ? 'Admin' : 'Customer'),
            el('td', {}, active ? 'Active' : 'Disabled'),
            el('td', {}, button)
        ));
    }
    if (!users.length) list.append(el('tr', {}, el('td', { colspan: '6' }, 'No matching users.')));
}

async function findAdminTickets(formData) {
    const list = document.getElementById('admin-tickets');
    list.replaceChildren();
    const filter = formData.get('filter');
    const id = Number(formData.get('id'));
    if (!Number.isInteger(id) || id < 1) throw new Error('Enter a valid ID.');
    const data = await adminRequest(`${ADMIN_PATH}/tickets?${filter}=${id}`);
    if (!Array.isArray(data.tickets)) throw new Error('The server did not return a ticket list.');
    for (const ticket of data.tickets) {
        const button = el('button', { type: 'button' }, 'Cancel Ticket');
        const card = el('article', { class: 'admin-ticket' },
            el('h3', {}, ticket.MovieName),
            el('p', {}, `${ticket.ShowTime} — ${ticket.LocationAddress}`),
            el('p', {}, `Ticket ${ticket.ID} · User ${ticket.CustomerID} · Seat ${ticket.SeatNumber}`), button
        );
        button.addEventListener('click', async () => {
            if (!window.confirm(`Cancel ticket ${ticket.ID} for ${ticket.MovieName}, seat ${ticket.SeatNumber}? This cannot be undone.`)) return;
            button.disabled = true;
            const status = document.querySelector('#ticket-form .form-status');
            try {
                await adminRequest(`${ADMIN_PATH}/tickets/${ticket.ID}`, { method: 'DELETE' });
                card.remove();
                status.textContent = 'Ticket canceled.';
            } catch (error) {
                status.textContent = error.message;
                button.disabled = false;
            }
        });
        list.append(card);
    }
    return data.tickets.length ? `${data.tickets.length} ticket(s) found.` : 'No tickets found.';
}

async function initializeAdmin() {
    if (!requireAuth()) return;
    const status = document.getElementById('admin-status');
    try {
        // Verify permission with the server before displaying administrator controls.
        const data = await adminRequest(`${ADMIN_PATH}/users`);
        if (!Array.isArray(data.users)) throw new Error('The server did not return a user list.');
        adminUsers = data.users;
        renderAdminUsers();
        await loadAdminMovies();
        document.getElementById('admin-content').hidden = false;
        document.getElementById('adminLink').hidden = false;
        status.textContent = 'Manage movies, showtimes, users, and tickets.';
    } catch (error) {
        status.textContent = error.message;
    }
}

document.getElementById('user-search').addEventListener('input', renderAdminUsers);

bindAdminForm('movie-form', async (data, form) => {
    await adminRequest(MOVIES_PATH, { method: 'POST', body: Object.fromEntries(data) });
    form.reset();
    try {
        await loadAdminMovies();
    } catch {
        return 'Movie added. Reload this page to refresh the movie selector.';
    }
    return 'Movie added.';
});

bindAdminForm('showtime-form', async (data, form) => {
    const seats = Number(data.get('seats'));
    const movieId = Number(data.get('movieId'));
    if (!Number.isInteger(seats) || seats < 1) throw new Error('Enter a positive whole number of seats.');
    if (!Number.isInteger(movieId) || movieId < 1) throw new Error('Select a movie.');
    const value = data.get('datetime');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid date and time.');
    await adminRequest(`${ADMIN_PATH}/showtimes`, {
        method: 'POST',
        body: { movieId, seats, datetime: value.replace('T', ' ') + ':00', location: data.get('location').trim() },
    });
    form.reset();
    return 'Showtime added. It is now available on the movie page.';
});

bindAdminForm('ticket-form', findAdminTickets);
initializeAdmin();
