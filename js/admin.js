const ADMIN_PATH = '/TicketFinder/admins';
let adminUsers = [];
let adminMovies = [];
let adminShowtimes = [];
let showtimeLoadVersion = 0;

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
            button.disabled = form.dataset.editLocked === 'true';
        }
    });
}

async function loadAdminMovies() {
    const data = await adminRequest(MOVIES_PATH);
    const movies = Array.isArray(data) ? data : data.movies;
    if (!Array.isArray(movies)) throw new Error('The server did not return a movie list.');
    adminMovies = movies;
    for (const id of ['showtime-movie', 'edit-movie-select', 'edit-showtime-movie']) {
        const select = document.getElementById(id);
        const previous = select.value;
        select.replaceChildren(el('option', { value: '' }, 'Select a movie'));
        for (const movie of movies) select.append(el('option', { value: String(movie.ID) }, movie.Title));
        select.value = previous;
    }
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
        const userSelect = document.getElementById('password-user');
        userSelect.replaceChildren(el('option', { value: '' }, 'Select a user'));
        for (const user of adminUsers) {
            userSelect.append(el('option', { value: String(user.ID) }, `${user.FirstName} ${user.LastName} (${user.Email})`));
        }
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

function previewPoster() {
    const image = document.getElementById('poster-preview');
    const status = document.getElementById('poster-status');
    const value = document.getElementById('edit-image').value.trim();
    image.hidden = true;
    image.removeAttribute('src');
    status.textContent = '';
    if (!value) return;
    let url;
    try {
        url = new URL(value, window.location.href);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
        status.textContent = 'Use an HTTP(S) image URL or a local image path.';
        return;
    }
    image.onload = () => { image.hidden = false; status.textContent = 'Image loaded.'; };
    image.onerror = () => { image.hidden = true; status.textContent = 'Image could not load. Check the URL or file path.'; };
    image.src = url.href;
}

function selectEditMovie() {
    const form = document.getElementById('edit-movie-form');
    const movie = adminMovies.find(item => String(item.ID) === document.getElementById('edit-movie-select').value);
    form.reset();
    form.querySelector('fieldset').disabled = !movie;
    form.querySelector('.form-status').textContent = '';
    if (movie) {
        form.elements.namedItem('title').value = movie.Title;
        form.elements.namedItem('genre').value = movie.Genre;
        form.elements.namedItem('release-date').value = movie.ReleaseDate;
        form.elements.namedItem('img-url').value = movie.ImageUrl || '';
    }
    previewPoster();
}

async function loadEditShowtimes() {
    const version = ++showtimeLoadVersion;
    const movieId = document.getElementById('edit-showtime-movie').value;
    const select = document.getElementById('edit-showtime-select');
    const form = document.getElementById('edit-showtime-form');
    adminShowtimes = [];
    form.reset();
    form.querySelector('fieldset').disabled = true;
    select.disabled = true;
    select.replaceChildren(el('option', { value: '' }, 'Select a showtime'));
    const status = form.querySelector('.form-status');
    status.textContent = movieId ? 'Loading showtimes...' : '';
    if (!movieId) return;
    try {
        const data = await adminRequest(`${ADMIN_PATH}/showtimes?movieId=${encodeURIComponent(movieId)}`);
        if (version !== showtimeLoadVersion) return;
        if (!Array.isArray(data.showtimes)) throw new Error('The server did not return showtimes.');
        adminShowtimes = data.showtimes;
        for (const show of adminShowtimes) select.append(el('option', { value: String(show.ID) }, `${show.Datetime} — ${show.Location} (ID ${show.ID})`));
        select.disabled = !adminShowtimes.length;
        status.textContent = adminShowtimes.length ? '' : 'No showtimes for this movie. Add one above.';
    } catch (error) {
        if (version === showtimeLoadVersion) status.textContent = error.message;
    }
}

document.getElementById('edit-movie-select').addEventListener('change', selectEditMovie);
document.getElementById('edit-image').addEventListener('input', previewPoster);
document.getElementById('edit-showtime-movie').addEventListener('change', loadEditShowtimes);
function lockShowtimeEditing(locked) {
    const form = document.getElementById('edit-showtime-form');
    form.dataset.editLocked = String(locked);
    for (const input of form.querySelectorAll('input, button[type="submit"]')) input.disabled = locked;
}

async function showtimeHasTickets(id) {
    const result = await adminRequest(`${ADMIN_PATH}/tickets?showtimeId=${encodeURIComponent(id)}`);
    if (!Array.isArray(result.tickets)) throw new Error('Unable to check booked tickets. Editing is disabled.');
    return result.tickets.length > 0;
}

document.getElementById('edit-showtime-select').addEventListener('change', async () => {
    const version = ++showtimeLoadVersion;
    const form = document.getElementById('edit-showtime-form');
    const show = adminShowtimes.find(item => String(item.ID) === document.getElementById('edit-showtime-select').value);
    form.reset();
    form.querySelector('fieldset').disabled = !show;
    form.querySelector('.form-status').textContent = '';
    lockShowtimeEditing(true);
    if (show) {
        form.elements.namedItem('datetime').value = show.Datetime.replace(' ', 'T');
        form.elements.namedItem('location').value = show.Location;
        form.elements.namedItem('seats').value = show.Seats;
        const status = form.querySelector('.form-status');
        status.textContent = 'Checking booked tickets...';
        try {
            const booked = await showtimeHasTickets(show.ID);
            if (version !== showtimeLoadVersion) return;
            lockShowtimeEditing(booked);
            status.textContent = booked ? 'This showtime has purchased tickets and cannot be edited.' : '';
        } catch (error) {
            if (version === showtimeLoadVersion) status.textContent = error.message;
        }
    }
});

bindAdminForm('password-form', async (data, form) => {
    const id = Number(data.get('userId'));
    if (!adminUsers.some(user => Number(user.ID) === id)) throw new Error('Select a user.');
    const password = data.get('password');
    if (!password.trim()) throw new Error('Enter a new password.');
    if (password !== data.get('confirm')) throw new Error('Passwords do not match.');
    await adminRequest(`${ADMIN_PATH}/users/${id}`, { method: 'PUT', body: { password } });
    form.reset();
    return 'Password changed. The user can sign in with the new password.';
});

bindAdminForm('edit-movie-form', async data => {
    const id = document.getElementById('edit-movie-select').value;
    if (!adminMovies.some(movie => String(movie.ID) === id)) throw new Error('Select a movie.');
    const body = Object.fromEntries(data);
    if (Object.values(body).some(value => !value.trim())) throw new Error('Fill in every movie field.');
    const url = new URL(body['img-url'], window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP(S) image URL or a local image path.');
    await adminRequest(`${MOVIES_PATH}/${id}`, { method: 'PUT', body });
    try { await loadAdminMovies(); } catch { return 'Movie saved. Reload to refresh the movie selectors.'; }
    return 'Movie saved. Refresh the movie page to see the updated poster and details.';
});

bindAdminForm('edit-showtime-form', async data => {
    const id = document.getElementById('edit-showtime-select').value;
    const show = adminShowtimes.find(item => String(item.ID) === id);
    if (!show) throw new Error('Select a showtime.');
    const seats = Number(data.get('seats'));
    const location = data.get('location').trim();
    const datetime = data.get('datetime');
    if (!Number.isInteger(seats) || seats < 1) throw new Error('Enter a positive whole number of seats.');
    if (!location) throw new Error('Enter a location.');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(datetime)) throw new Error('Enter a valid date and time.');
    lockShowtimeEditing(true);
    if (await showtimeHasTickets(id)) {
        throw new Error('This showtime has purchased tickets and cannot be edited.');
    }
    if (document.getElementById('edit-showtime-select').value !== id) {
        throw new Error('The selected showtime changed. Please select it again before saving.');
    }
    await adminRequest(`${ADMIN_PATH}/showtimes/${id}`, {
        method: 'PUT', body: { seats, location, datetime: datetime.replace('T', ' ') + (datetime.length === 16 ? ':00' : '') },
    });
    if (document.getElementById('edit-showtime-select').value !== id) return 'Showtime saved.';
    lockShowtimeEditing(false);
    show.Seats = seats;
    show.Location = location;
    show.Datetime = datetime.replace('T', ' ') + (datetime.length === 16 ? ':00' : '');
    const select = document.getElementById('edit-showtime-select');
    select.selectedOptions[0].textContent = `${show.Datetime} — ${show.Location} (ID ${show.ID})`;
    return 'Showtime saved.';
});
document.getElementById('delete-showtime').addEventListener('click', async () => {
    const select = document.getElementById('edit-showtime-select');
    const show = adminShowtimes.find(item => String(item.ID) === select.value);
    if (!show) return;
    const movie = adminMovies.find(item => Number(item.ID) === Number(show.MovieID));
    const message = `Delete ${movie ? movie.Title : 'this showtime'} on ${show.Datetime} at ${show.Location}? All tickets for this showing will be permanently canceled. This cannot be undone.`;
    if (!window.confirm(message)) return;
    const form = document.getElementById('edit-showtime-form');
    const fieldset = form.querySelector('fieldset');
    const status = form.querySelector('.form-status');
    const movieSelect = document.getElementById('edit-showtime-movie');
    fieldset.disabled = true;
    select.disabled = true;
    movieSelect.disabled = true;
    status.textContent = 'Deleting showtime...';
    try {
        await adminRequest(`${ADMIN_PATH}/showtimes/${show.ID}`, { method: 'DELETE' });
        document.getElementById('admin-tickets').replaceChildren();
        document.querySelector('#ticket-form .form-status').textContent = 'Search again to refresh ticket results.';
        await loadEditShowtimes();
        status.textContent = 'Showtime deleted and its tickets canceled. Refresh My Tickets to see the change.';
    } catch (error) {
        status.textContent = error.message;
        fieldset.disabled = false;
        select.disabled = false;
    } finally {
        movieSelect.disabled = false;
    }
});

document.getElementById('delete-movie').addEventListener('click', async () => {
    const select = document.getElementById('edit-movie-select');
    const movie = adminMovies.find(item => String(item.ID) === select.value);
    if (!movie) return;
    if (!window.confirm(`Delete ${movie.Title}? All of its showtimes and associated tickets will also be permanently deleted. This cannot be undone.`)) return;
    const form = document.getElementById('edit-movie-form');
    const fieldset = form.querySelector('fieldset');
    const status = form.querySelector('.form-status');
    fieldset.disabled = true;
    select.disabled = true;
    status.textContent = 'Deleting movie...';
    try {
        await adminRequest(`${MOVIES_PATH}/${movie.ID}`, { method: 'DELETE' });
    } catch (error) {
        status.textContent = error.message;
        fieldset.disabled = false;
        select.disabled = false;
        return;
    }

    // Discard stale selections after the server confirms deletion.
    ++showtimeLoadVersion;
    adminShowtimes = [];
    document.getElementById('edit-showtime-movie').value = '';
    const showSelect = document.getElementById('edit-showtime-select');
    showSelect.replaceChildren(el('option', { value: '' }, 'Select a movie first'));
    showSelect.disabled = true;
    const showForm = document.getElementById('edit-showtime-form');
    showForm.reset();
    showForm.querySelector('fieldset').disabled = true;
    showForm.querySelector('.form-status').textContent = '';
    document.getElementById('admin-tickets').replaceChildren();
    document.querySelector('#ticket-form .form-status').textContent = 'Search again to refresh ticket results.';
    adminMovies = adminMovies.filter(item => Number(item.ID) !== Number(movie.ID));
    for (const id of ['showtime-movie', 'edit-movie-select', 'edit-showtime-movie']) {
        const picker = document.getElementById(id);
        for (const option of Array.from(picker.options)) {
            if (option.value === String(movie.ID)) option.remove();
        }
    }
    select.value = '';
    selectEditMovie();
    select.disabled = false;
    try {
        await loadAdminMovies();
        status.textContent = 'Movie, showtimes, and associated tickets deleted.';
    } catch {
        status.textContent = 'Movie deleted. Reload the page to refresh the movie list.';
    }
});

initializeAdmin();
