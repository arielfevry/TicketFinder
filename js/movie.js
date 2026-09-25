async function fetchMovieData(path) {
    if (USE_MOCK) return api(path);

    const response = await fetch(path, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + state.user.id,
            'X-User-Id': state.user.id,
        },
    });

    if (response.status === 401) {
        signOut();
        throw new Error('Your session expired. Sign in again.');
    }

    // Remove the route comment emitted before the endpoint's JSON.
    const text = (await response.text()).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('The server returned an invalid response.');
    }

    if (!response.ok) {
        throw new Error(data.error || 'Unable to load movie data.');
    }
    return data;
}

const parameters =
    new URLSearchParams(window.location.search);


const movieId =
    Number(parameters.get("id"));



async function loadMoviePage() {

    const movieDetails =
        document.getElementById("movie-details");


    const showtimeList =
        document.getElementById("showtime-list");


    if (!movieId) {

        movieDetails.innerHTML =
            "<p>Invalid movie.</p>";

        return;
    }


    try {

        // Get the selected movie from the real API
        const movie =
            await fetchMovieData(`${MOVIES_PATH}/${movieId}`);

        if (!movie || typeof movie.Title !== 'string') {
            throw new Error('The server did not return movie details.');
        }


        movieDetails.innerHTML = `
            <img
                src="${movie.ImageUrl}"
                alt="${movie.Title}"
                width="200"
            >

            <h2>${movie.Title}</h2>

            <p>
                Genre: ${movie.Genre}
            </p>

            <p>
                Release Date:
                ${movie.ReleaseDate}
            </p>
        `;


        document.title =
            `${movie.Title} | TicketFinder`;


        await loadShowtimes(movie);

    }

    catch (error) {

        console.error(
            "Movie error:",
            error
        );


        movieDetails.innerHTML = `
            <p>
                ${error.message}
            </p>
        `;

    }

}



async function loadShowtimes(movie) {

    const showtimeList =
        document.getElementById("showtime-list");


    showtimeList.innerHTML =
        "<p>Loading showtimes...</p>";


    try {

        // Get real showtimes belonging to this movie
        const showtimes =
            await fetchMovieData(
                `${SHOWTIMES_PATH}?movie=${movieId}`
            );

        if (!Array.isArray(showtimes)) {
            throw new Error('The server did not return a showtime list.');
        }


        showtimeList.innerHTML = "";


        showtimes.forEach(function(showtime) {

            const showtimeCard =
                document.createElement("div");


            showtimeCard.innerHTML = `
                <p>
                    ${showtime.Datetime}
                </p>

                <p>
                    ${showtime.Location}
                </p>

                <p>
                    Capacity:
                    ${showtime.Seats}
                </p>

                <button
                    type="button"
                    class="select-showtime"
                    data-showtime-id="${showtime.ID}"
                >
                    Select Showtime
                </button>
            `;


            showtimeList.appendChild(
                showtimeCard
            );

        });


        const showtimeButtons =
            document.querySelectorAll(
                ".select-showtime"
            );


        showtimeButtons.forEach(function(button) {

            button.addEventListener(
                "click",
                function() {

                    const showtimeId =
                        Number(
                            button.dataset.showtimeId
                        );


                    loadSeats(
                        movie,
                        showtimeId
                    );

                }
            );

        });

    }

    catch (error) {

        console.error(
            "Showtime error:",
            error
        );


        showtimeList.innerHTML = `
            <p>
                No showtimes are currently available.
            </p>
        `;

    }

}



async function loadSeats(movie, showtimeId) {

    const seatSelection =
        document.getElementById(
            "seat-selection"
        );


    seatSelection.innerHTML = `
        <h2>Select a Seat</h2>

        <p>Loading seats...</p>
    `;


    try {

        // Get REAL seat availability
        const data =
            await fetchMovieData(
                `${SHOWTIMES_PATH}/${showtimeId}/seats`
            );


        const seats =
            data.seats;

        if (!Array.isArray(seats)) {
            throw new Error('The server did not return a seat list.');
        }


        seatSelection.innerHTML = `
            <h2>Select a Seat</h2>

            <div id="seat-list"></div>

            <p id="selected-seat">
                No seat selected.
            </p>

            <div>

                <label for="customer-age">
                    Age
                </label>

                <input
                    id="customer-age"
                    type="number"
                    min="1"
                    max="120"
                >

            </div>

            <br>

            <button
                type="button"
                id="purchase-button"
                disabled
            >
                Purchase Ticket
            </button>
        `;


        const seatList =
            document.getElementById(
                "seat-list"
            );


        const selectedSeatText =
            document.getElementById(
                "selected-seat"
            );


        const purchaseButton =
            document.getElementById(
                "purchase-button"
            );


        let selectedSeat = null;


        seats.forEach(function(seat) {

            const seatButton =
                document.createElement(
                    "button"
                );


            seatButton.type =
                "button";


            seatButton.textContent =
                seat.seatNumber;


            if (
                seat.is_availible === false
            ) {

                seatButton.disabled =
                    true;


                seatButton.textContent +=
                    " (Taken)";

            }


            seatButton.addEventListener(
                "click",
                function() {

                    selectedSeat =
                        seat.seatNumber;


                    selectedSeatText.textContent =
                        "Selected Seat: " +
                        selectedSeat;


                    purchaseButton.disabled =
                        false;

                }
            );


            seatList.appendChild(
                seatButton
            );

        });



        purchaseButton.addEventListener(
            "click",
            async function() {

                const ageInput =
                    document.getElementById(
                        "customer-age"
                    );


                const age =
                    Number(ageInput.value);


                if (!selectedSeat) {

                    toast(
                        "Please select a seat.",
                        true
                    );

                    return;
                }


                if (
                    !age ||
                    age < 1 ||
                    age > 120
                ) {

                    toast(
                        "Please enter a valid age.",
                        true
                    );

                    return;
                }


                purchaseButton.disabled =
                    true;


                try {

                    // REAL ticket purchase
                    await api(
                        TICKETS_PATH,
                        {
                            method: "POST",

                            body: {
                                MovieID: movieId,
                                ShowTimeID: showtimeId,
                                Age: age,
                                SeatNumber: selectedSeat
                            }
                        }
                    );


                    toast(
                        "Ticket purchased!"
                    );


                    setTimeout(
                        function() {

                            window.location.href =
                                "tickets.html?v=20260925-3";

                        },
                        500
                    );

                }

                catch (error) {

                    console.error(
                        "Purchase error:",
                        error
                    );


                    toast(
                        error.message,
                        true
                    );


                    purchaseButton.disabled =
                        false;

                }

            }
        );

    }

    catch (error) {

        console.error(
            "Seat error:",
            error
        );


        seatSelection.innerHTML = `
            <h2>Select a Seat</h2>

            <p>
                ${error.message}
            </p>
        `;

    }

}



if (requireAuth()) {

    loadMoviePage();

}
