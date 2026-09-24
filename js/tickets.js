document.getElementById('ticketSearch').addEventListener('input', debounce(e =>
    {
        loadTickets(e.target.value.trim());
    },
    300));

async function loadTickets(q) {
    const list = document.getElementById('ticketList');
    list.replaceChildren(el('p', { }, 'Loading your tickets...'));

    let tickets;
    try {
        ( tickets  = await api(TICKETS_PATH + '?q=' + encodeURIComponent(q)));
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
            el('h3', { }, t.movieName),
            el('p', { }, `${t.showTime} at ${t.locationAddress}`),
            el('p', { }, `Seat ${t.seatNumber}` + (t.age ? `, age ${t.age}` : ''))
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