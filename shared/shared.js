/*
TicketFinder - Shared Frontend Code
*/

// API Paths
const LOGIN_PATH = '/TicketFinder/login.php';
const TICKETS_PATH = '/TicketFinder/tickets.php';
const REGISTER_PATH = '/TicketFinder/register.php'
const MOVIES_PATH = '/TicketFinder/movies.php';
const SHOWTIMES_PATH = '/TicketFinder/showtimes.php';

// const USERS_PATH = '/api/users.php';

// FOR TESTING PURPOSES ONLY
// Enables use of fake backend
const USE_MOCK = false;

const USER_COOKIE = 'tf_user';
const SESSION_MINUTES = 20; // Cookie expiration time in minutes

// Make Cookie
function setCookie(name, value, minutes)
{
    try {
        const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
    } catch (e) {
        console.warn('Cookie write failed:', e.message);
    }
}

// Retrieve Cookie Data
function getCookie(name)
{
    const row = document.cookie.split('; ').find(r => r.startsWith(name + '='));
    return row ? decodeURIComponent(row.slice(name.length + 1)) : null;
}

// Delete Cookie
function deleteCookie(name)
{
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

function loadUser()
{
    try { return JSON.parse(getCookie(USER_COOKIE) || 'null'); }
    catch {return null;}
}

function saveUser(user)
{
    setCookie(USER_COOKIE, JSON.stringify(user), SESSION_MINUTES);
}

const state = {
    user: loadUser(), // {id, firstName, lastName, email, isAdmin}
};

// Fetchs info from the PHP pipelines
async function api(path, { method = 'GET', body } = {})
{
    if (USE_MOCK) {return mockApi(path, method, body);}

    const res = await fetch(path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(state.user ? {
                Authorization: 'Bearer ' + state.user.id,
                'X-User-Id': state.user.id,
            } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401)
    {
        signOut();
        throw Object.assign(new Error('Your session expired. Sign in again.'), {status: 401});
    }

    if (!res.ok)
    {
        throw Object.assign(new Error(data.error || 'Something went wrong.'),
    {status : res.status});
    }
    return data;
}

// Checks if user is signed in
function requireAuth()
{
    if (!state.user)
    {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Checks if user is an admin
function requireAdmin()
{
    if (!state.user.isAdmin)
    {
        window.location.href = 'movies.html';
        return false;
    }
    return true;
}

// Signs the user out
function signOut()
{
    state.user = null;
    deleteCookie(USER_COOKIE);
    window.location.href = 'index.html';
}

// Creates the navigation bar at the top of the page.
// MUST BE RUN ON EVERY PAGE EXCEPT LOGIN AND REGISTRATION!
function initTopbar()
{
    const nameEl = document.getElementById('userName');
    if (nameEl && state.user) nameEl.textContent = `${state.user.firstName} ${state.user.lastName}`;

    const adminLink = document.getElementById('adminLink');
    if (adminLink) adminLink.hidden = !state.user || !state.user.isAdmin;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);
}

initTopbar();


/*
Shared DOM Utilites
*/

// Used to make dynamic html elements during runtime
// Tickets, movies, seats, etc.
function el(tag, attrs = {}, ...children)
{
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs))
    {
        if (v !== '' && v != null) node.setAttribute(k, v);
    }
    for (const child of children)
    {
        if (child == null) continue;
        node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
}

// Makes toasts (little popups)
function toast(message, isError = false) 
{
    const holder = document.getElementById('toasts');
    if (!holder) return;
    const node = el('div', {}, message);
    holder.append(node);
    setTimeout(() => node.remove(), 5000);
}

// Puts a hold on sending data serverside until enough time has passed
// Used in search bars to only send when input is complete
function debounce(fn, ms)
{
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function formatDateTime(value)
{
    return new Date(value).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

// MOCK BACKEND - FOR TESTING PURPOSES ONLY
// Imitates the backend (when it works)

// Seed data the mock endpoints below read from and mutate.
const mock = {
  users: [
    { id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',   password: 'password', active: true, isAdmin: false },
    { id: 2, firstName: 'Sam', lastName: 'Ortiz',    email: 'admin@example.com', password: 'password', active: true, isAdmin: true  },
  ],
  movies: [
    { id: 1, title: 'Atlantic Rim', genre: 'Action', releaseDate: '07/09/13', imageUrl: '' },
    { id: 2, title: 'Good Burger',  genre: 'Comedy', releaseDate: '07/25/97', imageUrl: '' },
  ],
  showtimes: [
    { id: 11, movieId: 1, seats: 24, datetime: isoIn(6),  location: 'Easy Street' },
    { id: 12, movieId: 1, seats: 24, datetime: isoIn(9),  location: 'Park Ave' },
    { id: 13, movieId: 2, seats: 24, datetime: isoIn(28), location: 'Sunset Blvd' },
  ],
  tickets: [], // { id, showTimeId, movieName, showTime, locationAddress, seatNumber, customerId, age }
  nextTicketId: 1,
  session: null,
};

function isoIn(hours) {
  return new Date(Date.now() + hours * 3600e3).toISOString();
}

// Fake tickets on the user account
mock.tickets.push(
  {
    id: mock.nextTicketId++,
    showTimeId: 11,
    movieName: mock.movies.find(m => m.id === 1).title,
    showTime: formatDateTime(mock.showtimes.find(s => s.id === 11).datetime),
    locationAddress: mock.showtimes.find(s => s.id === 11).location,
    seatNumber: '7',
    customerId: 1,
    age: 34,
  },
  {
    id: mock.nextTicketId++,
    showTimeId: 13,
    movieName: mock.movies.find(m => m.id === 2).title,
    showTime: formatDateTime(mock.showtimes.find(s => s.id === 13).datetime),
    locationAddress: mock.showtimes.find(s => s.id === 13).location,
    seatNumber: '12',
    customerId: 1,
    age: 34,
  },
);

async function mockApi(path, method, body) {
  await new Promise(r => setTimeout(r, 180));

  const [route, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  const fail = (status, error) => { throw Object.assign(new Error(error), { status }); };
  const me = mock.session;

  if (route === LOGIN_PATH) {
    const u = mock.users.find(x => x.email === body.email);
    if (!u || body.password !== u.password) fail(401, 'Invalid email or password');
    mock.session = u;
    return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, active: u.active, isAdmin: u.isAdmin };
  }

  if (route === REGISTER_PATH) {
    // Mirrors register.php: firstName/lastName/email/password are all
    // required, and IsAdmin is never part of the insert — every account
    // created here is isAdmin: false, matching the real column's default.
    const { firstName, lastName, email, password } = body;
    if (!firstName || !lastName || !email || !password) fail(400, 'All fields are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Invalid email address');
    if (mock.users.some(u => u.email === email)) fail(409, 'An account with this email already exists');
    mock.users.push({ id: Date.now(), firstName, lastName, email, password, active: true, isAdmin: false });
    return { success: true, message: 'User registered successfully' };
  }

  if (!me) fail(401, 'Unauthorized');

  if (route === MOVIES_PATH && method === 'GET') {
    return { movies: mock.movies.map(m => ({
      ...m, showtimes: mock.showtimes.filter(s => s.movieId === m.id),
    })) };
  }

  if (route === MOVIES_PATH && method === 'POST') {
    if (!me.isAdmin) fail(403, 'Admins only');
    if (!body.title) fail(400, 'Title is required');
    mock.movies.push({ id: Date.now(), title: body.title, genre: body.genre, releaseDate: body.releaseDate, imageUrl: body.imageUrl || '' });
    return { ok: true };
  }

  if (route === SHOWTIMES_PATH && method === 'GET') {
    const showtime = mock.showtimes.find(s => s.id === Number(params.get('id')));
    if (!showtime) fail(404, 'That showing no longer exists.');
    const takenSeats = mock.tickets.filter(t => t.showTimeId === showtime.id).map(t => t.seatNumber);
    return { showtime, movie: mock.movies.find(m => m.id === showtime.movieId), takenSeats };
  }

  if (route === SHOWTIMES_PATH && method === 'POST') {
    if (!me.isAdmin) fail(403, 'Admins only');
    mock.showtimes.push({
      id: Date.now(), movieId: Number(body.movieId), seats: Number(body.seats) || 24,
      datetime: new Date(body.datetime).toISOString(), location: body.location,
    });
    return { ok: true };
  }

  if (route === TICKETS_PATH && method === 'POST') {
    const showtime = mock.showtimes.find(s => s.id === Number(body.showTimeId));
    if (!showtime) fail(404, 'That showing no longer exists.');
    const takenNow = new Set(mock.tickets.filter(t => t.showTimeId === showtime.id).map(t => t.seatNumber));
    if (body.seatNumbers.some(n => takenNow.has(n))) fail(409, 'Seat already sold');

    const movie = mock.movies.find(m => m.id === showtime.movieId);
    body.seatNumbers.forEach(seatNumber => {
      mock.tickets.push({
        id: mock.nextTicketId++, showTimeId: showtime.id, movieName: movie.title,
        showTime: formatDateTime(showtime.datetime), locationAddress: showtime.location,
        seatNumber, customerId: me.id, age: Number(body.age) || 0,
      });
    });
    return { ok: true };
  }

  if (route === TICKETS_PATH && method === 'GET') {
    const q = (params.get('q') || '').toLowerCase();
    const mine = mock.tickets.filter(t => t.customerId === me.id && (
      !q || t.movieName.toLowerCase().includes(q) || t.locationAddress.toLowerCase().includes(q)
    ));
    return { tickets: mine };
  }

  if (route === USERS_PATH) {
    if (!me.isAdmin) fail(403, 'Admins only');
    if (method === 'GET') {
      const q = (params.get('q') || '').toLowerCase();
      const matches = mock.users.filter(u => !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q));
      return { users: matches.map(({ password, ...u }) => u) };
    }
    if (method === 'DELETE') {
      mock.users = mock.users.filter(u => u.id !== Number(params.get('id')));
      return { ok: true };
    }
  }

  fail(404, 'No such endpoint: ' + path);
}