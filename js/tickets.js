// Sends a request to the tickets or showtimes API and returns the parsed JSON.
// Those PHP files print their route comment before the JSON, so the comment is
// stripped before parsing (the shared api() helper can't read these responses).
async function ticketRequest(url, method = 'GET', body) {
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + state.user.id,
            'X-User-Id': state.user.id,
        },
        body: body ? JSON.stringify(body) : undefined,
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
        throw Object.assign(new Error(data.error || 'The ticket request failed.'),
            { status: response.status });
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

// Gets the seat map for a showing: GET /TicketFinder/showtimes/{id}/seats
// Returns [{ seatNumber: 'A1', is_availible: true }, ...]
async function fetchSeats(showTimeId) {
    const data = await ticketRequest(SHOWTIMES_PATH + '/' + encodeURIComponent(showTimeId) + '/seats');
    if (!Array.isArray(data.seats)) {
        throw new Error('The server did not return a seat list.');
    }
    return data.seats;
}

// Moves a ticket to a new seat: PUT /TicketFinder/tickets/{id}
// Updating the ticket's SeatNumber frees the old seat, since seat availability
// comes from the seats stored on tickets.
async function changeSeat(ticketId, seatNumber) {
    return ticketRequest(TICKETS_PATH + '/' + encodeURIComponent(ticketId), 'PUT',
        { SeatNumber: seatNumber });
}

// Current search text, so the list can be reloaded after a change
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
        class: 'ticket-action ticket-delete',
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

// Builds the Change Seat button; it opens a seat picker inside the ticket card
function makeChangeSeatButton(ticket) {
    const label = `Change seat for ${ticket.MovieName}, currently seat ${ticket.SeatNumber}`;
    const btn = el('button', {
        type: 'button',
        class: 'ticket-action',
        'aria-expanded': 'false',
        'aria-label': label,
        'data-label': label,
    }, 'Change Seat');

    btn.addEventListener('click', () => {
        const details = btn.closest('article').firstElementChild;
        const openPicker = details.querySelector('.seat-picker');

        closeSeatPickers();
        if (!openPicker) {
            openSeatPicker(ticket, details, btn);
        }
    });

    return btn;
}

// Closes every open seat picker (only one is open at a time)
function closeSeatPickers() {
    document.querySelectorAll('#ticketList .seat-picker').forEach(p => p.remove());
    document.querySelectorAll('#ticketList [aria-expanded="true"]').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        b.setAttribute('aria-label', b.dataset.label);
        b.textContent = 'Change Seat';
    });
}

// Shows the seat map for the ticket's showing so the user can pick a new seat
async function openSeatPicker(ticket, container, toggleBtn) {
    const picker = el('div', { class: 'seat-picker' }, el('p', { }, 'Loading seats...'));
    container.append(picker);
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label', `Cancel seat change for ${ticket.MovieName}`);
    toggleBtn.textContent = 'Cancel';

    let seats;
    try {
        seats = await fetchSeats(ticket.ShowTimeID);
    } catch (ex) {
        picker.replaceChildren(el('p', { }, ex.message));
        return;
    }

    let selectedSeat = null;

    const status = el('p', { class: 'seat-status', 'aria-live': 'polite' },
        `Your current seat is ${ticket.SeatNumber}. Pick an open seat.`);

    const confirmBtn = el('button', { type: 'button', disabled: 'disabled' }, 'Confirm Seat Change');

    const grid = el('div', { class: 'seat-grid', role: 'group', 'aria-label': 'Seats' },
        ...seats.map(seat => {
            const isCurrent = seat.seatNumber === ticket.SeatNumber;
            const isTaken = !isCurrent && seat.is_availible === false;

            const seatBtn = el('button', {
                type: 'button',
                class: 'seat' + (isCurrent ? ' seat-current' : '') + (isTaken ? ' seat-taken' : ''),
                'aria-pressed': 'false',
                'aria-label': seat.seatNumber
                    + (isCurrent ? ' (your current seat)' : isTaken ? ' (taken)' : ''),
            }, seat.seatNumber);

            if (isCurrent || isTaken) {
                seatBtn.disabled = true;
                return seatBtn;
            }

            seatBtn.addEventListener('click', () => {
                grid.querySelectorAll('.seat[aria-pressed="true"]')
                    .forEach(b => b.setAttribute('aria-pressed', 'false'));
                seatBtn.setAttribute('aria-pressed', 'true');
                selectedSeat = seat.seatNumber;
                status.textContent = `Move from ${ticket.SeatNumber} to ${selectedSeat}?`;
                confirmBtn.disabled = false;
            });

            return seatBtn;
        })
    );

    confirmBtn.addEventListener('click', async () => {
        if (!selectedSeat) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Changing seat...';

        try {
            await changeSeat(ticket.ID ?? ticket.id, selectedSeat);
        } catch (ex) {
            confirmBtn.textContent = 'Confirm Seat Change';
            if (ex.status === 409) {
                // Someone else booked it first: reload the seat map
                toast(`Seat ${selectedSeat} was just taken. Please pick another seat.`, true);
                closeSeatPickers();
                openSeatPicker(ticket, container, toggleBtn);
            } else {
                confirmBtn.disabled = false;
                toast(ex.message, true);
            }
            return;
        }

        toast(`Seat changed from ${ticket.SeatNumber} to ${selectedSeat}.`);
        loadTickets(currentSearch());
    });

    const legend = el('p', { class: 'seat-legend' },
        el('span', { class: 'seat-key' }), 'Open',
        el('span', { class: 'seat-key seat-key-current' }), 'Your seat',
        el('span', { class: 'seat-key seat-key-taken' }), 'Taken'
    );

    picker.replaceChildren(
        el('h4', { }, 'Choose a new seat'),
        legend,
        el('p', { class: 'seat-screen' }, 'Screen'),
        grid,
        status,
        confirmBtn
    );
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
            el('div', { class: 'ticket-actions' },
                makeChangeSeatButton(t),
                makeDeleteButton(t)
            )
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