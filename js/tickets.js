// Sends a request to the tickets API and returns the parsed JSON.
// tickets.php prints its route comment before the JSON, so the comment is
// stripped before parsing (the shared api() helper can't read these responses).
async function ticketRequest(url, method = 'GET') {
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: 'Bearer ' + state.user.id,
            'X-User-Id': state.user.id,
        },
    });

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
        throw new Error(data.error || 'The ticket request failed.');
    }
    return data;
}

// Gets the user's tickets, optionally filtered by movie name
async function fetchTickets(q) {
    const data = await ticketRequest(TICKETS_PATH + '?showing=' + encodeURIComponent(q));
    if (!Array.isArray(data)) {
        throw new Error('The server did not return a ticket list.');
    }
    return data;
}

// Deletes one of the user's tickets: DELETE /TicketFinder/tickets/{id}
async function deleteTicket(ticketId) {
    return ticketRequest(TICKETS_PATH + '/' + encodeURIComponent(ticketId), 'DELETE');
}

// Current search text, so the list can be reloaded after a delete
function currentSearch() {
    return document.getElementById('ticketSearch').value.trim();
}

// Load user tickets when searching
document.getElementById('ticketSearch').addEventListener('input', debounce(e =>
    {
        loadTickets(e.target.value.trim());
    },
    300));

// Builds the Delete button for one ticket
function makeDeleteButton(ticket) {
    const btn = el('button', {
        type: 'button',
        class: 'ticket-delete',
        'aria-label': `Delete ticket for ${ticket.MovieName}, seat ${ticket.SeatNumber}`,
    }, 'Delete');

    btn.addEventListener('click', async () => {
        if (!confirm(`Delete your ticket for ${ticket.MovieName} (seat ${ticket.SeatNumber})? This can't be undone.`)) {
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
            await deleteTicket(ticket.ID ?? ticket.id);
        } catch (ex) {
            btn.disabled = false;
            btn.textContent = 'Delete';
            toast(ex.message, true);
            return;
        }

        toast('Ticket deleted.');
        loadTickets(currentSearch());
    });

    return btn;
}

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
            el('p', { }, `Seat ${t.SeatNumber}` + (t.Age ? `, age ${t.Age}` : '')),
            makeDeleteButton(t)
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