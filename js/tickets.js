async function fetchTickets(q) {
    const response = await fetch(
        TICKETS_PATH + '?showing=' + encodeURIComponent(q),
        {
            headers: {
                Authorization: 'Bearer ' + state.user.id,
                'X-User-Id': state.user.id,
            },
        }
    );

    if (response.status === 401) {
        signOut();
        throw new Error('Your session expired. Sign in again.');
    }

    const text = await response.text();
    const cleaned = text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
    let data;
    try {
        data = JSON.parse(cleaned);
    } catch {
        throw new Error('The server returned an invalid ticket response.');
    }

    if (!response.ok) {
        throw new Error(data.error || 'Unable to load tickets.');
    }
    if (!Array.isArray(data)) {
        throw new Error('The server did not return a ticket list.');
    }
    return data;
}

// Load user tickets when searching
document.getElementById('ticketSearch').addEventListener('input', debounce(e =>
    {
        loadTickets(e.target.value.trim());
    },
    300));

// Load User Tickets
async function loadTickets(q) {
    const list = document.getElementById('ticketList');
    list.replaceChildren(el('p', { }, 'Loading your tickets...'));

    let tickets;
    try {
        tickets = await fetchTickets(q);
    } catch (ex) {
        list.replaceChildren(el('p', { }, ex.message));
        return;
    }

    if (!tickets.length)
    {
        list.replaceChildren(el('p', { },
            q ? 'No tickets match that search.'
            : 'Nothing booked yet. Pick a showing from Now Showing to get started!'
        ));
        return;
    }

    list.replaceChildren(...tickets.map(t => el('article', { },
        el('div', { },
            el('h3', { }, t.MovieName),
            el('p', { }, `${t.ShowTime} at ${t.LocationAddress}`),
            el('p', { }, `Seat ${t.SeatNumber}` + (t.Age ? `, age ${t.Age}` : ''))
        ),
        el('div', { },
            el('p', { }, 'Admit'),
            el('p', { }, '1')
        )
    )));
}

if (requireAuth())
{
    loadTickets('');
}
